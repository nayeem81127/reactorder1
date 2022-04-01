const express = require('express');
const { Shopify } = require('@shopify/shopify-api');

const host = '127.0.0.1';

const port = 3000;

const app = express();

const shops = {};

const { HOST, SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_API_SCOPES } = process.env;

Shopify.Context.initialize({
    API_KEY: SHOPIFY_API_KEY,
    API_SECRET: SHOPIFY_API_SECRET,
    SCOPES: SHOPIFY_API_SCOPES,
    HOST: HOST,
    IS_EMBEDDED_APP: true,
});

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

app.listen(port, () => {
    console.log(`server is listening on at https://${host}:${port}/`)
})