const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATA_BASE || {
  database: process.env.DB_NAME || 'pidr_game',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
  }
});

// Проверка подключения к базе данных
sequelize.authenticate()
  .then(() => {
    console.log('Успешное подключение к базе данных');
    // Синхронизация моделей с базой данных
    return sequelize.sync();
  })
  .then(() => {
    console.log('Модели успешно синхронизированы с базой данных');
  })
  .catch(err => {
    console.error('Ошибка подключения к базе данных:', err);
  });

module.exports = sequelize; 