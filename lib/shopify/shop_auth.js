require('dotenv').config();
const express = require('express')
const app = express()
const getRawBody = require("raw-body"); //install raw-body from npm
const crypto = require("crypto");
const secret = process.env.SHOPIFY_API_SECRET;
app.use(express.static('public'));
var bodyParser = require('body-parser')
const { Shopify, ApiVersion } = require('@shopify/shopify-api')

Shopify.Context.initialize({ 
    API_KEY: process.env.SHOPIFY_API_KEY,
    API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
    SCOPES: process.env.SCOPES,
    HOST_NAME: process.env.TUNNEL_URL,
    API_VERSION: ApiVersion.October21,
    IS_EMBEDDED_APP: true
 });

module.exports = function (app) {

    app.get('/auth', async (req, res) => {
        const authRoute = await Shopify.Auth.beginAuth(
            req,
            res,
            req.query.shop,
            '/auth/callback',
            false
        )
        res.redirect(authRoute)
    })

    app.get('/auth/callback', async (req, res) => {
        try {
          const currentSession = await Shopify.Auth.validateAuthCallback(
            req,
            res,
            req.query
          ); // req.query must be cast to unkown and then AuthQuery in order to be accepted      
          
          console.log(currentSession)

        } catch (error) {
          console.error(error); // in practice these should be handled more gracefully
        }
        return res.redirect('/shopify'); // wherever you want your user to end up after OAuth completes
      });

      function verifyWebhookRequest(body,req) {
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