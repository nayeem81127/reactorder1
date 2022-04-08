require('dotenv').config();
const express = require('express')
const app = express()
const getRawBody = require("raw-body"); //install raw-body from npm
const crypto = require("crypto");
const secret = process.env.SHOPIFY_API_SECRET;
app.use(express.static('public'));
var bodyParser = require('body-parser')

module.exports = function (app) {

    
    app.post("/webhooks", async (req, res) => {
        //Extract X-Shopify-Hmac-Sha256 Header from the request
        const hmacHeader = req.get("X-Shopify-Hmac-Sha256");

        //Parse the request Body
       //const body = await getRawBody(req);
        //Create a hash based on the parsed body
        const hash = crypto
            .createHmac("sha256", secret)
            .update(JSON.stringify(req.body))
            .digest("hex");

            console.log('hash '+hash +' hmacheader '+hmacHeader)
            console.log('body '+ JSON.stringify(req.body))

        // Compare the created hash with the value of the X-Shopify-Hmac-Sha256 Header
        if (hash === hmacHeader) {
            console.log("Webhook source confirmed. Continue processing");
            res.sendStatus(200);
        } else {
            console.log("Unidentified webhook source. Do not process");
            res.sendStatus(403);
        }
    });    
}