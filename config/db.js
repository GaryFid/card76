const { Sequelize } = require('sequelize');
const config = require('./config');

const sequelize = new Sequelize(config.database.url, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false
        } : false
    },
    logging: false,
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
        max: 3
    }
});

let connectionRetries = 0;
const MAX_RETRIES = 5;

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Успешное подключение к базе данных');
        connectionRetries = 0; // Сбрасываем счетчик при успешном подключении
    } catch (error) {
        console.error('Ошибка подключения к базе данных:', error);
        
        if (connectionRetries < MAX_RETRIES) {
            connectionRetries++;
            const delay = Math.min(1000 * Math.pow(2, connectionRetries), 30000); // Экспоненциальная задержка
            console.log(`Повторная попытка подключения (${connectionRetries}/${MAX_RETRIES}) через ${delay/1000} секунд...`);
            setTimeout(testConnection, delay);
        } else {
            console.error('Превышено максимальное количество попыток подключения к базе данных');
            process.exit(1); // Завершаем процесс если не удалось подключиться
        }
    }
}

// Выполняем проверку подключения при запуске
testConnection();

module.exports = sequelize; 