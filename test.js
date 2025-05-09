console.log('Тестовый скрипт запущен!');
console.log('Версия Node.js:', process.version);
console.log('Версия npm:', process.env.npm_package_version || 'Не определено');
console.log('Директория:', __dirname);

// Проверяем импорт основных модулей
try {
  const express = require('express');
  console.log('Express загружен успешно!');
} catch (error) {
  console.error('Ошибка загрузки Express:', error.message);
}

try {
  const telegraf = require('telegraf');
  console.log('Telegraf загружен успешно!');
} catch (error) {
  console.error('Ошибка загрузки Telegraf:', error.message);
}

try {
  const mongoose = require('mongoose');
  console.log('Mongoose загружен успешно!');
} catch (error) {
  console.error('Ошибка загрузки Mongoose:', error.message);
}

// Запускаем тестовый веб-сервер
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Тестовый сервер работает!</h1>');
});

const PORT = 3333;
server.listen(PORT, () => {
  console.log(`Тестовый сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере для проверки`);
});

// Завершаем работу через 1 минуту
console.log('Скрипт автоматически завершит работу через 60 секунд');
setTimeout(() => {
  console.log('Тестовый скрипт завершен!');
  server.close();
  process.exit(0);
}, 60000); 