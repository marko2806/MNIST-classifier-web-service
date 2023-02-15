const express = require('express');
const router = express.Router()

// login route
router.get('/login', (req, res) => {
    res.send('Login home page')
});

// register route
router.get('/register', (req, res) => {
    res.send('Register home page')
});

// email verification route
router.get('/email-verification', (req, res) => {
    res.send('Email verification home page')
});

// login route
router.get('/forgot-password', (req, res) => {
    res.send('Forgot password home page')
});

module.exports = router