const fs = require('fs');
const path = require('path');
const config = require('../config');

// Путь к директории с данными
const DATA_DIR = path.join(__dirname, '..', 'data');

// Создаем директорию для данных, если она не существует
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Пути к файлам данных
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');

// Инициализация файлов с данными
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(GAMES_FILE)) {
  fs.writeFileSync(GAMES_FILE, JSON.stringify([]));
}

// Функция для проверки доступа к хранилищу
async function testConnection() {
  try {
    // Просто проверяем, можем ли мы читать файлы
    await fs.promises.access(USERS_FILE, fs.constants.R_OK | fs.constants.W_OK);
    await fs.promises.access(GAMES_FILE, fs.constants.R_OK | fs.constants.W_OK);
    console.log('Подключение к локальному хранилищу успешно установлено');
    return true;
  } catch (error) {
    console.error('Ошибка доступа к локальному хранилищу:', error);
    return false;
  }
}

// Функция для чтения данных из файла
async function readFromFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка чтения файла ${filePath}:`, error);
    return [];
  }
}

// Функция для записи данных в файл
async function writeToFile(filePath, data) {
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Ошибка записи в файл ${filePath}:`, error);
    return false;
  }
}

// Экспортируем функции для работы с локальным хранилищем
module.exports = {
  testConnection,
  DATA_DIR,
  USERS_FILE,
  GAMES_FILE,
  readFromFile,
  writeToFile
}; 