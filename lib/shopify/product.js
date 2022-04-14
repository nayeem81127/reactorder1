const Shopify = require('shopify-api-node');

const shopify = new Shopify({
    shopName: 'aqxolt.myshopify.com',
    accessToken: 'c32e38fc1ce3f144af73b39e4f3566cd'
});


shopify.customer
  .list({ limit: 250 })
  .then((customer) => console.log(JSON.stringify(customer)))
  .catch((err) => console.error(err));