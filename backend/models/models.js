import {
    Sequelize,
    Model,
    DataTypes
} from 'sequelize';

const sequelize = new Sequelize('valere');
export const User = sequelize.define('User', {
    user_id: DataTypes.STRING,
    username: DataTypes.STRING,
    email: DataTypes.DATE,
    passwordHash: DataTypes.STRING,
    emailConfirmed: DataTypes.BOOLEAN
});

export const EmailVerificationTokens = sequelize.define('EmailVerificationTokens', {
    id: DataTypes.INTEGER,
    ipaddress: DataTypes.STRING,
    verificationTokenHash: DataTypes.STRING,
    expirationDate: DataTypes.DATE,
    expired: DataTypes.BOOLEAN,
    user_id: DataTypes.STRING,
});

export const PasswordResetAttempt = sequelize.define('PasswordResetAttempt', {
    id: DataTypes.INTEGER,
    ipaddress: DataTypes.STRING,
    attempt_time: DataTypes.DATE,
    user_id: DataTypes.STRING,
});

User.belongsToMany(EmailVerificationTokens);
User.belongsToMany(PasswordResetAttempt);