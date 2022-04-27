'01t2w00000B1fPwAAJ',
'01t2w00000B1fPxAAJ',
'01t2w00000B1fPyAAJ',
'01t2w00000B1fPzAAJ',
'01t2w00000B1fQ0AAJ',
'01t2w00000B1fQ1AAJ',
'01t2w00000B1fQ2AAJ',
'01t2w00000B1fQ3AAJ',
'01t2w00000B1fQ4AAJ',
'01t2w00000B1fQ5AAJ',
'01t2w00000B1fQ6AAJ',
'01t2w00000B1fQ7AAJ',
'01t2w00000B1fQ8AAJ',
'01t2w00000B1fQ9AAJ',
'01t2w00000B1fQAAAZ',
'01t2w00000B1fQBAAZ',
'01t2w00000B1fQCAAZ',
'01t2w00000B1fQDAAZ',
'01t2w00000B1fQEAAZ',
'01t2w00000B1fQFAAZ',
'01t2w00000B1fQGAAZ',
'01t2w00000B1fQHAAZ',
'01t2w00000B1fQIAAZ',
'01t2w00000B1fQJAAZ',
'01t2w00000B1fQKAAZ',
'01t2w00000B1fQLAAZ',
'01t2w00000B1fQMAAZ',
'01t2w00000B1fQNAAZ',
'01t2w00000B1fQOAAZ',
'01t2w00000B1fQPAAZ',
'01t2w00000B1fQQAAZ',
'01t2w00000B1fQRAAZ',
'01t2w00000B1fQSAAZ',
'01t2w00000B1fQTAAZ',
'01t2w00000B1fQUAAZ',
'01t2w00000B1fQVAAZ',
'01t2w00000B1fQWAAZ',
'01t2w00000B1fQXAAZ',
'01t2w00000B1fQYAAZ',
'01t2w00000B1fQZAAZ',
'01t2w00000B1fQaAAJ',
'01t2w00000B1fQbAAJ',
'01t2w00000B1fQcAAJ',
'01t2w00000B1fQdAAJ',
'01t2w00000B1fQeAAJ',
'01t2w00000B1fQfAAJ',
'01t2w00000B1fQgAAJ',
'01t2w00000B1fQhAAJ',
'01t2w00000B1fQiAAJ',
'01t2w00000B1fQjAAJ',
'01t2w00000B1fQkAAJ',
'01t2w00000B1fQlAAJ',
'01t2w00000B1fQmAAJ',
'01t2w00000B1fQnAAJ',
'01t2w00000B1fQoAAJ',
'01t2w00000B1fQpAAJ',
'01t2w00000B1fQqAAJ',
'01t2w00000B1fQrAAJ',
'01t2w00000B1fQsAAJ',
'01t2w00000B1fQtAAJ',
'01t2w00000B1fQuAAJ',
'01t2w00000B1fQvAAJ',
'01t2w00000B1fQwAAJ',
'01t2w00000B1fQxAAJ',
'01t2w00000B1fQyAAJ',
'01t2w00000B1fQzAAJ',
'01t2w00000B1fR0AAJ',
'01t2w00000B1fRbAAJ'

conn.bulk.pollInterval = 1000;
conn.bulk.pollTimeout = Number.MAX_VALUE;
let records = [];


// We still need recordStream to listen for errors. We'll access the stream
// directly though, bypassing jsforce's RecordStream.Parsable
const recordStream = conn.bulk.query(`SELECT Id, Name, ERP7__Email__c, ERP7__Order_Profile__c, ERP7__Account_Profile__c,ERP7__Account_Type__c, ERP7__Customer_External_Id__c FROM Account where ERP7__Email__c IN ('${buyerEmailInfo.join("','")}')`);
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
}).then((records) => {
    console.log(records);
});





// console.log(users.length)

// const list = [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }, { x: 1, y: 2 }];

// const uniq = new Set(users.map(e => JSON.stringify(e)));

// users = Array.from(uniq).map(e => JSON.parse(e));

// console.log(JSON.stringify(users.length));
    