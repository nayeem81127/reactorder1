// var OrdersArray = [
//     {
//         customer: {
//             id: '123456',
//             first_name: 'name',
//             last_name: ''
//         }
//     },
//     {
//         customer: {
//             id: '123457',
//             first_name: '',
//             last_name: 'lastname'
//         }
//     },
//     {
//         customer: {
//             id: '123457',
//             first_name: '',
//             last_name: ''
//         }
//     },
//     {
//         customer: {
//             id: '123457',
//             first_name: 'name',
//             last_name: 'lastname'
//         }
//     }
// ]
// var ab = []
// for(let j in OrdersArray){
//     ab.push((OrdersArray[j].customer.first_name == '' || OrdersArray[j].customer.first_name == null) && (OrdersArray[j].customer.last_name == '' || OrdersArray[j].customer.last_name == null) ? OrdersArray[j].customer.id : OrdersArray[j].customer.last_name == null || OrdersArray[j].customer.last_name == '' ? OrdersArray[j].customer.first_name : OrdersArray[j].customer.last_name)   
// }