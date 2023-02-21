const express = require('express');
const sessions = require('express-session');
var bodyParser = require('body-parser');
const app = express();
const router = express.Router();
const port = 3000;

app.set("view engine", "jade");

const auth = require("./routes/auth")

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use("/static",express.static('static'))

//session middleware
app.use(sessions({
  secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24
  },
  resave: false
}));

app.use("/auth", auth);

var sessionChecker = (req, res, next) => {
  console.log(`Session Checker: ${req.session.userId}`);
  console.log(req.session);
  if (req.session && req.session.userId) {
    console.log(`Found User Session`);
    next();
  } else {
    console.log(`No User Session Found`);
    res.redirect('/auth/login');
  }
};

app.use(router);

router.get('/', sessionChecker, (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});