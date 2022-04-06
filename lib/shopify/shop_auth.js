require('dotenv').config();
const express = require('express')
const app = express()
const getRawBody = require('raw-body')
const crypto = require('crypto')
app.use(express.static('public'));

app.use(express.json({ limit: '50mb' }))

module.exports = function (app) {

    app.use(bodyparser.raw({ type: "application/json" }));

    // Webhooks
    app.post("/webhooks/shopify/product-creation", async (req, res) => {
      console.log("Webhook heard!");
      // Verify
      const hmac = req.header("X-Shopify-Hmac-Sha256");
      const topic = req.header("X-Shopify-Topic");
      const shop = req.header("X-Shopify-Shop-Domain");
    
      const verified = verifyWebhook(req.body, hmac);
    
      if (!verified) {
        console.log("Failed to verify the incoming request.");
        res.status(401).send("Could not verify request.");
        return;
      }
    
      const data = req.body.toString();
      const payload = JSON.parse(data);
      console.log(
        `Verified webhook request. Shop: ${shop} Topic: ${topic} \n Payload: ${payload} \n data: ${data}`
      );
    
      res.status(200).send("OK");
    });
    
    // Verify incoming webhook.
    function verifyWebhook(payload, hmac) {
      const message = payload.toString();
      const genHash = crypto
        .createHmac("sha256", process.env.API_SECRET)
        .update(message)
        .digest("base64");
      console.log(genHash);
      return genHash === hmac;
    }

    /*
    app.post('/webhooks/orders/create', async (req, res) => {
        console.log('🎉 We got an order!')
      
        // We'll compare the hmac to our own hash
        const hmac = req.get('X-Shopify-Hmac-Sha256')
      
        // Use raw-body to get the body (buffer)
        const body = await getRawBody(req);
        body = JSON.parse(body.toString());
      
        // Create a hash using the body and our key
        const hash = crypto
          .createHmac('sha256', secretKey)
          .update(body, 'utf8', 'hex')
          .digest('base64')
      
        // Compare our hash to Shopify's hash
        if (hash === hmac) {
          // It's a match! All good
          console.log('Phew, it came from Shopify!')
          res.sendStatus(200)
        } else {
          // No match! This request didn't originate from Shopify
          console.log('Danger! Not from Shopify!')
          res.sendStatus(403)
        }
      })
    
      app.post('/webhooks/product/create', async (req, res) => {
        console.log('🎉 We got an product!')
      
        // We'll compare the hmac to our own hash
        const hmac = req.get('X-Shopify-Hmac-Sha256')
      
        // Use raw-body to get the body (buffer)
        const body = await getRawBody(req)
      
        // Create a hash using the body and our key
        const hash = crypto
          .createHmac('sha256', secretKey)
          .update(body, 'utf8', 'hex')
          .digest('base64')
      
        // Compare our hash to Shopify's hash
        if (hash === hmac) {
          // It's a match! All good
          console.log('Phew, it came from Shopify!')
          res.sendStatus(200)
        } else {
          // No match! This request didn't originate from Shopify
          console.log('Danger! Not from Shopify!')
          res.sendStatus(403)
        }
      })
    
      app.post('/webhooks/customer/create', async (req, res) => {
        console.log('🎉 We got an customer!')
      
        // We'll compare the hmac to our own hash
        const hmac = req.get('X-Shopify-Hmac-Sha256')
      
        // Use raw-body to get the body (buffer)
        const body = await getRawBody(req)
      
        // Create a hash using the body and our key
        const hash = crypto
          .createHmac('sha256', secretKey)
          .update(body, 'utf8', 'hex')
          .digest('base64')
      
        // Compare our hash to Shopify's hash
        if (hash === hmac) {
          // It's a match! All good
          console.log('Phew, it came from Shopify!')
          res.sendStatus(200)
        } else {
          // No match! This request didn't originate from Shopify
          console.log('Danger! Not from Shopify!')
          res.sendStatus(403)
        }
      })
      */
}