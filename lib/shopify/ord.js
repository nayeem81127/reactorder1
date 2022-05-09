

// var series = [];

// var dataVal = [{"id":1,"seller_id":"northern-wide-plank.myshopify.com","category":"shopify","updated_at":"Fri Apr 29 2022","email":"admin@gmail.com","sync_count":"67"},{"id":2,"seller_id":"northern-wide-plank.myshopify.com","category":"shopify","updated_at":"Sat Apr 30 2022","email":"admin@gmail.com","sync_count":"68"},{"id":3,"seller_id":"northern-wide-plank.myshopify.com","category":"shopify","updated_at":"Sun May 1 2022","email":"admin@gmail.com","sync_count":"20"},{"id":5,"seller_id":"nwp.myshopify.com","category":"shopify","updated_at":"Sun May 1 2022","email":"admin@gmail.com","sync_count":"20"},{"id":4,"seller_id":"northern-wide-plank.myshopify.com","category":"shopify","updated_at":"Mon May 2 2022","email":"admin@gmail.com","sync_count":"1000"}]

// var data1 = [];
// for (let j in dataVal) {
//   data1.push(dataVal[j].seller_id)
// }

// var series = []
// for (let j in dataVal) {
//     data1.forEach((value) => {         
//       if (value == dataVal[j].seller_id) {  
//         var data = [];     
//         for(let i in dataVal){
//             if(value == dataVal[i].seller_id){
//                 data.push(dataVal[i].sync_count)
//             }
//         }
//         var list = {
//             name: value,
//             data: data
//         }
//         series.push(list)
//       }      
//     })   
//   }

//   var uniq1 = new Set(series.map(e => JSON.stringify(e)));
//   series = Array.from(uniq1).map(e => JSON.parse(e));
//   console.log(series)

// var dateString = []
// const timeStamp = new Date().getTime();
// for (let i=9; i >= 0; --i) {
//     const yesterdayTimeStamp = timeStamp - (24 * 60 * 60 * 1000) * i;
//     var data = new Date(yesterdayTimeStamp).toLocaleString('en-US', { weekday: 'short', day: 'numeric', year: 'numeric', month: 'long' })
//     dateString.push(data)
// }

// console.log(dateString)
// const Shopify = require('shopify-api-node');
// (async () => {
//     const shopify = new Shopify({
//         shopName: 'test-store-nicks-1.myshopify.com',
//         accessToken: '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'
//     });

//     let params = { limit: 50 };
//     let ProductArray = [];

//     do {
//         const Products = await shopify.order.list(params)
//         ProductArray = ProductArray.concat(Products);
//         params = Products.nextPageParameters;
//     } while (params !== undefined);

//     console.log(ProductArray)
// })();

// const Shopify = require('shopify-api-node');

// const shopify = new Shopify({
//     shopName: 'test-store-nicks-1.myshopify.com',
//         accessToken: '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'
// });


// shopify.customer
//   .list({ limit: 250 })
//   .then((customer) => console.log(JSON.stringify(customer)))
//   .catch((err) => console.error(err));