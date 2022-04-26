var id = [
    '0012w00000xuKLGAA2',
'0012w00000xuKLHAA2',
'0012w00000xuKLIAA2',
'0012w00000xuKLJAA2',
'0012w00000xuKLKAA2',
'0012w00000xuKLLAA2',
'0012w00000xuKLMAA2',
'0012w00000xuKLNAA2',
'0012w00000xuKLOAA2',
'0012w00000xuKLPAA2',
'0012w00000xuKLQAA2',
'0012w00000xuKLRAA2',
'0012w00000xuKLSAA2',
'0012w00000xuKLTAA2',
'0012w00000xuKLUAA2',
'0012w00000xuKLVAA2',
'0012w00000xuKLWAA2',
'0012w00000xuKLXAA2',
'0012w00000xuKLYAA2',
'0012w00000xuKLZAA2',
'0012w00000xuKLaAAM',
'0012w00000xuKLbAAM',
'0012w00000xuKLcAAM',
'0012w00000xuKLdAAM',
'0012w00000xuKLeAAM',
'0012w00000xuKLfAAM',
'0012w00000xuKLgAAM',
'0012w00000xuKLhAAM',
'0012w00000xuKLiAAM',
'0012w00000xuKLjAAM',
'0012w00000xuKLkAAM',
'0012w00000xuKLlAAM',
'0012w00000xuKLmAAM',
'0012w00000xuKLnAAM',
'0012w00000xuKLoAAM',
'0012w00000xuKLpAAM',
'0012w00000xuKLqAAM',
'0012w00000xuKLrAAM',
'0012w00000xuKLsAAM',
'0012w00000xuKLtAAM',
'0012w00000xuKLuAAM',
'0012w00000xuKLvAAM',
'0012w00000xuKLwAAM',
'0012w00000xuKLxAAM',
'0012w00000xuKLyAAM',
'0012w00000xuKLzAAM',
'0012w00000xuKM0AAM',
'0012w00000xuKM1AAM',
'0012w00000xuKM2AAM',
'0012w00000xuKM3AAM',
'0012w00000xuKM4AAM',
'0012w00000xuKM5AAM',
'0012w00000xuKM6AAM',
'0012w00000xuKM7AAM',
'0012w00000xuKM8AAM',
'0012w00000xuKM9AAM',
'0012w00000xuKMAAA2',
'0012w00000xuKMBAA2',
'0012w00000xuKMCAA2',
'0012w00000xuKMDAA2',
'0012w00000xuKMEAA2',
'0012w00000xuKMFAA2',
'0012w00000xuKMGAA2',
'0012w00000xuKMHAA2',
'0012w00000xuKMIAA2',
'0012w00000xuKMKAA2'
]



const jsforce = require('jsforce')

var conn = new jsforce.Connection({
    accessToken: '00D2w000006Xcud!ASAAQJT0hifAnr.rDyEU7eglQOm3gZMGGgGBhbdfI76VBI5y5c8L0OL7pF6_kCPd9K_Uq3YRJBjHOQq7vo0wWZVwGM.51rNu',
    instanceUrl: 'https://hightestorg-dev-ed.my.salesforce.com/'
});

conn.sobject("Account").del(id,
    function (err, rets) {
        if (err) { return console.error(err); }
        for (var i = 0; i < rets.length; i++) {
            if (rets[i].success) {
                console.log("deleted successfully " + rets[i].id);
            }
        }
    });

// // conn.bulk.load("Account", "delete", id, function (err, rets) {
// //                                     if (err) { return console.error('err 1' + err); }
// //                                     for (var i = 0; i < rets.length; i++) {
// //                                         if (rets[i].success) {
// //                                             console.log("#" + (i + 1) + " deleted successfully" + rets[i].id);
// //                                         } else {
// //                                             console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
// //                                         }
// //                                     }
// //                                 });

// // const jsforce = require("jsforce");
// // const csv = require("csvtojson");

// // const Shopify = require('shopify-api-node');
// // const shopify = new Shopify({
// //     shopName: 'northern-wide-plank.myshopify.com',
// //     accessToken: 'f2bfa76d0986497d167289d3ab7c9e1b'
// // });

// // (async () => {
// // let params = { limit: 250 };
// // let CustomersArray = [];


// // do {
// //     const Customers = await shopify.customer.list(params)
// //     CustomersArray = CustomersArray.concat(Customers);
// //     params = Customers.nextPageParameters;
// // } while (params !== undefined);


// // console.log('first')

// // let buyerEmailInfo = []

// // for (let i in CustomersArray) {
// //     if (CustomersArray[i].email != "" && CustomersArray[i].email != null) {
// //         buyerEmailInfo.push(CustomersArray[i].email)
// //     }
// // }
// // console.log(buyerEmailInfo.length)

// // buyerEmailInfo= [
// //     'imran.khan@gmail.com',
// //     'bob.smith@test.com'
// //     ]

// // console.log('CustomersArray '+JSON.stringify(CustomersArray))
// // let CustomerDetails = []

// // for (let i in CustomersArray) {
// //     if (CustomersArray[i].id != "" && CustomersArray[i].id != null && CustomersArray[i].email != "" && CustomersArray[i].email != null) {
// //         if (CustomersArray[i].last_name != "" && CustomersArray[i].last_name != null || CustomersArray[i].first_name != "" && CustomersArray[i].first_name != null) {
// //             var list = {
// //                 ERP7__Customer_External_Id__c: CustomersArray[i].id,
// //                 Name: CustomersArray[i].first_name + " " + CustomersArray[i].last_name,
// //                 ERP7__Email__c: CustomersArray[i].email,
// //                 ERP7__Account_Type__c: "Customer",
// //                 ERP7__Account_Profile__c: 'Aqxolt_Customer',
// //                 ERP7__Order_Profile__c: 'Aqxolt_Order_Profile',
// //                 ERP7__Active__c: true
// //             }
// //             CustomerDetails.push(list)
// //         }
// //     }
// // }
// // console.log(JSON.stringify(CustomerDetails.length), buyerEmailInfo.length)



// // let conn = new jsforce.Connection({
// //     accessToken: '00D2w000006Xcud!ASAAQJT0hifAnr.rDyEU7eglQOm3gZMGGgGBhbdfI76VBI5y5c8L0OL7pF6_kCPd9K_Uq3YRJBjHOQq7vo0wWZVwGM.51rNu',
// //     instanceUrl: 'https://hightestorg-dev-ed.my.salesforce.com/'
// // });

// // conn.bulk.pollInterval = 1000;
// // conn.bulk.pollTimeout = Number.MAX_VALUE;
// // let records = [];


// //   // We still need recordStream to listen for errors. We'll access the stream
// //   // directly though, bypassing jsforce's RecordStream.Parsable
// //   const recordStream = conn.bulk.query(`SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c,ERP7__Account_Type__c, ERP7__Customer_External_Id__c FROM Account where ERP7__Email__c IN ('${buyerEmailInfo.join("','")}')`);
// //   const readStream = recordStream.stream();
// //   const csvToJsonParser = csv({flatKeys: false, checkType: true});
// //   readStream.pipe(csvToJsonParser);

// //   csvToJsonParser.on("data", (data) => {
// //     records.push(JSON.parse(data.toString('utf8')));
// //   }); 

// //   new Promise((resolve, reject) => {
// //     recordStream.on("error", (error) => {
// //       console.error(error);
// //       reject(new Error(`Couldn't download results from Salesforce Bulk API`));
// //     });

// //     csvToJsonParser.on("error", (error) => {
// //       console.error(error);
// //       reject(new Error(`Couldn't parse results from Salesforce Bulk API`));
// //     });

// //     csvToJsonParser.on("done", async () => {
// //       resolve(records);
// //     });
// //   }).then((records) => { 
// //     console.log(records);
// //   });
// // })();

conn.bulk.pollInterval = 1000;
conn.bulk.pollTimeout = Number.MAX_VALUE;
let records = [];


// We still need recordStream to listen for errors. We'll access the stream
// directly though, bypassing jsforce's RecordStream.Parsable
const recordStream = conn.bulk.query(`SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c,ERP7__Account_Type__c, ERP7__Customer_External_Id__c FROM Account where ERP7__Email__c IN ('${buyerEmailInfo.join("','")}')`);
const readStream = recordStream.stream();
const csvToJsonParser = csv({ flatKeys: false, checkType: true });
readStream.pipe(csvToJsonParser);

csvToJsonParser.on("data", (data) => {
    records.push(JSON.parse(data.toString('utf8')));
});

new Promise((resolve, reject) => {
    recordStream.on("error", (error) => {
        var err = JSON.stringify(error);
        console.log(err)
        var obj = JSON.parse(err);
        if (obj.name == 'InvalidSessionId') {
            req.flash('error_msg', '• Session has Expired Please try again');
            res.redirect('/shopify')
        } else {
            req.flash('error_msg', '• ' + obj.name);
            res.redirect('/shopify')
        }
    });

    csvToJsonParser.on("error", (error) => {
        console.error(error);
    });

    csvToJsonParser.on("done", async () => {
        resolve(records);
    });
}).then((records) => {
    console.log(records);
});





// console.log(users.length)

// const list = [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }, { x: 1, y: 2 }];

// const uniq = new Set(users.map(e => JSON.stringify(e)));

// users = Array.from(uniq).map(e => JSON.parse(e));

// console.log(JSON.stringify(users.length));
    