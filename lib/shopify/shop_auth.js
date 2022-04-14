require('dotenv').config();
const express = require('express')
const app = express()
const crypto = require("crypto");
const { pool } = require("../../dbConfig")
app.use(express.static('public'));
const { Shopify, ApiVersion } = require('@shopify/shopify-api')

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES,
  HOST_NAME: process.env.TUNNEL_URL,
  API_VERSION: ApiVersion.October21,
  IS_EMBEDDED_APP: true
});

const shops = {}

module.exports = function (app) {

  app.get('/auth', async (req, res) => {
    const authRoute = await Shopify.Auth.beginAuth(
      req,
      res,
      req.query.shop,
      '/auth/callback',
      false
    )
    console.log(authRoute)
    res.redirect(authRoute)
  })

  app.get('/auth/callback', async (req, res) => {
    try {
      const currentSession = await Shopify.Auth.validateAuthCallback(
        req,
        res,
        req.query
      ); // req.query must be cast to unkown and then AuthQuery in order to be accepted      

      if(req.user.email != undefined ){
      var updatedDate = new Date().toISOString();
      var createdDate = new Date().toISOString();
      if (currentSession.shop && currentSession.accessToken) {
        const client = await pool.connect()
        await client.query('BEGIN')
        await JSON.stringify(client.query('SELECT * FROM shops WHERE "email"=$1', [email], function (err, result) {
          if (result.rows.length == 0) {
            client.query('INSERT INTO shops (email, created_at, updated_at, shopify_domain, shopify_token) VALUES ($1, $2, $3, $4, $5)', [email, createdDate, updatedDate, currentSession.shop, currentSession.accessToken], function (err, result) {
              if (err) { console.log(err); }
              else {
                client.query('COMMIT')
                return res.redirect('/shopify');
              }
            });
          }
          else if (result.rows.length > 0) {
            var ExistAmazAppClientId = [];
            for (let i in result.rows) {
              ExistAmazAppClientId.push(result.rows[i].shopify_domain)
            }

            var NotInShop;
            if (!ExistAmazAppClientId.includes(currentSession.shop)) {
              NotInShop = currentSession.shop;
            }

            if (NotInShop) {
              client.query('INSERT INTO shops (email, created_at, updated_at, shopify_domain, shopify_token) VALUES ($1, $2, $3, $4, $5)', [email, createdDate, updatedDate, currentSession.shop, currentSession.accessToken], function (err, result) {
                if (err) { console.log(err); }
                else {
                  client.query('COMMIT')
                  return res.redirect('/shopify');
                }
              });
            } else {
              client.query('UPDATE shops set updated_at=$1, shopify_token=$2 WHERE email=$3 AND shopify_domain=$4', [updatedDate, currentSession.accessToken, email, currentSession.shop], function (err, result) {
                if (err) { console.log(err); }
                else {
                  client.query('COMMIT')
                  return res.redirect('/shopify');
                }
              });
            }
          }
        }));
        client.release();
      } else if (!currentSession.shop) {
        req.flash('error_msg', '• Shop is Empty')
        return res.redirect('/shopify');
      } else {
        req.flash('error_msg', '• AccessToken is Empty')
        return res.redirect('/shopify');
      }
    }else{
      shops[currentSession.shop] = currentSession;

      return res.redirect(`https://${currentSession.shop}/admin/apps/oauth-node-1`);
    }
    } catch (error) {
      console.error(error); // in practice these should be handled more gracefully
    }
  });

  function verifyWebhookRequest(body, req) {
    try {
      const generatedHash = crypto
        .createHmac("SHA256", Shopify.Context.API_SECRET_KEY)
        .update(JSON.stringify(body), "utf8")
        .digest("base64");
      const ShopifyHeader = 'x-shopify-hmac-sha256';
      const hmac = req.get(ShopifyHeader);
      console.log(hmac + ' ' + generatedHash)
      const safeCompareResult = Shopify.Utils.safeCompare(generatedHash, hmac);
      if (!safeCompareResult) {
        console.log('Not Safe')
        return true;
      } else {
        console.log('Safe')
        return false;
      }
    } catch (error) {
      console.log('error', error)
      return false;
    }
  }

  app.post("/webhooks", (req, res) => {
    if (verifyWebhookRequest(req.body, req) === true) {
      console.log('Not verified')
      res.sendStatus(401);
      // do something with the ctx.request.body
    } else {
      console.log('verified :)')
      res.sendStatus(200)
    }
  });
}