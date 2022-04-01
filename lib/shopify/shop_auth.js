const express = require("express")
const app = express();

app.use(express.static('public'));
require('dotenv').config();

module.exports = function (app) {

    
}