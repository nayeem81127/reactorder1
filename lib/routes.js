var express = require('express');
var app = express();
var passport = require("passport");
var { pool } = require("../dbConfig")
const bcrypt = require('bcrypt');
const uuid = require('uuid').v4;
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

module.exports = function (app) {

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
		console.log(username)
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

	app.get('/index', checkNotAuthenticated, isAccess, (req, res, next) => {
		res.render('index', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
	});

	app.get('/amazon', checkNotAuthenticated, isAmazon, isAccess, function (req, res, next) {
		res.render('amazon', { username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
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
						aws_access_key: ''
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
		var createdDate  = new Date().toISOString();
		console.log(updatedDate, createdDate)
		var { marketplace_id, refresh_token, amazonAppClient_id, amazonAppClientSecret, amazonSecretAccessKey, awsAccessKey } = req.body;
		const client = await pool.connect()
		await client.query('BEGIN')
		await JSON.stringify(client.query('SELECT id FROM amazon_credentials WHERE "email"=$1', [email], function (err, result) {
			if (result.rows.length > 0) {
				client.query('UPDATE amazon_credentials set marketplace_id=$1, refresh_token=$2, amazon_app_client_id=$3, amazon_app_client_secret=$4, aws_secret_access_key=$5, aws_access_key=$6, updated_at=$8 WHERE email=$7', [marketplace_id, refresh_token, amazonAppClient_id, amazonAppClientSecret, amazonSecretAccessKey, awsAccessKey, email, updatedDate]),
					client.query('COMMIT');
				req.flash('success_msg', '• Credentials is Updated')
				res.redirect('/amazon-credentials');
				return;
			}
			else {
				client.query('INSERT INTO amazon_credentials (id, marketplace_id, refresh_token, amazon_app_client_id, amazon_app_client_secret, aws_secret_access_key, aws_access_key, email, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [uuid(), marketplace_id, refresh_token, amazonAppClient_id, amazonAppClientSecret, amazonSecretAccessKey, awsAccessKey, email, createdDate, updatedDate], function (err, result) {
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
		var { aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer } = req.body;
		const client = await pool.connect();
		await client.query('BEGIN');
		await JSON.stringify(client.query('SELECT id FROM "users" WHERE "email"=$1', [email], function (err, result) {
			if (result.rows.length > 0) {
				client.query(`UPDATE "users" set aqxolt_client=$1, client_secret=$2, aqxolt_channel=$3, aqxolt_order_profile=$4, aqxolt_customer=$5, updated_at=$7 WHERE email=$6`, [aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer, email, updatedDate]),
					client.query('COMMIT');
				req.flash('success_msg', '• Record is Updated');
				res.redirect('/updateAqxolt');
			}
		}));
		client.release();
	});

	app.post('/edit', async function (req, res, next) {
		var { aqxoltClient, clientSecret, aqxoltChannel, aqxoltOrderProfile, aqxoltCustomer, emailId } = req.body;	
		var updatedDate = new Date().toISOString();	
		const client = await pool.connect();
		await client.query('BEGIN');
		await JSON.stringify(client.query(`UPDATE "users" set aqxolt_client=$1, client_secret=$2, aqxolt_channel=$3, aqxolt_order_profile=$4, aqxolt_customer=$5, updated_at=$7 WHERE email=$6`, [aqxoltClient, clientSecret, aqxoltChannel, aqxoltOrderProfile, aqxoltCustomer, emailId, updatedDate]),
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
		req.logout();
		req.flash('success_msg', '• You have logged out successfully');
		res.redirect('/');
	});

	app.post('/', passport.authenticate('local', {
		successRedirect: '/index',
		failureRedirect: '/',
		failureFlash: true
	}), function (req, res) {
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
}