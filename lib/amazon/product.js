const express = require("express")
const app = express()
const jsforce = require('jsforce')
const salesLogin = require('../routes')
const SellingPartnerAPI = require('amazon-sp-api');
app.use(express.static('public'));

module.exports = function (app) {

    app.post('/amazonProductSync', salesLogin, async function (req, res, next) {
        var Region = 'eu';
        var RefreshToken = req.user.refresh_token;;
        var ClientId = req.user.amazon_app_client_id;
        var ClientSecret = req.user.amazon_app_client_secret;
        var AWSAccessKey = req.user.aws_access_key;
        var AWSSecretAccessKey = req.user.aws_secret_access_key;
        var AWSSellingPartnerRole = req.user.aws_selling_partner_role;

        var orderProfile = req.user.aqxolt_order_profile;

        var conn = new jsforce.Connection({
            accessToken: req.user.oauth_token,
            instanceUrl: req.user.instance_url
        });

        if (!orderProfile && !RefreshToken || !ClientId || !ClientSecret || !AWSAccessKey || !AWSSecretAccessKey || !AWSSellingPartnerRole) {
            req.flash('error_msg', '• Order Profile And Amazon Credentials are Missing');
            return res.redirect('/amazon')
        }
        else if (!orderProfile) {
            req.flash('error_msg', '• Order Profile is Empty in Aqxolt Info');
            return res.redirect('/amazon')
        }
        else if (!RefreshToken || !ClientId || !ClientSecret || !AWSAccessKey || !AWSSecretAccessKey || !AWSSellingPartnerRole) {
            req.flash('error_msg', '• Amazon Credentials are Missing');
            return res.redirect('/amazon')
        }
        else if (orderProfile && RefreshToken && ClientId && ClientSecret && AWSAccessKey && AWSSecretAccessKey && AWSSellingPartnerRole) {
            console.log('Region->' + Region);
            let sellingPartner = new SellingPartnerAPI({
                region: Region,
                refresh_token: RefreshToken,
                credentials: {
                    SELLING_PARTNER_APP_CLIENT_ID: ClientId,
                    SELLING_PARTNER_APP_CLIENT_SECRET: ClientSecret,
                    AWS_ACCESS_KEY_ID: AWSAccessKey,
                    AWS_SECRET_ACCESS_KEY: AWSSecretAccessKey,
                    AWS_SELLING_PARTNER_ROLE: AWSSellingPartnerRole,
                }
            });

            //Order sync:
            let resS = await sellingPartner.callAPI({
                operation: 'getOrders',
                endpoint: 'orders',
                query: {
                    //details: true,
                    //granularityType: 'Marketplace',
                    MarketplaceIds: 'A1F83G8C2ARO7P',
                    LastUpdatedAfter: '2020-09-26'
                }
            });
            console.log('Response Orders ->', JSON.stringify(resS.Orders));
            var AmazonOrderIdList = [];
            for (let i in resS.Orders) {
                if (resS.Orders[i].AmazonOrderId != "") AmazonOrderIdList.push(resS.Orders[i].AmazonOrderId);
            }

            //Sync OrderItems
            console.log('Response AmazonOrderId ->', JSON.stringify(AmazonOrderIdList));
            var AllItems = [];
            for (let i in AmazonOrderIdList) {
                let OrderItems = await sellingPartner.callAPI({
                    operation: 'getOrderItems',
                    // endpoint:'orders',

                    path: {
                        orderId: AmazonOrderIdList[i]
                    }
                });
                var ProductItems = [];
                AllItems.push(OrderItems);
                console.log('Response ->', JSON.stringify(OrderItems));
            }

            var mainProductIdList = [];
            var mainProductList = [];
            var productList = [];
            var priceBookEntryList = [];
            const priceBookMap = new Map();
            var priceBookEntriesObjectList = [];
            console.log('Response All Items ->', AllItems);
            var OrderItemsList = [];
            if (AllItems != []) {
                for (let i in AllItems) {
                    for (let j in AllItems[i].OrderItems) {
                        OrderItemsList.push(AllItems[i].OrderItems[j]);
                    }
                }
            }

            if (resS != []) {
                var orderDetails = [];
                for (let i in resS.Orders) {
                    if (resS.Orders[i].AmazonOrderId != "") orderDetails.push(resS.Orders[i]);
                }
            }
            console.log('orderDetails Length  ->', orderDetails.length);

            var AllPrice = [];
            for (let i in OrderItemsList) {
                var Priceing = await sellingPartner.callAPI({
                    operation: 'getPricing',
                    query: {
                        MarketplaceId: 'A1F83G8C2ARO7P',
                        ItemType: 'Asin',
                        Asins: OrderItemsList[i].ASIN,
                    }
                })
                AllPrice.push(Priceing[0].Product);
                console.log('Response Pricing ->', JSON.stringify(Priceing));
            }

            console.log('All Price' + JSON.stringify(AllPrice))
            var PriceList = [];
            for (let i in AllPrice) {
                for (let j in AllPrice[i].Offers) {
                    var pList = {
                        Amount: AllPrice[i].Offers[j].BuyingPrice.ListingPrice.Amount,
                        ASIN: AllPrice[i].Identifiers.MarketplaceASIN.ASIN
                    }
                    PriceList.push(pList);
                }
            }

            console.log(JSON.stringify(PriceList))

            if (OrderItemsList.length === 0) {
                req.flash('error_msg', '• Product Not Found');
                return res.redirect('/amazon')
            }
            else if (OrderItemsList != []) {
                var Amazon = true;
                var isActive = true;
                var productInsert = [];
                var trackInventory = true;
                for (let i in OrderItemsList) {
                    if (OrderItemsList[i].OrderItemId != "" && OrderItemsList[i].ItemPrice.Amount != "" && OrderItemsList[i].ASIN != "" && OrderItemsList[i].SellerSKU != "" && OrderItemsList[i].Title != "") {
                        var list = {
                            'ERP7__Submitted_to_Amazon__c': true,
                            'amazon_ext_id__c': OrderItemsList[i].ASIN,
                            'ERP7__Amazon__c': Amazon,
                            'Name': OrderItemsList[i].Title,
                            'StockKeepingUnit': OrderItemsList[i].SellerSKU,
                            'ERP7__SKU__c': OrderItemsList[i].SellerSKU,
                            'ERP7__ASIN_Code__c': OrderItemsList[i].ASIN,
                            'ERP7__Price_Entry_Amount__c': OrderItemsList[i].ItemPrice.Amount,
                            'IsActive': isActive,
                            'ERP7__Track_Inventory__c': trackInventory
                        }
                        productInsert.push(list)
                    }
                }
                //console.log(OrderItemsList.length)

                if (productInsert != []) {
                    conn.sobject("product2").upsert(productInsert,
                        'amazon_ext_id__c',
                        function (err, rets) {
                            if (err) { return console.error(err); }
                            for (var i = 0; i < rets.length; i++) {
                                if (rets[i].success) {
                                    console.log("Upserted Successfully");
                                }
                            }
                        });
                }

                conn.query(`SELECT ERP7__Price_Book__c FROM ERP7__Profiling__c where Id='${orderProfile}'`, (err, result) => {
                    if (err) { return console.error(err); }

                    if (result.records.length > 0) {
                        var pricebook_id = result.records[0].ERP7__Price_Book__c;


                        conn.query("SELECT Id, ERP7__Submitted_to_Amazon__c, amazon_ext_id__c, ERP7__Amazon__c, Name, ERP7__SKU__c, ERP7__ASIN_Code__c, ERP7__Price_Entry_Amount__c,IsActive, ERP7__Track_Inventory__c FROM product2", function (err, result) {
                            if (err) { return console.error(err); }
                            for (let i in result.records) {
                                productList.push(result.records[i]);
                            }

                            if (productList.length > 0 && OrderItemsList.length > 0) {
                                for (let i in productList) {
                                    if (productList[i].amazon_ext_id__c != null && productList[i].amazon_ext_id__c != "") {

                                        for (let j in OrderItemsList) {
                                            if (productList[i].amazon_ext_id__c == OrderItemsList[j].ASIN) {
                                                if (!mainProductIdList.includes(productList[i].Id)) mainProductList.push(productList[i]);
                                                mainProductIdList.push(productList[i].Id);
                                            }
                                        }
                                    }
                                }
                            }
                            console.log('mainProductList->', JSON.stringify(mainProductList));

                            conn.query("SELECT Id, Product2Id FROM pricebookentry WHERE isactive = true ORDER BY lastmodifieddate", function (err, result) {
                                if (err) { return console.error(err); }

                                for (let i in result.records) {
                                    if (mainProductIdList.includes(result.records[i].Product2Id)) {
                                        priceBookEntryList.push(result.records[i]);
                                    }
                                }
                                console.log(result.records.length)

                                if (priceBookEntryList.length > 0) {
                                    for (let i in priceBookEntryList) {
                                        priceBookMap.set(priceBookEntryList[i].Product2Id, priceBookEntryList[i]);
                                    }
                                }

                                console.log('priceBookEntryList2->', priceBookEntryList);
                                var pbeValue1 = [];
                                var pbeValue = [];
                                for (let i in mainProductList) {
                                    if (priceBookMap.has(mainProductList[i].Id)) {
                                        var PBE = priceBookMap.get(mainProductList[i].Id);
                                        PBE.unitprice = mainProductList[i].ERP7__Price_Entry_Amount__c;
                                        PBE.ASIN = mainProductList[i].ERP7__ASIN_Code__c;
                                        priceBookEntriesObjectList.push(PBE);
                                        console.log('PBE74->', PBE);
                                        for (let i in priceBookEntriesObjectList) {
                                            for (let j in PriceList) {
                                                if (priceBookEntriesObjectList[i].ASIN === PriceList[j].ASIN) {
                                                    var pbeoList = {
                                                        Id: priceBookEntriesObjectList[i].Id,
                                                        UnitPrice: PriceList[j].Amount
                                                    }
                                                    pbeValue.push(pbeoList)
                                                }
                                            }
                                        }
                                    } else {
                                        var PBE = {};
                                        var isActive = true;
                                        PBE.Pricebook2Id = pricebook_id;
                                        PBE.Product2Id = mainProductList[i].Id;
                                        PBE.ASIN = mainProductList[i].ERP7__ASIN_Code__c;
                                        PBE.UnitPrice = mainProductList[i].ERP7__Price_Entry_Amount__c;
                                        priceBookEntriesObjectList.push(PBE);
                                        console.log('PBE75->', PBE);
                                        for (let i in priceBookEntriesObjectList) {
                                            for (let j in PriceList) {
                                                if (priceBookEntriesObjectList[i].ASIN === PriceList[j].ASIN) {
                                                    var pbeList = {
                                                        'IsActive': isActive,
                                                        'UnitPrice': PriceList[j].Amount,
                                                        'Pricebook2Id': pricebook_id,
                                                        'Product2Id': priceBookEntriesObjectList[i].Product2Id
                                                    }
                                                    pbeValue1.push(pbeList)
                                                }
                                            }
                                        }
                                    }
                                }

                                console.log(JSON.stringify(pbeValue) + "pbeValue")

                                if (pbeValue != []) {
                                    conn.sobject('pricebookentry').update(pbeValue,
                                        function (err, rets) {
                                            if (err) { return console.error(err); }
                                            for (var i = 0; i < rets.length; i++) {
                                                if (rets[i].success) {
                                                    console.log("Updated Successfully : " + rets[i].id);
                                                }
                                                // if(i == rets.length - 1){
                                                // 	console.log('success')
                                                // req.flash('success_msg', `• Product's Sync`);														
                                                // }
                                            }
                                        });
                                }

                                if (pbeValue1 != []) {
                                    conn.sobject("pricebookentry").create(pbeValue1, function (err, ret) {
                                        for (var i = 0; i < ret.length; i++) {
                                            if (ret[i].success) {
                                                console.log('Created Successfully ' + ret[i].id);
                                            }
                                        }
                                        // req.flash('success_msg1', `• Product's Sync`);												
                                    });
                                }
                            });
                        })
                    }
                });
            }
            req.flash('success_msg', `• Product's Synced`);
        }
        return res.redirect('/amazon')
    });
}