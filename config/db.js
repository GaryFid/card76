const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(process.env.DATABASE_URL || {
    database: process.env.DB_NAME || 'pidr_game',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
        ssl: isProduction ? {
            require: true,
            rejectUnauthorized: false
        } : false
    },
    logging: false
});

// Тестирование соединения
sequelize.authenticate()
    .then(() => {
        console.log('Соединение с базой данных установлено успешно.');
        // Синхронизация моделей с базой данных
        return sequelize.sync();
    })
    .then(() => {
        console.log('Модели успешно синхронизированы с базой данных');
    })
    .catch(err => {
        console.error('Ошибка при подключении к базе данных:', err);
    });

module.exports = sequelize; 