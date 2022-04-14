const express = require("express")
const app = express()
const { pool } = require("../../dbConfig");
const jsforce = require('jsforce')
const salesLogin = require('../routes');
app.use(express.static('public'));
const Shopify = require('shopify-api-node');
const customer = require("../amazon/customer");

module.exports = function (app) {

    (async () => {

        try {

            app.post('/shopifyCustomerSync', salesLogin, async function (req, res, next) {

                const client = await pool.connect();
                await client.query('BEGIN');
                await JSON.stringify(client.query("SELECT * FROM shops WHERE email=$1", [req.user.email], async function (err, result) {
                    if (err) { console.log(err); }

                    if (result.rows.length === 0) {
                        req.flash('error_msg', '• No Shops Found');
                        return res.redirect('/shopify')
                    }
                    else if (result.rows.length > 0) {
                        var oauth_token = req.user.oauth_token;
                        var instance_url = req.user.instance_url;
                        for (let z in result.rows) {
                            setTimeout(async function () {
                                if (req.user.email === result.rows[z].email) {
                                    var Aqxolt_Customer;
                                    var Aqxolt_Order_Profile;
                                    var shopName = result.rows[z].shopify_domain;
                                    var accessToken = result.rows[z].shopify_token;

                                    if (result.rows[z].aqxolt_customer && result.rows[z].aqxolt_order_profile) {
                                        Aqxolt_Customer = result.rows[z].aqxolt_customer;
                                        Aqxolt_Order_Profile = result.rows[z].aqxolt_order_profile;
                                    } else {
                                        Aqxolt_Customer = req.user.aqxolt_customer;
                                        Aqxolt_Order_Profile = req.user.aqxolt_order_profile;
                                    }

                                    if (!Aqxolt_Order_Profile && !Aqxolt_Customer && !accessToken || !shopName) {
                                        req.flash('error_msg', '• Order Profile, Customer And Shops Credentials are Missing');
                                        res.redirect('/shopify')
                                    }
                                    else if (!accessToken || !shopName) {
                                        req.flash('error_msg', '• Shops Credentials are Missing');
                                        res.redirect('/shopify')
                                    }
                                    else if (!Aqxolt_Order_Profile) {
                                        req.flash('error_msg', '• Order Profile is Empty in Aqxolt Info');
                                        res.redirect('/amazon')
                                    }
                                    else if (!Aqxolt_Customer) {
                                        req.flash('error_msg', '• Aqxolt Customer is Empty in Aqxolt Info');
                                        res.redirect('/amazon')
                                    }
                                    else if (!Aqxolt_Customer && !Aqxolt_Order_Profile) {
                                        req.flash('error_msg', '• Aqxolt Customer And Order Profile is Empty');
                                        res.redirect('/amazon')
                                    }
                                    else if (Aqxolt_Customer && Aqxolt_Order_Profile && accessToken && shopName) {

                                        const shopify = new Shopify({
                                            shopName: shopName,
                                            accessToken: accessToken
                                        });

                                        let params = { limit: 50 };
                                        let CustomersArray = [];

                                        do {
                                            const Customers = await shopify.customer.list(params).catch(err => console.log('err 123 '+err))
                                            CustomersArray = CustomersArray.concat(Customers);
                                            params = Customers.nextPageParameters;
                                        } while (params !== undefined);

                                        var conn = new jsforce.Connection({
                                            accessToken: oauth_token,
                                            instanceUrl: instance_url
                                        });

                                        
                                    }
                                }
                            }, 2000 * z);
                        }
                        res.redirect('/shopify')
                    }
                }))
            });

        } catch (e) {
            console.log('Error-> ', e);
        }
    })();

}
