// conn.bulk.pollInterval = 1000;
// conn.bulk.pollTimeout = Number.MAX_VALUE;
// let records = [];


// // We still need recordStream to listen for errors. We'll access the stream
// // directly though, bypassing jsforce's RecordStream.Parsable
// const recordStream = conn.bulk.query(`SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c,ERP7__Account_Type__c, ERP7__Customer_External_Id__c FROM Account where ERP7__Email__c IN ('${buyerEmailInfo.join("','")}')`);
// const readStream = recordStream.stream();
// const csvToJsonParser = csv({ flatKeys: false, checkType: true });
// readStream.pipe(csvToJsonParser);

// csvToJsonParser.on("data", (data) => {
//     records.push(JSON.parse(data.toString('utf8')));
// });

// new Promise((resolve, reject) => {
//     recordStream.on("error", (error) => {
//         console.log(error)
//     });

//     csvToJsonParser.on("error", (error) => {
//         console.error(error);
//     });

//     csvToJsonParser.on("done", async () => {
//         resolve(records);
//     });
// }).then((records) => {
//     console.log(records);
// });





// console.log(users.length)

// const list = [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }, { x: 1, y: 2 }];

// const uniq = new Set(users.map(e => JSON.stringify(e)));

// users = Array.from(uniq).map(e => JSON.parse(e));

// console.log(JSON.stringify(users.length));

const { pool } = require("../../dbConfig");

(async () => {

    try {        
        const timeStamp = new Date().getTime();
        const yesterdayTimeStamp = timeStamp - (24 * 60 * 60 * 1000) * 1;       
        var todayDate = new Date(timeStamp).toLocaleString('en-US', { weekday: 'short', day: 'numeric', year: 'numeric', month: 'long' })
        var yesterdayDate = new Date(yesterdayTimeStamp).toLocaleString('en-US', { weekday: 'short', day: 'numeric', year: 'numeric', month: 'long' })
        const client = await pool.connect();
        await client.query('BEGIN');
        var todaycount = 67;
        await JSON.stringify(client.query(`SELECT * FROM charts WHERE seller_id=$1 AND email=$2 AND category=$3 AND updated_at=$4`, ['northern-wide-plank.myshopify.com', 'admin@gmail.com', 'shopify', yesterdayDate], async function (err, result1) {
            if (err) { console.log(err); }
            if (result1.rows.length == 0) {
                client.query(`SELECT * FROM charts WHERE seller_id=$1 AND email=$2 AND category=$3 AND updated_at=$4`, ['northern-wide-plank.myshopify.com', 'admin@gmail.com', 'shopify', todayDate], async function (err, result) {
                    if (err) { console.log(err); }
                    console.log('second '+result.rows.length)
                    if (result.rows.length == 0) {
                        client.query(`Insert into charts(email,seller_id) values('admin@gmail.com','nwp')`,async function (err, result) {
                            if (err) { console.log(err); }
                        })
                    }
                })
            }
            else if (result1.rows.length > 0) {
                var count = parseInt(todaycount - result1.rows[0].sync_count)
                client.query(`update charts set sync_count=$5 WHERE seller_id=$1 AND email=$2 AND category=$3 AND updated_at=$4`['northern-wide-plank.myshopify.com', 'admin@gmail.com', 'shopify', todayDate, count])
            }
        }))
        client.release();
    } catch (e) {
        console.log('Error-> ', e);
    }
})();

/*

heroku pg:psql postgresql-curved-68451 --app testpostgres-123

database name of heroku postgresql----> postgresql-curved-68451
heroku app name ------->  testpostgres-123
----------------------------------------------------------------------------------------


insert---------
 INSERT INTO users (name, email, password, role, has_access_of, login_count) VALUES ('Nayeem','nayeem@gmail.com','123456','admin','["amazon", "shopify", "etsy", "majento", "wooCommerce", "bigCommerce", "quickBooks", "ebay"]', 0);
--------------------------------------------------------------------------------------------------------

create table

CREATE TABLE users (
id uuid PRIMARY KEY,
role VARCHAR(20) NOT NULL,
status VARCHAR(20) NOT NULL,
name VARCHAR(90) NOT NULL,
email VARCHAR(200) UNIQUE NOT NULL,
password VARCHAR(200) NOT NULL,
created_at timestamp without time zone NOT NULL,
updated_at timestamp without time zone NOT NULL,
has_access_of jsonb NOT NULL,
login_count numeric NOT NULL,
last_login timestamp without time zone NOT NULL,
aqxolt_client VARCHAR(200),
client_secret VARCHAR(200),
aqxolt_channel VARCHAR(200),
aqxolt_order_profile VARCHAR(200),
aqxolt_customer VARCHAR(200),
instance_url VARCHAR(200),
uid VARCHAR(200),
refreshtoken VARCHAR(200),
oauth_token VARCHAR(200)
 );

                             Table "public.users"
    Column     |            Type             | Collation | Nullable | Default
---------------+-----------------------------+-----------+----------+---------
 id            | uuid                        |           | not null |
 role          | character varying(20)       |           | not null |
 name          | character varying(90)       |           | not null |
 email         | character varying(200)      |           | not null |
 password      | character varying(200)      |           | not null |
 created_at    | timestamp without time zone |           | not null |
 updated_at    | timestamp without time zone |           | not null |
 has_access_of | jsonb                       |           | not null |
 login_count   | numeric                     |           | not null |
 last_login    | timestamp without time zone |           | not null |
Indexes:
    "users_pkey" PRIMARY KEY, btree (id)
    "users_email_key" UNIQUE CONSTRAINT, btree (email)

=================================================================================================================
update json value--->

update users set has_access_of= '["amazon", "shopify", "etsy", "majento", "wooCommerce", "bigCommerce", "quickBooks", "ebay"]' where email = 'admin@gmail.com';

==================================================================================================================================
Delete query ---->

 delete from users where email = 'Test@gmail.com';

------------------------------------------------------------------------------------------------------------------

https://github.com/timtamimi/node.js-passport.js-template/blob/master/lib/routes.js

================================================================================================================

https://tamimi.dev/getting-started-with-authentication-in-node-js-with-passport-and-postgresql-2219664b568c

================================================================================================================

bcrypt body-parser connect-flash cookie-parser dotenv node-gyp ejs express express-flash express-session passport passport-local pg uuid
==================================================================================================================

heroku pg:psql postgresql-polished-33974 --app axolt-integration
==============================================================================================================

postgres://viissgyvzrbxsu:74a9683a0dc419aa1beae4a00b46a888c4e23d01f1907c9110d27cac4cfc88c9@ec2-34-194-171-47.compute-1.amazonaws.com:5432/dbhjrjaam6blad
=================================================================================================================================================================

CREATE TABLE amazon_credentials (
id uuid PRIMARY KEY, 
marketplace_id VARCHAR(200),
refresh_token VARCHAR(500),
amazon_app_client_id VARCHAR(200),
amazon_app_client_secret VARCHAR(200),
aws_secret_access_key VARCHAR(200),
aws_access_key VARCHAR(200),
created_at VARCHAR(200),
aws_selling_partner_role VARCHAR(200),
updated_at VARCHAR(200)
);


ALTER TABLE amazon_credentials Add email varchar(200),
ADD FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE;
 
============================================================================================================================================
CREATE TABLE jobs_log(
id uuid PRIMARY KEY, 
amazon_app_client_id VARCHAR(200),
category VARCHAR(100),
updated_at VARCHAR(200)
);

ALTER TABLE jobs_log Add email varchar(200),
ADD FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE;

============================================================================================================================================

SELECT * FROM users INNER JOIN amazon_credentials ON users.email = amazon_credentials.email where users.email='admin@gmail.com';
============================================================================================================================================

3MVG9n_HvETGhr3AtA7xRPjR9FiiWwcp5s4FO2S5Ni9NyOShi95J9XllRMsksmp3TSrSghEYQzfC4fGAW0ubs ---> client id
 
 13F6F85185867C6506F189B72989FC5C7B69B0FED429D917ACC102BC608CB087 ---> client sceret
 
 a0Y2w000000Yx2qEAC ---> channel

 a2b2w000000PeAoAAK ---> order profile
   
 a2b2w000000PeAjAAK ---> customer profile

============================================================================================================================================

3MVG9pRzvMkjMb6khfCBO8EDC0XhriVHHRBUBiqXZ7YvVJ.P12SqCP1ZL1GpHwHSmKGdEqtghWr64K05_AOvZ

B5008EBA2817E273B8B987DD3176AF2A2649A70B4F69A7A24460702E781D12FD

https://softwareenterprise-dev-ed.my.salesforce.com/

var arr = [];
    for(let i in orderDetails){
      console.log(orderDetails[i].AmazonOrderId)      
        if (orderDetails.hasOwnProperty(i)) {
           var innerObj = {};
           innerObj[i] = orderDetails[i];
           arr.push(innerObj)
        }     
    }
    console.log(arr);
============================================================================================================================================

Array unique values

const unique = (value, index, self) => {
                return self.indexOf(value) === index
              }
              
              const ages = [26, 27, 26, 26, 28, 28, 29, 29, 30]
              const uniqueAges = ages.filter(unique)
              
              console.log(uniqueAges)  // [ 26, 27, 28, 29, 30 ]

===================================================================================================================================================
 
passport.deserializeUser((email, done) => {
    // pool.query(`SELECT * FROM users INNER JOIN amazon_credentials ON users.email = amazon_credentials.email where users.email= $1`, [email], (err, results) => {
    //   if (err) {
    //     return done(err);
    //   }
    //   if (results.rows.length > 0) {
    //     //  console.log(`ID is 1 ${JSON.stringify(results.rows[0].id)}`);
    //     return done(null, results.rows[0]);
    //   } else {
        pool.query(`SELECT * FROM users where email= $1`, [email], (err, result) => {
          if (err) {
            return done(err);
          }
          if (result.rows.length > 0) {
            // console.log(`ID is 2 ${JSON.stringify(result.rows[0].id)}`);
            return done(null, result.rows[0]);
          }
        });
    //   }
    // });
  });

=========================================================================================================================================================

&& UsersDetails[z].aqxolt_order_profile && UsersDetails[z].aqxolt_customer && UsersDetails[z].aqxolt_channel

=========================================================================================================================================================

insert into amazon_credentials (email,id,marketplace_id,refresh_token,amazon_app_client_id,amazon_app_client_secret,aws_secret_access_key,aws_access_key,created_at,aws_selling_partner_role,updated_at) values('admin@gmail.com','9cf269bb-c94c-455c-a49e-bd5bc66addc9','A1F83G8C2ARO7P','Atzr|IwEBIKaDEcQEt-upWRDiYCpr9w3UXAs1Bpg9phpH6QYZ9QVk93RS28ip2kyS5T55f6M6mV_mLLU4jk6vbPQPJn8KspFgLE5_Ozemye-JVxOiPq7zL1UVDjcuCckibZRddNujWWVldG8KDVmRVUh1sdgbSL-EDqAL6AcFFkWQ0J9YbTs-1X52fSXljyxRdXD8f5L4xHVlZhCBCpvALmJE9XS2ZXXuw7p9rqYBRRNdoBSJCAWlakmIIQKRY2uZEf2z3Ioyrqc4TnQIoF2Gnn_2JHnc1Fzca6iPJddYMTytC4bLZLZ_5t7jS3eMcdMnyBjThoJo44g','amzn1.application-oa2-client.fb2b1d1c45c040d79115cf4c440b8614','2b58f2a9ea358a58e5e78a3db5c312fdcdf56c69aabd0a4daab23b42023f16d7','zpUuXrFGVYllU93z94LCkiwfzjL+D1p81ptn4Kek','AKIAUWP7HSF63GXOMU7F','2022-03-18T10:52:25.980Z','arn:aws:iam::323194687869:role/SPAPIRole','2022-03-23T06:52:48.465Z');


=========================================================================================================================================================


'Fri, March 25, 2022, 10:52:25 AM'
SELECT * FROM jobs_log WHERE updated_at::date  >= 'Thu, March 24, 2022, 2:41:42 PM' AND update_date < ('Thu, March 24, 2022, 2:41:42 PM'::date + '1 day');
AND updated_at < ('2013-05-03'::date + '1 day'::interval);

==========================================================================================================================================================

CREATE TABLE shops(
id PRIMARY KEY,
email VARCHAR(200) NOT NULL,
shopify_domain VARCHAR(20) NOT NULL,
shopify_token VARCHAR(20) NOT NULL,
created_at timestamp without time zone NOT NULL,
updated_at timestamp without time zone NOT NULL,
ADD FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE;
 );

==========================================================================================================================================================
CREATE TABLE flow_charts(
id SERIAL PRIMARY KEY,
email VARCHAR(200) NOT NULL,
seller_id VARCHAR(200) NOT NULL,
category VARCHAR(200) NOT NULL,
sync_count VARCHAR(200) NOT NULL,
updated_at timestamp without time zone NOT NULL,
ADD FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
 );
===========================================================================================================================================================

SCOPES write_fulfillments,write_inventory,read_orders,write_customers,write_products,write_price_rules

SHOPIFY_API_KEY  5e72148f73d9fe9c8ef820c0defa9f80

write_fulfillments,write_inventory,read_orders,write_customers,write_products,write_price_rules

==========================================================================================================================================================

CREATE TABLE shop_aqxolt_infos(
id SERIAL PRIMARY KEY,
aqxolt_channel VARCHAR(200),
aqxolt_order_profile VARCHAR(200),
aqxolt_customer VARCHAR(200),
parent_id integer,
created_at timestamp without time zone NOT NULL,
updated_at timestamp without time zone NOT NULL
 );

============================================================================================================================================================


Session {
 id: 'offline_aqxoltfb.myshopify.com',
 shop: 'aqxoltfb.myshopify.com',
 state: '070954773792116',
 isOnline: false,
 accessToken: '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',
 scope: 'write_fulfillments,write_inventory,read_orders,write_customers,write_products,write_price_rules'
}

=========================================================================================================

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
                                    // var exeLen = parseInt(z) + 1;
                                    // SuccessToGo(exeLen);
                                  });
                                }
                              }
                              else if (priceBookEntryRecords.length > 0) {
                                var priceBookExist = [];
                                var priceBookIdExist = [];
                                var priceNotExist = [];
                                for (let i in priceBookEntryRecords) {
                                  for (let j in priceBookEntryAvail) {
                                    if (priceBookEntryRecords[i].Product2Id == priceBookEntryAvail[j].Product2Id && priceBookEntryRecords[i].Pricebook2Id == priceBookEntryAvail[j].Pricebook2Id) {
                                      var list = {
                                        Id: priceBookEntryRecords[i].Id,
                                        UnitPrice: priceBookEntryAvail[j].UnitPrice
                                      }
                                      priceBookExist.push(list)
                                      var list2 = {
                                        Product2Id: priceBookEntryRecords[i].Product2Id,
                                        Pricebook2Id: priceBookEntryRecords[i].Pricebook2Id
                                      }
                                      priceBookIdExist.push(list2)
                                    }
                                  }
                                }
                                // console.log('priceBookExist ' + JSON.stringify(priceBookExist))

                                if (priceBookIdExist != []) {
                                  priceNotExist = priceBookEntryAvail.filter((Exist) => !priceBookIdExist.some((NotExist) => Exist.Product2Id == NotExist.Product2Id && Exist.Pricebook2Id == NotExist.Pricebook2Id))
                                }
                                console.log(priceBookEntryAvail.length)
                                console.log(priceNotExist.length)
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

                                if (priceBookExist != []) {
                                  conn.bulk.pollTimeout = 25000;
                                  conn.bulk.load("pricebookentry", "update", priceBookExist, function (err, rets) {
                                    if (err) { return console.error('err 2' + err); }
                                    for (var i = 0; i < rets.length; i++) {
                                      if (rets[i].success) {
                                        console.log("#" + (i + 1) + " update PricebookEntry successfully, id = " + rets[i].id);
                                      } else {
                                        console.log("#" + (i + 1) + " error occurred, message = " + rets[i].errors.join(', '));
                                      }
                                    }
                                    var date = new Date();
                                    var updatedDate = date.toLocaleString('en-US', { weekday: 'short', day: 'numeric', year: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric', second: 'numeric' })
                                    pool.query('INSERT INTO jobs_log (email, updated_at, category, message, seller_id) VALUES ($1, $2, $3, $4, $5)', [Email, updatedDate, 'shopify', 'Product Sync', shopName]);
                                    // var exeLen = parseInt(z) + 1;
                                    // SuccessToGo(exeLen);
                                  });
                                }
                              }

test-store-nicks-1.myshopify.com  | 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 

test-store-nicks-7.myshopify.com  | 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

Shopify	mailto:info@aqxolt.com	Suite522@
*/

