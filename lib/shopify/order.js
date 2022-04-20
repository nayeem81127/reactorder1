const express = require("express")
const app = express()
const { pool } = require("../../dbConfig");
const jsforce = require('jsforce')
const salesLogin = require('../routes');
app.use(express.static('public'));
const Shopify = require('shopify-api-node');
const { format } = require("util");

module.exports = function (app) {

    (async () => {

        try {

            app.post('/shopifyOrderSync', salesLogin, async function (req, res, next) {
                var Email = req.user.email;
                const client = await pool.connect();
                await client.query('BEGIN');
                await JSON.stringify(client.query("SELECT * FROM shops WHERE email=$1", [Email], async function (err, result) {
                    if (err) { console.log(err); }

                    if (result.rows.length === 0) {
                        req.flash('error_msg', '• No Shops Found');
                        return res.redirect('/shopify')
                    }
                    else if (result.rows.length > 0) {
                        var oauth_token = req.user.oauth_token;
                        var instance_url = req.user.instance_url;
                        for (let z in result.rows) {
                            setTimeout(async function () {
                                if (Email === result.rows[z].email) {
                                    var Aqxolt_Customer;
                                    var Aqxolt_Order_Profile;
                                    var Aqxolt_Channel;
                                    var shopName = result.rows[z].shopify_domain;
                                    var accessToken = result.rows[z].shopify_token;

                                    if (result.rows[z].aqxolt_customer && result.rows[z].aqxolt_order_profile) {
                                        Aqxolt_Customer = result.rows[z].aqxolt_customer;
                                        Aqxolt_Order_Profile = result.rows[z].aqxolt_order_profile;
                                        Aqxolt_Channel = result.rows[z].aqxolt_channel;
                                    } else {
                                        Aqxolt_Customer = req.user.aqxolt_customer;
                                        Aqxolt_Order_Profile = req.user.aqxolt_order_profile;
                                        Aqxolt_Channel = req.user.aqxolt_channel;
                                    }

                                    if (!Aqxolt_Order_Profile && !Aqxolt_Customer && !Aqxolt_Channel && !accessToken || !shopName) {
                                        req.flash('error_msg', '• Order Profile, Customer, Channel And Shops Credentials are Missing');
                                        res.redirect('/shopify')
                                    }
                                    else if (!accessToken || !shopName) {
                                        req.flash('error_msg', '• Shops Credentials are Missing');
                                        res.redirect('/shopify')
                                    }
                                    else if (!Aqxolt_Order_Profile) {
                                        req.flash('error_msg', '• Order Profile is Empty in Aqxolt Info');
                                        res.redirect('/shopify')
                                    }
                                    else if (!Aqxolt_Customer) {
                                        req.flash('error_msg', '• Aqxolt Customer is Empty in Aqxolt Info');
                                        res.redirect('/shopify')
                                    }
                                    else if (!Aqxolt_Channel) {
                                        req.flash('error_msg', '• Aqxolt Channel is Empty in Aqxolt Info');
                                        res.redirect('/shopify')
                                    }
                                    else if (!Aqxolt_Customer && !Aqxolt_Order_Profile && !Aqxolt_Channel) {
                                        req.flash('error_msg', '• Aqxolt Customer, Channel And Order Profile is Empty');
                                        res.redirect('/shopify')
                                    }
                                    else if (Aqxolt_Customer && Aqxolt_Order_Profile && Aqxolt_Channel && accessToken && shopName) {

                                        const shopify = new Shopify({
                                            shopName: 'northern-wide-plank.myshopify.com',
                                            accessToken: 'f2bfa76d0986497d167289d3ab7c9e1b'
                                            //shopName: shopName,
                                            //accessToken: accessToken
                                        });

                                        let params = { limit: 50 };
                                        let ProductArray = [];
                                        let CustomersArray = [];
                                        let OrdersArray = [];

                                        do {
                                            const Orders = await shopify.order.list(params)
                                            OrdersArray = OrdersArray.concat(Orders);
                                            params = Orders.nextPageParameters;
                                        } while (params !== undefined);

                                        // console.log('OrdersArray ' + JSON.stringify(OrdersArray))

                                        let buyerEmailInfo = []
                                        let CustomerDetails = []
                                        let productCode = [];
                                        let ProductDetails = [];
                                        let OrderDetails = [];

                                        for (let i in OrdersArray) {
                                            if (OrdersArray[i].customer.email != "" && OrdersArray[i].customer.email != null) {
                                                buyerEmailInfo.push(OrdersArray[i].customer.email)
                                            }
                                        }
                                        // console.log('buyerEmailInfo ' + JSON.stringify(buyerEmailInfo))

                                        for (let i in OrdersArray) {
                                            if (OrdersArray[i].customer.id != "" && OrdersArray[i].customer.id != null && OrdersArray[i].customer.email != "" && OrdersArray[i].customer.email != null && OrdersArray[i].customer.last_name != "" && OrdersArray[i].customer.last_name != null) {
                                                var list = {
                                                    ERP7__Customer_External_Id__c: OrdersArray[i].customer.id,
                                                    Name: OrdersArray[i].customer.first_name.concat(" ", OrdersArray[i].customer.last_name),
                                                    ERP7__Email__c: OrdersArray[i].customer.email,
                                                    ERP7__Account_Type__c: "Customer",
                                                    ERP7__Account_Profile__c: Aqxolt_Customer,
                                                    ERP7__Order_Profile__c: Aqxolt_Order_Profile,
                                                    ERP7__Active__c: true
                                                }
                                                CustomerDetails.push(list)
                                            }
                                        }
                                        // console.log('CustomerDetails ' + JSON.stringify(CustomerDetails))
var text = []
                                        for(let i in OrdersArray){
                                            // for(let j in OrdersArray[i].line_items){
                                                
                                            // }
                                            if(OrdersArray[i].id == '4707531555028') text.push(OrdersArray[i])
                                        }
                                        console.log(text.length)
res.send(text)
                                        for (let i in ProductArray) {
                                            if (ProductArray[i].id != '' && ProductArray[i].id != undefined && ProductArray[i].variants[0].sku != '' && ProductArray[i].variants[0].sku != undefined) {
                                                productCode.push(ProductArray[i].id)
                                                var img;
                                                for (let j in ProductArray[i].images) {
                                                    img = ProductArray[i].images[j].src
                                                }
                                                var list = {
                                                    Name: ProductArray[i].title,
                                                    ERP7__Manufacturer__c: ProductArray[i].vendor,
                                                    Description: ProductArray[i].body_html,
                                                    ProductCode: ProductArray[i].id,
                                                    ERP7__Picture__c: img,
                                                    StockKeepingUnit: ProductArray[i].variants[0].sku,
                                                    ERP7__SKU__c: ProductArray[i].variants[0].sku,
                                                    ERP7__Price_Entry_Amount__c: ProductArray[i].variants[0].price,
                                                    IsActive: true
                                                }
                                                ProductDetails.push(list)
                                            }
                                        }

                                        // console.log('ProductDetails '+JSON.stringify(ProductDetails))
                                        var conn = new jsforce.Connection({
                                            accessToken: oauth_token,
                                            instanceUrl: instance_url
                                        });
                                        /*
                                                                                var pricebook_id;
                                                                                if (Aqxolt_Order_Profile != null) {
                                                                                    setTimeout(async function () {
                                                                                        conn.query(`SELECT Id, ERP7__Price_Book__c FROM ERP7__Profiling__c where Id='${Aqxolt_Order_Profile}'`, function (err, result) {
                                                                                            if (err) {
                                                                                                var error = JSON.stringify(err);
                                                                                                var obj = JSON.parse(error);
                                                                                                if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                    req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                    res.redirect('/shopify')
                                                                                                } else if (obj.name == 'INVALID_FIELD') {
                                                                                                    req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                    res.redirect('/shopify')
                                                                                                } else if (obj.name == 'INVALID_QUERY_FILTER_OPERATOR') {
                                                                                                    req.flash('error_msg', '• Invalid Aqxolt Order Profile Id');
                                                                                                    res.redirect('/shopify')
                                                                                                } else {
                                                                                                    req.flash('error_msg', '• ' + obj.name);
                                                                                                    res.redirect('/shopify')
                                                                                                }
                                                                                            }
                                        
                                                                                            if (result.records.length == 0) {
                                                                                                req.flash('error_msg', '• Invalid Order Profile Id');
                                                                                                res.redirect('/shopify')
                                                                                            }
                                                                                            else if (result.records.length > 0) {
                                                                                                pricebook_id = result.records[0].ERP7__Price_Book__c;
                                                                                                if (Aqxolt_Customer != null) {
                                                                                                    setTimeout(async function () {
                                                                                                        conn.query(`SELECT Id FROM ERP7__Profiling__c where Id='${Aqxolt_Customer}'`, function (err, result) {
                                                                                                            if (err) {
                                                                                                                var error = JSON.stringify(err);
                                                                                                                var obj = JSON.parse(error);
                                                                                                                if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                                    req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                                    res.redirect('/shopify')
                                                                                                                } else if (obj.name == 'INVALID_FIELD') {
                                                                                                                    req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                                    res.redirect('/shopify')
                                                                                                                } else if (obj.name == 'INVALID_QUERY_FILTER_OPERATOR') {
                                                                                                                    req.flash('error_msg', '• Invalid Aqxolt Customer Id');
                                                                                                                    res.redirect('/shopify')
                                                                                                                } else {
                                                                                                                    req.flash('error_msg', '• ' + obj.name);
                                                                                                                    res.redirect('/shopify')
                                                                                                                }
                                                                                                            }
                                        
                                                                                                            if (result.records.length == 0) {
                                                                                                                req.flash('error_msg', '• Invalid Customer Profile Id');
                                                                                                                res.redirect('/shopify')
                                                                                                            }
                                                                                                            else if (result.records.length > 0) {
                                                                                                                if (Aqxolt_Channel != null) {
                                                                                                                    setTimeout(async function () {
                                                                                                                        conn.query(`SELECT Id FROM ERP7__Channel__c where Id='${Aqxolt_Channel}'`, function (err, result) {
                                                                                                                            if (err) {
                                                                                                                                var error = JSON.stringify(err);
                                                                                                                                var obj = JSON.parse(error);
                                                                                                                                if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                                                    req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                                                    res.redirect('/shopify')
                                                                                                                                } else if (obj.name == 'INVALID_FIELD') {
                                                                                                                                    req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                                                    res.redirect('/shopify')
                                                                                                                                } else if (obj.name == 'INVALID_QUERY_FILTER_OPERATOR') {
                                                                                                                                    req.flash('error_msg', '• Invalid Aqxolt Channel Id');
                                                                                                                                    res.redirect('/shopify')
                                                                                                                                }
                                                                                                                                else {
                                                                                                                                    req.flash('error_msg', '• ' + obj.name);
                                                                                                                                    res.redirect('/shopify')
                                                                                                                                }
                                                                                                                            }
                                        
                                                                                                                            if (result.records.length == 0) {
                                                                                                                                req.flash('error_msg', '• Invalid Aqxolt Channel Id');
                                                                                                                                res.redirect('/shopify')
                                                                                                                            }
                                                                                                                            else if (result.records.length > 0) {
                                                                                                                                if (buyerEmailInfo.length > 0) {
                                                                                                                                    setTimeout(async function () {
                                                                                                                                        conn.query("SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c,ERP7__Account_Type__c, ERP7__Customer_External_Id__c FROM Account WHERE ERP7__Email__c IN ('" + buyerEmailInfo.join("','") + "')", function (err, result) {
                                                                                                                                            if (err) {
                                                                                                                                                var error = JSON.stringify(err);
                                                                                                                                                var obj = JSON.parse(error);
                                                                                                                                                if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                                                                    req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                                                                    res.redirect('/shopify')
                                                                                                                                                } else if (obj.name == 'INVALID_FIELD') {
                                                                                                                                                    req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                                                                    res.redirect('/shopify')
                                                                                                                                                } else {
                                                                                                                                                    req.flash('error_msg', '• ' + obj.name);
                                                                                                                                                    res.redirect('/shopify')
                                                                                                                                                }
                                                                                                                                            }
                                        
                                                                                                                                            if (result.records.length == 0) {
                                                                                                                                                res.redirect('/index');
                                                                                                                                                if (CustomerDetails != []) {
                                                                                                                                                    conn.bulk.pollTimeout = 25000;
                                                                                                                                                    conn.bulk.load("Account", "insert", CustomerDetails, function (err, rets) {
                                                                                                                                                        if (err) { return console.error('err 1' + err); }
                                                                                                                                                        for (var i = 0; i < rets.length; i++) {
                                                                                                                                                            if (rets[i].success) {
                                                                                                                                                                console.log("#" + (i + 1) + " insert account successfully, id = " + rets[i].id);
                                                                                                                                                            } else {
                                                                                                                                                                console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                                                                                                                                            }
                                                                                                                                                        }
                                                                                                                                                        conInsertion();
                                                                                                                                                    });
                                                                                                                                                }
                                                                                                                                            }
                                                                                                                                            else if (result.records.length > 0) {
                                                                                                                                                res.redirect('/index');
                                                                                                                                                var accExist = [];
                                                                                                                                                var accExternalId = [];
                                                                                                                                                var accNotExist = [];
                                                                                                                                                // var idval = []
                                                                                                                                                for (let i in result.records) {
                                                                                                                                                    // idval.push(result.records[i].Id)
                                                                                                                                                    for (let j in CustomerDetails) {
                                                                                                                                                        if (result.records[i].ERP7__Customer_External_Id__c == CustomerDetails[j].ERP7__Customer_External_Id__c) {
                                                                                                                                                            let list = {
                                                                                                                                                                Id: result.records[i].Id,
                                                                                                                                                                ERP7__Email__c: CustomerDetails[j].ERP7__Email__c,
                                                                                                                                                                Name: CustomerDetails[j].Name,
                                                                                                                                                                ERP7__Order_Profile__c: CustomerDetails[j].ERP7__Order_Profile__c,
                                                                                                                                                                ERP7__Account_Profile__c: CustomerDetails[j].ERP7__Account_Profile__c,
                                                                                                                                                                ERP7__Account_Type__c: CustomerDetails[j].ERP7__Account_Type__c,
                                                                                                                                                                ERP7__Active__c: CustomerDetails[j].ERP7__Active__c,
                                                                                                                                                                ERP7__Customer_External_Id__c: CustomerDetails[j].ERP7__Customer_External_Id__c
                                                                                                                                                            }
                                                                                                                                                            accExist.push(list);
                                                                                                                                                            accExternalId.push(CustomerDetails[j].ERP7__Customer_External_Id__c)
                                                                                                                                                        }
                                                                                                                                                    }
                                                                                                                                                }
                                        
                                                                                                                                                // conn.sobject("Account").del(idval
                                                                                                                                                //     ,
                                                                                                                                                //     function (err, rets) {
                                                                                                                                                //         if (err) { return console.error(err); }
                                                                                                                                                //         for (var i = 0; i < rets.length; i++) {
                                                                                                                                                //             if (rets[i].success) {
                                                                                                                                                //                 console.log("deleted successfully " + rets[i].id);
                                                                                                                                                //             }
                                                                                                                                                //         }
                                                                                                                                                //     });
                                        
                                                                                                                                                // console.log('Exist ' + accExternalId)
                                                                                                                                                for (let i in CustomerDetails) {
                                                                                                                                                    if (!accExternalId.includes(CustomerDetails[i].ERP7__Customer_External_Id__c)) accNotExist.push(CustomerDetails[i])
                                                                                                                                                }
                                                                                                                                                // console.log('accExist' + JSON.stringify(accExist))
                                                                                                                                                // console.log('accNotExist' + JSON.stringify(accNotExist))
                                        
                                                                                                                                                if (accNotExist != []) {
                                                                                                                                                    conn.bulk.pollTimeout = 25000;
                                                                                                                                                    conn.bulk.load("Account", "insert", accNotExist, function (err, rets) {
                                                                                                                                                        if (err) { return console.error('err 1' + err); }
                                                                                                                                                        for (var i = 0; i < rets.length; i++) {
                                                                                                                                                            if (rets[i].success) {
                                                                                                                                                                console.log("#" + (i + 1) + " insert account successfully, id = " + rets[i].id);
                                                                                                                                                            } else {
                                                                                                                                                                console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                                                                                                                                            }
                                                                                                                                                        }
                                                                                                                                                    });
                                                                                                                                                }
                                        
                                                                                                                                                if (accExist != []) {
                                                                                                                                                    conn.bulk.pollTimeout = 25000;
                                                                                                                                                    conn.bulk.load("Account", "update", accExist, function (err, rets) {
                                                                                                                                                        if (err) { return console.error('err 2' + err); }
                                                                                                                                                        for (var i = 0; i < rets.length; i++) {
                                                                                                                                                            if (rets[i].success) {
                                                                                                                                                                console.log("#" + (i + 1) + " update account successfully, id = " + rets[i].id);
                                                                                                                                                            } else {
                                                                                                                                                                console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                                                                                                                                            }
                                                                                                                                                        }
                                                                                                                                                        conInsertion();
                                                                                                                                                    });
                                                                                                                                                }
                                        
                                                                                                                                            }
                                                                                                                                        });
                                                                                                                                    }, 3000 * z);
                                                                                                                                }
                                                                                                                                else {
                                                                                                                                    req.flash('error_msg', `• Order's Not Found`);
                                                                                                                                    return res.redirect('/shopify');
                                                                                                                                }
                                                                                                                            }
                                                                                                                        })
                                                                                                                    }, 1000 * z);
                                                                                                                }
                                                                                                            }
                                                                                                        })
                                                                                                    }, 1000 * z);
                                                                                                }                                                        
                                                                                            }
                                                                                        })
                                                                                    }, 1000 * z);
                                                                                }
                                        
                                                                                var accIdExist = [];
                                                                                var contactDetails = [];
                                                                                function conInsertion() {
                                        
                                                                                    var conExist = [];
                                                                                    var conEmailExist = [];
                                                                                    var conNotExist = [];
                                                                                    setTimeout(async function () {
                                                                                        conn.query("SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c, ERP7__Account_Type__c, ERP7__Customer_External_Id__c FROM Account WHERE ERP7__Email__c IN ('" + buyerEmailInfo.join("','") + "')", function (err, result) {
                                                                                            if (err) {
                                                                                                var error = JSON.stringify(err);
                                                                                                var obj = JSON.parse(error);
                                                                                                if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                    req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                    res.redirect('/amazon')
                                                                                                } else if (obj.name == 'INVALID_FIELD') {
                                                                                                    req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                    res.redirect('/amazon')
                                                                                                } else {
                                                                                                    req.flash('error_msg', '• ' + obj.name);
                                                                                                    res.redirect('/amazon')
                                                                                                }
                                                                                            }
                                        
                                                                                            if (result.records.length > 0) {
                                                                                                for (let i in result.records) {
                                                                                                    for (let j in CustomersArray) {
                                                                                                        if (CustomersArray[j].id == result.records[i].ERP7__Customer_External_Id__c && CustomersArray[j].last_name != '') {
                                                                                                            let acclist = {
                                                                                                                AccountId: result.records[i].Id,
                                                                                                                Email: result.records[i].ERP7__Email__c,
                                                                                                                FirstName: CustomersArray[j].first_name,
                                                                                                                LastName: CustomersArray[j].last_name,
                                                                                                                Phone: CustomersArray[j].phone,
                                                                                                                ERP7__Contact_External_Id__c: CustomersArray[j].id
                                                                                                            }
                                                                                                            contactDetails.push(acclist);
                                                                                                            accIdExist.push(result.records[i].Id)
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                                // console.log('contactDetails' + JSON.stringify(contactDetails))
                                                                                                // console.log(contactDetails.length)
                                        
                                                                                                conn.query("SELECT Id, AccountId, LastName, Email, ERP7__Contact_External_Id__c FROM Contact WHERE AccountId IN ('" + accIdExist.join("','") + "')", function (err, result) {
                                                                                                    if (err) {
                                                                                                        var error = JSON.stringify(err);
                                                                                                        var obj = JSON.parse(error);
                                                                                                        if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                            req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                            res.redirect('/amazon')
                                                                                                        } else if (obj.name == 'INVALID_FIELD') {
                                                                                                            req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                            res.redirect('/amazon')
                                                                                                        } else {
                                                                                                            req.flash('error_msg', '• ' + obj.name);
                                                                                                            res.redirect('/amazon')
                                                                                                        }
                                                                                                    }
                                        
                                                                                                    if (result.records.length == 0) {
                                                                                                        if (contactDetails != []) {
                                                                                                            conn.bulk.pollTimeout = 25000;
                                                                                                            conn.bulk.load("Contact", "insert", contactDetails, function (err, rets) {
                                                                                                                if (err) { return console.error('err 1' + err); }
                                                                                                                for (var i = 0; i < rets.length; i++) {
                                                                                                                    if (rets[i].success) {
                                                                                                                        console.log("#" + (i + 1) + " insert contact successfully, id = " + rets[i].id);
                                                                                                                    } else {
                                                                                                                        console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                                                                                                    }
                                                                                                                }
                                                                                                                addressInsertion()
                                                                                                            });
                                                                                                        }
                                                                                                    }
                                                                                                    else if (result.records.length > 0) {
                                                                                                        for (let i in result.records) {
                                                                                                            for (let j in contactDetails) {
                                                                                                                if (result.records[i].ERP7__Contact_External_Id__c == contactDetails[j].ERP7__Contact_External_Id__c) {
                                                                                                                    let list = {
                                                                                                                        Id: result.records[i].Id,
                                                                                                                        AccountId: result.records[i].AccountId,
                                                                                                                        Email: contactDetails[j].Email,
                                                                                                                        FirstName: contactDetails[j].FirstName,
                                                                                                                        LastName: contactDetails[j].LastName,
                                                                                                                        Phone: contactDetails[j].Phone,
                                                                                                                        ERP7__Contact_External_Id__c: contactDetails[j].ERP7__Contact_External_Id__c
                                                                                                                    }
                                                                                                                    conExist.push(list);
                                                                                                                    conEmailExist.push(contactDetails[j].ERP7__Contact_External_Id__c)
                                                                                                                }
                                                                                                            }
                                                                                                        }
                                        
                                                                                                        // console.log('conExist' + JSON.stringify(conExist))
                                        
                                                                                                        for (let i in contactDetails) {
                                                                                                            if (!conEmailExist.includes(contactDetails[i].ERP7__Contact_External_Id__c)) conNotExist.push(contactDetails[i])
                                                                                                        }
                                                                                                        // console.log('conNotExist' + JSON.stringify(conNotExist))
                                                                                                        // console.log(conNotExist.length)
                                        
                                                                                                        if (conNotExist != []) {
                                                                                                            conn.bulk.pollTimeout = 25000;
                                                                                                            conn.bulk.load("Contact", "insert", conNotExist, function (err, rets) {
                                                                                                                if (err) { return console.error('err 1' + err); }
                                                                                                                for (var i = 0; i < rets.length; i++) {
                                                                                                                    if (rets[i].success) {
                                                                                                                        console.log("#" + (i + 1) + " insert contact successfully, id = " + rets[i].id);
                                                                                                                    } else {
                                                                                                                        console.log("#" + (i + 1) + " error occurred, message = " + JSON.stringify(rets[i].errors));
                                                                                                                    }
                                                                                                                }
                                                                                                            });
                                                                                                        }
                                        
                                                                                                        if (conExist != []) {
                                                                                                            conn.bulk.pollTimeout = 25000;
                                                                                                            conn.bulk.load("Contact", "update", conExist, function (err, rets) {
                                                                                                                if (err) { return console.error('err 1' + err); }
                                                                                                                for (var i = 0; i < rets.length; i++) {
                                                                                                                    if (rets[i].success) {
                                                                                                                        console.log("#" + (i + 1) + " update contact successfully, id = " + rets[i].id);
                                                                                                                    } else {
                                                                                                                        console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                                                                                                    }
                                                                                                                }
                                                                                                                addressInsertion()
                                                                                                            });
                                                                                                        }
                                                                                                    }
                                                                                                    // console.log('Length' + result.records.length)
                                        
                                                                                                })
                                                                                            }
                                                                                        })
                                                                                    }, 3000 * z);
                                                                                }
                                        
                                        
                                                                                function addressInsertion() {
                                                                                    var address = [];
                                        
                                                                                    for (let i in CustomersArray) {
                                                                                        for (let j in CustomersArray[i].addresses) {
                                                                                            address.push(CustomersArray[i].addresses[j])
                                                                                        }
                                                                                    }
                                        
                                                                                    // console.log('address '+JSON.stringify(address))
                                        
                                                                                    setTimeout(async function () {
                                                                                        conn.query("SELECT Id, Name, Email, AccountId, ERP7__Contact_External_Id__c FROM Contact WHERE AccountId IN ('" + accIdExist.join("','") + "')", function (err, result) {
                                                                                            if (err) {
                                                                                                var error = JSON.stringify(err);
                                                                                                var obj = JSON.parse(error);
                                                                                                if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                    req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                    res.redirect('/amazon')
                                                                                                } else if (obj.name == 'INVALID_FIELD') {
                                                                                                    req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                    res.redirect('/amazon')
                                                                                                } else {
                                                                                                    req.flash('error_msg', '• ' + obj.name);
                                                                                                    res.redirect('/amazon')
                                                                                                }
                                                                                            }
                                        
                                                                                            var AddressDetails = [];
                                                                                            if (result.records.length > 0) {
                                                                                                for (let i in result.records) {
                                                                                                    for (let j in address) {
                                                                                                        if (result.records[i].ERP7__Contact_External_Id__c == address[j].customer_id) {
                                                                                                            if (address[j].zip != null && address[j].zip != '' || address[j].address1 != null && address[j].address1 != '') {
                                                                                                                var List = {
                                                                                                                    Name: address[j].zip + ' ' + address[j].address1,
                                                                                                                    ERP7__Contact__c: result.records[i].Id,
                                                                                                                    ERP7__Customer__c: result.records[i].AccountId,
                                                                                                                    ERP7__Address_Line1__c: address[j].address1,
                                                                                                                    ERP7__Address_Line2__c: address[j].address2,
                                                                                                                    ERP7__City__c: address[j].city,
                                                                                                                    ERP7__Country__c: address[j].country,
                                                                                                                    ERP7__Postal_Code__c: address[j].zip,
                                                                                                                    ERP7__State__c: address[j].province,
                                                                                                                    ERP7__Primary__c: address[j].default == true
                                                                                                                }
                                                                                                                AddressDetails.push(List)
                                                                                                            }
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                                // console.log(JSON.stringify(AddressDetails))
                                                                                                // console.log(AddressDetails.length)
                                        
                                                                                                var addIdExist = [];
                                                                                                var addNotExist = [];
                                                                                                setTimeout(async function () {
                                                                                                    conn.query("SELECT Id, Name, ERP7__Customer__c, ERP7__Contact__c, ERP7__City__c, ERP7__Country__c, ERP7__Postal_Code__c, ERP7__State__c FROM ERP7__Address__c WHERE ERP7__Customer__c IN ('" + accIdExist.join("','") + "')", function (err, result) {
                                                                                                        if (err) {
                                                                                                            var error = JSON.stringify(err);
                                                                                                            var obj = JSON.parse(error);
                                                                                                            if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                                req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                                res.redirect('/amazon')
                                                                                                            } else if (obj.name == 'INVALID_FIELD') {
                                                                                                                req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                                res.redirect('/amazon')
                                                                                                            } else {
                                                                                                                req.flash('error_msg', '• ' + obj.name);
                                                                                                                res.redirect('/amazon')
                                                                                                            }
                                                                                                        }
                                                                                                        if (result.records.length == 0) {
                                                                                                            if (AddressDetails != []) {
                                                                                                                conn.bulk.pollTimeout = 25000;
                                                                                                                conn.bulk.load("ERP7__Address__c", "insert", AddressDetails, function (err, rets) {
                                                                                                                    if (err) { return console.error('err 1' + err); }
                                                                                                                    for (var i = 0; i < rets.length; i++) {
                                                                                                                        if (rets[i].success) {
                                                                                                                            console.log("#" + (i + 1) + " insert address successfully, id = " + rets[i].id);
                                                                                                                        } else {
                                                                                                                            console.log("#" + (i + 1) + " error occurred, message = " + JSON.stringify(rets[i].errors));
                                                                                                                        }
                                                                                                                    }
                                                                                                                    productInsert();
                                                                                                                });
                                                                                                            }
                                                                                                        }
                                                                                                        else if (result.records.length > 0) {
                                                                                                            // var idval = []
                                                                                                            var addressExist = [];
                                                                                                            for (let i in result.records) {
                                                                                                                // idval.push(result.records[i].Id)
                                                                                                                for (let j in AddressDetails) {
                                                                                                                    if (result.records[i].ERP7__Customer__c == AddressDetails[j].ERP7__Customer__c) {
                                                                                                                        var list = {
                                                                                                                            Id: result.records[i].Id,
                                                                                                                            Name: AddressDetails[j].Name,
                                                                                                                            ERP7__Contact__c: result.records[i].ERP7__Contact__c,
                                                                                                                            ERP7__Address_Line1__c: AddressDetails[j].ERP7__Address_Line1__c,
                                                                                                                            ERP7__Address_Line2__c: AddressDetails[j].ERP7__Address_Line2__c,
                                                                                                                            ERP7__City__c: AddressDetails[j].ERP7__City__c,
                                                                                                                            ERP7__Country__c: AddressDetails[j].ERP7__Country__c,
                                                                                                                            ERP7__Postal_Code__c: AddressDetails[j].ERP7__Postal_Code__c,
                                                                                                                            ERP7__State__c: AddressDetails[j].ERP7__State__c,
                                                                                                                            ERP7__Primary__c: AddressDetails[j].ERP7__Primary__c
                                                                                                                        }
                                                                                                                        addressExist.push(list)
                                                                                                                        addIdExist.push(AddressDetails[j].ERP7__Customer__c)
                                                                                                                    }
                                                                                                                }
                                                                                                            }
                                        
                                                                                                            // console.log(JSON.stringify(idval))
                                                                                                            // console.log('addressExist '+JSON.stringify(addressExist))
                                                                                                            // console.log(addressExist.length)
                                        
                                                                                                            // conn.sobject("ERP7__Address__c").del(idval
                                                                                                            //     ,
                                                                                                            //       function (err, rets) {
                                                                                                            //           if (err) { return console.error(err); }
                                                                                                            //           for (var i = 0; i < rets.length; i++) {
                                                                                                            //               if (rets[i].success) {
                                                                                                            //                   console.log("deleted successfully " + rets[i].id);
                                                                                                            //               }
                                                                                                            //           }
                                                                                                            //       });
                                        
                                                                                                            for (let i in AddressDetails) {
                                                                                                                if (!addIdExist.includes(AddressDetails[i].ERP7__Customer__c)) addNotExist.push(AddressDetails[i])
                                                                                                            }
                                        
                                                                                                            if (addNotExist != []) {
                                                                                                                conn.bulk.pollTimeout = 25000;
                                                                                                                conn.bulk.load("ERP7__Address__c", "insert", addNotExist, function (err, rets) {
                                                                                                                    if (err) { return console.error('err 1' + err); }
                                                                                                                    for (var i = 0; i < rets.length; i++) {
                                                                                                                        if (rets[i].success) {
                                                                                                                            console.log("#" + (i + 1) + " insert address successfully, id = " + rets[i].id);
                                                                                                                        } else {
                                                                                                                            console.log("#" + (i + 1) + " error occurred, message = " + JSON.stringify(rets[i].errors));
                                                                                                                        }
                                                                                                                    }
                                                                                                                });
                                                                                                            }
                                        
                                                                                                            if (addressExist != []) {
                                                                                                                conn.bulk.pollTimeout = 25000;
                                                                                                                conn.bulk.load("ERP7__Address__c", "update", addressExist, function (err, rets) {
                                                                                                                    if (err) { return console.error('err 1' + err); }
                                                                                                                    for (var i = 0; i < rets.length; i++) {
                                                                                                                        if (rets[i].success) {
                                                                                                                            console.log("#" + (i + 1) + " update address successfully, id = " + rets[i].id);
                                                                                                                        } else {
                                                                                                                            console.log("#" + (i + 1) + " error occurred, message = " + JSON.stringify(rets[i].errors));
                                                                                                                        }
                                                                                                                    }
                                                                                                                    productInsert();
                                                                                                                });
                                                                                                            }
                                                                                                        }
                                                                                                    })
                                                                                                }, 2000 * z);
                                                                                            }
                                                                                        })
                                                                                    }, 3000 * z);
                                                                                }
                                        
                                                                                function productInsert() {
                                                                                    var productExist = [];
                                                                                    var productIdExist = [];
                                                                                    var productNotExist = [];
                                        
                                                                                    if (productCode.length > 0) {
                                                                                        setTimeout(async function () {
                                                                                            conn.query("SELECT Id, Name, ERP7__SKU__c, ERP7__Manufacturer__c, Description, ProductCode, ERP7__Picture__c, StockKeepingUnit, ERP7__Price_Entry_Amount__c FROM Product2 WHERE ProductCode IN ('" + productCode.join("','") + "')", function (err, result) {
                                                                                                if (err) {
                                                                                                    var error = JSON.stringify(err);
                                                                                                    var obj = JSON.parse(error);
                                                                                                    if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                        req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                        res.redirect('/shopify')
                                                                                                    } else if (obj.name == 'INVALID_FIELD') {
                                                                                                        req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                        res.redirect('/shopify')
                                                                                                    } else {
                                                                                                        req.flash('error_msg', '• ' + obj.name);
                                                                                                        res.redirect('/shopify')
                                                                                                    }
                                                                                                }
                                        
                                                                                                if (result.records.length == 0) {
                                                                                                    if (ProductDetails != []) {
                                                                                                        conn.bulk.pollTimeout = 25000;
                                                                                                        conn.bulk.load("Product2", "insert", ProductDetails, function (err, rets) {
                                                                                                            if (err) { return console.error('err ' + err); }
                                                                                                            for (var i = 0; i < rets.length; i++) {
                                                                                                                if (rets[i].success) {
                                                                                                                    console.log("#" + (i + 1) + " insert Product successfully, id = " + rets[i].id);
                                                                                                                } else {
                                                                                                                    console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                                                                                                }
                                                                                                            }
                                                                                                            priceBookEntryInsert();
                                                                                                        });
                                                                                                    }
                                                                                                }
                                                                                                else if (result.records.length > 0) {
                                                                                                    for (let i in result.records) {
                                                                                                        for (let j in ProductDetails) {
                                                                                                            if (result.records[i].ProductCode == ProductDetails[j].ProductCode) {
                                                                                                                var list = {
                                                                                                                    Id: result.records[i].Id,
                                                                                                                    Name: ProductDetails[j].Name,
                                                                                                                    ERP7__Manufacturer__c: ProductDetails[j].ERP7__Manufacturer__c,
                                                                                                                    Description: ProductDetails[j].Description,
                                                                                                                    ProductCode: ProductDetails[j].ProductCode,
                                                                                                                    ERP7__Picture__c: ProductDetails[j].ERP7__Picture__c,
                                                                                                                    StockKeepingUnit: ProductDetails[j].StockKeepingUnit,
                                                                                                                    ERP7__SKU__c: ProductDetails[j].ERP7__SKU__c,
                                                                                                                    ERP7__Price_Entry_Amount__c: ProductDetails[j].ERP7__Price_Entry_Amount__c,
                                                                                                                    IsActive: true
                                                                                                                }
                                                                                                                productExist.push(list)
                                                                                                                productIdExist.push(ProductDetails[j].ProductCode)
                                                                                                            }
                                                                                                        }
                                                                                                    }
                                        
                                                                                                    for (let i in ProductDetails) {
                                                                                                        if (!productIdExist.includes(ProductDetails[i].ProductCode)) productNotExist.push(ProductDetails[i])
                                                                                                    }
                                                                                                    // console.log(productNotExist)
                                        
                                                                                                    if (productNotExist != []) {
                                                                                                        conn.bulk.pollTimeout = 25000;
                                                                                                        conn.bulk.load("Product2", "insert", productNotExist, function (err, rets) {
                                                                                                            if (err) { return console.error('err 1' + err); }
                                                                                                            for (var i = 0; i < rets.length; i++) {
                                                                                                                if (rets[i].success) {
                                                                                                                    console.log("#" + (i + 1) + " insert Product successfully, id = " + rets[i].id);
                                                                                                                } else {
                                                                                                                    console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                                                                                                }
                                                                                                            }
                                                                                                        });
                                                                                                    }
                                        
                                                                                                    if (productExist != []) {
                                                                                                        conn.bulk.pollTimeout = 25000;
                                                                                                        conn.bulk.load("Product2", "update", productExist, function (err, rets) {
                                                                                                            if (err) { return console.error('err 2' + err); }
                                                                                                            for (var i = 0; i < rets.length; i++) {
                                                                                                                if (rets[i].success) {
                                                                                                                    console.log("#" + (i + 1) + " update Product successfully, id = " + rets[i].id);
                                                                                                                } else {
                                                                                                                    console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                                                                                                }
                                                                                                            }
                                                                                                            priceBookEntryInsert();
                                                                                                        });
                                                                                                    }
                                                                                                }
                                                                                            })
                                                                                        }, 3000 * z);
                                                                                    }
                                                                                }
                                        
                                                                                var productList = [];
                                                                                var prodMainId = [];
                                                                                function priceBookEntryInsert() {
                                        
                                                                                    setTimeout(async function () {
                                                                                        conn.query("SELECT Id, Name, ERP7__SKU__c, ERP7__Manufacturer__c, Description, ProductCode, ERP7__Picture__c, StockKeepingUnit, ERP7__Price_Entry_Amount__c FROM Product2 WHERE ProductCode IN ('" + productCode.join("','") + "')", function (err, result) {
                                                                                            if (err) {
                                                                                                var error = JSON.stringify(err);
                                                                                                var obj = JSON.parse(error);
                                                                                                if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                    req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                    res.redirect('/amazon')
                                                                                                } else if (obj.name == 'INVALID_FIELD') {
                                                                                                    req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                    res.redirect('/amazon')
                                                                                                } else {
                                                                                                    req.flash('error_msg', '• ' + obj.name);
                                                                                                    res.redirect('/amazon')
                                                                                                }
                                                                                            }
                                                                                            // console.log('product ' + result.records.length)
                                                                                            if (result.records.length > 0) {
                                                                                                for (let i in result.records) {
                                                                                                    prodMainId.push(result.records[i].Id)
                                                                                                    productList.push(result.records[i])
                                                                                                }
                                                                                                // console.log('prodMainId' + JSON.stringify(prodMainId))
                                                                                                // console.log('product list' + JSON.stringify(productList))
                                        
                                                                                                var isActive = true;
                                                                                                var priceBookEntryAvail = [];
                                                                                                for (let i in productList) {
                                                                                                    for (let j in ProductDetails) {
                                                                                                        if (productList[i].StockKeepingUnit === ProductDetails[j].StockKeepingUnit) {
                                                                                                            var list = {
                                                                                                                IsActive: isActive,
                                                                                                                Pricebook2Id: pricebook_id,
                                                                                                                Product2Id: productList[i].Id,
                                                                                                                UnitPrice: ProductDetails[j].ERP7__Price_Entry_Amount__c
                                                                                                            }
                                                                                                            priceBookEntryAvail.push(list)
                                                                                                        }
                                                                                                    }
                                                                                                }
                                        
                                                                                                // console.log('priceBookEntryInsert ' + JSON.stringify(priceBookEntryAvail))
                                        
                                                                                                setTimeout(async function () {
                                                                                                    conn.query("SELECT Id, Product2Id, Pricebook2Id FROM pricebookentry WHERE isactive = true AND Product2Id IN ('" + prodMainId.join("','") + "') ORDER BY lastmodifieddate", function (err, result) {
                                                                                                        if (err) {
                                                                                                            var error = JSON.stringify(err);
                                                                                                            var obj = JSON.parse(error);
                                                                                                            if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                                req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                                res.redirect('/amazon')
                                                                                                            } else if (obj.name == 'INVALID_FIELD') {
                                                                                                                req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                                res.redirect('/amazon')
                                                                                                            } else {
                                                                                                                req.flash('error_msg', '• ' + obj.name);
                                                                                                                res.redirect('/amazon')
                                                                                                            }
                                                                                                        }
                                        
                                                                                                        // console.log('price ' + result.records.length)
                                                                                                        if (result.records.length == 0) {
                                                                                                            if (priceBookEntryAvail != []) {
                                                                                                                conn.bulk.pollTimeout = 25000;
                                                                                                                conn.bulk.load("pricebookentry", "insert", priceBookEntryAvail, function (err, rets) {
                                                                                                                    if (err) { return console.error('err 2' + err); }
                                                                                                                    for (var i = 0; i < rets.length; i++) {
                                                                                                                        if (rets[i].success) {
                                                                                                                            console.log("#" + (i + 1) + " insert PricebookEntry successfully, id = " + rets[i].id);
                                                                                                                        } else {
                                                                                                                            console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                                                                                                        }
                                                                                                                    }
                                                                                                                    orderInsertion();
                                                                                                                });
                                                                                                            }
                                                                                                        }
                                                                                                        else if (result.records.length > 0) {
                                                                                                            var priceBookExist = [];
                                                                                                            var priceBookIdExist = [];
                                                                                                            var priceNotExist = [];
                                                                                                            for (let i in result.records) {
                                                                                                                for (let j in priceBookEntryAvail) {
                                                                                                                    if (result.records[i].Product2Id == priceBookEntryAvail[j].Product2Id && result.records[i].Pricebook2Id == priceBookEntryAvail[j].Pricebook2Id) {
                                                                                                                        var list = {
                                                                                                                            Id: result.records[i].Id,
                                                                                                                            UnitPrice: priceBookEntryAvail[j].UnitPrice
                                                                                                                        }
                                                                                                                        priceBookExist.push(list)
                                                                                                                        var list2 = {
                                                                                                                            Product2Id: result.records[i].Product2Id,
                                                                                                                            Pricebook2Id: result.records[i].Pricebook2Id
                                                                                                                        }
                                                                                                                        priceBookIdExist.push(list2)
                                                                                                                    }
                                                                                                                }
                                                                                                            }
                                                                                                            // console.log('priceBookExist ' + JSON.stringify(priceBookExist))
                                        
                                                                                                            if (priceBookIdExist != []) {
                                                                                                                priceNotExist = priceBookEntryAvail.filter((Exist) => !priceBookIdExist.some((NotExist) => Exist.Product2Id == NotExist.Product2Id && Exist.Pricebook2Id == NotExist.Pricebook2Id))
                                                                                                            }
                                        
                                                                                                            if (priceNotExist != []) {
                                                                                                                conn.bulk.pollTimeout = 25000;
                                                                                                                conn.bulk.load("pricebookentry", "insert", priceNotExist, function (err, rets) {
                                                                                                                    if (err) { return console.error('err 2' + err); }
                                                                                                                    for (var i = 0; i < rets.length; i++) {
                                                                                                                        if (rets[i].success) {
                                                                                                                            console.log("#" + (i + 1) + " insert PricebookEntry successfully, id = " + rets[i].id);
                                                                                                                        } else {
                                                                                                                            console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                                                                                                        }
                                                                                                                    }
                                                                                                                });
                                                                                                            }
                                        
                                                                                                            if (priceBookExist != []) {
                                                                                                                conn.bulk.pollTimeout = 25000;
                                                                                                                conn.bulk.load("pricebookentry", "update", priceBookExist, function (err, rets) {
                                                                                                                    if (err) { return console.error('err 2' + err); }
                                                                                                                    for (var i = 0; i < rets.length; i++) {
                                                                                                                        if (rets[i].success) {
                                                                                                                            console.log("#" + (i + 1) + " update PricebookEntry successfully, id = " + rets[i].id);
                                                                                                                        } else {
                                                                                                                            console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                                                                                                        }
                                                                                                                    }
                                                                                                                    orderInsertion();
                                                                                                                });
                                                                                                            }
                                                                                                        }
                                                                                                    })
                                                                                                }, 3000 * z);
                                                                                            }
                                                                                        })
                                                                                    }, 2000 * z);
                                                                                }
                                        
                                                                                var orderId = [];
                                                                                function orderInsertion() {
                                                                                    setTimeout(async function () {
                                                                                        conn.query("SELECT Id, Name, ERP7__Customer__c, ERP7__Contact__c, ERP7__City__c, ERP7__Country__c, ERP7__Postal_Code__c, ERP7__State__c FROM ERP7__Address__c WHERE ERP7__Customer__c IN ('" + accIdExist.join("','") + "')", function (err, result) {
                                                                                            if (err) {
                                                                                                var error = JSON.stringify(err);
                                                                                                var obj = JSON.parse(error);
                                                                                                if (obj.name == 'INVALID_SESSION_ID') {
                                                                                                    req.flash('error_msg', '• Session has Expired Please try again');
                                                                                                    res.redirect('/shopify')
                                                                                                } else if (obj.name == 'INVALID_FIELD') {
                                                                                                    req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                                    res.redirect('/shopify')
                                                                                                } else {
                                                                                                    req.flash('error_msg', '• ' + obj.name);
                                                                                                    res.redirect('/shopify')
                                                                                                }
                                                                                            }  
                                                                                            
                                                                                            for(let i in OrdersArray){
                                                                                                var list = {
                                                                                                    ERP7__Contact__c:,
                                                                                                    ERP7__Stage__c:,
                                                                                                    Status:,
                                                                                                    ERP7__Order_Profile__c:,
                                                                                                    ERP7__Channel__c:,
                                                                                                    ERP7__Active__c:,
                                                                                                    OrderReferenceNumber:,
                                                                                                    ERP7__E_Order_Id__c:,
                                                                                                    Name:,
                                                                                                    AccountId:,
                                                                                                    ERP7__Sync_Status__c:,
                                                                                                    EffectiveDate:,
                                                                                                    ERP7__Customer_Email__c:,
                                                                                                    ERP7__Estimated_Shipping_Amount__c:,
                                                                                                    ERP7__Amount__c:,
                                                                                                    Type:,
                                                                                                    Pricebook2Id:,
                                                                                                    ERP7__Bill_To_Address__c:,
                                                                                                    ERP7__Ship_To_Address__c:,
                                                                                                    ERP7__Unique_Id__c:,
                                                                                                    ERP7__Sync_Total_Tax__c:,
                                                                                                    ERP7__Total_Shipping_Amount__c:,
                                                                                                    ERP7__Order_Discount__c:,                                                            
                                                                                                }
                                                                                            }
                                        
                                                                                            if (result.records.length == 0) {
                                        
                                                                                            }
                                                                                            else if (result.records.length > 0) {
                                        
                                                                                            }
                                                                                        })
                                                                                    }, 2000 * z);
                                                                                }
                                        */
                                    }
                                }
                            }, 2000 * z);
                        }
                    }
                }))
                client.release();
            });

        } catch (e) {
            console.log('Error-> ', e);
        }
    })();
}
