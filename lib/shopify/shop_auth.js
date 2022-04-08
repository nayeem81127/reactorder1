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
        req.body = '';
    
        res.on('data', function(chunk) {
            req.body += chunk.toString('utf8');
            console.log(req.body)
        });
        res.on('end', function() {
            handleRequest(req, res);
        });

        function verifyShopifyHook(req) {
            console.log(req.body)
            var digest = crypto.createHmac('sha256', secret)
                    .update(new Buffer(req.body, 'utf8'))
                    .digest('base64');
            
            return digest === req.headers['X-Shopify-Hmac-Sha256'];
        }

        function handleRequest(req, res) {
            if (verifyShopifyHook(req)) {
                res.writeHead(200);
                res.end('Verified webhook');
            } else {
                res.writeHead(401);
                res.end('Unverified webhook');
            }
        }
    })
    
    
    
/*
    app.post("/webhooks", async (req, res) => {
        //Extract X-Shopify-Hmac-Sha256 Header from the request
        const hmacHeader = req.get("X-Shopify-Hmac-Sha256");

        //Parse the request Body
       // const body = await getRawBody(req);
        //Create a hash based on the parsed body
        const hash = crypto
            .createHmac("sha256", secret)
            .update(, "utf8"))
            .digest("base64");

        // Compare the created hash with the value of the X-Shopify-Hmac-Sha256 Header
        if (hash === hmacHeader) {
            console.log("Webhook source confirmed. Continue processing");
            res.sendStatus(200);
        } else {
            console.log("Unidentified webhook source. Do not process");
            res.sendStatus(403);
        }
    });
    */
}