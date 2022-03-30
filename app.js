var express = require('express');
require('dotenv').config();
const PORT = process.env.PORT || 4000

var flash = require('connect-flash');
var passport = require("passport");
var session = require("express-session");

var app = express();
var bodyParser = require('body-parser')

// app.use(require('cookie-parser')());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

var path = require('path');

// cookie: {maxAge: 60000},
app.use(flash());
app.use(session({
    cookie: {
        maxAge: 518400000
    },
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}))

app.use(passport.initialize());
app.use(passport.session());

app.use('/public', express.static(__dirname + '/public'));

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    if(!req.session){ req.flash('session_exp', '• Your session has expired. Please log in again.') }
    next();
});
app.set('view engine', 'ejs');
app.set('view options', { layout: false });


require('./lib/routes.js')(app);

// var reqTimer = setTimeout(function wakeUp() {
//     request("https://reactorder.herokuapp.com", function() {
//        console.log("WAKE UP DYNO");
//     });
//     return reqTimer = setTimeout(wakeUp, 1200000);
//  }, 1200000);

app.listen(PORT);
console.log('Node listening on port %s', PORT);
