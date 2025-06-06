require('dotenv').config();

module.exports = {
    app: {
        url: process.env.APP_URL || 'http://localhost:3000',
        baseUrl: process.env.BASE_URL
    },
    database: {
        url: process.env.DATA_BASE,
        dialect: 'postgres',
        ssl: true,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    },
    telegram: {
        botToken: process.env.BOT_TOKEN,
        botUsername: process.env.BOT_USERNAME
    },
    session: {
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 часа
            secure: true
        },
        resave: false,
        saveUninitialized: false
    }
}; 