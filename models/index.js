const { sequelize } = require('../config/database');
const User = require('./user');
const Game = require('./game');

// Функция для синхронизации моделей с базой данных
async function syncModels() {
  try {
    // В режиме разработки можно использовать { force: true } для пересоздания таблиц
    await sequelize.sync({ alter: true });
    console.log('Таблицы MySQL успешно синхронизированы');
    return true;
  } catch (error) {
    console.error('Ошибка синхронизации таблиц MySQL:', error);
    return false;
  }
}

module.exports = {
  User,
  Game,
  sequelize,
  syncModels
}; 