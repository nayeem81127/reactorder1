require('dotenv').config();
const express = require('express')
const app = express()
const getRawBody = require('raw-body')
const crypto = require('crypto')
const secretKey = process.env.SHOPIFY_API_SECRET;
app.use(express.static('public'));

app.use(express.json({ limit: '50mb' }))

module.exports = function (app) {

    const SHOPIFY_SIGNATURE_SECRET = 'a844070545f5802b5ad422d04c653b52'
    if (!SHOPIFY_SIGNATURE_SECRET) {
        throw new Error('Please provide process.env.SHOPIFY_API_SECRET')
    }
    function validateShopifySignature() {
        return async (req, res, next) => {
            try {
                const rawBody = req.rawBody
                if (typeof rawBody == 'undefined') {
                    throw new Error(
                        'validateShopifySignature: req.rawBody is undefined. Please make sure the raw request body is available as req.rawBody.'
                    )
                }
                const hmac = req.headers['x-shopify-hmac-sha256']
                const hash = crypto
                    .createHmac('sha256', SHOPIFY_SIGNATURE_SECRET)
                    .update(rawBody)
                    .digest('base64')
                const signatureOk = crypto.timingSafeEqual(
                    Buffer.from(hash),
                    Buffer.from(hmac)
                )
                if (!signatureOk) {
                    res.status(403)
                    res.send('Unauthorized')
                    return
                }
                next()
            } catch (err) {
                next(err)
            }
        }
    }

    app.use(
        express.json({
            limit: '50mb',
            verify: (req, res, buf) => {
                req.rawBody = buf
            }
        })
    )

    app.post(
        '/webhooks/shopify/product-creation',
        validateShopifySignature(),
        (req, res, next) => {
            // ...
        }
    )

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