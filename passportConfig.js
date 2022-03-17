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
              if (results.rows[0].status === 'Active') {
                let cont = parseInt(results.rows[0].login_count);
                let count = parseInt(cont + 1);
                var createdDate = new Date().toISOString();
                pool.query(`UPDATE "users" set "login_count"=$1, "last_login"=$2 WHERE email=$3`, [count, createdDate, email])
                return done(null, user);
              } else {
                return done(null, false, { message: "Users is InActive" });
              }
            } else {
              return done(null, false, { message: "Password Incorrect" });
            }
          });
        } else {
          // No user       
          return done(null, false, { message: "No user with that email address" });
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
        pool.query(`SELECT * FROM users where email= $1`, [email], (err, result) => {
          if (err) {
            return done(err);
          }
          if (result.rows.length > 0) {
            // console.log(`ID is ${result.rows[0].id}`);
            return done(null, result.rows[0]);
          }
        });
  });
}

module.exports = initialize;