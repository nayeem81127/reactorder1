var express = require('express');
var app = express();
var passport = require("passport");
var { pool } = require("../dbConfig")
const bcrypt = require('bcrypt');
const jsforce = require('jsforce')
const uuid = require('uuid').v4;
const util = require('util')
const { isAdmin,
	isAmazon,
	isEbay,
	isMajento,
	isQuickBooks,
	isWooCommerce,
	isEtsy,
	isBigCommerce,
	isShopify } = require('./auth')

const initializePassport = require('../passportConfig');
initializePassport(passport)

app.use(express.static('public'));

var oauth2;

const SellingPartnerAPI = require('amazon-sp-api');

module.exports = function (app) {

	(async () => {

		try {

			app.get('/', checkAuthenticated, function (req, res, next) {
				const success_msg = req.flash('success_msg');
				res.render('login', { success_msg });
			});

			app.get('/register', checkAuthenticated, function (req, res, next) {
				res.render('register');
			});


			app.post('/register', async function (req, res) {

				try {
					let { name, email, password, password2, checkbox } = req.body;

					let errors = [];
					var createdDate = new Date().toISOString();

					console.log({
						name,
						email,
						password,
						password2,
						checkbox
					});

					if (!name || !email || !password || !password2) {
						errors.push({ message: '• Please enter all fields' });
					}

					if (password.length < 6) {
						errors.push({ message: '• Password must be a least 6 characters long' });
					}

					if (!checkbox) {
						errors.push({ message: '• Please check Term and Condition' });
					}

					if (password !== password2) {
						errors.push({ message: '• Passwords do not match' });
					}

					var user = "user";

					if (errors.length > 0) {
						res.render("register", { errors, name: name, email: email, password: password });
					} else {

						const client = await pool.connect()
						await client.query('BEGIN')
						var pwd = await bcrypt.hash(req.body.password, 5);
						await JSON.stringify(client.query('SELECT id FROM "users" WHERE "email"=$1', [email], function (err, result) {
							if (result.rows.length > 0) {
								errors.push({ message: '• This email address is already registered. Log In!' });
								res.render("register", { errors, name: name, email: email, password: password });
							}
							else {
								client.query('INSERT INTO users (id, name, email, password, created_at, updated_at, role, has_access_of, login_count, last_login) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [uuid(), name, email, pwd, createdDate, createdDate, user, '[]', 0, createdDate], function (err, result) {
									if (err) { console.log(err); }
									else {

										client.query('COMMIT')
										console.log(result)
										req.flash('success_msg', '• You are now registered. Please Log In')
										res.redirect('/');
										return;
									}
								});
							}
						}));
						client.release();
					}
				}
				catch (e) { throw (e) }
			});

			var amaz = false;
			var shopify = false;
			var etsy = false;
			var majento = false;
			var wooCommerce = false;
			var bigCommerce = false;
			var quickBooks = false;
			var ebay = false;
			var manage;
			var username = "";

			const isAccess = (req, res, next) => {
				amaz = false;
				shopify = false;
				etsy = false;
				majento = false;
				wooCommerce = false;
				bigCommerce = false;
				quickBooks = false;
				ebay = false;
				username = req.user.name;
				if (req.user.has_access_of.includes('amazon')) {
					amaz = true;
				}
				if (req.user.has_access_of.includes('shopify')) {
					shopify = true;
				}
				if (req.user.has_access_of.includes('etsy')) {
					etsy = true;
				}
				if (req.user.has_access_of.includes('majento')) {
					majento = true;
				}
				if (req.user.has_access_of.includes('wooCommerce')) {
					wooCommerce = true;
				}
				if (req.user.has_access_of.includes('bigCommerce')) {
					bigCommerce = true;
				}
				if (req.user.has_access_of.includes('quickBooks')) {
					quickBooks = true;
				}
				if (req.user.has_access_of.includes('ebay')) {
					ebay = true;
				}
				if (req.user.role === "admin") {
					manage = true;
				}
				if (req.user.role === "user") {
					manage = false;
				}
				next();
			}

			app.get('/oauth2/auth', checkNotAuthenticated, function (req, res) {
				if (!req.user.aqxolt_client && !req.user.client_secret) {
					res.redirect('/index');
				} else {

					oauth2 = new jsforce.OAuth2({
						loginUrl: req.user.instance_url,
						clientId: req.user.aqxolt_client,
						clientSecret: req.user.client_secret,
						redirectUri: `${req.protocol}://${req.get('host')}/${process.env.REDIRECT_URI}`
					});
					res.redirect(oauth2.getAuthorizationUrl({ scope: 'api id web refresh_token' }));
				}
			});

			app.get('/oauth2/callback', checkNotAuthenticated, function (req, res) {
				var conn = new jsforce.Connection({ oauth2: oauth2 });

				console.log('conn ==>' + JSON.stringify(util.inspect(conn)))
				var code = req.query.code;
				console.log('code' + code);
				console.log('code2' + req.param('code'))
				conn.authorize(code, async function (err, userInfo) {
					if (err) { return console.error(err); }

					console.log('Client Id conn ===>' + conn.oauth2.clientId)
					console.log('access Token conn ===>' + conn.accessToken)
					console.log('instance url conn ===>' + conn.instanceUrl)
					console.log('refresh Token conn ===>' + conn.refreshToken)
					console.log('Client Secret conn ===>' + conn.oauth2.clientSecret)
					console.log('Access Token: ' + conn.accessToken);
					console.log('Instance URL: ' + conn.instanceUrl);
					console.log('User ID: ' + userInfo.id);
					console.log('Org ID: ' + userInfo.organizationId);
					console.log('Url: ' + userInfo.url);

					var email = req.user.email;
					var updatedDate = new Date().toISOString();
					const client = await pool.connect();
					await client.query('BEGIN');
					await JSON.stringify(client.query('SELECT id FROM "users" WHERE "email"=$1', [email], function (err, result) {
						if (result.rows.length > 0) {
							client.query(`UPDATE "users" set uid=$1, oauth_token=$2, refreshtoken=$3, updated_at=$4 WHERE email=$5`, [userInfo.url, conn.accessToken, conn.refreshToken, updatedDate, email]),
								client.query('COMMIT');
							res.redirect('/index');
						}
					}));
					client.release();
				});
			});

			const salesLogin = (req, res, next) => {
				var email = req.user.email;
				var conn = new jsforce.Connection({
					oauth2: {
						clientId: req.user.aqxolt_client,
						clientSecret: req.user.client_secret,
						redirectUri: `${req.protocol}://${req.get('host')}/${process.env.REDIRECT_URI}`
					},
					instanceUrl: req.user.instance_url,
					accessToken: req.user.oauth_token,
					refreshToken: req.user.refreshtoken
				});
				conn.on("refresh", async function (accessToken, res) {
					console.log('accessToken refresh');
					const client = await pool.connect();
					await client.query('BEGIN');
					await JSON.stringify(client.query('SELECT id FROM "users" WHERE "email"=$1', [email], function (err, result) {
						if (result.rows.length > 0) {
							client.query(`UPDATE "users" set oauth_token=$1 WHERE email=$2`, [accessToken, email]),
								client.query('COMMIT');
						}
					}));
					client.release();
				});

				//console.log(conn.refreshToken)
				// Alternatively, you can use the callback style request to fetch the refresh token
				conn.oauth2.refreshToken(req.user.refreshtoken, async (err, results) => {
					if (err) return (err);
					//console.log(results)
					const client = await pool.connect();
					await client.query('BEGIN');
					await JSON.stringify(client.query('SELECT id FROM "users" WHERE "email"=$1', [email], function (err, result) {
						if (result.rows.length > 0) {
							client.query(`UPDATE "users" set oauth_token=$1 WHERE email=$2`, [results.access_token, email]),
								client.query('COMMIT');
						}
					}));
					client.release();
				});
				next();
			}

			app.get('/index', checkNotAuthenticated, isAccess, salesLogin, (req, res, next) => {
				return res.render('index', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/amazon', checkNotAuthenticated, isAmazon, isAccess, salesLogin, function (req, res, next) {

				var query = 'SELECT id, name FROM account';
				// open connection with client's stored OAuth details

				var conn = new jsforce.Connection({
					accessToken: req.user.oauth_token,
					instanceUrl: req.user.instance_url
				});

				conn.query(query, function (err, result) {
					if (err) {
						console.error(err);
					}
					console.log('accounts' + result.records.length);
				});

				return res.render('amazon', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.post('/amazonOrderSync', salesLogin, async function (req, res, next) {
				var Region = 'eu';
				var RefreshToken = req.user.refresh_token;;
				var ClientId = req.user.amazon_app_client_id;
				var ClientSecret = req.user.amazon_app_client_secret;
				var AWSAccessKey = req.user.aws_access_key;
				var AWSSecretAccessKey = req.user.aws_secret_access_key;
				var AWSSellingPartnerRole = req.user.aws_selling_partner_role;
				var AccountId = '0015j00000ArRocAAF';

				var conn = new jsforce.Connection({
					accessToken: req.user.oauth_token,
					instanceUrl: req.user.instance_url
				});

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
						AWS_AccountId: AccountId,
					}
				});
				let resS = await sellingPartner.callAPI({
					operation: 'getOrders',
					endpoint: 'orders',
					query: {
						//details: true,
						//granularityType: 'Marketplace',
						MarketplaceIds: req.user.marketplace_id,
						LastUpdatedAfter: '2020-09-26'
					}
				});
				console.log('Response ->', JSON.stringify(resS.Orders));

				if (resS != []) {
					var orderDetails = [];
					for (let i in resS.Orders) {
						if (resS.Orders[i].AmazonOrderId != "") orderDetails.push(resS.Orders[i]);
					}
				}

				console.log('orderDetails Length  ->', orderDetails.length);

				if (orderDetails != []) {
					var AccountId = '0015j00000ArRocAAF';
					var isActive = true;
					var arr = [];
					for (let i in orderDetails) {
						if (orderDetails[i].OrderStatus == 'Canceled') orderDetails[i].OrderStatus = 'Cancelled';
						if (orderDetails[i].AmazonOrderId != "" && orderDetails[i].SalesChannel != "" && orderDetails[i].OrderStatus != "" && orderDetails[i].MarketplaceId != "" && orderDetails[i].OrderType != "" && orderDetails[i].PurchaseDate != "" && AccountId != "") {
							var list = {
								'Ligthning_light__AmazonOrderId__c': orderDetails[i].AmazonOrderId,
								'Ligthning_light__SalesChannel__c': orderDetails[i].SalesChannel,
								'Ligthning_light__OrderStatus__c': orderDetails[i].OrderStatus,
								'Ligthning_light__MarketplaceId__c': orderDetails[i].MarketplaceId,
								'Ligthning_light__AccountId__c': AccountId,
								'Ligthning_light__Active__c': isActive
							}
							arr.push(list)
						}
						else {
							console.log('No Orders Found to sync');
						}
					}
				}

				console.log('arr ==>', arr)
				/*
				conn.sobject("Ligthning_light__Order__c").upsert(arr,
					'Ligthning_light__AmazonOrderId__c',
					{ allOrNone: true },
					function (err, rets) {
						if (err) { return console.error(err); }
						for (var i = 0; i < rets.length; i++) {
							if (rets[i].success) {
								console.log("Upserted Successfully");
							}
						}
					}); */
				res.redirect('/amazon')
			});

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
				var newPriceBookEntries = [];
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

				if (OrderItemsList != []) {
					var Amazon = true;
					var isActive = true;
					var arr = [];
					var trackInventory = true;
					for (let i in OrderItemsList) {
						if (OrderItemsList[i].OrderItemId != "" && OrderItemsList[i].ItemPrice.Amount != "" && OrderItemsList[i].ASIN != "" && OrderItemsList[i].SellerSKU != "" && OrderItemsList[i].Title != "") {
							console.log(`${OrderItemsList[i].ASIN}`, `${Amazon}`, `${OrderItemsList[i].Title}`, `${OrderItemsList[i].SellerSKU}`, `${OrderItemsList[i].ASIN}`, `${OrderItemsList[i].ItemPrice.Amount}`, `${isActive}`, `${trackInventory}`)
							var list = {
								'ERP7__Submitted_to_Amazon__c': true,
								'amazon_ext_id__c': OrderItemsList[i].ASIN,
								'ERP7__Amazon__c': Amazon,
								'Name': OrderItemsList[i].Title,
								'ERP7__SKU__c': OrderItemsList[i].SellerSKU,
								'ERP7__ASIN_Code__c': OrderItemsList[i].ASIN,
								'ERP7__Price_Entry_Amount__c': OrderItemsList[i].ItemPrice.Amount,
								'IsActive': isActive,
								'ERP7__Track_Inventory__c': trackInventory
							}
							arr.push(list)
							//{ '': , '': `${}`, '': `${}`, '':`${}`, '': `${}`, '':`${}`, '':`${}`, '':`${}`, '':`${}` }
						}
					}
					console.log(OrderItemsList.length)

					for (var i = 0; i < 6; i++) {
						console.log(JSON.stringify(arr[i].amazon_ext_id__c) + 'arr')
					}
					console.log(arr.length)

					conn.sobject("product2").upsert(arr,
						'amazon_ext_id__c',
						function (err, rets) {
							if (err) { return console.error(err); }
							for (var i = 0; i < rets.length; i++) {
								if (rets[i].success) {
									console.log("Upserted Successfully");
								}
							}
						});

					// conn.query(`SELECT Id, amazon_ext_id__c, Name FROM product2 where amazon_ext_id__c='B091GB9XYQ'`, function (err, result) {
					// 	console.log('res amaz' + result.records[0].amazon_ext_id__c)
					// 	console.log('name' + result.records[0].Name)
					// 	console.log('name' + result.records[0].Id)
					// })

					// conn.query(`SELECT Id, amazon_ext_id__c, Name FROM product2 where amazon_ext_id__c='B091FN7PRL'`, function (err, result) {
					// 	console.log('res amaz' + result.records[0].amazon_ext_id__c)
					// 	console.log('name' + result.records[0].Name)
					// 	console.log('name' + result.records[0].Id)
					// })



					conn.query(`SELECT Id, Product2Id FROM pricebookentry where Product2Id='01t2w00000B1DfXAAV'`, function (err, result) {
						if (result.records.length > 0) {
							console.log('Product2Id' + result.records[0].Product2Id)
							console.log('Id' + result.records[0].Id)
						} else {
							console.log('empty')
						}
					})


					conn.query(`SELECT ERP7__Price_Book__c FROM ERP7__Profiling__c where Id='${orderProfile}'`, (err, result) => {
						if (err) { return console.error(err); }

						if (result.records.length > 0) {
							var pricebook_id = result.records[0].ERP7__Price_Book__c;


							conn.query("SELECT Id, ERP7__Submitted_to_Amazon__c, amazon_ext_id__c, ERP7__Amazon__c, Name, ERP7__SKU__c, ERP7__ASIN_Code__c, ERP7__Price_Entry_Amount__c,IsActive, ERP7__Track_Inventory__c FROM product2", function (err, result) {
								if (err) { return console.error(err); }
								for (let i in result.records) {
									productList.push(result.records[i]);
								}

								console.log(result.records.length)

								console.log(productList.length + 'ordl' + OrderItemsList.length)

								if (productList.length > 0 && OrderItemsList.length > 0) {
									for (let i in productList) {
										console.log('product ' + [i] + productList[i].amazon_ext_id__c)
										if (productList[i].amazon_ext_id__c != null && productList[i].amazon_ext_id__c != "") {

											for (let j in OrderItemsList) {
												if (productList[i].amazon_ext_id__c == OrderItemsList[j].ASIN) {
													console.log('amaz' + productList[i].amazon_ext_id__c + 'order' + OrderItemsList[j].ASIN)
													console.log('sid' + productList[i].Id)
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

									console.log('price len' + priceBookEntryList.length)
									if (priceBookEntryList.length > 0) {
										for (let i in priceBookEntryList) {
											priceBookMap.set(priceBookEntryList[i].Product2Id, priceBookEntryList[i]);
										}
									}

									console.log('priceBookEntryList2->', priceBookEntryList);
									var pbeValue1 = [];
									var pbeValue = [];
									for (let i in mainProductList) {
										console.log('m1' + mainProductList[i].Id)
										if (priceBookMap.has(mainProductList[i].Id)) {
											var PBE = priceBookMap.get(mainProductList[i].Id);
											PBE.unitprice = mainProductList[i].ERP7__Price_Entry_Amount__c;
											console.log('main prod' + mainProductList[i].ERP7__Price_Entry_Amount__c)
											priceBookEntriesObjectList.push(PBE);
											console.log('PBE74->', PBE);
											var randomNumber1 = Math.floor(Math.random() * 100);
											var randomNumber2 = Math.floor(Math.random() * 10);
											var randomId = 'PB' + randomNumber1 + randomNumber2;
											var isActive = true;
											console.log('randomId->', randomId);
											console.log(pricebook_id)
											for (let i in priceBookEntriesObjectList) {
												console.log('price' + priceBookEntriesObjectList[i].unitprice)
												var pbeoList = {
													'UnitPrice': priceBookEntriesObjectList[i].unitprice,
													'Pricebook2Id': pricebook_id
												}
												pbeValue.push(pbeoList)
											}
										} else {
											var PBE = {};
											var isActive = true;
											PBE.Pricebook2Id = pricebook_id;
											PBE.Product2Id = mainProductList[i].Id;
											PBE.UnitPrice = mainProductList[i].ERP7__Price_Entry_Amount__c;
											console.log('main1 prod' + mainProductList[i].ERP7__Price_Entry_Amount__c + mainProductList[i].Id)
											priceBookEntriesObjectList.push(PBE);
											console.log('PBE75->', PBE);
											var randomNumber1 = Math.floor(Math.random() * 100);
											var randomNumber2 = Math.floor(Math.random() * 10);
											var randomId = 'PB' + randomNumber1 + randomNumber2;
											console.log('randomId->', randomId);
											console.log(pricebook_id)
											for (let i in priceBookEntriesObjectList) {
												var pbeList = {
													'IsActive': isActive,
													'UnitPrice': priceBookEntriesObjectList[i].UnitPrice,
													'Pricebook2Id': pricebook_id,
													'Product2Id': priceBookEntriesObjectList[i].Product2Id
												}
												pbeValue1.push(pbeList)
											}
										}
									}
									console.log('pbeValue' + JSON.stringify(pbeValue))
									if (pbeValue != []) {
										conn.sobject("pricebookentry").update(pbeValue, function (err, ret) {
											if (err || !ret.success) { return console.error(err, ret); }
											console.log('Updated Successfully : ' + ret.id);
											// ...
										});
									}
									console.log('pbeValue1' + JSON.stringify(pbeValue1))
									if (pbeValue1 != []) {
										conn.sobject("pricebookentry").create(pbeValue1, function (err, ret) {
											if (err || !ret.success) { return console.error(err, JSON.stringify(ret)); }
											console.log('Created Successfully : ' + ret.id);
											// ...
										});
									}
								});
							})
						}
					});
				}
				res.redirect('/amazon')
			});

			app.get('/shopify', checkNotAuthenticated, isShopify, isAccess, function (req, res, next) {
				res.render('shopify', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/ebay', checkNotAuthenticated, isEbay, isAccess, function (req, res, next) {
				res.render('ebay', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/majento', checkNotAuthenticated, isMajento, isAccess, function (req, res, next) {
				res.render('majento', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/woocommerce', checkNotAuthenticated, isWooCommerce, isAccess, function (req, res, next) {
				res.render('woocommerce', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/bigcommerce', checkNotAuthenticated, isBigCommerce, isAccess, function (req, res, next) {
				res.render('bigcommerce', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/etsy', checkNotAuthenticated, isEtsy, isAccess, function (req, res, next) {
				res.render('etsy', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/quickbooks', checkNotAuthenticated, isQuickBooks, isAccess, function (req, res, next) {
				res.render('quickbooks', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/amazon-credentials', checkNotAuthenticated, isAmazon, isAccess, async function (req, res, next) {
				var email = req.user.email;
				const success_msg = req.flash('success_msg');
				const client = await pool.connect()
				await client.query('BEGIN')
				await JSON.stringify(client.query('SELECT * FROM "amazon_credentials" WHERE "email"=$1', [email], function (err, result) {
					if (err) {
						console.log('error', err);
						throw err;
					}
					if (result.rows.length > 0) {
						res.render('amazon-credentials', { success_msg, amazDetails: result.rows, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
					} else {
						var list = [
							{
								marketplace_id: '',
								refresh_token: '',
								amazon_app_client_id: '',
								amazon_app_client_secret: '',
								aws_secret_access_key: '',
								aws_access_key: '',
								aws_selling_partner_role: ''
							}
						];
						res.render('amazon-credentials', { success_msg, amazDetails: list, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
					}
				}));
				client.release();
			});

			app.post('/amazon-credentials', async function (req, res, next) {
				var email = req.user.email;
				var updatedDate = new Date().toISOString();
				var createdDate = new Date().toISOString();
				console.log(updatedDate, createdDate)
				var { marketplace_id, refresh_token, amazonAppClient_id, amazonAppClientSecret, amazonSecretAccessKey, awsAccessKey, awsSellingPartnerRole } = req.body;
				const client = await pool.connect()
				await client.query('BEGIN')
				await JSON.stringify(client.query('SELECT id FROM amazon_credentials WHERE "email"=$1', [email], function (err, result) {
					if (result.rows.length > 0) {
						client.query('UPDATE amazon_credentials set marketplace_id=$1, refresh_token=$2, amazon_app_client_id=$3, amazon_app_client_secret=$4, aws_secret_access_key=$5, aws_access_key=$6, updated_at=$8, aws_selling_partner_role=$9 WHERE email=$7', [marketplace_id, refresh_token, amazonAppClient_id, amazonAppClientSecret, amazonSecretAccessKey, awsAccessKey, email, updatedDate, awsSellingPartnerRole]),
							client.query('COMMIT');
						req.flash('success_msg', '• Credentials is Updated')
						res.redirect('/amazon-credentials');
						return;
					}
					else {
						client.query('INSERT INTO amazon_credentials (id, marketplace_id, refresh_token, amazon_app_client_id, amazon_app_client_secret, aws_secret_access_key, aws_access_key, email, created_at, updated_at, aws_selling_partner_role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', [uuid(), marketplace_id, refresh_token, amazonAppClient_id, amazonAppClientSecret, amazonSecretAccessKey, awsAccessKey, email, createdDate, updatedDate, awsSellingPartnerRole], function (err, result) {
							if (err) { console.log(err); }
							else {
								client.query('COMMIT')
								req.flash('success_msg', '• Credentials is Inserted')
								res.redirect('/amazon-credentials');
								return;
							}
						});
					}
				}));
				client.release();
			});

			app.get('/updateAqxolt', checkNotAuthenticated, isAccess, async function (req, res, next) {
				var email = req.user.email;
				const success_msg = req.flash('success_msg');
				const client = await pool.connect()
				await client.query('BEGIN')
				await JSON.stringify(client.query('SELECT * FROM "users" WHERE "email"=$1', [email], function (err, result) {
					if (err) {
						console.log('error', err);
						throw err;
					}
					if (result.rows.length > 0) {
						res.render('manage-users-edit', { success_msg, salesDetails: result.rows, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
					}
				}));
				client.release();
			});

			app.post('/updateAqxolt', async function (req, res, next) {
				var email = req.user.email;
				var updatedDate = new Date().toISOString();
				var { aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer, instance_Url } = req.body;
				const client = await pool.connect();
				await client.query('BEGIN');
				await JSON.stringify(client.query('SELECT id FROM "users" WHERE "email"=$1', [email], function (err, result) {
					if (result.rows.length > 0) {
						client.query(`UPDATE "users" set aqxolt_client=$1, client_secret=$2, aqxolt_channel=$3, aqxolt_order_profile=$4, aqxolt_customer=$5, updated_at=$7, instance_url=$8 WHERE email=$6`, [aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer, email, updatedDate, instance_Url]),
							client.query('COMMIT');
						res.redirect('/oauth2/auth')
					}
				}));
				client.release();
			});

			app.post('/edit', async function (req, res, next) {
				var { aqxoltClient, clientSecret, aqxoltChannel, aqxoltOrderProfile, aqxoltCustomer, emailId, instanceUrl } = req.body;
				var updatedDate = new Date().toISOString();
				const client = await pool.connect();
				await client.query('BEGIN');
				await JSON.stringify(client.query(`UPDATE "users" set aqxolt_client=$1, client_secret=$2, aqxolt_channel=$3, aqxolt_order_profile=$4, aqxolt_customer=$5, updated_at=$7, instance_url=$8 WHERE email=$6`, [aqxoltClient, clientSecret, aqxoltChannel, aqxoltOrderProfile, aqxoltCustomer, emailId, updatedDate, instanceUrl]),
					client.query('COMMIT'));
				client.release();
				req.flash('success_msg', '• Record is Updated');
				res.redirect('/manage')
				return;
			});

			app.delete('/delete/:id', async function (req, res) {
				const client = await pool.connect();
				await client.query('BEGIN');
				await JSON.stringify(client.query(`Delete FROM "users" WHERE "email"=$1`, [req.params.id]),
					client.query('COMMIT'));
				req.flash('success_msg', `• User ${req.params.id} is Successfully Deleted`);
				client.release();
				res.send(200);
				return;
			})

			app.post('/makeAdmin/:id', async function (req, res) {
				var updatedDate = new Date().toISOString();
				const client = await pool.connect();
				await client.query('BEGIN');
				await JSON.stringify(client.query(`UPDATE users set role=$1, updated_at=$2 WHERE email=$3`, ['admin', updatedDate, req.params.id]),
					client.query('COMMIT'));
				req.flash('success_msg', `• User ${req.params.id} is Now Admin`);
				client.release();
				res.send(200);
				return;
			})

			app.post('/removeAdmin/:id', async function (req, res) {
				var updatedDate = new Date().toISOString();
				const client = await pool.connect();
				await client.query('BEGIN');
				await JSON.stringify(client.query(`UPDATE users set role=$1, updated_at=$2 WHERE email=$3`, ['user', updatedDate, req.params.id]),
					client.query('COMMIT'));
				req.flash('success_msg', `• User ${req.params.id} is Now User`);
				client.release();
				res.send(200);
				return;
			})

			app.get('/manage', checkNotAuthenticated, isAdmin, isAccess, async function (req, res, next) {
				var userId = req.user.email;
				const success_msg = req.flash('success_msg');
				const client = await pool.connect()
				await client.query('BEGIN')
				await JSON.stringify(client.query('SELECT * FROM "users"', function (err, result) {
					if (err) {
						throw err;
					}
					if (result.rows.length > 0) {
						res.render('manage', { userList: result, success_msg, userId, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
					}
				}));
				client.release();
			});

			app.post('/manage', async function (req, res, next) {
				let { selAccess, selEmail } = req.body;
				var updatedDate = new Date().toISOString();
				if (selAccess.length > 0 && selEmail.length > 0) {
					console.log("selAccess" + selAccess);
					console.log("selEmail" + selEmail);
					const client = await pool.connect()
					await client.query('BEGIN')
					await JSON.stringify(client.query(`UPDATE users set has_access_of=$1, updated_at=$2 WHERE email=$3`, [selAccess, updatedDate, selEmail]),
						client.query('COMMIT'));
					req.flash('success_msg', `• User ${selEmail} is Successfully Updated`);
					client.release();
					return res.redirect('/manage');

				}
			});

			app.get('/manage-edit', checkNotAuthenticated, isAccess, function (req, res, next) {
				return res.render('manage-password', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.post('/manage-edit', isAccess, async function (req, res, next) {
				var email = req.user.email;
				var updatedDate = new Date().toISOString();
				var { newPassword, confirmPassword, currentPassword } = req.body;
				let errors = [];
				console.log(newPassword, confirmPassword, currentPassword)
				bcrypt.compare(currentPassword, req.user.password, async (err, isMatch) => {
					if (isMatch && newPassword.length === 0 && confirmPassword.length === 0) {
						return res.redirect('/index');
					}
					if (isMatch || newPassword != confirmPassword) {
						errors.push({ message: '• Passwords do not match' });
					}
					if (newPassword.length < 6) {
						errors.push({ message: '• Password must be a least 6 characters long' });
					}
					if (isMatch && newPassword === confirmPassword) {
						var pwd = await bcrypt.hash(newPassword, 5);
						const client = await pool.connect();
						await client.query('BEGIN');
						await JSON.stringify(client.query(`UPDATE "users" set password=$1, updated_at=$2 WHERE email=$3`, [pwd, updatedDate, email]),
							client.query('COMMIT'));
						client.release();
						return res.redirect('/index');
					}
					if (!isMatch) {
						errors.push({ message: '• Current Password is Incorrect' });
					}
					if (!newPassword || !confirmPassword || !currentPassword) {
						errors.push({ message: '• Please enter all fields' });
					}
					if (errors.length > 0) {
						res.render("manage-password", { errors, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
					}
				});

			});

			app.get("/logout", (req, res) => {
				var conn = new jsforce.Connection({
					accessToken: req.user.oauth_token,
					instanceUrl: req.user.instance_url
				});

				conn.logout(function (err) {
					if (err) { return console.log(err); }
					console.log('successfully logout')
				})
				req.logout();
				req.flash('success_msg', '• You have logged out successfully');
				res.redirect('/');
			});

			app.post('/', passport.authenticate('local', {
				failureRedirect: '/',
				failureFlash: true
			}),
				(req, res) => {
					if (!req.user.aqxolt_client || !req.user.client_secret || !req.user.oauth_token || !req.user.refreshtoken || !req.user.instance_url) {
						res.redirect('/updateAqxolt');
					}
					if (req.user.aqxolt_client && req.user.client_secret && req.user.oauth_token && req.user.refreshtoken && req.user.instance_url) {
						res.redirect('/index');
					}
				}, function (req, res) {
					if (req.body.remember) {
						req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
						// Cookie expires after 30 days
					} else {
						req.session.cookie.expires = false; // Cookie expires at end of session
					}
					res.redirect('/');
				});

			function checkAuthenticated(req, res, next) {
				if (req.isAuthenticated()) {
					return res.redirect("/index");
				}
				next();
			}

			function checkNotAuthenticated(req, res, next) {
				if (req.isAuthenticated()) {
					return next();
				}
				res.redirect("/");
			}
		} catch (e) {
			console.log('Error-> ', e);
		}
	})();
}
