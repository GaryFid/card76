require('dotenv').config();

module.exports = {
    app: {
        url: process.env.APP_URL || 'http://localhost:3000',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
    },
    database: {
        url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pidr',
        dialect: 'postgres',
        ssl: false,
        dialectOptions: {
            ssl: {
                require: false,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        retry: {
            match: [
                /SequelizeConnectionError/,
                /SequelizeConnectionRefusedError/,
                /SequelizeHostNotFoundError/,
                /SequelizeHostNotReachableError/,
                /SequelizeInvalidConnectionError/,
                /SequelizeConnectionTimedOutError/
            ],
            max: 5
        }
    },
    telegram: {
        botToken: process.env.BOT_TOKEN,
        botUsername: process.env.BOT_USERNAME,
        enabled: false
    },
    session: {
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 часа
            secure: false
        },
        resave: false,
        saveUninitialized: false
    },
    server: {
        port: process.env.PORT || 3000
    }
}; 