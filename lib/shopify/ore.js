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


var exist = ['Fri, April 29, 2022','Sat, April 30, 202','Sun, May 1, 2022','Mon, May 2, 2022'] 

var dateavail = ['Sat, April 30, 2022', 'Sun, May 1, 2022', 'Mon, May 2, 2022', 'Tue, May 3, 2022', 'Wed, May 4, 2022', 'Thu, May 5, 2022', 'Fri, May 6, 2022', 'Sat, May 7, 2022', 'Sun, May 8, 2022', 'Mon, May 9, 2022']

var data = []
dateavail.forEach(element => {
    if(exist.includes(element)) data.push('0')
});

console.log(data)
    