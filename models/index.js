const sequelize = require('../config/db');
const User = require('./user');
const Game = require('./game');

// Функция для инициализации моделей
async function syncModels() {
  await sequelize.sync({ alter: true });
}

module.exports = {
  User,
  Game,
  syncModels
}; 