var express = require('express');
require('dotenv').config();
const PORT = process.env.PORT || 5000

var flash = require('connect-flash');

var passport = require("passport");

var session = require("express-session");

var app = express();

app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));




var bodyParser = require('body-parser')

var path = require('path');

app.use('/public', express.static(__dirname + '/public'));

    // cookie: {maxAge: 60000},
app.use(flash());
app.use(session({
    secret: 'keyboard cat',
    resave: false,    
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser());
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
  });
app.set('view engine', 'ejs');
app.set('view options', { layout: false });


require('./lib/routes.js')(app);

app.listen(PORT);
console.log('Node listening on port %s', PORT);
