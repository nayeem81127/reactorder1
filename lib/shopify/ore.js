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
        console.log(error)
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
    