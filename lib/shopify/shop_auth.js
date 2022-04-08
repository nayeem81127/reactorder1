require('dotenv').config();
const express = require('express')
const app = express()
const getRawBody = require('raw-body')
const crypto = require('crypto')
app.use(express.static('public'));
var bodyParser = require('body-parser')



module.exports = function (app) {

    app.use(bodyParser.json({
        limit: '50mb',
        verify(req, res, buf) {
            req.textBody = buf.toString();
        }
    }));

    app.post('/webhooks', async (req, res) => {
        console.log('🎉 We got an order!')

        // We'll compare the hmac to our own hash
        const hmac = req.get('X-Shopify-Hmac-Sha256')

        // Use raw-body to get the body (buffer)
        const body = req.textBody  //await getRawBody(req);
        // body = JSON.parse(body.toString());

        // Create a hash using the body and our key
        const hash = crypto
            .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
            .update(body, 'utf8', 'hex')
            .digest('base64')

        if (hash === hmac) {
            console.log("Webhook source confirmed. Continue processing");
            res.sendStatus(200);
        } else {
            console.log("Unidentified webhook source. Do not process");
            res.sendStatus(403);
        }
    })
}