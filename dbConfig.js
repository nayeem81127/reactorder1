require("dotenv").config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const { Pool } = require('pg')

const pool = new Pool({
	user:  'wzfierxtepegkj',  // 'yjmbnturnljevu',
	host:  'ec2-52-30-133-191.eu-west-1.compute.amazonaws.com', // 'ec2-18-235-114-62.compute-1.amazonaws.com',
	database:  'db0fom0rqn7b59', // 'd3n4tj3kre2bm0',
	password:  '4aa818b39d8cc90a44fc168b0512080e26d27eab5b5f7b7b429ca3f2ff874773', // '484172569e3241a83a71eebfd740e73d8c590b37621a136836f17b0ca4eaf565',
	port:  '5432',
	ssl: true
});

module.exports = { pool };