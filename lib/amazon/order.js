const express = require("express")
const app = express()
const jsforce = require('jsforce')
const salesLogin = require('../routes')
const SellingPartnerAPI = require('amazon-sp-api');
app.use(express.static('public'));

module.exports = function (app) {

    app.post('/amazonOrderSync', salesLogin, async function (req, res, next) {
        var Region = 'eu';
        var RefreshToken = req.user.refresh_token;;
        var ClientId = req.user.amazon_app_client_id;
        var ClientSecret = req.user.amazon_app_client_secret;
        var AWSAccessKey = req.user.aws_access_key;
        var AWSSecretAccessKey = req.user.aws_secret_access_key;
        var AWSSellingPartnerRole = req.user.aws_selling_partner_role;

        var Aqxolt_Customer = req.user.aqxolt_customer;
        var Aqxolt_Channel = req.user.aqxolt_channel;
        var Aqxolt_Order_Profile = req.user.aqxolt_order_profile;
        var oauth_token = req.user.oauth_token;
        var instance_url = req.user.instance_url;

        var conn = new jsforce.Connection({
            accessToken: oauth_token,
            instanceUrl: instance_url
        });

        if (!Aqxolt_Channel && !Aqxolt_Order_Profile && !Aqxolt_Customer && !RefreshToken || !ClientId || !ClientSecret || !AWSAccessKey || !AWSSecretAccessKey || !AWSSellingPartnerRole) {
            req.flash('error_msg', '• Order Profile, Customer, Channel And Amazon Credentials are Missing');
            return res.redirect('/amazon')
        }
        else if (!RefreshToken || !ClientId || !ClientSecret || !AWSAccessKey || !AWSSecretAccessKey || !AWSSellingPartnerRole) {
            req.flash('error_msg', '• Amazon Credentials are Missing');
            return res.redirect('/amazon')
        }
        else if (!Aqxolt_Channel) {
            req.flash('error_msg', '• Aqxolt Channel is Empty in Aqxolt Info');
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
        else if (!Aqxolt_Customer && !Aqxolt_Order_Profile && !Aqxolt_Channel) {
            req.flash('error_msg', '• Aqxolt Customer, Channel And Order Profile is Empty in Aqxolt Info');
            return res.redirect('/amazon')
        }
        else if (Aqxolt_Customer && Aqxolt_Order_Profile && Aqxolt_Channel && RefreshToken && ClientId && ClientSecret && AWSAccessKey && AWSSecretAccessKey && AWSSellingPartnerRole) {

            console.log('Region->' + Region);
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
            // console.log('Response ->', JSON.stringify(resS.Orders));

            var AmazonOrderIdList = [];
            for (let i in resS.Orders) {
                if (resS.Orders[i].AmazonOrderId != "") AmazonOrderIdList.push(resS.Orders[i].AmazonOrderId);
            }
            // console.log('Response AmazonOrderId ->', JSON.stringify(AmazonOrderIdList));

            var BuyerInfo = [];
            for (let i in AmazonOrderIdList) {
                var BuyerDetails = await sellingPartner.callAPI({
                    operation: 'getOrderBuyerInfo',

                    path: {
                        orderId: AmazonOrderIdList[i]
                    }
                });
                BuyerInfo.push(BuyerDetails);
                // console.log('Response BuyerInfo ->', JSON.stringify(BuyerDetails));
            }

            var AddressInfo = [];
            for (let i in AmazonOrderIdList) {
                var OrderAddress = await sellingPartner.callAPI({
                    operation: 'getOrderAddress',

                    path: {
                        orderId: AmazonOrderIdList[i]
                    }
                });
                AddressInfo.push(OrderAddress);
                // console.log('Response OrderAddress ->', JSON.stringify(OrderAddress));
            }

            var OrderItems = [];
            for (let i in AmazonOrderIdList) {
                var getOrderItems = await sellingPartner.callAPI({
                    operation: 'getOrderItems',

                    path: {
                        orderId: AmazonOrderIdList[i]
                    }
                });
                OrderItems.push(getOrderItems);
                // console.log('Response OrderItems ->', JSON.stringify(getOrderItems));
            }

            var asinValue = [];
            if (OrderItems != []) {
                for (let i in OrderItems) {
                    if (OrderItems[i].OrderItems[0].ASIN != '') {
                        asinValue.push(OrderItems[i].OrderItems[0].ASIN)
                    }
                }
            }

            const uniqVal = (value, index, self) => {
                return self.indexOf(value) === index
            }

            const asinId = asinValue.filter(uniqVal)
            // console.log(asinId)

            var prodBrand = [];
            for (let i in asinId) {
                var CatalogItem = await sellingPartner.callAPI({
                    operation: 'getCatalogItem',
                    path: {
                        asin: asinId[i]
                    },
                    query: {
                        MarketplaceId: 'A1F83G8C2ARO7P'
                    }
                })
                prodBrand.push(CatalogItem);
                // console.log('Response CatalogItem ->', JSON.stringify(CatalogItem));
            }

            var Pricing = [];
            for (let i in asinId) {
                var prodPrice = await sellingPartner.callAPI({
                    operation: 'getPricing',
                    query: {
                        MarketplaceId: 'A1F83G8C2ARO7P',
                        ItemType: 'Asin',
                        Asins: asinId[i]
                    }
                })
                Pricing.push(prodPrice[0].Product);
                // console.log('Response Product Price ->', JSON.stringify(prodPrice));
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
            var accIdExist = [];
            var accUpExist = [];

            for (let i in allBuyerDetails) {
                buyerEmailInfo.push(allBuyerDetails[i].ERP7__Email__c)
            }
            // console.log('email ' + email)
            var accExist = [];
            var accEmailExist = [];
            var accNotExist = [];

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
                            conInsertion();
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
                                conInsertion();
                            });
                    }
                }
            });

            function conInsertion() {
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
                                // for (let i in result.records) {
                                //     conEmailExist.push(result.records[i].Email)
                                // }
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
                                        addressInsertion()
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
                                            addressInsertion()
                                        });
                                }

                            }
                            // console.log('Length' + result.records.length)
                        })
                    }
                })
            }

            var curContactExist = [];
            function addressInsertion() {
                var AddressAvailable = [];
                if (AddressInfo != []) {
                    for (let i in BuyerInfo) {
                        for (let j in AddressInfo) {
                            if (BuyerInfo[i].AmazonOrderId === AddressInfo[j].AmazonOrderId) {
                                if (AddressInfo[j].ShippingAddress != undefined) {
                                    if (BuyerInfo[i].BuyerEmail != undefined && BuyerInfo[i].BuyerEmail != '') {
                                        if (AddressInfo[j].ShippingAddress.PostalCode != '' && AddressInfo[j].ShippingAddress.City) {
                                            var addressList = {
                                                BuyerEmail: BuyerInfo[i].BuyerEmail,
                                                StateOrRegion: AddressInfo[j].ShippingAddress.StateOrRegion,
                                                PostalCode: AddressInfo[j].ShippingAddress.PostalCode,
                                                City: AddressInfo[j].ShippingAddress.City,
                                                CountryCode: AddressInfo[j].ShippingAddress.CountryCode
                                            }
                                            AddressAvailable.push(addressList)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // console.log('AddressAvailable ' + JSON.stringify(AddressAvailable))
                }


                conn.query("SELECT Id, Name, Email, AccountId FROM Contact WHERE AccountId IN ('" + accIdExist.join("','") + "')", function (err, result) {
                    if (err) { return console.error(err); }

                    if (result.records.length > 0) {
                        for (let i in result.records) {
                            var conList = {
                                Name: result.records[i].Name,
                                ContactId: result.records[i].Id,
                                AccountId: result.records[i].AccountId,
                                Email: result.records[i].Email
                            }
                            curContactExist.push(conList)
                        }

                        var addInsert = [];
                        if (AddressAvailable != []) {
                            if (curContactExist != []) {
                                for (let i in AddressAvailable) {
                                    for (let j in curContactExist) {
                                        if (AddressAvailable[i].BuyerEmail == curContactExist[j].Email) {
                                            var list = {
                                                Name: AddressAvailable[i].PostalCode + ' ' + AddressAvailable[i].City,
                                                ERP7__Contact__c: curContactExist[j].ContactId,
                                                ERP7__Customer__c: curContactExist[j].AccountId,
                                                ERP7__City__c: AddressAvailable[i].City,
                                                ERP7__Country__c: AddressAvailable[i].CountryCode,
                                                ERP7__Postal_Code__c: AddressAvailable[i].PostalCode,
                                                ERP7__State__c: AddressAvailable[i].StateOrRegion,
                                            }
                                            addInsert.push(list)
                                        }
                                    }
                                }
                            }
                        }

                        var addIdExist = [];
                        var addNotExist = [];
                        // console.log('addInsert ' + JSON.stringify(addInsert))
                        conn.query("SELECT Id, Name, ERP7__Customer__c, ERP7__Contact__c, ERP7__City__c, ERP7__Country__c, ERP7__Postal_Code__c, ERP7__State__c FROM ERP7__Address__c WHERE ERP7__Customer__c IN ('" + accIdExist.join("','") + "')", function (err, result) {
                            if (err) { return console.error(err); }
                            if (result.records.length == 0) {
                                for (let i in addInsert) {
                                    if (!addIdExist.includes(addInsert[i].ERP7__Customer__c)) addNotExist.push(addInsert[i])
                                }
                                if (addNotExist != []) {
                                    conn.sobject("ERP7__Address__c").create(addNotExist,
                                        function (err, rets) {
                                            if (err) { return console.error(err); }
                                            for (var i = 0; i < rets.length; i++) {
                                                if (rets[i].success) {
                                                    console.log("Created record id Address 1: " + rets[i].id);
                                                }
                                            }
                                            orderInsertion();
                                        });
                                }
                            }
                            else if (result.records.length > 0) {
                                var addExist = [];
                                for (let i in result.records) {
                                    var list = {
                                        Id: result.records[i].Id,
                                        ERP7__Contact__c: result.records[i].ERP7__Contact__c,
                                        ERP7__City__c: result.records[i].ERP7__City__c,
                                        ERP7__Country__c: result.records[i].ERP7__Country__c,
                                        ERP7__Postal_Code__c: result.records[i].ERP7__Postal_Code__c,
                                        ERP7__State__c: result.records[i].ERP7__State__c
                                    }
                                    addExist.push(list)
                                    addIdExist.push(result.records[i].ERP7__Customer__c)
                                }

                                for (let i in addInsert) {
                                    if (!addIdExist.includes(addInsert[i].ERP7__Customer__c)) addNotExist.push(addInsert[i])
                                }

                                if (addNotExist != []) {
                                    conn.sobject("ERP7__Address__c").create(addNotExist,
                                        function (err, rets) {
                                            if (err) { return console.error(err); }
                                            for (var i = 0; i < rets.length; i++) {
                                                if (rets[i].success) {
                                                    console.log("Created record id Address 1: " + rets[i].id);
                                                }
                                            }
                                        });
                                }

                                if (addExist != []) {
                                    conn.sobject("ERP7__Address__c").update(addExist,
                                        function (err, rets) {
                                            if (err) { return console.error(err); }
                                            for (var i = 0; i < rets.length; i++) {
                                                if (rets[i].success) {
                                                    console.log("Updated Successfully Address : " + rets[i].id);
                                                }
                                            }
                                            orderInsertion();
                                        });
                                }
                            }
                        })
                    }
                })
            }

            var pricebook_id;
            var orderId = [];
            function orderInsertion() {

                conn.query("SELECT Id, Name, ERP7__Customer__c, ERP7__Contact__c, ERP7__City__c, ERP7__Country__c, ERP7__Postal_Code__c, ERP7__State__c FROM ERP7__Address__c WHERE ERP7__Customer__c IN ('" + accIdExist.join("','") + "')", function (err, result) {
                    if (err) { return console.error(err); }

                    if (result.records.length > 0) {
                        var AddressIdCur = [];
                        for (let i in result.records) {
                            var list = {
                                AddressId: result.records[i].Id,
                                AccountId: result.records[i].ERP7__Customer__c
                            }
                            AddressIdCur.push(list)
                        }

                        conn.query(`SELECT ERP7__Price_Book__c FROM ERP7__Profiling__c where Id='${Aqxolt_Order_Profile}'`, (err, result) => {
                            if (err) { return console.error(err); }

                            if (result.records.length > 0) {
                                pricebook_id = result.records[0].ERP7__Price_Book__c;

                                var OrderAvailable = [];
                                if (BuyerInfo != [] && OrderItems != [] && curContactExist != [] && AddressIdCur != [] && resS.Orders != []) {
                                    for (let i in BuyerInfo) {
                                        for (let j in OrderItems) {
                                            for (let k in resS.Orders) {
                                                for (let l in curContactExist) {
                                                    for (let m in AddressIdCur) {
                                                        if (BuyerInfo[i].AmazonOrderId === OrderItems[j].AmazonOrderId) {
                                                            if (BuyerInfo[i].AmazonOrderId === resS.Orders[k].AmazonOrderId) {
                                                                if (BuyerInfo[i].BuyerEmail != undefined && BuyerInfo[i].BuyerEmail != '') {
                                                                    if (BuyerInfo[i].BuyerEmail === curContactExist[l].Email) {
                                                                        if (curContactExist[l].AccountId === AddressIdCur[m].AccountId) {
                                                                            var List = {
                                                                                ERP7__E_Order_Id__c: OrderItems[j].AmazonOrderId,
                                                                                Name: OrderItems[j].AmazonOrderId,
                                                                                ERP7__Amount__c: resS.Orders[k].OrderTotal.Amount,
                                                                                ERP7__Customer_Email__c: BuyerInfo[i].BuyerEmail,
                                                                                ERP7__Customer_Purchase_Order_Date__c: resS.Orders[k].PurchaseDate,
                                                                                ERP7__Estimated_Shipping_Amount__c: OrderItems[j].OrderItems[0].ShippingPrice != undefined && OrderItems[j].OrderItems[0].ShippingPrice != '' ? OrderItems[j].OrderItems[0].ShippingPrice.Amount : null,
                                                                                Status: 'Draft',
                                                                                Type: 'Amazon',
                                                                                ERP7__Order_Profile__c: Aqxolt_Order_Profile,
                                                                                ERP7__Channel__c: Aqxolt_Channel,
                                                                                ERP7__Contact__c: curContactExist[l].ContactId,
                                                                                AccountId: curContactExist[l].AccountId,
                                                                                ERP7__Ship_To_Address__c: AddressIdCur[m].AddressId,
                                                                                ERP7__Bill_To_Address__c: AddressIdCur[m].AddressId,
                                                                                EffectiveDate: resS.Orders[k].PurchaseDate,
                                                                                Pricebook2Id: pricebook_id
                                                                            }
                                                                            OrderAvailable.push(List)
                                                                            orderId.push(OrderItems[j].AmazonOrderId)
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }


                                var orderNotExist = [];
                                var orderExist = [];
                                var orderIdExist = [];
                                conn.query("SELECT Id, Name, ERP7__E_Order_Id__c, ERP7__Amount__c, ERP7__Customer_Email__c, ERP7__Customer_Purchase_Order_Date__c, ERP7__Estimated_Shipping_Amount__c, Status, Type, ERP7__Order_Profile__c, ERP7__Channel__c, ERP7__Contact__c, AccountId, ERP7__Ship_To_Address__c, ERP7__Bill_To_Address__c, Pricebook2Id FROM Order WHERE ERP7__E_Order_Id__c IN ('" + orderId.join("','") + "')", (err, result) => {
                                    if (err) { return console.error(err); }
                                    // console.log(result.records.length)
                                    if (result.records.length == 0) {
                                        if (OrderAvailable != []) {
                                            conn.sobject("Order").create(OrderAvailable,
                                                function (err, rets) {
                                                    if (err) { return console.error(err); }
                                                    for (var i = 0; i < rets.length; i++) {
                                                        if (rets[i].success) {
                                                            console.log("Created record id Order: " + rets[i].id);
                                                        }
                                                    }
                                                    productInsert();
                                                });
                                        }
                                    }
                                    else if (result.records.length > 0) {
                                        for (let i in result.records) {
                                            let list = {
                                                Id: result.records[i].Id,
                                                ERP7__E_Order_Id__c: result.records[i].ERP7__E_Order_Id__c,
                                                Name: result.records[i].Name,
                                                ERP7__Amount__c: result.records[i].ERP7__Amount__c,
                                                ERP7__Customer_Email__c: result.records[i].ERP7__Customer_Email__c,
                                                ERP7__Customer_Purchase_Order_Date__c: result.records[i].ERP7__Customer_Purchase_Order_Date__c,
                                                ERP7__Estimated_Shipping_Amount__c: result.records[i].ERP7__Estimated_Shipping_Amount__c,
                                                Status: result.records[i].Status,
                                                Type: result.records[i].Type,
                                                ERP7__Order_Profile__c: result.records[i].ERP7__Order_Profile__c,
                                                ERP7__Channel__c: result.records[i].ERP7__Channel__c,
                                                ERP7__Contact__c: result.records[i].ERP7__Contact__c,
                                                AccountId: result.records[i].AccountId,
                                                ERP7__Ship_To_Address__c: result.records[i].ERP7__Ship_To_Address__c,
                                                ERP7__Bill_To_Address__c: result.records[i].ERP7__Bill_To_Address__c,
                                                EffectiveDate: result.records[i].EffectiveDate,
                                                Pricebook2Id: result.records[i].Pricebook2Id
                                            }
                                            orderExist.push(list);
                                            orderIdExist.push(result.records[i].ERP7__E_Order_Id__c)
                                        }

                                        for (let i in OrderAvailable) {
                                            if (!orderIdExist.includes(OrderAvailable[i].ERP7__E_Order_Id__c)) orderNotExist.push(OrderAvailable[i])
                                        }
                                        // console.log('orderNotExist' + JSON.stringify(orderNotExist))

                                        if (orderNotExist != []) {
                                            conn.sobject("Order").create(orderNotExist,
                                                function (err, rets) {
                                                    if (err) { return console.error(err); }
                                                    for (var i = 0; i < rets.length; i++) {
                                                        if (rets[i].success) {
                                                            console.log("Created record id Order 1: " + rets[i].id);
                                                        }
                                                    }
                                                });
                                        }

                                        if (orderExist != []) {
                                            conn.sobject("Order").update(orderExist,
                                                function (err, rets) {
                                                    if (err) { return console.error(err); }
                                                    for (var i = 0; i < rets.length; i++) {
                                                        if (rets[i].success) {
                                                            console.log("Updated record id Order: " + rets[i].id);
                                                        }
                                                    }
                                                    productInsert();
                                                });
                                        }
                                    }
                                })
                            }
                        })
                    }
                })
            }

            var SellerSKUId = [];
            function productInsert() {

                var prodAvailable = [];
                var Amazon = true;
                var isActive = true;
                var trackInventory = true;
                if (OrderItems != [] && prodBrand != [] && Pricing != []) {
                    for (let i in OrderItems) {
                        for (let j in prodBrand) {
                            for (let k in Pricing) {
                                if (OrderItems[i].OrderItems[0].ASIN === prodBrand[j].Identifiers.MarketplaceASIN.ASIN) {
                                    if (OrderItems[i].OrderItems[0].ASIN === Pricing[k].Identifiers.MarketplaceASIN.ASIN) {
                                        var list = {
                                            StockKeepingUnit: OrderItems[i].OrderItems[0].SellerSKU,
                                            ERP7__Submitted_to_Amazon__c: true,
                                            ERP7__Amazon__c: Amazon,
                                            Name: OrderItems[i].OrderItems[0].Title,
                                            ERP7__SKU__c: OrderItems[i].OrderItems[0].SellerSKU,
                                            ERP7__ASIN_Code__c: OrderItems[i].OrderItems[0].ASIN,
                                            ERP7__Price_Entry_Amount__c: OrderItems[i].OrderItems[0].ItemPrice.Amount,
                                            ERP7__Brand__c: prodBrand[j].AttributeSets[0].Brand,
                                            ERP7__Manufacturer__c: prodBrand[j].AttributeSets[0].Manufacturer,
                                            Family: prodBrand[j].AttributeSets[0].ProductTypeName,
                                            IsActive: isActive,
                                            ERP7__Track_Inventory__c: trackInventory
                                        }
                                        prodAvailable.push(list)
                                        SellerSKUId.push(OrderItems[i].OrderItems[0].SellerSKU)
                                    }
                                }
                            }
                        }
                    }
                }

                var productExist = [];
                var productIdExist = [];
                var productNotExist = [];
                conn.query("SELECT Id, ERP7__Amazon__c, Name, StockKeepingUnit, ERP7__SKU__c, ERP7__ASIN_Code__c, ERP7__Submitted_to_Amazon__c, ERP7__Price_Entry_Amount__c, ERP7__Brand__c, ERP7__Manufacturer__c, Family, IsActive, ERP7__Track_Inventory__c FROM Product2 WHERE StockKeepingUnit IN ('" + SellerSKUId.join("','") + "')", function (err, result) {
                    if (err) { return console.error(err); }
                    // console.log(result.records.length)
                    if (result.records.length == 0) {
                        if (prodAvailable != []) {
                            conn.sobject("Product2").create(prodAvailable,
                                function (err, rets) {
                                    if (err) { return console.error(err); }
                                    for (var i = 0; i < rets.length; i++) {
                                        if (rets[i].success) {
                                            console.log("Created record id Product: " + rets[i].id);
                                        }
                                    }
                                    priceBookEntryInsert();
                                });
                        }
                    }
                    else if (result.records.length > 0) {
                        for (let i in result.records) {
                            var list = {
                                Id: result.records[i].Id,
                                StockKeepingUnit: result.records[i].StockKeepingUnit,
                                Name: result.records[i].Name,
                                ERP7__Amazon__c: result.records[i].ERP7__Amazon__c,
                                ERP7__SKU__c: result.records[i].ERP7__SKU__c,
                                ERP7__ASIN_Code__c: result.records[i].ERP7__ASIN_Code__c,
                                ERP7__Price_Entry_Amount__c: result.records[i].ERP7__Price_Entry_Amount__c,
                                ERP7__Brand__c: result.records[i].ERP7__Brand__c,
                                ERP7__Manufacturer__c: result.records[i].ERP7__Manufacturer__c,
                                Family: result.records[i].Family,
                                IsActive: result.records[i].IsActive,
                                ERP7__Track_Inventory__c: result.records[i].ERP7__Track_Inventory__c,
                                ERP7__Submitted_to_Amazon__c: result.records[i].ERP7__Submitted_to_Amazon__c
                            }
                            productExist.push(list)
                            productIdExist.push(result.records[i].StockKeepingUnit)
                        }

                        for (let i in prodAvailable) {
                            if (!productIdExist.includes(prodAvailable[i].StockKeepingUnit)) productNotExist.push(prodAvailable[i])
                        }

                        if (productNotExist != []) {
                            conn.sobject("Product2").create(productNotExist,
                                function (err, rets) {
                                    if (err) { return console.error(err); }
                                    for (var i = 0; i < rets.length; i++) {
                                        if (rets[i].success) {
                                            console.log("Created record id Product: " + rets[i].id);
                                        }
                                    }
                                });
                        }

                        if (productExist != []) {
                            conn.sobject("Product2").update(productExist,
                                function (err, rets) {
                                    if (err) { return console.error(err); }
                                    for (var i = 0; i < rets.length; i++) {
                                        if (rets[i].success) {
                                            console.log("Updated record id Product: " + rets[i].id);
                                        }
                                    }
                                    priceBookEntryInsert();
                                });
                        }
                    }
                })
            }

            var productList = [];
            var prodMainId = [];
            function priceBookEntryInsert() {
                conn.query("SELECT Id, ERP7__ASIN_Code__c FROM Product2 WHERE StockKeepingUnit IN ('" + SellerSKUId.join("','") + "')", function (err, result) {
                    if (err) { return console.error(err); }
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
                            for (let j in Pricing) {
                                if (productList[i].ERP7__ASIN_Code__c === Pricing[j].Identifiers.MarketplaceASIN.ASIN) {
                                    if (Pricing[j].Offers[0].BuyingPrice.ListingPrice.Amount != undefined) {
                                        var list = {
                                            IsActive: isActive,
                                            Pricebook2Id: pricebook_id,
                                            Product2Id: productList[i].Id,
                                            UnitPrice: Pricing[j].Offers[0].BuyingPrice.ListingPrice.Amount
                                        }
                                        priceBookEntryAvail.push(list)
                                    }
                                }
                            }
                        }
                        // console.log('priceBookEntryInsert ' + JSON.stringify(priceBookEntryAvail))

                        conn.query("SELECT Id, Product2Id FROM pricebookentry WHERE isactive = true AND Product2Id IN ('" + prodMainId.join("','") + "') ORDER BY lastmodifieddate", function (err, result) {
                            if (err) { return console.error(err); }

                            // console.log('price ' + result.records.length)
                            if (result.records.length == 0) {
                                if (priceBookEntryAvail != []) {
                                    conn.sobject("pricebookentry").create(priceBookEntryAvail,
                                        function (err, rets) {
                                            if (err) { return console.error(err); }
                                            for (var i = 0; i < rets.length; i++) {
                                                if (rets[i].success) {
                                                    console.log("Created record id Price book Entry: " + rets[i].id);
                                                }
                                            }
                                            orderItemsInsert();
                                        });
                                }
                            }
                            else if (result.records.length > 0) {
                                var priceBookExist = [];
                                var priceBookIdExist = [];
                                var priceNotExist = [];
                                for (let i in result.records) {
                                    for (let j in productList) {
                                        for (let k in Pricing) {
                                            if (result.records[i].Product2Id === productList[j].Id) {
                                                if (productList[j].ERP7__ASIN_Code__c === Pricing[k].Identifiers.MarketplaceASIN.ASIN) {
                                                    if (Pricing[k].Offers[0].BuyingPrice.ListingPrice.Amount != undefined) {
                                                        var list = {
                                                            Id: result.records[i].Id,
                                                            UnitPrice: Pricing[k].Offers[0].BuyingPrice.ListingPrice.Amount
                                                        }
                                                        priceBookExist.push(list)
                                                        priceBookIdExist.push(result.records[i].Id)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                // console.log('priceBookExist ' + JSON.stringify(priceBookExist))

                                for (let i in priceBookEntryAvail) {
                                    if (!priceBookIdExist.includes(priceBookEntryAvail[i].StockKeepingUnit)) priceNotExist.push(priceBookEntryAvail[i])
                                }

                                if (priceNotExist != []) {
                                    conn.sobject("pricebookentry").create(priceNotExist,
                                        function (err, rets) {
                                            if (err) { return console.error(err); }
                                            for (var i = 0; i < rets.length; i++) {
                                                if (rets[i].success) {
                                                    console.log("Created record id Price book Entry: 1" + rets[i].id);
                                                }
                                            }
                                        });
                                }

                                if (priceBookExist != []) {
                                    conn.sobject("pricebookentry").update(priceBookExist,
                                        function (err, rets) {
                                            if (err) { return console.error(err); }
                                            for (var i = 0; i < rets.length; i++) {
                                                if (rets[i].success) {
                                                    console.log("Updated record id Price book Entry 1: " + rets[i].id);
                                                }
                                            }
                                            orderItemsInsert();
                                        });
                                }
                            }
                        })
                    }
                })
            }

            function orderItemsInsert() {
                var OrderIdAvailable = [];
                var OrderAmazId = [];
                var pricebookIdExist = [];
                conn.query("SELECT Id, Product2Id, Pricebook2Id FROM pricebookentry WHERE isactive = true AND Product2Id IN ('" + prodMainId.join("','") + "') ORDER BY lastmodifieddate", function (err, result) {
                    if (err) { return console.error(err); }

                    if (result.records.length > 0) {
                        for (let i in result.records) {
                            var list = {
                                PricebookEntryId: result.records[i].Id,
                                Product2Id: result.records[i].Product2Id
                            }
                            pricebookIdExist.push(list)
                        }


                        conn.query("SELECT Id, ERP7__E_Order_Id__c, Pricebook2Id FROM Order WHERE ERP7__E_Order_Id__c IN ('" + orderId.join("','") + "')", (err, result) => {
                            if (err) { return console.error(err); }
                            // console.log('order ' + result.records.length)
                            if (result.records.length > 0) {
                                for (let i in result.records) {
                                    var list = {
                                        OrderId: result.records[i].Id,
                                        AmazonOrderId: result.records[i].ERP7__E_Order_Id__c
                                    }
                                    OrderAmazId.push(list)
                                    OrderIdAvailable.push(result.records[i].Id)
                                }

                                var orderItemAvailable = [];
                                if (resS.Orders != [] && OrderAmazId != [] && OrderItems != [] && productList != []) {
                                    for (let i in resS.Orders) {
                                        for (let j in OrderAmazId) {
                                            for (let k in OrderItems) {
                                                for (let l in pricebookIdExist) {
                                                    for (let m in productList) {
                                                        if (resS.Orders[i].AmazonOrderId === OrderAmazId[j].AmazonOrderId) {
                                                            if (resS.Orders[i].AmazonOrderId === OrderItems[k].AmazonOrderId) {
                                                                if (OrderItems[k].OrderItems[0].ASIN === productList[m].ERP7__ASIN_Code__c) {
                                                                    if (pricebookIdExist[l].Product2Id === productList[m].Id) {
                                                                        var list = {
                                                                            ERP7__Inventory_Tracked__c: true,
                                                                            ERP7__Active__c: true,
                                                                            OrderId: OrderAmazId[j].OrderId,
                                                                            ERP7__Order_Line_Status__c: (resS.Orders[i].OrderStatus == "Shipped" ? 'Fulfilled' : 'In Progress'),
                                                                            Quantity: OrderItems[k].OrderItems[0].ProductInfo.NumberOfItems,
                                                                            UnitPrice: OrderItems[k].OrderItems[0].ItemPrice.Amount,
                                                                            Product2Id: productList[m].Id,
                                                                            ERP7__Is_Back_Order__c: false,
                                                                            ERP7__Allocate_Stock__c: true,
                                                                            PricebookEntryId: pricebookIdExist[l].PricebookEntryId,
                                                                            ERP7__VAT_Amount__c: (OrderItems[k].OrderItems[0].ItemTax.Amount),
                                                                            ERP7__Total_Price__c: parseFloat(OrderItems[k].OrderItems[0].ItemPrice.Amount * OrderItems[k].OrderItems[0].ProductInfo.NumberOfItems) + parseFloat(OrderItems[k].OrderItems[0].ItemTax.Amount)
                                                                        }
                                                                        orderItemAvailable.push(list)
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    // console.log(orderItemAvailable)
                                }

                                conn.query("SELECT Id, ERP7__Inventory_Tracked__c, ERP7__Active__c, OrderId, ERP7__Order_Line_Status__c, Quantity, UnitPrice, Product2Id, ERP7__Is_Back_Order__c, ERP7__Allocate_Stock__c, PricebookEntryId, ERP7__VAT_Amount__c, ERP7__Total_Price__c FROM OrderItem WHERE OrderId IN ('" + OrderIdAvailable.join("','") + "') AND Product2Id IN ('" + prodMainId.join("','") + "') ", function (err, result) {
                                    if (err) { return console.error(err); }
                                    // console.log(result.records.length)
                                    if (result.records.length == 0) {
                                        if (orderItemAvailable != []) {
                                            conn.sobject("OrderItem").create(orderItemAvailable,
                                                function (err, rets) {
                                                    if (err) { return console.error(err); }
                                                    for (var i = 0; i < rets.length; i++) {
                                                        if (rets[i].success) {
                                                            console.log("Created record id Order Item: 1" + rets[i].id);
                                                        }
                                                    }
                                                });
                                        }
                                    }
                                    else if (result.records.length > 0) {
                                        var orderItemExist = [];
                                        var orderItemIdExist = [];
                                        var orderItemNotExist = [];
                                        for (let i in result.records) {
                                            var list = {
                                                Id: result.records[i].Id,
                                                ERP7__Inventory_Tracked__c: result.records[i].ERP7__Inventory_Tracked__c,
                                                ERP7__Active__c: result.records[i].ERP7__Active__c,
                                                ERP7__Order_Line_Status__c: result.records[i].ERP7__Order_Line_Status__c,
                                                Quantity: result.records[i].Quantity,
                                                UnitPrice: result.records[i].UnitPrice,
                                                ERP7__Is_Back_Order__c: result.records[i].ERP7__Is_Back_Order__c,
                                                ERP7__Allocate_Stock__c: result.records[i].ERP7__Allocate_Stock__c,
                                                ERP7__VAT_Amount__c: result.records[i].ERP7__VAT_Amount__c,
                                                ERP7__Total_Price__c: result.records[i].ERP7__Total_Price__c
                                            }
                                            var list2 = {
                                                OrderId: result.records[i].OrderId,
                                                Product2Id: result.records[i].Product2Id,
                                            }
                                            orderItemExist.push(list)
                                            orderItemIdExist.push(list2)
                                        }

                                        for (let i in orderItemAvailable) {
                                            orderItemNotExist.push(orderItemAvailable[i])
                                        }

                                        for (let i in orderItemAvailable) {
                                            for (let j in orderItemIdExist) {
                                                if (orderItemIdExist[j].OrderId === orderItemAvailable[i].OrderId && orderItemIdExist[j].Product2Id === orderItemAvailable[i].Product2Id) {
                                                    orderItemNotExist.pop(orderItemAvailable[i])
                                                }
                                            }
                                        }

                                        if (orderItemNotExist != []) {
                                            conn.sobject("OrderItem").create(orderItemNotExist,
                                                function (err, rets) {
                                                    if (err) { return console.error(err); }
                                                    for (var i = 0; i < rets.length; i++) {
                                                        if (rets[i].success) {
                                                            console.log("Created record id Order Item: " + rets[i].id);
                                                        }
                                                    }
                                                });
                                        }

                                        if (orderItemExist != []) {
                                            conn.sobject("OrderItem").update(orderItemExist,
                                                function (err, rets) {
                                                    if (err) { return console.error(err); }
                                                    for (var i = 0; i < rets.length; i++) {
                                                        if (rets[i].success) {
                                                            console.log("Updated record id Order Item: " + rets[i].id);
                                                        }
                                                    }
                                                });
                                        }
                                    }
                                })
                            }
                        })
                    }
                })
            }
            req.flash('success_msg', `• Order's Synced`);
        }
        res.redirect('/amazon')
    });
}