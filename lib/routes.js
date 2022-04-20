require('dotenv').config();
var express = require('express');
var app = express();
var passport = require("passport");
var { pool } = require("../dbConfig")
const bcrypt = require('bcrypt');
const jsforce = require('jsforce')
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

app.use(express.static(__dirname + '/public'));

var oauth2;

app.use(function (req, res, next) {
	res.setHeader("Content-Security-Policy", "frame-ancestors 'self';");
	next();
});

const SellingPartnerAPI = require('amazon-sp-api');

module.exports = function (app) {

	(async () => {

		try {

			app.get('/', checkAuthenticated, function (req, res, next) {
				const success_msg = req.flash('success_msg');
				const session_exp = req.flash('session_exp');
				res.render('login', { success_msg, session_exp });
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
					} else {
						req.session.cookie.expires = false; // Cookie expires at end of session
					}
					res.redirect('/');
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
								client.query('INSERT INTO users (name, email, password, created_at, updated_at, role, has_access_of, login_count, last_login, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', [name, email, pwd, createdDate, createdDate, user, '[]', 0, createdDate, 'Active'], function (err, result) {
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

			const MySession = (req, res, next) => {
				var hour = 3600000;
				req.session.cookie.expires = new Date(Date.now() + hour);
				req.session.cookie.maxAge = hour;
				next();
			}

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

				// console.log('conn ==>' + JSON.stringify(util.inspect(conn)))
				var code = req.query.code;
				conn.authorize(code, async function (err, userInfo) {
					if (err) { return console.error(err); }

					// console.log('Client Id conn ===>' + conn.oauth2.clientId)
					// console.log('access Token conn ===>' + conn.accessToken)
					// console.log('instance url conn ===>' + conn.instanceUrl)
					// console.log('refresh Token conn ===>' + conn.refreshToken)
					// console.log('Client Secret conn ===>' + conn.oauth2.clientSecret)
					// console.log('Access Token: ' + conn.accessToken);
					// console.log('Instance URL: ' + conn.instanceUrl);
					// console.log('User ID: ' + userInfo.id);
					// console.log('Org ID: ' + userInfo.organizationId);
					// console.log('Url: ' + userInfo.url);

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
			module.exports = salesLogin;

			app.get('/index', checkNotAuthenticated, isAccess, MySession, (req, res, next) => {
				return res.render('index', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/amazon', checkNotAuthenticated, isAmazon, isAccess, MySession, async function (req, res, next) {
				const error_msg = req.flash('error_msg');
				const success_msg = req.flash('success_msg');
				var email = req.user.email;
				const client = await pool.connect()
				await client.query('BEGIN')
				await JSON.stringify(client.query('SELECT * FROM amazon_credentials WHERE "email"=$1', [email], function (err, result) {
					if (err) {
						console.log('error', err);
						throw err;
					}
					if (result.rows.length == 0) {
						return res.render('amazon', { generateLog: result, amazDetails: result, error_msg, success_msg, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
					}
					else if (result.rows.length > 0) {
						var amazDetails = result;
						client.query('SELECT * FROM "jobs_log" WHERE "email"=$1 AND category=$2 ORDER BY updated_at DESC LIMIT 25 OFFSET 25', [email, 'amazon'], function (err, result) {
							if (err) {
								console.log('error', err);
								throw err;
							}
							else {
								return res.render('amazon', { generateLog: result, amazDetails: amazDetails, error_msg, success_msg, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
							}
						})
					}
				}))
				client.release();
			});

			app.get('/amazon/:id', checkNotAuthenticated, isAmazon, isAccess, MySession, async function (req, res) {
				const error_msg = req.flash('error_msg');
				const success_msg = req.flash('success_msg');
				var idValue = req.params.id;
				var email = req.user.email;
				if (idValue == 'All') {
					return res.redirect('/amazon');
				}
				else {
					const client = await pool.connect()
					await client.query('BEGIN')
					await JSON.stringify(client.query('SELECT * FROM amazon_credentials WHERE "email"=$1', [email], function (err, result) {
						if (err) {
							console.log('error', err);
							throw err;
						}
						if (result.rows.length > 0) {
							var amazDetails = result;
							client.query('SELECT * FROM "jobs_log" WHERE "email"=$1 AND amazon_app_client_id=$2 AND category=$3 ORDER BY updated_at DESC LIMIT 25 OFFSET 25', [email, idValue, 'amazon'], function (err, result) {
								if (err) {
									console.log('error', err);
									throw err;
								}
								if (result.rows.length > 0) {
									return res.render('amazon', { generateLog: result, amazDetails: amazDetails, idValue, error_msg, success_msg, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
								}
							})
						}
					}))
					client.release();
				}
			})

			require('./amazon/customer')(app);
			require('./amazon/order')(app);
			require('./amazon/product')(app);

			app.get('/shopify', checkNotAuthenticated, isShopify, isAccess, MySession, async function (req, res, next) {
				const error_msg = req.flash('error_msg');
				const success_msg = req.flash('success_msg');
				var email = req.user.email;
				const client = await pool.connect()
				await client.query('BEGIN')
				await JSON.stringify(client.query('SELECT * FROM shops WHERE email=$1', [email], function (err, result) {
					if (err) {
						console.log('error', err);
						throw err;
					}
					if(result.rows.length == 0){
						res.redirect('/installExtension')
					}else{
						res.render('shopify', { error_msg, success_msg, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
					}
				}));
				client.release();
			});

			app.get('/installExtension', checkNotAuthenticated, isShopify, isAccess, MySession, async function (req, res, next) {
				res.render('install_extension', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/addShop', checkNotAuthenticated, isShopify, isAccess, MySession, async function (req, res, next) {
				var email = req.user.email;
				const success_msg = req.flash('success_msg');
				const error_msg = req.flash('error_msg');
				const client = await pool.connect()
				await client.query('BEGIN')
				await JSON.stringify(client.query('SELECT * FROM shops WHERE email=$1', [email], function (err, result) {
					if (err) {
						console.log('error', err);
						throw err;
					}
					else {
						res.render('addshop_shopify', { error_msg, success_msg, shopDetails: result, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
					}
				}));
				client.release();
			});

			app.post('/addShop', async function (req, res, next) {
				var email = req.user.email;
				var updatedDate = new Date().toISOString();
				var { shopifyDomain, aqxoltOrderProfile, aqxoltCustomer, aqxoltChannel } = req.body;
				if (!shopifyDomain || !aqxoltOrderProfile || !aqxoltCustomer || !aqxoltChannel) {
					req.flash('error_msg', '• Please enter all fields');
					return res.redirect('/addShop')
				} else {
					const client = await pool.connect()
					await client.query('BEGIN')
					await JSON.stringify(client.query('update shops set aqxolt_order_profile=$1, aqxolt_customer=$2, aqxolt_channel=$3, updated_at=$6 where shopify_domain=$4 and email=$5', [aqxoltOrderProfile, aqxoltCustomer, aqxoltChannel, shopifyDomain, email, updatedDate], function (err, result) {
						if (err) { console.log(err); }
						else {
							client.query('COMMIT')
							req.flash('success_msg', '• Credentials is Updated')
							res.redirect('/addShop');
							return;
						}
					}))
					client.release();
				}
			});

			app.delete('/deleteShop/:id', async function (req, res) {
				var email = req.user.email;
				const client = await pool.connect();
				await client.query('BEGIN');
				await JSON.stringify(client.query(`Delete FROM Shops WHERE "email"=$1 and shopify_domain=$2`, [email, req.params.id], function (err, result) {
					if (err) { console.log(err); }
					else {
						client.query('COMMIT');
						req.flash('success_msg', `• Shop ${req.params.id} is Successfully Deleted`);
						client.release();
						res.sendStatus(200);
						return;
					}
				}))
			})

			require('./shopify/customer')(app);
			require('./shopify/order')(app);
			require('./shopify/product')(app);
			require('./shopify/shop_auth')(app);

			app.get('/ebay', checkNotAuthenticated, isEbay, isAccess, MySession, function (req, res, next) {
				res.render('ebay', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/majento', checkNotAuthenticated, isMajento, isAccess, MySession, function (req, res, next) {
				res.render('majento', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/woocommerce', checkNotAuthenticated, isWooCommerce, isAccess, MySession, function (req, res, next) {
				res.render('woocommerce', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/bigcommerce', checkNotAuthenticated, isBigCommerce, isAccess, MySession, function (req, res, next) {
				res.render('bigcommerce', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/etsy', checkNotAuthenticated, isEtsy, isAccess, MySession, function (req, res, next) {
				res.render('etsy', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/quickbooks', checkNotAuthenticated, isQuickBooks, isAccess, MySession, function (req, res, next) {
				res.render('quickbooks', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			});

			app.get('/amazon-credentials', checkNotAuthenticated, isAmazon, isAccess, MySession, async function (req, res, next) {
				var email = req.user.email;
				const success_msg = req.flash('success_msg');
				const error_msg = req.flash('error_msg');
				const client = await pool.connect()
				await client.query('BEGIN')
				await JSON.stringify(client.query('SELECT * FROM "amazon_credentials" WHERE "email"=$1', [email], function (err, result) {
					if (err) {
						console.log('error', err);
						throw err;
					}
					else {
						res.render('amazon-credentials', { error_msg, success_msg, amazDetails: result, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
					}
				}));
				client.release();
			});

			app.post('/amazon-credentials', async function (req, res, next) {
				var email = req.user.email;
				var updatedDate = new Date().toISOString();
				var createdDate = new Date().toISOString();
				var { marketplace_id, refresh_token, amazonAppClient_id, amazonAppClientSecret, amazonSecretAccessKey, awsAccessKey, awsSellingPartnerRole } = req.body;
				if (!marketplace_id || !refresh_token || !amazonAppClient_id || !amazonAppClientSecret || !amazonSecretAccessKey || !awsAccessKey || !awsSellingPartnerRole) {
					req.flash('error_msg', '• Please enter all fields');
					return res.redirect('/amazon-credentials')
				} else {
					const client = await pool.connect()
					await client.query('BEGIN')
					await JSON.stringify(client.query('SELECT * FROM amazon_credentials WHERE "email"=$1', [email], function (err, result) {
						if (result.rows.length == 0) {
							client.query('INSERT INTO amazon_credentials (marketplace_id, refresh_token, amazon_app_client_id, amazon_app_client_secret, aws_secret_access_key, aws_access_key, email, created_at, updated_at, aws_selling_partner_role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', [marketplace_id, refresh_token, amazonAppClient_id, amazonAppClientSecret, amazonSecretAccessKey, awsAccessKey, email, createdDate, updatedDate, awsSellingPartnerRole], function (err, result) {
								if (err) { console.log(err); }
								else {
									client.query('COMMIT')
									req.flash('success_msg', '• Credentials is Inserted')
									res.redirect('/amazon-credentials');
									return;
								}
							});
						}
						else if (result.rows.length > 0) {
							var ExistAmazAppClientId = [];
							for (let i in result.rows) {
								ExistAmazAppClientId.push(result.rows[i].amazon_app_client_id)
							}

							var NotInAmaz;
							if (!ExistAmazAppClientId.includes(amazonAppClient_id)) {
								NotInAmaz = amazonAppClient_id;
							}

							if (NotInAmaz) {
								client.query('INSERT INTO amazon_credentials (marketplace_id, refresh_token, amazon_app_client_id, amazon_app_client_secret, aws_secret_access_key, aws_access_key, email, created_at, updated_at, aws_selling_partner_role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', [marketplace_id, refresh_token, amazonAppClient_id, amazonAppClientSecret, amazonSecretAccessKey, awsAccessKey, email, createdDate, updatedDate, awsSellingPartnerRole], function (err, result) {
									if (err) { console.log(err); }
									else {
										client.query('COMMIT')
										req.flash('success_msg', '• Credentials is Inserted')
										res.redirect('/amazon-credentials');
									}
								});
							} else {
								client.query('UPDATE amazon_credentials set marketplace_id=$1, refresh_token=$2, amazon_app_client_secret=$4, aws_secret_access_key=$5, aws_access_key=$6, updated_at=$8, aws_selling_partner_role=$9 WHERE email=$7 AND amazon_app_client_id=$3', [marketplace_id.trim(), refresh_token.trim(), amazonAppClient_id.trim(), amazonAppClientSecret.trim(), amazonSecretAccessKey.trim(), awsAccessKey.trim(), email, updatedDate, awsSellingPartnerRole.trim()], function (err, result) {
									if (err) { console.log(err); }
									else {
										client.query('COMMIT')
										req.flash('success_msg', '• Credentials is Updated')
										res.redirect('/amazon-credentials');
									}
								});
							}
						}
					}));
					client.release();
				}
			});

			app.delete('/deleteSeller/:id', async function (req, res) {
				var email = req.user.email;
				const client = await pool.connect();
				await client.query('BEGIN');
				await JSON.stringify(client.query(`Delete FROM amazon_credentials WHERE "email"=$1 And amazon_app_client_id=$2`, [email, req.params.id], function (err, result) {
					if (err) { console.log(err); }
					else {
						client.query('COMMIT');
						req.flash('success_msg', `• Seller ${req.params.id} is Successfully Deleted`);
						client.release();
						res.sendStatus(200);
						return;
					}
				}))
			})

			app.get('/updateAqxolt', checkNotAuthenticated, isAccess, async function (req, res, next) {
				var email = req.user.email;
				const success_msg = req.flash('success_msg');
				const error_msg = req.flash('error_msg');
				const client = await pool.connect()
				await client.query('BEGIN')
				await JSON.stringify(client.query('SELECT * FROM "users" WHERE "email"=$1', [email], function (err, result) {
					if (err) {
						console.log('error', err);
						throw err;
					}
					if (result.rows.length > 0) {
						res.render('manage-users-edit', { error_msg, success_msg, salesDetails: result.rows, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
					}
				}));
				client.release();
			});

			app.post('/updateAqxolt', async function (req, res, next) {
				var email = req.user.email;
				var updatedDate = new Date().toISOString();
				var { aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer, instance_Url } = req.body;
				if (!aqxolt_client || !client_secret || !aqxolt_channel || !aqxolt_order_profile || !aqxolt_customer || !instance_Url) {
					req.flash('error_msg', '• Please enter all fields');
					return res.redirect('/updateAqxolt')
				} else {
					const client = await pool.connect();
					await client.query('BEGIN');
					await JSON.stringify(client.query('SELECT id FROM "users" WHERE "email"=$1', [email], function (err, result) {
						if (result.rows.length > 0) {
							client.query(`UPDATE "users" set aqxolt_client=$1, client_secret=$2, aqxolt_channel=$3, aqxolt_order_profile=$4, aqxolt_customer=$5, updated_at=$7, instance_url=$8 WHERE email=$6`, [aqxolt_client.trim(), client_secret.trim(), aqxolt_channel.trim(), aqxolt_order_profile.trim(), aqxolt_customer.trim(), email, updatedDate, instance_Url.trim()]),
								client.query('COMMIT');
							res.redirect('/oauth2/auth')
						}
					}));
					client.release();
				}
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
				res.sendStatus(200);
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
				res.sendStatus(200);
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
				res.sendStatus(200);
				return;
			})

			app.post('/Active/:id', async function (req, res) {
				var updatedDate = new Date().toISOString();
				const client = await pool.connect();
				await client.query('BEGIN');
				await JSON.stringify(client.query(`UPDATE users set status=$1, updated_at=$2 WHERE email=$3`, ['Active', updatedDate, req.params.id]),
					client.query('COMMIT'));
				req.flash('success_msg', `• User ${req.params.id} is Now Active`);
				client.release();
				res.sendStatus(200);
				return;
			})

			app.post('/InActive/:id', async function (req, res) {
				var updatedDate = new Date().toISOString();
				const client = await pool.connect();
				await client.query('BEGIN');
				await JSON.stringify(client.query(`UPDATE users set status=$1, updated_at=$2 WHERE email=$3`, ['InActive', updatedDate, req.params.id]),
					client.query('COMMIT'));
				req.flash('success_msg', `• User ${req.params.id} is Now In Active`);
				client.release();
				res.sendStatus(200);
				return;
			})

			app.get('/manage', checkNotAuthenticated, isAdmin, isAccess, MySession, async function (req, res, next) {
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

			app.get('/manage-edit', checkNotAuthenticated, isAccess, MySession, function (req, res, next) {
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
				if (req.user.oauth_token && req.user.instance_url) {
					var conn = new jsforce.Connection({
						accessToken: req.user.oauth_token,
						instanceUrl: req.user.instance_url
					});

					conn.logout(function (err) {
						if (err) { return console.log(err); }
					})
				}
				req.logout();
				req.flash('success_msg', '• You have logged out successfully');
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