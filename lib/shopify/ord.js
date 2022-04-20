
// const request = require('request-promise')

// let url = `https://northern-wide-plank.myshopify.com/admin/orders.json`;

//             let options = {
//                 method: 'GET',
//                 uri: url,
//                 json: true,
//                 headers: {
//                     'X-Shopify-Access-Token': 'f2bfa76d0986497d167289d3ab7c9e1b',
//                     'content-type': 'application/json'
//                 },
//             }

//             request(options)
//                 .then(prod => {                   
//                    console.log(JSON.stringify(prod))
//                 })
//                 .catch(err => {
//                     console.log(err)
//                 })


const Shopify = require('shopify-api-node');

const shopify = new Shopify({
    shopName: 'northern-wide-plank.myshopify.com',
    accessToken: 'f2bfa76d0986497d167289d3ab7c9e1b'
});

let params = { limit: 50 };

let OrdersArray = [];

(async () => {

    try {
        do {
            const Orders = await shopify.order.list(params)
            OrdersArray = OrdersArray.concat(Orders);
            params = Orders.nextPageParameters;
        } while (params !== undefined);

        console.log('OrdersArray ' + JSON.stringify(OrdersArray))
    } catch (e) {
        console.log('Error-> ', e);
    }
})();