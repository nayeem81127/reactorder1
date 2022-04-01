const express = require("express")
const app = express();
const crypto = require('crypto');
const nonce = require('nonce')();
const request = require('request-promise');
const querystring = require('querystring');
const cookie = require('cookie');
app.use(express.static('public'));
const { Shopify } = require('@shopify/shopify-api');
require('dotenv').config();

// const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES, HOST } = process.env;

//     const shops = {};

//     Shopify.Context.initialize({
//         API_KEY: SHOPIFY_API_KEY,
//         API_SECRET: SHOPIFY_API_SECRET,
//         SCOPES: SCOPES,
//         HOST: HOST,
//         IS_EMBEDDED_APP: true,
//     });

module.exports = function (app) {

    app.get('/shopify-api', (req, res) => {
        // Shop Name
        const shopName = req.query.shop_name;
        if (shopName) {

            const shopState = nonce();
            // shopify callback redirect
            const redirectURL = process.env.TUNNEL_URL + 'shopify-api/callback';
            // Install URL for app install
            const shopifyURL = 'https://' + shopName +
                '/admin/oauth/authorize?client_id=' + process.env.SHOPIFY_API_KEY +
                '&scope=' + process.env.SCOPES +
                '&state=' + shopState +
                '&redirect_uri=' + redirectURL;

            res.cookie('state', shopState);
            res.redirect(shopifyURL);
        } else {
            return res.status(400).send('Missing "Shop Name" parameter!!');
        }
    });

    app.get('/shopify-api/callback', (req, res) => {
        const { shopName, hmac, code, shopState } = req.query;
        console.log(shopName, hmac, code, shopState)
        const stateCookie = cookie.parse(req.headers.cookie).state;

        if (shopState !== stateCookie) {
            return res.status(403).send('Request origin cannot be verified');
        }

        if (shopName && hmac && code) {
            const queryMap = Object.assign({}, req.query);
            delete queryMap['signature'];
            delete queryMap['hmac'];

            const message = querystring.stringify(queryMap);
            const providedHmac = Buffer.from(hmac, 'utf-8');
            const generatedHash = Buffer.from(crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET).update(message).digest('hex'), 'utf-8');

            let hashEquals = false;

            try {
                hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac);
            } catch (e) {
                hashEquals = false;
            }

            if (!hashEquals) {
                return res.status(400).send('HMAC validation failed');
            }
            const accessTokenRequestUrl = 'https://' + shopName + '/admin/oauth/access_token';
            const accessTokenPayload = {
                client_id: process.env.SHOPIFY_API_KEY,
                client_secret: process.env.SHOPIFY_API_SECRET,
                code,
            };

            request.post(accessTokenRequestUrl, { json: accessTokenPayload })
                .then((accessTokenResponse) => {
                    const accessToken = accessTokenResponse.access_token;
                    const shopRequestURL = 'https://' + shopName + '/admin/api/2020-04/shop.json';
                    const shopRequestHeaders = { 'X-Shopify-Access-Token': accessToken };

                    request.get(shopRequestURL, { headers: shopRequestHeaders })
                        .then((shopResponse) => {
                            res.redirect('https://' + shopName + '/admin/apps');
                        })
                        .catch((error) => {
                            res.status(error.statusCode).send(error.error.error_description);
                        });
                })
                .catch((error) => {
                    res.status(error.statusCode).send(error.error.error_description);
                });

        } else {
            res.status(400).send('Required parameters missing');
        }
    });

    // app.get('/install', function (req, res, next) {
    //     var shop = req.query.shop;
    //     var appId = process.env.SHOPIFY_API_KEY;
    
    //     var appSecret = process.env.appSecret;
    //     var appScope = process.env.SCOPES;
    //     var appDomain = process.env.TUNNEL_URL;
    
    //     //build the url
    //     var installUrl = `https://${shop}/admin/oauth/authorize?client_id=${appId}&scope=${appScope}&redirect_uri=https://${appDomain}/shopify/auth`;
    
    //     //Do I have the token already for this store?
    //     //Check database
    //     //For tutorial ONLY - check .env variable value
    //     if (process.env.appStoreTokenTest.length > 0) {
    //         res.redirect('/shopify/app?shop=' + shop);
    //     } else {
    //         //go here if you don't have the token yet
    //         res.redirect(installUrl);
    //     }
    
    // });

   

/*
    app.get('/', async (req, res) => {
        if (typeof shops[req.query.shop] != 'undefined') {
            res.send('Hello World!');
        } else {
            res.redirect(`/auth?shop=${req.query.shop}`);
        }
    });

    app.get('/auth', async (req, res) => {
        const authRoute = await Shopify.Auth.beginAuth(
            req,
            res,
            req.query.shop,
            '/auth/callback',
            false,
        )
        res.redirect(authRoute);
    });

    app.get('auth/callback', async (req, res) => {
        const shopSession = await Shopify.Auth.validateAuthCallback(
            req,
            res,
            req.query
        );

        console.log(shopSession);

        shops[shopSession.shop] = shopSession;
        res.redirect(`https://${shopSession.shop}/admin/apps/oauth-node-1`);

    });

*/

}