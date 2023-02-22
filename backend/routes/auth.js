const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const crypto = require('crypto')
const nodemailer = require('nodemailer');

const {
    User,
    PasswordResetAttempt,
    EmailVerificationTokens
} = require('../models/models');


const smtpServerParams = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
}

async function hashPassword(password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

// login route
router.get('/login', (req, res) => {
    if (req.query && req.query.message) {
        let message = decodeURIComponent(req.query.message);
        return res.render('auth/login', {
            messages: [message]
        })
    }
    return res.render('auth/login');
});

router.post('/login', (req, res) => {
    if (req.body) {
        // Retrieve user from the database
        User.findOne({
                where: {
                    email: req.body.email
                }
            })
            .then(async user => {
                if (user && user.email_verified) {
                    const isPasswordCorrect = await bcrypt.compare(req.body.password, user.password_hash);
                    if (!isPasswordCorrect) {
                        // If the password does not match, send an error response
                        return res.render("auth/login", {
                            validationErrors: [
                                "Invalid email or password"
                            ]
                        });
                    }
                    req.session.userId = user.user_id;
                    res.redirect('/');
                } else {
                    return res.render("auth/login", {
                        validationErrors: [
                            "Invalid email or password"
                        ]
                    });
                }
            })
            .catch((error) => {
                console.error(error);
                return res.render("auth/login", {
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
    let message = encodeURIComponent("Logged out successfully");
    return res.redirect('login?message=' + message);
});

// register route
router.get('/register', (req, res) => {
    res.render('auth/register');
});

function getIPAddress(req) {
    // get the first IP-address from x-forwarded-for if proxy is used
    if (req.header('x-forwarded-for')) {
        return req.header('x-forwarded-for').split(',')[0].trim()
    }
    // req.socket.remoteAddress is fallback if x-forwarded-for does not exist in the request
    return req.socket.remoteAddress;
}

router.post('/register', async (req, res) => {
    if (req.body) {
        const registeredUser = req.body;

        //chech that the user is not already created
        const dbUser = await User.findOne({
            where: {
                email: registeredUser.email
            }
        });
        if (dbUser) {
            return res.render("auth/register", {
                validationErrors: ["Account with entered email already exists"]
            });
        }

        if (!registeredUser.password) {
            return res.render("auth/register", {
                validationErrors: ["Please enter password"]
            });
        }
        if (registeredUser.password.length < 8) {
            return res.render("auth/register", {
                validationErrors: ["Please enter password with at least 8 characters"]
            });
        }
        const hashedPassword = await hashPassword(registeredUser.password);
        User.create({
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
                const transporter = nodemailer.createTransport(smtpServerParams);
                const mailOptions = {
                    from: 'kallie.turcotte@ethereal.email',
                    to: user.email,
                    subject: 'Password Reset Request',
                    text: `Please click on the following link to verify your email: http://localhost:3000/auth/email-verification/${emailVerificationToken}`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error(error);
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
    res.render('auth/email_verification', {
        emailVerified: user.email_verified
    });
});

// login route
router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot_password');
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
    const transporter = nodemailer.createTransport(smtpServerParams);

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
    res.render('auth/reset_password', {
        token: req.params.token
    });
});

router.post('/reset-password', async (req, res) => {
    if (req.body) {
        const passwordResetToken = req.body.token;
        const tokenHash = crypto.createHash('sha256').update(passwordResetToken).digest('hex');
        const newPassword = req.body["new-password"];

        const passwordResetAttempt = await PasswordResetAttempt.findOne({
            where: {
                reset_token_hash: tokenHash
            }
        }) // TODO: join with user;
        if (!passwordResetAttempt) {
            return res.status(404).json({
                message: 'Invalid token'
            });
        }

        const user = await User.findOne({
            where: {
                user_id: passwordResetAttempt.user_id
            }
        })
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
        const hashedPassword = await hashPassword(newPassword);
        user.password_hash = hashedPassword;
        await user.save();

        res.json({
            message: "Password reset successful"
        });
    }
});


module.exports = router