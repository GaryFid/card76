const { testConnection } = require('../config/database');
const User = require('./user');
const Game = require('./game');

// Функция для инициализации моделей
async function syncModels() {
  try {
    // Проверяем доступ к файлам хранилища
    const connected = await testConnection();
    if (connected) {
      console.log('Локальное JSON хранилище готово к использованию');
      return true;
    } else {
      console.error('Ошибка инициализации локального JSON хранилища');
      return false;
    }
  } catch (error) {
    console.error('Ошибка при инициализации моделей:', error);
    return false;
  }
}

module.exports = {
  User,
  Game,
  syncModels
}; 