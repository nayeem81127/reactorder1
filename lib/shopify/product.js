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

      app.post('/shopifyProductSync', salesLogin, async function (req, res, next) {
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

              if (Email === result.rows[z].email) {
                var Aqxolt_Order_Profile;
                var shopName = result.rows[z].shopify_domain;
                var accessToken = result.rows[z].shopify_token;

                if (result.rows[z].aqxolt_order_profile) {
                  Aqxolt_Order_Profile = result.rows[z].aqxolt_order_profile;
                } else {
                  Aqxolt_Order_Profile = req.user.aqxolt_order_profile;
                }

                if (!Aqxolt_Order_Profile && !accessToken || !shopName) {
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
                else if (Aqxolt_Order_Profile && accessToken && shopName) {

                  const shopify = new Shopify({
                    shopName: shopName,
                    accessToken: accessToken
                  });

                  let params = { limit: 50 };
                  let ProductArray = [];

                  do {
                    const Products = await shopify.product.list(params)
                    ProductArray = ProductArray.concat(Products);
                    params = Products.nextPageParameters;
                  } while (params !== undefined);
                  // console.log('ProductArray '+JSON.stringify(ProductArray))
                  let SkuId = [];

                  let ProductDetails = [];
                  for (let i in ProductArray) {
                    for (let j in ProductArray[i].variants) {
                      if (ProductArray[i].id != '' && ProductArray[i].id != undefined && ProductArray[i].variants[j].sku != '' && ProductArray[i].variants[j].sku != undefined) {
                        SkuId.push(ProductArray[i].variants[j].sku)
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
                          StockKeepingUnit: ProductArray[i].variants[j].sku,
                          ERP7__SKU__c: ProductArray[i].variants[j].sku,
                          ERP7__Price_Entry_Amount__c: ProductArray[i].variants[j].price,
                          IsActive: true
                        }
                        ProductDetails.push(list)
                      }
                    }
                  }
                  // console.log('ProductDetails '+JSON.stringify(ProductDetails))

                  var conn = new jsforce.Connection({
                    accessToken: oauth_token,
                    instanceUrl: instance_url
                  });

                  var pricebook_id;
                  if (Aqxolt_Order_Profile != null) {

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
                          req.flash('error_msg', '• ' + JSON.stringify(obj));
                          res.redirect('/shopify')
                        }
                      }

                      if (result.records.length == 0) {
                        req.flash('error_msg', '• Invalid Order Profile Id');
                        res.redirect('/shopify')
                      }
                      else if (result.records.length > 0) {
                        pricebook_id = result.records[0].ERP7__Price_Book__c;

                        var productExist = [];
                        var productIdExist = [];
                        var productNotExist = [];

                        if (SkuId.length > 0) {

                          conn.bulk.pollInterval = 1000;
                          conn.bulk.pollTimeout = Number.MAX_VALUE;
                          let records = [];

                          const recordStream = conn.bulk.query(`SELECT Id, Name, ERP7__SKU__c, ERP7__Manufacturer__c, Description, ProductCode, ERP7__Picture__c, StockKeepingUnit, ERP7__Price_Entry_Amount__c FROM Product2 WHERE StockKeepingUnit IN ('${SkuId.join("','")}')`);
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
                          }).then((prodRecords) => {
                            if (prodRecords.length == 0) {
                              res.redirect('/index');
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
                            else if (prodRecords.length > 0) {
                              res.redirect('/index');
                              for (let i in prodRecords) {
                                // idval.push(prodRecords[i].Id)
                                for (let j in ProductDetails) {
                                  if (prodRecords[i].StockKeepingUnit == ProductDetails[j].StockKeepingUnit) {
                                    var list = {
                                      Id: prodRecords[i].Id,
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
                                    productIdExist.push(ProductDetails[j].StockKeepingUnit)
                                  }
                                }
                              }

                              for (let i in ProductDetails) {
                                if (!productIdExist.includes(ProductDetails[i].StockKeepingUnit)) productNotExist.push(ProductDetails[i])
                              }

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
                          });

                        }
                        else {
                          req.flash('error_msg', `• Product Not Found`);
                          return res.redirect('/shopify');
                        }
                      }
                    })

                  }

                  var productList = [];
                  var prodMainId = [];
                  function priceBookEntryInsert() {


                    conn.bulk.pollInterval = 1000;
                    conn.bulk.pollTimeout = Number.MAX_VALUE;
                    let records = [];

                    const recordStream = conn.bulk.query(`SELECT Id, Name, ERP7__SKU__c, ERP7__Manufacturer__c, Description, ProductCode, ERP7__Picture__c, StockKeepingUnit, ERP7__Price_Entry_Amount__c FROM Product2 WHERE StockKeepingUnit IN ('${SkuId.join("','")}')`);
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
                    }).then((prod2Records) => {
                      if (prod2Records.length > 0) {
                        for (let i in prod2Records) {
                          prodMainId.push(prod2Records[i].Id)
                          productList.push(prod2Records[i])
                        }

                        var isActive = true;
                        var priceBookEntryAvail = [];
                        for (let i in productList) {
                          for (let j in ProductDetails) {
                            if (productList[i].StockKeepingUnit == ProductDetails[j].StockKeepingUnit) {
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

                        conn.bulk.pollInterval = 1000;
                        conn.bulk.pollTimeout = Number.MAX_VALUE;
                        let records = [];

                        const recordStream = conn.bulk.query(`SELECT Id, Product2Id, Pricebook2Id FROM pricebookentry WHERE isactive = true AND Product2Id IN ('${prodMainId.join("','")}') ORDER BY lastmodifieddate`);
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
                        }).then((priceBookEntryRecords) => {
                          if (priceBookEntryRecords.length == 0) {
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
                                var date = new Date();
                                var updatedDate = date.toLocaleString('en-US', { weekday: 'short', day: 'numeric', year: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric', second: 'numeric' })
                                pool.query('INSERT INTO jobs_log (email, updated_at, category, message, seller_id) VALUES ($1, $2, $3, $4, $5)', [Email, updatedDate, 'shopify', 'Product Sync', shopName]);
                              });
                            }
                          }
                          else if (priceBookEntryRecords.length > 0) {
                            var priceBookIdExist = [];
                            var priceNotExist = [];
                            for (let i in priceBookEntryRecords) {
                              for (let j in priceBookEntryAvail) {
                                if (priceBookEntryRecords[i].Product2Id == priceBookEntryAvail[j].Product2Id && priceBookEntryRecords[i].Pricebook2Id == priceBookEntryAvail[j].Pricebook2Id) {
                                  var list2 = {
                                    Product2Id: priceBookEntryRecords[i].Product2Id,
                                    Pricebook2Id: priceBookEntryRecords[i].Pricebook2Id
                                  }
                                  priceBookIdExist.push(list2)
                                }
                              }
                            }

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

                            var date = new Date();
                            var updatedDate = date.toLocaleString('en-US', { weekday: 'short', day: 'numeric', year: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric', second: 'numeric' })
                            pool.query('INSERT INTO jobs_log (email, updated_at, category, message, seller_id) VALUES ($1, $2, $3, $4, $5)', [Email, updatedDate, 'shopify', 'Product Sync', shopName]);
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
