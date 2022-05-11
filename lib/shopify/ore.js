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


