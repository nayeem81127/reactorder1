require('dotenv').config();
const express = require('express')
const app = express()
const getRawBody = require('raw-body')
const crypto = require('crypto')
app.use(express.static('public'));
var bodyParser = require('body-parser')

module.exports = function (app) { 
    
    app.post('/webhooks', async (req, res) => {
        console.log('🎉 We got an order!')
      
        // We'll compare the hmac to our own hash
        const hmac = req.get('X-Shopify-Hmac-Sha256')
      
        // Use raw-body to get the body (buffer)
        const body = await getRawBody(req);
        body = JSON.parse(body.toString());
      
        // Create a hash using the body and our key
        const hash = crypto
          .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
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
}