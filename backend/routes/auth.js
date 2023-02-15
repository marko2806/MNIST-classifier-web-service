const express = require('express');
const router = express.Router()

// login route
router.get('/login', (req, res) => {
    res.render('login');
});

// register route
router.get('/register', (req, res) => {
    res.render('register');
});

// email verification route
router.get('/email-verification', (req, res) => {
    res.render('email_verification');
});

// login route
router.get('/forgot-password', (req, res) => {
    res.render('forgot_password');
});

module.exports = router