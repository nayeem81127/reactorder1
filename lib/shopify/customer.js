const express = require("express")
const app = express()
const { pool } = require("../../dbConfig");
const jsforce = require('jsforce')
const salesLogin = require('../routes');
const csv = require("csvtojson");
app.use(express.static('public'));
const Shopify = require('shopify-api-node');

module.exports = function (app) {

    (async () => {

        try {

            app.post('/shopifyCustomerSync', salesLogin, async function (req, res, next) {
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

                        var conn = new jsforce.Connection({
                            accessToken: oauth_token,
                            instanceUrl: instance_url
                        });

                        for (let z in result.rows) {

                            if (Email === result.rows[z].email) {
                                var Aqxolt_Customer;
                                var Aqxolt_Order_Profile;
                                var shopName = result.rows[z].shopify_domain;
                                var accessToken = result.rows[z].shopify_token;

                                if (result.rows[z].aqxolt_customer && result.rows[z].aqxolt_order_profile) {
                                    Aqxolt_Customer = result.rows[z].aqxolt_customer;
                                    Aqxolt_Order_Profile = result.rows[z].aqxolt_order_profile;
                                } else {
                                    Aqxolt_Customer = req.user.aqxolt_customer;
                                    Aqxolt_Order_Profile = req.user.aqxolt_order_profile;
                                }

                                if (!Aqxolt_Order_Profile && !Aqxolt_Customer && !accessToken || !shopName) {
                                    req.flash('error_msg', '• Order Profile, Customer And Shops Credentials are Missing');
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
                                else if (!Aqxolt_Customer && !Aqxolt_Order_Profile) {
                                    req.flash('error_msg', '• Aqxolt Customer And Order Profile is Empty');
                                    res.redirect('/shopify')
                                }
                                else if (Aqxolt_Customer && Aqxolt_Order_Profile && accessToken && shopName) {

                                    const shopify = new Shopify({
                                        shopName: shopName,
                                        accessToken: accessToken
                                    });

                                    let params = { limit: 250 };
                                    let CustomersArray = [];

                                    do {
                                        const Customers = await shopify.customer.list(params)
                                        CustomersArray = CustomersArray.concat(Customers);
                                        params = Customers.nextPageParameters;
                                    } while (params !== undefined);

                                    let buyerEmailInfo = []
                                    let customerId = []

                                    for (let i in CustomersArray) {
                                        if (CustomersArray[i].id != "" && CustomersArray[i].id != null) {
                                            customerId.push(CustomersArray[i].id)
                                        }
                                    }

                                    // console.log('CustomersArray '+JSON.stringify(CustomersArray))
                                    let CustomerDetails = []

                                    for (let i in CustomersArray) {
                                        if (CustomersArray[i].id != "" && CustomersArray[i].id != null) {
                                            var list = {
                                                ERP7__Customer_External_Id__c: CustomersArray[i].id,
                                                Name: (OrdersArray[i].customer.first_name == "" || OrdersArray[i].customer.first_name == null) && (OrdersArray[i].customer.last_name == "" || OrdersArray[i].customer.last_name == null) ? OrdersArray[i].customer.id : (OrdersArray[i].customer.first_name == "" || OrdersArray[i].customer.first_name == null) || (OrdersArray[i].customer.last_name == "" || OrdersArray[i].customer.last_name == null) ? OrdersArray[i].customer.first_name : OrdersArray[i].customer.first_name + ' ' + OrdersArray[i].customer.last_name,
                                                ERP7__Email__c: CustomersArray[i].email,
                                                ERP7__Account_Type__c: "Customer",
                                                ERP7__Account_Profile__c: Aqxolt_Customer,
                                                ERP7__Order_Profile__c: Aqxolt_Order_Profile,
                                                ERP7__Active__c: true
                                            }
                                            CustomerDetails.push(list)
                                        }
                                    }
                                    console.log(JSON.stringify(CustomerDetails.length), buyerEmailInfo.length)

                                    // var id = [

                                    // ]

                                    //     conn.sobject("OrderItem").del(id,
                                    //         function (err, rets) {
                                    //             if (err) { return console.error(err); }
                                    //             for (var i = 0; i < rets.length; i++) {
                                    //                 if (rets[i].success) {
                                    //                     console.log("deleted successfully " + rets[i].id);
                                    //                 }
                                    //             }
                                    //         });

                                    if (Aqxolt_Order_Profile != null) {

                                        conn.query(`SELECT Id FROM ERP7__Profiling__c where Id='${Aqxolt_Order_Profile}'`, function (err, result) {
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
                                                    req.flash('error_msg', '• err ' + JSON.stringify(obj.name));
                                                    res.redirect('/shopify')
                                                }
                                            }
                                            if (result.records.length == 0) {
                                                req.flash('error_msg', '• Invalid Order Profile Id');
                                                res.redirect('/shopify')
                                            }
                                            else if (result.records.length > 0) {
                                                if (Aqxolt_Customer != null) {

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
                                                                req.flash('error_msg', '• err ' + JSON.stringify(obj.name));
                                                                res.redirect('/shopify')
                                                            }
                                                        }
                                                        console.log('cust' + result.records.length)
                                                        if (result.records.length == 0) {
                                                            req.flash('error_msg', '• Invalid Customer Profile Id');
                                                            res.redirect('/shopify')
                                                        }
                                                        else if (result.records.length > 0) {
                                                            if (buyerEmailInfo.length > 0) {

                                                                conn.bulk.pollInterval = 1000;
                                                                conn.bulk.pollTimeout = Number.MAX_VALUE;
                                                                let records = [];

                                                                const recordStream = conn.bulk.query(`SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c,ERP7__Account_Type__c, ERP7__Customer_External_Id__c FROM Account where ERP7__Customer_External_Id__c IN ('${customerId.join("','")}')`);
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
                                                                            res.redirect('/amazon')
                                                                        } else {
                                                                            req.flash('error_msg', '• ' + obj.name);
                                                                            res.redirect('/amazon')
                                                                        }
                                                                    });

                                                                    csvToJsonParser.on("error", (error) => {
                                                                        console.error(error);
                                                                    });

                                                                    csvToJsonParser.on("done", async () => {
                                                                        resolve(records);
                                                                    });
                                                                }).then((accRecords) => {
                                                                    if (accRecords.length == 0) {
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
                                                                    } else if (accRecords.length > 0) {
                                                                        res.redirect('/index');
                                                                        var accExist = [];
                                                                        var accExternalId = [];
                                                                        var accNotExist = [];
                                                                        // var idval = []
                                                                        for (let i in accRecords) {
                                                                            // idval.push(accRecords[i].Id)
                                                                            for (let j in CustomerDetails) {
                                                                                if (accRecords[i].ERP7__Customer_External_Id__c == CustomerDetails[j].ERP7__Customer_External_Id__c) {
                                                                                    let list = {
                                                                                        Id: accRecords[i].Id,
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

                                                                        console.log(accExist.length, accExternalId.length)

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

                                                            }
                                                            else {
                                                                req.flash('error_msg', `• Customer's Not Found`);
                                                                return res.redirect('/shopify');
                                                            }
                                                        }
                                                    })

                                                }
                                            }
                                        })

                                    }

                                    var accIdExist = [];
                                    var contactDetails = [];
                                    function conInsertion() {

                                        var conExist = [];
                                        var conEmailExist = [];
                                        var conNotExist = [];

                                        conn.bulk.pollInterval = 1000;
                                        conn.bulk.pollTimeout = Number.MAX_VALUE;
                                        let records = [];

                                        const recordStream = conn.bulk.query(`SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c,ERP7__Account_Type__c, ERP7__Customer_External_Id__c FROM Account where ERP7__Customer_External_Id__c IN ('${customerId.join("','")}')`);
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
                                                    res.redirect('/amazon')
                                                } else {
                                                    req.flash('error_msg', '• ' + obj.name);
                                                    res.redirect('/amazon')
                                                }
                                            });

                                            csvToJsonParser.on("error", (error) => {
                                                console.error(error);
                                            });

                                            csvToJsonParser.on("done", async () => {
                                                resolve(records);
                                            });
                                        }).then((acc2Records) => {
                                            if (acc2Records.length > 0) {
                                                for (let i in acc2Records) {
                                                    for (let j in CustomersArray) {
                                                        if (CustomersArray[j].id == acc2Records[i].ERP7__Customer_External_Id__c) {
                                                            let acclist = {
                                                                AccountId: acc2Records[i].Id,
                                                                Email: acc2Records[i].ERP7__Email__c,
                                                                FirstName: OrdersArray[j].customer.last_name == '' || OrdersArray[j].customer.last_name == null ? '' : OrdersArray[j].customer.first_name,
                                                                LastName: (OrdersArray[j].customer.first_name == '' || OrdersArray[j].customer.first_name == null) && (OrdersArray[j].customer.last_name == '' || OrdersArray[j].customer.last_name == null) ? OrdersArray[j].customer.id : OrdersArray[j].customer.last_name == null || OrdersArray[j].customer.last_name == '' ? OrdersArray[j].customer.first_name : OrdersArray[j].customer.last_name,
                                                                Phone: CustomersArray[j].phone,
                                                                ERP7__Contact_External_Id__c: CustomersArray[j].id
                                                            }
                                                            contactDetails.push(acclist);
                                                            accIdExist.push(acc2Records[i].Id)
                                                        }
                                                    }
                                                }

                                                conn.bulk.pollInterval = 1000;
                                                conn.bulk.pollTimeout = Number.MAX_VALUE;
                                                let records = [];

                                                const recordStream = conn.bulk.query(`SELECT Id, AccountId, LastName, Email, ERP7__Contact_External_Id__c FROM Contact WHERE AccountId IN ('${accIdExist.join("','")}')`);
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
                                                            res.redirect('/amazon')
                                                        } else {
                                                            req.flash('error_msg', '• ' + obj.name);
                                                            res.redirect('/amazon')
                                                        }
                                                    });

                                                    csvToJsonParser.on("error", (error) => {
                                                        console.error(error);
                                                    });

                                                    csvToJsonParser.on("done", async () => {
                                                        resolve(records);
                                                    });
                                                }).then((conRecords) => {
                                                    if (conRecords.length == 0) {
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
                                                    else if (conRecords.length > 0) {
                                                        for (let i in conRecords) {
                                                            for (let j in contactDetails) {
                                                                if (conRecords[i].ERP7__Contact_External_Id__c == contactDetails[j].ERP7__Contact_External_Id__c) {
                                                                    let list = {
                                                                        Id: conRecords[i].Id,
                                                                        AccountId: conRecords[i].AccountId,
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
                                                });
                                            }
                                        });

                                    }

                                    function addressInsertion() {
                                        var address = [];

                                        for (let i in CustomersArray) {
                                            for (let j in CustomersArray[i].addresses) {
                                                address.push(CustomersArray[i].addresses[j])
                                            }
                                        }

                                        // console.log('address '+JSON.stringify(address))


                                        conn.bulk.pollInterval = 1000;
                                        conn.bulk.pollTimeout = Number.MAX_VALUE;
                                        let records = [];


                                        // We still need recordStream to listen for errors. We'll access the stream
                                        // directly though, bypassing jsforce's RecordStream.Parsable
                                        const recordStream = conn.bulk.query(`SELECT Id, Name, Email, AccountId, ERP7__Contact_External_Id__c FROM Contact WHERE AccountId IN ('${accIdExist.join("','")}')`);
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
                                                    res.redirect('/amazon')
                                                } else {
                                                    req.flash('error_msg', '• ' + obj.name);
                                                    res.redirect('/amazon')
                                                }
                                            });

                                            csvToJsonParser.on("error", (error) => {
                                                console.error(error);
                                            });

                                            csvToJsonParser.on("done", async () => {
                                                resolve(records);
                                            });
                                        }).then((con2Records) => {
                                            var AddressDetails = [];
                                            if (con2Records.length > 0) {
                                                for (let i in con2Records) {
                                                    for (let j in address) {
                                                        if (con2Records[i].ERP7__Contact_External_Id__c == address[j].customer_id) {
                                                            if (address[j].zip != null && address[j].zip != '' || address[j].address1 != null && address[j].address1 != '') {
                                                                var List = {
                                                                    Name: address[j].zip + ' ' + address[j].address1,
                                                                    ERP7__Contact__c: con2Records[i].Id,
                                                                    ERP7__Customer__c: con2Records[i].AccountId,
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

                                                conn.bulk.pollInterval = 1000;
                                                conn.bulk.pollTimeout = Number.MAX_VALUE;
                                                let records = [];
                                                var addIdExist = [];
                                                var addNotExist = [];


                                                // We still need recordStream to listen for errors. We'll access the stream
                                                // directly though, bypassing jsforce's RecordStream.Parsable
                                                const recordStream = conn.bulk.query(`SELECT Id, Name, ERP7__Customer__c, ERP7__Contact__c, ERP7__City__c, ERP7__Country__c, ERP7__Postal_Code__c, ERP7__State__c FROM ERP7__Address__c WHERE ERP7__Customer__c IN ('${accIdExist.join("','")}')`);
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
                                                            res.redirect('/amazon')
                                                        } else {
                                                            req.flash('error_msg', '• ' + obj.name);
                                                            res.redirect('/amazon')
                                                        }
                                                    });

                                                    csvToJsonParser.on("error", (error) => {
                                                        console.error(error);
                                                    });

                                                    csvToJsonParser.on("done", async () => {
                                                        resolve(records);
                                                    });
                                                }).then((addRecords) => {
                                                    if (addRecords.length == 0) {
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
                                                                var date = new Date();
                                                                var updatedDate = date.toLocaleString('en-US', { weekday: 'short', day: 'numeric', year: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric', second: 'numeric' })
                                                                pool.query('INSERT INTO jobs_log (email, updated_at, category, message, seller_id) VALUES ($1, $2, $3, $4, $5)', [Email, updatedDate, 'shopify', 'Customer Sync', shopName]);
                                                                // var exeLen = parseInt(z) + 1;
                                                                // SuccessToGo(exeLen);
                                                            });
                                                        }
                                                    }
                                                    else if (addRecords.length > 0) {
                                                        // var idval = []
                                                        var addressExist = [];
                                                        for (let i in addRecords) {
                                                            // idval.push(addRecords[i].Id)
                                                            for (let j in AddressDetails) {
                                                                if (addRecords[i].ERP7__Customer__c == AddressDetails[j].ERP7__Customer__c) {
                                                                    var list = {
                                                                        Id: addRecords[i].Id,
                                                                        Name: AddressDetails[j].Name,
                                                                        ERP7__Contact__c: addRecords[i].ERP7__Contact__c,
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
                                                                var date = new Date();
                                                                var updatedDate = date.toLocaleString('en-US', { weekday: 'short', day: 'numeric', year: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric', second: 'numeric' })
                                                                pool.query('INSERT INTO jobs_log (email, updated_at, category, message, seller_id) VALUES ($1, $2, $3, $4, $5)', [Email, updatedDate, 'shopify', 'Customer Sync', shopName]);
                                                                // var exeLen = parseInt(z) + 1;
                                                                // SuccessToGo(exeLen);
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        });

                                    }
                                }

                            }

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