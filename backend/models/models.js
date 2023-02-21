const {
    Sequelize,
    DataTypes
} = require('sequelize');

const sequelize = new Sequelize('MNIST-web-service', 'postgres', 'bazepodataka', {
    host: 'localhost',
    dialect: 'postgres'
});

const User = sequelize.define('users', {
    user_id: {
        type: DataTypes.UUIDV4,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
        }
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email_verified: DataTypes.BOOLEAN
}, {
    timestamps: false
});

const EmailVerificationTokens = sequelize.define('email_verification_tokens', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ip_address: {
        type: DataTypes.STRING
    },
    verification_token_hash: DataTypes.STRING,
    expiration_date: DataTypes.DATE,
    expired: DataTypes.BOOLEAN,
    user_id: DataTypes.UUIDV4,
}, {
    timestamps: false
});

const PasswordResetAttempt = sequelize.define('password_reset_attempts', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ip_address: DataTypes.STRING,
    reset_token_hash: DataTypes.STRING,
    expiration_date: DataTypes.DATE,
    expired: DataTypes.BOOLEAN,
    user_id: DataTypes.UUIDV4
}, {
    timestamps: false
});

User.belongsToMany(EmailVerificationTokens, {
    through: "user_id"
});
User.belongsToMany(PasswordResetAttempt, {
    through: "user_id"
});

module.exports = {
    User,
    EmailVerificationTokens,
    PasswordResetAttempt
}

