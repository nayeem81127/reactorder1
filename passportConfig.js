const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require("bcrypt");
const { pool } = require("./dbConfig");

function initialize(passport) {
  console.log("Initialized");

  const authenticateUser = (email, password, done) => {
    console.log(email, password);
    pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          throw err;
        }
        console.log('allrows~>', results.rows);

        if (results.rows.length > 0) {
          const user = results.rows[0];

          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
              console.log(err);
            }
            if (isMatch) {
              let cont = parseInt(results.rows[0].login_count);
              let count = parseInt(cont + 1);
              var createdDate = new Date().toISOString();
              pool.query(`UPDATE "users" set "login_count"=$1, "last_login"=$2 WHERE email=$3`, [count, createdDate, email])
              return done(null, user);
            } else {
              return done(null, false, { message: "Password Incorrect"});
            }
          });
        } else {
          // No user       
          return done(null, false, { message: "No user with that email address"});
          //
        }
      }
    );
  };

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      authenticateUser
    )
  );

  passport.serializeUser((user, done) => done(null, user.email));

  passport.deserializeUser((email, done) => {
    pool.query(`SELECT * FROM users INNER JOIN amazon_credentials ON users.email = amazon_credentials.email where users.email= $1`, [email], (err, results) => {
      if (err) {
        return done(err);
      }
      console.log(`ID is ${results.rows[0].id}`);
      return done(null, results.rows[0]);
    });
  });
}

module.exports = initialize;