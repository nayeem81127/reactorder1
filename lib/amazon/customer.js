const express = require("express")
const app = express()
const { pool } = require("../../dbConfig");
const jsforce = require('jsforce')
const salesLogin = require('../routes')
const SellingPartnerAPI = require('amazon-sp-api');
app.use(express.static('public'));

module.exports = function (app) {

    (async () => {

        try {

            app.post('/amazonCustomerSync', salesLogin, async function (req, res, next) {

                const client = await pool.connect();
                await client.query('BEGIN');
                await JSON.stringify(client.query("SELECT * FROM amazon_credentials WHERE email=$1", [req.user.email], async function (err, result) {
                    if (err) { console.log(err); }

                    if (result.rows.length === 0) {
                        req.flash('error_msg', '• Amazon Credentials are Missing');
                        return res.redirect('/amazon')
                    }
                    else if (result.rows.length > 0) {
                        var Aqxolt_Customer = req.user.aqxolt_customer;
                        var Aqxolt_Order_Profile = req.user.aqxolt_order_profile;
                        var oauth_token = req.user.oauth_token;
                        var instance_url = req.user.instance_url;

                        for (let z in result.rows) {
                            setTimeout(async function () {
                                if (req.user.email === result.rows[z].email) {
                                    var Email = result.rows[z].email;
                                    var Region = 'eu';
                                    var RefreshToken = result.rows[z].refresh_token;;
                                    var ClientId = result.rows[z].amazon_app_client_id;
                                    var ClientSecret = result.rows[z].amazon_app_client_secret;
                                    var AWSAccessKey = result.rows[z].aws_access_key;
                                    var AWSSecretAccessKey = result.rows[z].aws_secret_access_key;
                                    var AWSSellingPartnerRole = result.rows[z].aws_selling_partner_role;
                                    var MarketplaceId = result.rows[z].marketplace_id;

                                    if (!Aqxolt_Order_Profile && !Aqxolt_Customer && !RefreshToken || !ClientId || !ClientSecret || !AWSAccessKey || !AWSSecretAccessKey || !AWSSellingPartnerRole) {
                                        req.flash('error_msg', '• Order Profile, Customer And Amazon Credentials are Missing');
                                        res.redirect('/amazon')
                                    }
                                    else if (!RefreshToken || !ClientId || !ClientSecret || !AWSAccessKey || !AWSSecretAccessKey || !AWSSellingPartnerRole) {
                                        req.flash('error_msg', '• Amazon Credentials are Missing');
                                        res.redirect('/amazon')
                                    }
                                    else if (!Aqxolt_Order_Profile) {
                                        req.flash('error_msg', '• Order Profile is Empty in Aqxolt Info');
                                        res.redirect('/amazon')
                                    }
                                    else if (!Aqxolt_Customer) {
                                        req.flash('error_msg', '• Aqxolt Customer is Empty in Aqxolt Info');
                                        res.redirect('/amazon')
                                    }
                                    else if (!Aqxolt_Customer && !Aqxolt_Order_Profile) {
                                        req.flash('error_msg', '• Aqxolt Customer And Order Profile is Empty in Aqxolt Info');
                                        res.redirect('/amazon')
                                    }
                                    else if (Aqxolt_Customer && Aqxolt_Order_Profile && RefreshToken && ClientId && ClientSecret && AWSAccessKey && AWSSecretAccessKey && AWSSellingPartnerRole) {

                                        // console.log('Region->' + Region);
                                        let sellingPartner = new SellingPartnerAPI({
                                            region: Region,
                                            refresh_token: RefreshToken,
                                            credentials: {
                                                SELLING_PARTNER_APP_CLIENT_ID: ClientId,
                                                SELLING_PARTNER_APP_CLIENT_SECRET: ClientSecret,
                                                AWS_ACCESS_KEY_ID: AWSAccessKey,
                                                AWS_SECRET_ACCESS_KEY: AWSSecretAccessKey,
                                                AWS_SELLING_PARTNER_ROLE: AWSSellingPartnerRole
                                            }
                                        });

                                        await sellingPartner.callAPI({
                                            operation: 'getOrders',
                                            endpoint: 'orders',
                                            query: {
                                                MarketplaceIds: MarketplaceId,
                                                LastUpdatedAfter: '2020-09-26'
                                            }
                                        })
                                            .then(result => {
                                                this.resS = result;
                                            })
                                            .catch(err => {
                                                var error = JSON.stringify(err);
                                                var obj = JSON.parse(error);
                                                if (obj.message == "The request has an invalid grant parameter : refresh_token") {
                                                    req.flash('error_msg', '• Invalid Amazon Refresh Token for this seller ' + ClientId);
                                                    res.redirect('/amazon')
                                                } else if (obj.message == "The request signature we calculated does not match the signature you provided. Check your AWS Secret Access Key and signing method. Consult the service documentation for details.") {
                                                    req.flash('error_msg', '• Check your AWS Secret Access Key for this seller ' + ClientId);
                                                    res.redirect('/amazon')
                                                } else if (obj.message == "The security token included in the request is invalid.") {
                                                    req.flash('error_msg', '• Check your security token Key for this seller ' + ClientId);
                                                    res.redirect('/amazon')
                                                } else {
                                                    req.flash('error_msg', '• Invalid Amazon Credentials for this seller ' + ClientId);
                                                    res.redirect('/amazon')
                                                }
                                            })
                                        let resS = this.resS;
                                        if (resS) {
                                            // console.log('Response Order->', JSON.stringify(resS.Orders));

                                            var conn = new jsforce.Connection({
                                                accessToken: oauth_token,
                                                instanceUrl: instance_url
                                            });

                                            var AmazonOrderIdList = [];
                                            for (let i in resS.Orders) {
                                                if (resS.Orders[i].AmazonOrderId != "") AmazonOrderIdList.push(resS.Orders[i].AmazonOrderId);
                                            }
                                            // console.log('Response AmazonOrderId ->', JSON.stringify(AmazonOrderIdList));

                                            var BuyerInfo = [];
                                            for (let i in AmazonOrderIdList) {
                                                var BuyerDetails = await sellingPartner.callAPI({
                                                    operation: 'getOrderBuyerInfo',
                                                    // endpoint:'orders',

                                                    path: {
                                                        orderId: AmazonOrderIdList[i]
                                                    }
                                                });
                                                BuyerInfo.push(BuyerDetails);
                                                // console.log('Response BuyerInfo ->', JSON.stringify(BuyerDetails));
                                            }

                                            var noBuyerEmail = [];
                                            var BuyerNameExist = [];
                                            if (BuyerInfo != []) {
                                                for (let i in BuyerInfo) {
                                                    if (BuyerInfo[i].AmazonOrderId != '' && BuyerInfo[i].BuyerName != undefined && BuyerInfo[i].BuyerName != '') {
                                                        var arlist = {
                                                            AmazonOrderId: BuyerInfo[i].AmazonOrderId,
                                                            BuyerName: BuyerInfo[i].BuyerName,
                                                            BuyerEmail: BuyerInfo[i].BuyerEmail
                                                        }
                                                        BuyerNameExist.push(arlist)
                                                    }
                                                }
                                                // console.log('BuyerNameExist ' + JSON.stringify(BuyerNameExist))
                                            }

                                            if (BuyerInfo != []) {
                                                for (let i in BuyerInfo) {
                                                    if (BuyerInfo[i].AmazonOrderId != '' && BuyerInfo[i].BuyerName == undefined && BuyerInfo[i].BuyerEmail != '' && BuyerInfo[i].BuyerEmail != undefined) {
                                                        var arlist = {
                                                            AmazonOrderId: BuyerInfo[i].AmazonOrderId,
                                                            BuyerEmail: BuyerInfo[i].BuyerEmail
                                                        }
                                                        noBuyerEmail.push(arlist)
                                                    }
                                                }
                                                // console.log('noBuyerEmail ' + JSON.stringify(noBuyerEmail))
                                            }

                                            var buyerEmailName = [];
                                            if (noBuyerEmail != []) {
                                                for (let i in noBuyerEmail) {
                                                    var emailChange = noBuyerEmail[i].BuyerEmail;
                                                    var byEmail = emailChange.split('@', 1);
                                                    byEmail = byEmail.toString().replace(/[]/g, '');
                                                    var buyerList = {
                                                        AmazonOrderId: noBuyerEmail[i].AmazonOrderId,
                                                        BuyerName: byEmail,
                                                        BuyerEmail: noBuyerEmail[i].BuyerEmail
                                                    }
                                                    buyerEmailName.push(buyerList);
                                                }
                                            }
                                            // console.log('buyerEmailName ' + JSON.stringify(buyerEmailName))

                                            var allBuyerDetails = [];

                                            if (buyerEmailName != []) {
                                                for (let i in buyerEmailName) {
                                                    var byList = {
                                                        Name: buyerEmailName[i].BuyerName,
                                                        ERP7__Email__c: buyerEmailName[i].BuyerEmail,
                                                        ERP7__Order_Profile__c: Aqxolt_Order_Profile,
                                                        ERP7__Account_Profile__c: Aqxolt_Customer,
                                                        ERP7__Account_Type__c: "Customer"
                                                    }
                                                    allBuyerDetails.push(byList)
                                                }
                                            }

                                            if (BuyerNameExist != []) {
                                                for (let i in BuyerNameExist) {
                                                    var byList = {
                                                        Name: BuyerNameExist[i].BuyerName,
                                                        ERP7__Email__c: BuyerNameExist[i].BuyerEmail,
                                                        ERP7__Order_Profile__c: Aqxolt_Order_Profile,
                                                        ERP7__Account_Profile__c: Aqxolt_Customer,
                                                        ERP7__Account_Type__c: "Customer"
                                                    }
                                                    allBuyerDetails.push(byList)
                                                }
                                            }

                                            // console.log('allBuyerDetails ' + JSON.stringify(allBuyerDetails))
                                            var buyerEmailInfo = [];
                                            for (let i in allBuyerDetails) {
                                                buyerEmailInfo.push(allBuyerDetails[i].ERP7__Email__c)
                                            }
                                            // console.log('email ' + email)

                                            allBuyerDetails = allBuyerDetails.filter(function ({ name, date, amt }) {
                                                var key = `${name}${date}${amt}`;
                                                return !this.has(key) && this.add(key);
                                            }, new Set);

                                            var accExist = [];
                                            var accEmailExist = [];
                                            var accNotExist = [];

                                            if (Aqxolt_Order_Profile != null) {
                                                setTimeout(async function () {
                                                    conn.query(`SELECT Id FROM ERP7__Profiling__c where Id='${Aqxolt_Order_Profile}'`, function (err, result) {
                                                        if (err) {
                                                            var error = JSON.stringify(err);
                                                            var obj = JSON.parse(error);
                                                            if (obj.name == 'INVALID_SESSION_ID') {
                                                                req.flash('error_msg', '• Session has Expired Please try again');
                                                                res.redirect('/amazon')
                                                            } else if (obj.name == 'INVALID_FIELD') {
                                                                req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                res.redirect('/amazon')
                                                            } else if (obj.name == 'INVALID_QUERY_FILTER_OPERATOR') {
                                                                req.flash('error_msg', '• Invalid Aqxolt Order Profile Id');
                                                                res.redirect('/amazon')
                                                            } else {
                                                                req.flash('error_msg', '• ' + JSON.stringify(obj));
                                                                res.redirect('/amazon')
                                                            }
                                                        }

                                                        if (result.records.length == 0) {
                                                            req.flash('error_msg', '• Invalid Order Profile Id');
                                                            res.redirect('/amazon')
                                                        }
                                                        else if (result.records.length > 0) {
                                                            if (Aqxolt_Customer != null) {
                                                                setTimeout(async function () {
                                                                    conn.query(`SELECT Id FROM ERP7__Profiling__c where Id='${Aqxolt_Customer}'`, function (err, result) {
                                                                        if (err) {
                                                                            var error = JSON.stringify(err);
                                                                            var obj = JSON.parse(error);
                                                                            if (obj.name == 'INVALID_SESSION_ID') {
                                                                                req.flash('error_msg', '• Session has Expired Please try again');
                                                                                res.redirect('/amazon')
                                                                            } else if (obj.name == 'INVALID_FIELD') {
                                                                                req.flash('error_msg', '• You have Connected to InValid Org. Please Connect to Valid Org');
                                                                                res.redirect('/amazon')
                                                                            } else if (obj.name == 'INVALID_QUERY_FILTER_OPERATOR') {
                                                                                req.flash('error_msg', '• Invalid Aqxolt Customer Id');
                                                                                res.redirect('/amazon')
                                                                            } else {
                                                                                req.flash('error_msg', '• ' + obj.name);
                                                                                res.redirect('/amazon')
                                                                            }
                                                                        }

                                                                        if (result.records.length == 0) {
                                                                            req.flash('error_msg', '• Invalid Customer Profile Id');
                                                                            res.redirect('/amazon')
                                                                        }
                                                                        else if (result.records.length > 0) {
                                                                            if (buyerEmailInfo.length > 0) {
                                                                                setTimeout(async function () {
                                                                                    conn.query("SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c,ERP7__Account_Type__c FROM Account WHERE ERP7__Email__c IN ('" + buyerEmailInfo.join("','") + "')", function (err, result) {
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
                                                                                            res.redirect('/index');
                                                                                            conn.sobject("Account").create(allBuyerDetails,
                                                                                                function (err, rets) {
                                                                                                    if (err) { return console.error(err); }
                                                                                                    for (var i = 0; i < rets.length; i++) {
                                                                                                        if (rets[i].success) {
                                                                                                            console.log("Created record id Account 1: " + rets[i].id);
                                                                                                        }
                                                                                                    }
                                                                                                    conInsertion();
                                                                                                });
                                                                                        }
                                                                                        else if (result.records.length > 0) {
                                                                                            res.redirect('/index');
                                                                                            for (let i in result.records) {
                                                                                                for (let j in allBuyerDetails) {
                                                                                                    if (result.records[i].ERP7__Email__c == allBuyerDetails[j].ERP7__Email__c) {
                                                                                                        let acclist = {
                                                                                                            Id: result.records[i].Id,
                                                                                                            ERP7__Email__c: allBuyerDetails[j].ERP7__Email__c,
                                                                                                            Name: allBuyerDetails[j].Name,
                                                                                                            ERP7__Order_Profile__c: allBuyerDetails[j].ERP7__Order_Profile__c,
                                                                                                            ERP7__Account_Profile__c: allBuyerDetails[j].ERP7__Account_Profile__c,
                                                                                                            ERP7__Account_Type__c: allBuyerDetails[j].ERP7__Account_Type__c
                                                                                                        }
                                                                                                        accExist.push(acclist);
                                                                                                        accEmailExist.push(allBuyerDetails[j].ERP7__Email__c)
                                                                                                    }
                                                                                                }
                                                                                            }

                                                                                            // console.log('Exist ' + accEmailExist)
                                                                                            for (let i in allBuyerDetails) {
                                                                                                if (!accEmailExist.includes(allBuyerDetails[i].ERP7__Email__c)) accNotExist.push(allBuyerDetails[i])
                                                                                            }
                                                                                            // console.log('accExist' + JSON.stringify(accExist))

                                                                                            if (accNotExist != []) {
                                                                                                conn.sobject("Account").create(accNotExist,
                                                                                                    function (err, rets) {
                                                                                                        if (err) { return console.error(err); }
                                                                                                        for (var i = 0; i < rets.length; i++) {
                                                                                                            if (rets[i].success) {
                                                                                                                console.log("Created record id Account 2: " + rets[i].id);
                                                                                                            }
                                                                                                        }
                                                                                                    });
                                                                                            }

                                                                                            if (accExist != []) {
                                                                                                conn.sobject("Account").update(accExist,
                                                                                                    function (err, rets) {
                                                                                                        if (err) { return console.error(err); }
                                                                                                        for (var i = 0; i < rets.length; i++) {
                                                                                                            if (rets[i].success) {
                                                                                                                console.log("Updated Successfully Account : " + rets[i].id);
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
                                                                                req.flash('error_msg', `• Customer's Not Found`);
                                                                                return res.redirect('/amazon');
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
                                            function conInsertion() {

                                                var accUpExist = [];
                                                var conExist = [];
                                                var conEmailExist = [];
                                                var conNotExist = [];
                                                setTimeout(async function () {
                                                    conn.query("SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c, ERP7__Account_Type__c FROM Account WHERE ERP7__Email__c IN ('" + buyerEmailInfo.join("','") + "')", function (err, result) {
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
                                                                let acclist = {
                                                                    AccountId: result.records[i].Id,
                                                                    Email: result.records[i].ERP7__Email__c,
                                                                    LastName: result.records[i].Name,
                                                                }
                                                                accUpExist.push(acclist);
                                                                accIdExist.push(result.records[i].Id)
                                                            }
                                                            // console.log('accUpExist' + JSON.stringify(accUpExist))

                                                            accUpExist = accUpExist.filter(function ({ name, date, amt }) {
                                                                var key = `${name}${date}${amt}`;
                                                                return !this.has(key) && this.add(key);
                                                            }, new Set);

                                                            conn.query("SELECT Id, AccountId, LastName, Email FROM Contact WHERE AccountId IN ('" + accIdExist.join("','") + "')", function (err, result) {
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
                                                                    conn.sobject("Contact").create(accUpExist,
                                                                        async function (err, rets) {
                                                                            if (err) { return console.error(err); }
                                                                            for (var i = 0; i < rets.length; i++) {
                                                                                if (rets[i].success) {
                                                                                    console.log("Created record id contact 1: " + rets[i].id);
                                                                                }
                                                                            }
                                                                            var date = new Date();
                                                                            var updatedDate = date.toLocaleString('en-US', { weekday: 'short', day: 'numeric', year: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric', second: 'numeric' })
                                                                            pool.query('INSERT INTO jobs_log (email, updated_at, category, message, amazon_app_client_id) VALUES ($1, $2, $3, $4, $5, $6)', [Email, updatedDate, 'amazon', 'Customer Sync', ClientId]);
                                                                            // var exeLen = parseInt(z) + 1;
                                                                            // SuccessToGo(exeLen);
                                                                        });
                                                                }
                                                                else if (result.records.length > 0) {
                                                                    for (let i in result.records) {
                                                                        for (let j in accUpExist) {
                                                                            if (result.records[i].Email == accUpExist[j].Email) {
                                                                                let acclist = {
                                                                                    Id: result.records[i].Id,
                                                                                    AccountId: result.records[i].AccountId,
                                                                                    Email: accUpExist[j].Email,
                                                                                    LastName: accUpExist[j].LastName
                                                                                }
                                                                                conExist.push(acclist);
                                                                                conEmailExist.push(accUpExist[j].Email)
                                                                            }
                                                                        }
                                                                    }
                                                                    // console.log('Exist ' + conExist)
                                                                    for (let i in accUpExist) {
                                                                        if (!conEmailExist.includes(accUpExist[i].Email)) conNotExist.push(accUpExist[i])
                                                                    }
                                                                    // console.log('conNotExist' + JSON.stringify(conNotExist))

                                                                    if (conNotExist != []) {
                                                                        conn.sobject("Contact").create(conNotExist,
                                                                            function (err, rets) {
                                                                                if (err) { return console.error(err); }
                                                                                for (var i = 0; i < rets.length; i++) {
                                                                                    if (rets[i].success) {
                                                                                        console.log("Created record id contact 2: " + rets[i].id);
                                                                                    }
                                                                                }
                                                                            })
                                                                    }

                                                                    if (conExist != []) {
                                                                        conn.sobject("Contact").update(conExist,
                                                                            async function (err, rets) {
                                                                                if (err) { return console.error(err); }
                                                                                for (var i = 0; i < rets.length; i++) {
                                                                                    if (rets[i].success) {
                                                                                        console.log("Updated Successfully Contact : " + rets[i].id);
                                                                                    }
                                                                                }
                                                                                var date = new Date();
                                                                                var updatedDate = date.toLocaleString('en-US', { weekday: 'short', day: 'numeric', year: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric', second: 'numeric' })
                                                                                pool.query('INSERT INTO jobs_log (email, updated_at, category, message, amazon_app_client_id) VALUES ($1, $2, $3, $4, $5, $6)', [Email, updatedDate, 'amazon', 'Customer Sync', ClientId]);
                                                                                // var exeLen = parseInt(z) + 1;
                                                                                // SuccessToGo(exeLen);
                                                                            });
                                                                    }
                                                                }
                                                                // console.log('Length' + result.records.length)
                                                            })
                                                        }
                                                    })
                                                }, 3000 * z);
                                            }
                                        }
                                    }
                                }
                            }, 2000 * z);
                        }
                        // function SuccessToGo(exeLen) {
                        //     if (result.rows.length === exeLen) {
                        //         req.flash('success_msg', `• Customer's Synced`);
                        //         return res.redirect('/amazon');
                        //     }
                        // }
                    }
                }))
                client.release();
            })
        } catch (e) {
            console.log('Error-> ', e);
        }
    })();
}