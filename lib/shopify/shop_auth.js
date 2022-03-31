require('dotenv').config();
const express = require("express")
const app = express();
const crypto = require('crypto');
const nonce = require('nonce')();
const request = require('request-promise');
const querystring = require('querystring');
const cookie = require('cookie');
app.use(express.static('public'));

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

}