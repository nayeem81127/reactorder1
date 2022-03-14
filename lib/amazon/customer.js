const express = require("express")
const app = express()
const jsforce = require('jsforce')
const salesLogin = require('../routes')
const SellingPartnerAPI = require('amazon-sp-api');
app.use(express.static('public'));

module.exports = function (app) {

    var buyerEmailInfo = [];
    var accIdExist = [];
    function conInsertion(oauth_token, instance_url, addressTrue) {
        var conn = new jsforce.Connection({
            accessToken: oauth_token,
            instanceUrl: instance_url
        });

        var accUpExist = [];
        var conExist = [];
        var conEmailExist = [];
        var conNotExist = [];
        conn.query("SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c, ERP7__Account_Type__c FROM Account WHERE ERP7__Email__c IN ('" + buyerEmailInfo.join("','") + "')", function (err, result) {
            if (err) { return console.error(err); }

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

                conn.query("SELECT Id, AccountId, LastName, Email FROM Contact WHERE AccountId IN ('" + accIdExist.join("','") + "')", function (err, result) {
                    if (err) { return console.error(err); }

                    if (result.records.length == 0) {
                        for (let i in result.records) {
                            conEmailExist.push(result.records[i].Email)
                        }
                        for (let i in accUpExist) {
                            if (!conEmailExist.includes(accUpExist[i].Email)) conNotExist.push(accUpExist[i])
                        }
                        // console.log('conNotExist ' + JSON.stringify(conNotExist))

                        conn.sobject("Contact").create(conNotExist,
                            function (err, rets) {
                                if (err) { return console.error(err); }
                                for (var i = 0; i < rets.length; i++) {
                                    if (rets[i].success) {
                                        console.log("Created record id contact 1: " + rets[i].id);
                                    }
                                }
                            });
                    }
                    else if (result.records.length > 0) {
                        for (let i in result.records) {
                            let acclist = {
                                Id: result.records[i].Id,
                                AccountId: result.records[i].AccountId,
                                Email: result.records[i].Email,
                                LastName: result.records[i].LastName
                            }
                            conExist.push(acclist);
                            conEmailExist.push(result.records[i].Email)
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
                                function (err, rets) {
                                    if (err) { return console.error(err); }
                                    for (var i = 0; i < rets.length; i++) {
                                        if (rets[i].success) {
                                            console.log("Updated Successfully Contact : " + rets[i].id);
                                        }
                                    }
                                });
                        }

                    }
                    // console.log('Length' + result.records.length)
                })
            }
        })
    }

    app.post('/amazonCustomerSync', salesLogin, async function (req, res, next) {
        var Region = 'eu';
        var RefreshToken = req.user.refresh_token;;
        var ClientId = req.user.amazon_app_client_id;
        var ClientSecret = req.user.amazon_app_client_secret;
        var AWSAccessKey = req.user.aws_access_key;
        var AWSSecretAccessKey = req.user.aws_secret_access_key;
        var AWSSellingPartnerRole = req.user.aws_selling_partner_role;

        var Aqxolt_Customer = req.user.aqxolt_customer;
        var Aqxolt_Order_Profile = req.user.aqxolt_order_profile;
        var oauth_token = req.user.oauth_token;
        var instance_url = req.user.instance_url;

        var conn = new jsforce.Connection({
            accessToken: oauth_token,
            instanceUrl: instance_url
        });

        if (!Aqxolt_Order_Profile && !Aqxolt_Customer && !RefreshToken || !ClientId || !ClientSecret || !AWSAccessKey || !AWSSecretAccessKey || !AWSSellingPartnerRole) {
            req.flash('error_msg', '• Order Profile, Customer And Amazon Credentials are Missing');
            return res.redirect('/amazon')
        }
        else if (!RefreshToken || !ClientId || !ClientSecret || !AWSAccessKey || !AWSSecretAccessKey || !AWSSellingPartnerRole) {
            req.flash('error_msg', '• Amazon Credentials are Missing');
            return res.redirect('/amazon')
        }
        else if (!Aqxolt_Order_Profile) {
            req.flash('error_msg', '• Order Profile is Empty in Aqxolt Info');
            return res.redirect('/amazon')
        }
        else if (!Aqxolt_Customer) {
            req.flash('error_msg', '• Aqxolt Customer is Empty in Aqxolt Info');
            return res.redirect('/amazon')
        }
        else if (!Aqxolt_Customer && !Aqxolt_Order_Profile) {
            req.flash('error_msg', '• Aqxolt Customer And Order Profile is Empty in Aqxolt Info');
            return res.redirect('/amazon')
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

            let resS = await sellingPartner.callAPI({
                operation: 'getOrders',
                endpoint: 'orders',
                query: {
                    MarketplaceIds: req.user.marketplace_id,
                    LastUpdatedAfter: '2020-09-26'
                }
            });
            // console.log('Response Order->', JSON.stringify(resS.Orders));

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

            for (let i in allBuyerDetails) {
                buyerEmailInfo.push(allBuyerDetails[i].ERP7__Email__c)
            }
            // console.log('email ' + email)
            var accExist = [];
            var accEmailExist = [];
            var accNotExist = [];
            var addressTrue = false;

            conn.query("SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c,ERP7__Account_Type__c FROM Account WHERE ERP7__Email__c IN ('" + buyerEmailInfo.join("','") + "')", function (err, result) {
                if (err) { return console.error(err); }

                if (result.records.length == 0) {
                    for (let i in allBuyerDetails) {
                        if (!accEmailExist.includes(allBuyerDetails[i].ERP7__Email__c)) {
                            accNotExist.push(allBuyerDetails[i])
                        }
                    }
                    // console.log('accNotExist' + JSON.stringify(accNotExist));

                    conn.sobject("Account").create(accNotExist,
                        function (err, rets) {
                            if (err) { return console.error(err); }
                            for (var i = 0; i < rets.length; i++) {
                                if (rets[i].success) {
                                    console.log("Created record id Account 1: " + rets[i].id);
                                }
                            }
                            conInsertion(oauth_token, instance_url, addressTrue);
                        });
                }
                else if (result.records.length > 0) {
                    for (let i in result.records) {
                        let acclist = {
                            Id: result.records[i].Id,
                            ERP7__Email__c: result.records[i].ERP7__Email__c,
                            Name: result.records[i].Name,
                            ERP7__Order_Profile__c: result.records[i].ERP7__Order_Profile__c,
                            ERP7__Account_Profile__c: result.records[i].ERP7__Account_Profile__c,
                            ERP7__Account_Type__c: result.records[i].ERP7__Account_Type__c
                        }
                        accExist.push(acclist);
                        accEmailExist.push(result.records[i].ERP7__Email__c)
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
                                conInsertion(oauth_token, instance_url, addressTrue);
                            });
                    }
                }
            });
            req.flash('success_msg', `• Customer's Synced`);
        }
        res.redirect('/amazon');
    })
}