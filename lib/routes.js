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

	app.get('/updateAqxolt', checkNotAuthenticated, isAccess, async function (req, res, next) {
		var email = req.user.email;
		var aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer;
		console.log('email get' + email)
		const success_msg = req.flash('success_msg');
		const client = await pool.connect()
		await client.query('BEGIN')
		await JSON.stringify(client.query('SELECT * FROM "users_salesforce" WHERE "email"=$1', [email], function (err, result) {
			if (err) {
				console.log('error' ,err);
				throw err;
			}
			if (result.rows.length > 0) {
				aqxolt_client = result.rows[0].aqxolt_client;
				client_secret = result.rows[0].client_secret;
				aqxolt_channel = result.rows[0].aqxolt_channel;
				aqxolt_order_profile = result.rows[0].aqxolt_order_profile;
				aqxolt_customer = result.rows[0].aqxolt_customer;
				res.render('manage-users-edit', { success_msg, aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			}
			else {
				aqxolt_client = '';
				client_secret = '';
				aqxolt_channel = '';
				aqxolt_order_profile = '';
				aqxolt_customer = '';
				res.render('manage-users-edit', { success_msg, aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			}
		}));
		client.release();
	});

	app.post('/updateAqxolt', async function (req, res, next) {
		var email = req.user.email;
		console.log("email" + email);
		var { aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer } = req.body;		
		console.log('input value' + aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer);

		const client = await pool.connect();
		await client.query('BEGIN');
		await JSON.stringify(client.query('SELECT id FROM "users_salesforce" WHERE "email"=$1', [email], function (err, result) {
			if (result.rows.length > 0) {
				client.query(`UPDATE "users_salesforce" set aqxolt_client=$1, client_secret=$2, aqxolt_channel=$3, aqxolt_order_profile=$4, aqxolt_customer=$5 WHERE email=$6`, [aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer, email]),
						client.query('COMMIT');
						req.flash('success_msg', '• Record is Updated');
						res.redirect('/updateAqxolt');					
				}			
			else {
				client.query('INSERT INTO "users_salesforce"(id, aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer, email) VALUES ($1, $2, $3, $4, $5, $6, $7)', [uuid(), aqxolt_client, client_secret, aqxolt_channel, aqxolt_order_profile, aqxolt_customer, email], function (err, result) {
					if (err) { console.log(err); }
					else {
						client.query('COMMIT')
						console.log(result)
						req.flash('success_msg', '• Record is Created');
						res.redirect('/updateAqxolt');
					}
				});
			}
		}));
		client.release();
	});

	app.get('/manage', checkNotAuthenticated, isAdmin, isAccess, async function (req, res, next) {
		var userId = req.user.id;
		const client = await pool.connect()
		await client.query('BEGIN')
		await JSON.stringify(client.query('SELECT * FROM "users"', function (err, result) {
			if (err) {
				throw err;
			}
			if (result.rows.length > 0) {
				res.render('manage', { userList: result, userId, username, manage, amaz, etsy, shopify, majento, wooCommerce, bigCommerce, quickBooks, ebay });
			}
		}));
		client.release();
	});

	app.post('/manage', async function (req, res, next) {
		let { adminRole, delEmail, userRole, selAccess, selEmail } = req.body;
		var updatedDate = new Date().toISOString();
		if (delEmail.length > 0) {
			console.log("delEmail" + delEmail);
			await pool.query('Delete FROM "users" WHERE "email"=$1', [delEmail]);
			await pool.query('COMMIT');
			res.redirect('/manage');
			return;
		}
		if (selAccess.length > 0 && selEmail.length > 0) {
			console.log("selAccess" + selAccess);
			console.log("selEmail" + selEmail);
			const client = await pool.connect()
			await client.query('BEGIN')
			await JSON.stringify(client.query(`UPDATE users set has_access_of=$1, updated_at=$2 WHERE email=$3`, [selAccess, updatedDate, selEmail]),
				client.query('COMMIT'));
			client.release();
			res.redirect('/manage');
			return;
		}
		if (adminRole.length > 0) {
			console.log("adminRole" + adminRole);
			const client = await pool.connect()
			await client.query('BEGIN')
			await JSON.stringify(client.query(`UPDATE users set role=$1, updated_at=$2 WHERE email=$3`, ['admin', updatedDate, adminRole]),
				client.query('COMMIT'));
			client.release();
			res.redirect('/manage');
			return;
		} 
		if (userRole.length > 0) {
			console.log("userRole" + userRole);
			const client = await pool.connect()
			await client.query('BEGIN')
			await JSON.stringify(client.query(`UPDATE users set role=$1, updated_at=$2 WHERE email=$3`, ['user', updatedDate, userRole]),
				client.query('COMMIT'));
			client.release();
			res.redirect('/manage');
			return;
		} 
	});

	app.get("/logout", (req, res) => {
		req.logout();
		req.flash('success_msg', '• You have logged out successfully');
		res.redirect('/');
	});

	/*
	app.get('/login', function (req, res, next) {
		if (req.isAuthenticated()) {
			res.redirect('/index');
		}
		else{
			res.render('login', {title: "Log in", userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
		}
		
	});
	*/

	/*
	app.get('/logout', function (req, res) {
	
		console.log(req.isAuthenticated());
		req.logout();
		console.log(req.isAuthenticated());
		req.flash('success', "Logged out. See you soon!");
		res.redirect('/');
	});
	
	app.post('/', passport.authenticate('local', {
		successRedirect: '/index',
		failureRedirect: '/',
		failureFlash: true
	}));
*/

	/* , function(req, res) {
		if (req.body.remember) {
			req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
			} else {
			req.session.cookie.expires = false; // Cookie expires at end of session
		}
		res.redirect('/');
	} */

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

	/* app.post(
		"/",
		passport.authenticate("local", {
			failureRedirect: "/",
			failureFlash: true 
		}), (req, res) => {
			if (req.user.role === "admin") {
				res.redirect('/admin');
			}
			if (req.user.role === "user") {
				res.redirect("/index");
			}
		});
		*/

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

/*
passport.use('local', new LocalStrategy({ passReqToCallback: true }, (req, email, password, done) => {
	console.log(email, password);
	loginAttempt();
	async function loginAttempt() {


		const client = await pool.connect()
		try {
			await client.query('BEGIN')
			var currentAccountsData = await JSON.stringify(client.query('SELECT id, name, email, password FROM users WHERE email=$1', [email], function (err, result) {
				console.log('result.rows[0]'+result.rows[0]);
				if (err) {
					return done(err)
				}
				if (result.rows[0] == null) {
					console.log("1");
					//req.flash('danger', "Oops. Incorrect login details.");
					req.flash("msg", "No user with that email");
					res.locals.messages = req.flash();
					return done(null, false);
				}
				else {
					bcrypt.compare(password, result.rows[0].password, function (err, check) {
						if (err) {
							console.log("2");
							console.log('Error while checking password');
							return done();
						}
						else if (check) {
							console.log("3");
							return done(null, user);
							//[{email: result.rows[0].email, name: result.rows[0].name}]);
						}
						else {
							console.log("4");
							//req.flash('danger', "Oops. Incorrect login details.");
							req.flash("msg", "Password Incorrect");
							res.locals.messages = req.flash();
							return done(null, false);
						}
					});
				}
			}))
		}

		catch (e) { throw (e); }
	};

}
))

passport.serializeUser(function (user, done) {
	done(null, user);
});

passport.deserializeUser(function (user, done) {
	done(null, user);
});	

*/