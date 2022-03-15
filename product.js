const SellingPartnerAPI = require('amazon-sp-api');
const jsforce = require('jsforce')

async function productSync() {
    var Region = 'eu';
    var RefreshToken = 'Atzr|IwEBIKaDEcQEt-upWRDiYCpr9w3UXAs1Bpg9phpH6QYZ9QVk93RS28ip2kyS5T55f6M6mV_mLLU4jk6vbPQPJn8KspFgLE5_Ozemye-JVxOiPq7zL1UVDjcuCckibZRddNujWWVldG8KDVmRVUh1sdgbSL-EDqAL6AcFFkWQ0J9YbTs-1X52fSXljyxRdXD8f5L4xHVlZhCBCpvALmJE9XS2ZXXuw7p9rqYBRRNdoBSJCAWlakmIIQKRY2uZEf2z3Ioyrqc4TnQIoF2Gnn_2JHnc1Fzca6iPJddYMTytC4bLZLZ_5t7jS3eMcdMnyBjThoJo44g';
    var ClientId = 'amzn1.application-oa2-client.fb2b1d1c45c040d79115cf4c440b8614';
    var ClientSecret = '2b58f2a9ea358a58e5e78a3db5c312fdcdf56c69aabd0a4daab23b42023f16d7';
    var AWSAccessKey = 'zpUuXrFGVYllU93z94LCkiwfzjL+D1p81ptn4Kek';
    var AWSSecretAccessKey = 'AKIAUWP7HSF63GXOMU7F';
    var AWSSellingPartnerRole = 'arn:aws:iam::323194687869:role/SPAPIRole';

    var orderProfile = 'a2b2w000000PeAoAAK';

    var conn = new jsforce.Connection({
        accessToken: '00D2w000006Xcud!ASAAQFE2Pb03s1sEDS_F0PJ0b.0mpiFxatHZnbURqkipydIK6VAq8tWVkJ.rXJZ1cXeBr7hximKwc4zPyS48rYoXNg3oNTVJ',
        instanceUrl: 'https://hightestorg-dev-ed.my.salesforce.com/'
    });

    if (orderProfile && RefreshToken && ClientId && ClientSecret && AWSAccessKey && AWSSecretAccessKey && AWSSellingPartnerRole) {
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
                MarketplaceIds: 'A1F83G8C2ARO7P',
                LastUpdatedAfter: '2020-09-26'
            }
        });
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


        var SellerSKUId = [];

        var prodAvailable = [];
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
        var pricebook_id;
        conn.query(`SELECT ERP7__Price_Book__c FROM ERP7__Profiling__c where Id='${orderProfile}'`, (err, result) => {
            if (err) { return console.error(err); }

            if (result.records.length > 0) {
                pricebook_id = result.records[0].ERP7__Price_Book__c;

                var productExist = [];
                var productIdExist = [];
                var productNotExist = [];

                if (SellerSKUId.length > 0) {
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
                                            });
                                    }
                                }
                            })
                        }
                    })
                }
            }
        })            
    }      
}

productSync();
