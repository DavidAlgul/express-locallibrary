const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const catalogRouter = require("./routes/catalog"); //Import routes for "catalog" area of site

// Web servers can often compress the HTTP response sent back to a client, significantly reducing the time required for the client to get and load the page.
const compression = require("compression");

const app = express();

app.use(compression()); // Compress all routes
app.use(express.static(path.join(__dirname, "public")));

// Helmet is a middleware package. It can set appropriate HTTP headers that help protect your app from well-known web vulnerabilities
const helmet = require("helmet");

// Add helmet to the middleware chain.
// Set CSP headers to allow our Bootstrap and jQuery to be served
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
    },
  }),
);

// Express-rate-limit is a middleware package that can be used to limit repeated requests to APIs and endpoints.

const RateLimit = require("express-rate-limit");

// Set up rate limiter: maximum of twenty requests per minute

const limiter = RateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 requests per windowMs
});

app.use(limiter);

const mongoose = require("mongoose");

mongoose.set("strictQuery", false);

// Replace the line with the following code that uses process.env.MONGODB_URI to get the connection string from an environment variable named MONGODB_URI if has been set (use your own database URL instead of the placeholder below).

const mongoDB = process.env.MONGODB_URI;

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(mongoDB);
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// app.set('views', ...)
  // app.set(key, value) ist eine Methode von Express, um eine Einstellung für die App zu definieren.
  // In diesem Fall wird die Einstellung "views" gesetzt, die angibt, wo sich die Template-Dateien befinden.
// path.join(__dirname, 'views')
  // path.join() kombiniert mehrere Pfadsegmente zu einem plattformunabhängigen Pfad.
  // __dirname ist eine globale Variable in Node.js, die den absoluten Pfad zum aktuellen Dateiverzeichnis enthält.
  // path.join(__dirname, 'views') ergibt also den absoluten Pfad zum "views"-Verzeichnis der Anwendung.

  // Beispielhafte Ordnerstruktur
  // Angenommen, deine Projektstruktur sieht so aus:
  
  // /my-express-app
  //   ├── /views
  //   │    ├── index.ejs
  //   │    ├── about.ejs
  //   ├── server.js
  // Wenn server.js in /my-express-app/ liegt, dann sorgt
  
  // app.set('views', path.join(__dirname, 'views'));
  // dafür, dass Express View-Dateien im Verzeichnis
  // /my-express-app/views/ sucht.  

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/catalog', catalogRouter); // Add catalog routes to middleware chain.

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// // Import the mongoose module
// const mongoose = require('mongoose');

// // Set `strictQuery: false` to globally opt into filtering by properties that aren't in the schema
// // Included because it removes preparatory warnings for Mongoose 7.
// // See: https://mongoosejs.com/docs/migrating_to_6.html#strictquery-is-removed-and-replaced-by-strict

// mongoose.set("strictQuery", false);

// // Define the database URL to connect to.
// const mongoDB = "mongodb://127.0.0.1/my_database";

// // Wait for database to connect, logging an error if there is a problem
// main().catch((err) => console.log(err));

// async function main() {
//   await mongoose.connect(mongoDB);
// }

module.exports = app;
