const { Sequelize } = require('sequelize');
const config = require('../config');

// Создаем экземпляр Sequelize для подключения к MySQL
const sequelize = new Sequelize(
  config.mysqlDatabase,
  config.mysqlUser,
  config.mysqlPassword, 
  {
    host: config.mysqlHost,
    port: config.mysqlPort,
    dialect: 'mysql',
    logging: config.debug ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Функция для проверки подключения к базе данных
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Подключение к MySQL успешно установлено');
    return true;
  } catch (error) {
    console.error('Ошибка подключения к MySQL:', error);
    return false;
  }
}

// Экспортируем sequelize и функцию проверки
module.exports = {
  sequelize,
  testConnection
}; 