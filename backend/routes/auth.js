const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const crypto = require('crypto')
const nodemailer = require('nodemailer');
const {
    Op
} = require("sequelize");

const {
    User,
    PasswordResetAttempt,
    EmailVerificationTokens
} = require('../models/models');


async function hashPassword(password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

function getIPAddress(req){
    // get the first IP-address from x-forwarded-for if proxy is used
    if (req.header('x-forwarded-for')){
        return req.header('x-forwarded-for').split(',')[0].trim()
    }
    // req.socket.remoteAddress is fallback if x-forwarded-for does not exist in the request
    return req.socket.remoteAddress;
}

// login route
router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', (req, res) => {
    if (req.body) {
        // Retrieve user from the database
        User.findOne({
                where: {
                    [Op.or]: [{
                        email: req.body.username
                    }, {
                        username: req.body.username
                    }]
                }
            })
            .then(async user => {
                if (user && user.email_verified) {
                    console.log(user)
                    console.log(await hashPassword(req.body.password))
                    const passwordCorrect = await bcrypt.compare(req.body.password, user.password_hash);
                    if (!passwordCorrect) {
                        // If the password does not match, send an error response
                        return res.render("login", {
                            validationErrors: [
                                "Invalid username or password1"
                            ]
                        });
                    }
                    req.session.userId = user.user_id;
                    res.redirect('/');
                } else {
                    return res.render("login", {
                        validationErrors: [
                            "Invalid username or password2"
                        ]
                    });
                }
            })
            .catch(error => {
                console.log("error");
                console.log(error);
                return res.render("login", {
                    errorMessages: [
                        "Error logging in"
                    ]
                });
            });
    }
});

router.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(function (err) {
            console.log('Destroyed session');
        })
    }
    res.redirect('/auth/login');
});

// register route
router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', async (req, res) => {
    if (req.body) {
        const registeredUser = req.body;

        //chech that the user is not already created
        const dbUser = await User.findOne({where:{email:registeredUser.email}});
        if(dbUser){
            return res.render("register", {
                validationErrors: ["Account with entered email already exists"]
            });
        }

        if (!registeredUser.password) {
            return res.render("register", {
                validationErrors: ["Please enter password"]
            });
        }
        if (registeredUser.password.length < 8) {
            return res.render("register", {
                validationErrors: ["Please enter password with at least 8 characters"]
            });
        }
        const hashedPassword = await hashPassword(registeredUser.password);
        User.create({
            username: registeredUser.username,
            email: registeredUser.email,
            password_hash: hashedPassword
        }).then(async (user) => {
            const emailVerificationToken = crypto.randomBytes(20).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');
            const currentDate = new Date();
            const expiryDate = currentDate.setHours(currentDate.getHours() + 1);

            EmailVerificationTokens.create({
                user_id: user.user_id,
                ip_address: getIPAddress(req),
                verification_token_hash: hashedToken,
                expiration_date: expiryDate,
                expired: false
            }).then(() => {
                // TODO export email config to config file
                const transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    auth: {
                        user: 'kallie.turcotte@ethereal.email',
                        pass: 'TCMUdDttb3W492F6mp'
                    }
                });
                const mailOptions = {
                    from: 'kallie.turcotte@ethereal.email',
                    to: user.email,
                    subject: 'Password Reset Request',
                    text: `Please click on the following link to verify your email: http://localhost:3000/auth/email-verification/${emailVerificationToken}`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(error);
                        res.status(500).send('Error sending email');
                    } else {
                        console.log('Email sent: ' + info.response);
                        res.status(200).send('Password reset email sent');
                    }
                });
                res.send("User created successfully");
            });
        }).catch((err) => {
            res.send("Something went wrong when creating user: " + err);
        });
    }
});

// email verification route
router.get('/email-verification/:token', async (req, res) => {
    const token = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const tokenRecord = await EmailVerificationTokens.findOne({
        where: {
            verification_token_hash: hashedToken
        }
    });
    if (!tokenRecord) {
        res.status(404).send("Invalid token");
    }
    // TODO: popraviti expiry
    if ( /*tokenRecord.expirationdate >= new Date() &&*/ !tokenRecord.expired) {
        const user = await User.findOne({
            where: {
                user_id: tokenRecord.user_id
            }
        });
        user.email_verified = true;
        await user.save();
        res.status(200).send("Email verified");
    }
    const user = await User.findOne({
        where: {
            user_id: tokenRecord.user_id
        }
    });
    res.render('email_verification', {
        emailVerified: user.email_verified
    });
});

// login route
router.get('/forgot-password', (req, res) => {
    res.render('forgot_password');
});

router.post('/forgot-password', async (req, res) => {
    const {
        email
    } = req.body;

    const user = await User.findOne({
        where: {
            email: email
        }
    });
    if (!user)
        return res.status(400).send('User not found');

    // Generate a password reset token
    const token = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const currentDate = new Date();
    const expiryDate = currentDate.setHours(currentDate.getHours() + 1);
    await PasswordResetAttempt.create({
        user_id: user.user_id,
        ip_address: getIPAddress(req),
        reset_token_hash: hashedToken,
        expiration_date: expiryDate,
        expired: false
    });
    // Send an email to the user with the password reset link
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'kallie.turcotte@ethereal.email',
            pass: 'TCMUdDttb3W492F6mp'
        }
    });

    const mailOptions = {
        from: 'kallie.turcotte@ethereal.email',
        to: email,
        subject: 'Password Reset Request',
        text: `Please click on the following link to reset your password: http://localhost:3000/auth/reset-password/${token}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error sending email');
        } else {
            console.log('Email sent: ' + info.response);
            res.status(200).send('Password reset email sent');
        }
    });
})

router.get('/reset-password/:token', (req, res) => {
    res.render('reset_password', {
        token: req.params.token
    });
});

router.post('/reset-password', async (req, res) => {
    if (req.body) {
        const passwordResetToken = req.body.token;
        console.log(passwordResetToken);
        const tokenHash = crypto.createHash('sha256').update(passwordResetToken).digest('hex');
        const newPassword = req.body["new-password"];

        const passwordResetAttempt = await PasswordResetAttempt.findOne({where:{
            reset_token_hash: tokenHash
        }}) // TODO: join with user;
        if (!passwordResetAttempt) {
            return res.status(404).json({
                message: 'Invalid token'
            });
        }

        const user = await User.findOne({where:{
            user_id: passwordResetAttempt.user_id
        }})
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
        const hashedPassword = await hashPassword(newPassword);
        console.log(user);
        console.log("Hash before and after")
        console.log(user.password_hash);
        user.password_hash = hashedPassword;
        console.log(user.password_hash);
        await user.save();

        res.json({
            message: "Password reset successful"
        });
    }
});


module.exports = router