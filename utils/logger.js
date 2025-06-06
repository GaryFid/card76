const fs = require('fs');
const path = require('path');

// Создаем директорию для логов, если её нет
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Функция для логирования
function log(type, data) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        type,
        data
    };

    // Записываем в файл
    const logFile = path.join(logsDir, `${type}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

    // Выводим в консоль
    console.log(`[${type}]`, JSON.stringify(data, null, 2));
}

// Специальные функции для разных типов логов
const logger = {
    game: (data) => log('game', data),
    auth: (data) => log('auth', data),
    error: (data) => log('error', data),
    session: (data) => log('session', data)
};

module.exports = logger; 