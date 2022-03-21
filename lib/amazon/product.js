const express = require("express")
const app = express()
const jsforce = require('jsforce')
const { pool } = require("../../dbConfig");
const salesLogin = require('../routes')
const SellingPartnerAPI = require('amazon-sp-api');
app.use(express.static('public'));

module.exports = function (app) {

    (async () => {

        try {

            app.post('/amazonProductSync', salesLogin, async function (req, res, next) {

                const client = await pool.connect();
                await client.query('BEGIN');
                await JSON.stringify(client.query("SELECT * FROM amazon_credentials WHERE email=$1", [req.user.email], async function (err, result) {
                    if (err) { console.log(err); }

                    if (result.rows.length === 0) {
                        req.flash('error_msg', '• Amazon Credentials are Missing');
                        return res.redirect('/amazon')
                    }
                    else if (result.rows.length > 0) {
                        var Region = 'eu';
                        var RefreshToken = result.rows[0].refresh_token;;
                        var ClientId = result.rows[0].amazon_app_client_id;
                        var ClientSecret = result.rows[0].amazon_app_client_secret;
                        var AWSAccessKey = result.rows[0].aws_access_key;
                        var AWSSecretAccessKey = result.rows[0].aws_secret_access_key;
                        var AWSSellingPartnerRole = result.rows[0].aws_selling_partner_role;
                        var MarketplaceId = result.rows[0].marketplace_id;

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
                                .catch(error => {
                                    req.flash('error_msg', '• ' + error.message);
                                    return res.redirect('/amazon')
                                })
                            let resS = this.resS;

                            if (resS) {
                            // console.log('Response Orders ->', JSON.stringify(resS.Orders));
                            var AmazonOrderIdList = [];
                            for (let i in resS.Orders) {
                                if (resS.Orders[i].AmazonOrderId != "") AmazonOrderIdList.push(resS.Orders[i].AmazonOrderId);
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
                                console.log('Response OrderItems ->', JSON.stringify(getOrderItems));
                            }

                            var OrderItemsList = [];
                            if (OrderItems != []) {
                                for (let i in OrderItems) {
                                    for (let j in OrderItems[i].OrderItems) {
                                        OrderItemsList.push(OrderItems[i].OrderItems[j]);
                                    }
                                }
                            }

                            var asinValue = [];
                            if (OrderItemsList != []) {
                                for (let i in OrderItemsList) {
                                    if (OrderItemsList[i].ASIN != '') {
                                        asinValue.push(OrderItemsList[i].ASIN)
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
                                        MarketplaceId: MarketplaceId
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
                                        MarketplaceId: MarketplaceId,
                                        ItemType: 'Asin',
                                        Asins: asinId[i]
                                    }
                                })
                                Pricing.push(prodPrice[0].Product);
                                console.log('Response Product Price ->', JSON.stringify(prodPrice));
                            }

                            var SellerSKUId = [];
                            var prodAvailable = [];
                            var isActive = true;
                            var trackInventory = true;
                            if (OrderItemsList != [] && prodBrand != [] && Pricing != []) {
                                for (let i in OrderItemsList) {
                                    for (let j in prodBrand) {
                                        for (let k in Pricing) {
                                            for (let l in prodBrand[j].AttributeSets) {
                                                for (let m in Pricing[k].Offers) {
                                                    if (OrderItemsList[i].ASIN === prodBrand[j].Identifiers.MarketplaceASIN.ASIN) {
                                                        if (OrderItemsList[i].ASIN === Pricing[k].Identifiers.MarketplaceASIN.ASIN) {
                                                            if (OrderItemsList[i].SellerSKU === Pricing[k].Offers[m].SellerSKU) {
                                                                if (Pricing[k].Offers[m].BuyingPrice.ListingPrice.Amount != undefined) {
                                                                    var list = {
                                                                        StockKeepingUnit: OrderItemsList[i].SellerSKU,
                                                                        ERP7__Submitted_to_Amazon__c: true,
                                                                        Name: OrderItemsList[i].Title,
                                                                        ERP7__SKU__c: OrderItemsList[i].SellerSKU,
                                                                        ERP7__ASIN_Code__c: OrderItemsList[i].ASIN,
                                                                        ERP7__Price_Entry_Amount__c: Pricing[k].Offers[m].BuyingPrice.ListingPrice.Amount,
                                                                        ERP7__Brand__c: prodBrand[j].AttributeSets[l].Brand,
                                                                        ERP7__Manufacturer__c: prodBrand[j].AttributeSets[l].Manufacturer,
                                                                        Family: prodBrand[j].AttributeSets[l].ProductTypeName,
                                                                        IsActive: isActive,
                                                                        ERP7__Track_Inventory__c: trackInventory
                                                                    }
                                                                    prodAvailable.push(list)
                                                                    SellerSKUId.push(OrderItemsList[i].SellerSKU)
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

                            var pricebook_id;
                            conn.query(`SELECT ERP7__Price_Book__c FROM ERP7__Profiling__c where Id='${orderProfile}'`, (err, result) => {
                                if (err) {
                                    req.flash('error_msg', '• ' + JSON.stringify(err));
                                    return res.redirect('/amazon')
                                }

                                if (result.records.length > 0) {
                                    pricebook_id = result.records[0].ERP7__Price_Book__c;

                                    var productExist = [];
                                    var productIdExist = [];
                                    var productNotExist = [];

                                    if (SellerSKUId.length > 0) {
                                        conn.query("SELECT Id, Name, StockKeepingUnit, ERP7__SKU__c, ERP7__ASIN_Code__c, ERP7__Submitted_to_Amazon__c, ERP7__Price_Entry_Amount__c, ERP7__Brand__c, ERP7__Manufacturer__c, Family, IsActive, ERP7__Track_Inventory__c FROM Product2 WHERE StockKeepingUnit IN ('" + SellerSKUId.join("','") + "')", function (err, result) {
                                            if (err) { return console.error(err); }
                                            console.log('product ' + result.records.length)
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
                                                    console.log(result.records[i].ERP7__Price_Entry_Amount__c)
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
                                    else {
                                        req.flash('error_msg', `• Product Not Found`);
                                        return res.redirect('/amazon');
                                    }
                                }
                            })

                            var productList = [];
                            var prodMainId = [];
                            function priceBookEntryInsert() {
                                console.log(SellerSKUId)
                                conn.query("SELECT Id, ERP7__ASIN_Code__c, StockKeepingUnit FROM Product2 WHERE StockKeepingUnit IN ('" + SellerSKUId.join("','") + "')", function (err, result) {
                                    if (err) {                                        
                                        req.flash('error_msg', '• ' + err.message);
                                        return res.redirect('/amazon')
                                    }
                                    console.log('product ' + result.records.length)
                                    if (result.records.length > 0) {
                                        for (let i in result.records) {
                                            prodMainId.push(result.records[i].Id)
                                            productList.push(result.records[i])
                                        }
                                        console.log('prodMainId' + JSON.stringify(prodMainId))
                                        console.log('product list' + JSON.stringify(productList))

                                        var isActive = true;
                                        var priceBookEntryAvail = [];
                                        for (let i in productList) {
                                            for (let j in Pricing) {
                                                for (let k in Pricing[j].Offers) {
                                                    if (productList[i].StockKeepingUnit === Pricing[j].Offers[k].SellerSKU) {
                                                        console.log('hello ')
                                                        if (Pricing[j].Offers[k].BuyingPrice.ListingPrice.Amount != undefined) {
                                                            console.log('IsActive:', isActive,
                                                                'Pricebook2Id:', pricebook_id,
                                                                'Product2Id:', productList[i].Id,
                                                                'UnitPrice:', Pricing[j].Offers[k].BuyingPrice.ListingPrice.Amount)
                                                            var list = {
                                                                IsActive: isActive,
                                                                Pricebook2Id: pricebook_id,
                                                                Product2Id: productList[i].Id,
                                                                UnitPrice: Pricing[j].Offers[k].BuyingPrice.ListingPrice.Amount
                                                            }
                                                            priceBookEntryAvail.push(list)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        console.log('priceBookEntryInsert ' + JSON.stringify(priceBookEntryAvail))

                                        conn.query("SELECT Id, Product2Id FROM pricebookentry WHERE isactive = true AND Product2Id IN ('" + prodMainId.join("','") + "') ORDER BY lastmodifieddate", function (err, result) {
                                            if (err) {
                                                req.flash('error_msg', '• ' + JSON.stringify(err));
                                                return res.redirect('/amazon')
                                            }

                                            console.log('price ' + result.records.length)
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
                                                            req.flash('success_msg', `• Product's Synced`);
                                                            return res.redirect('/amazon');
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
                                                            for (let l in Pricing[k].Offers) {
                                                                if (result.records[i].Product2Id === productList[j].Id) {
                                                                    if (productList[j].StockKeepingUnit === Pricing[k].Offers[l].SellerSKU) {
                                                                        if (Pricing[k].Offers[l].BuyingPrice.ListingPrice.Amount != undefined) {
                                                                            var list = {
                                                                                Id: result.records[i].Id,
                                                                                UnitPrice: Pricing[k].Offers[l].BuyingPrice.ListingPrice.Amount
                                                                            }
                                                                            priceBookExist.push(list)
                                                                            priceBookIdExist.push(result.records[i].Id)
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                console.log('priceBookExist ' + JSON.stringify(priceBookExist))

                                                for (let i in priceBookEntryAvail) {
                                                    if (!priceBookIdExist.includes(priceBookEntryAvail[i].StockKeepingUnit)) priceNotExist.push(priceBookEntryAvail[i])
                                                }

                                                if (priceNotExist != []) {
                                                    conn.sobject("pricebookentry").create(priceNotExist,
                                                        function (err, rets) {
                                                            if (err) { return console.error(err); }
                                                            for (var i = 0; i < rets.length; i++) {
                                                                if (rets[i].success) {
                                                                    console.log("Created record id Price book Entry 1: " + rets[i].id);
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
                                                            req.flash('success_msg', `• Product's Synced`);
                                                            return res.redirect('/amazon');
                                                        });
                                                }
                                            }
                                        })
                                    }
                                })
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