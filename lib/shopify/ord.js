var OrdersArray = [
    {
        customer: {
            id: '123456',
            first_name: 'name',
            last_name: ''
        }
    },
    {
        customer: {
            id: '123457',
            first_name: '',
            last_name: 'lastname'
        }
    },
    {
        customer: {
            id: '123457',
            first_name: '',
            last_name: ''
        }
    },
    {
        customer: {
            id: '123457',
            first_name: 'name',
            last_name: 'lastname'
        }
    },
    {
        customer: {
            id: '123457',
            first_name: 'name',
            last_name: null
        }
    }

]
var ab = []
for(let i in OrdersArray){
    ab.push((OrdersArray[i].customer.first_name == "" || OrdersArray[i].customer.first_name == null) && (OrdersArray[i].customer.last_name == "" || OrdersArray[i].customer.last_name == null) ? OrdersArray[i].customer.id : (OrdersArray[i].customer.first_name == "" || OrdersArray[i].customer.first_name == null) ? OrdersArray[i].customer.last_name : (OrdersArray[i].customer.last_name == "" || OrdersArray[i].customer.last_name == null) ? OrdersArray[i].customer.first_name : OrdersArray[i].customer.first_name + ' ' + OrdersArray[i].customer.last_name)   
}

console.log(ab)
