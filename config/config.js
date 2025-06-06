require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    database: {
        url: process.env.DATABASE_URL,
        dialect: 'postgres',
        ssl: isProduction,
        dialectOptions: {
            ssl: isProduction ? {
                require: true,
                rejectUnauthorized: false
            } : false
        }
    },
    server: {
        port: process.env.PORT || 3000
    },
    session: {
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 часа
            secure: isProduction
        },
        resave: false,
        saveUninitialized: false
    },
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN
    }
}; 