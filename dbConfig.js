require("dotenv").config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const { Pool } = require('pg')

const pool = new Pool({
	user: process.env.PGUSER || 'yjmbnturnljevu',
	host: process.env.PGHOST || 'ec2-18-235-114-62.compute-1.amazonaws.com',
	database: process.env.PGDATABASE || 'd3n4tj3kre2bm0',
	password: process.env.PGPASSWORD || '484172569e3241a83a71eebfd740e73d8c590b37621a136836f17b0ca4eaf565',
	port: process.env.PGPORT || '5432',
	ssl: true
});

module.exports = { pool };
