const { Sequelize } = require('sequelize');
const config = require('./config');

const sequelize = new Sequelize(config.database.url, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

// Функция для проверки подключения
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Успешное подключение к базе данных');
    } catch (error) {
        console.error('Ошибка подключения к базе данных:', error);
        throw error;
    }
}

// Выполняем проверку подключения при запуске
testConnection().catch(() => {
    console.log('Повторная попытка подключения через 5 секунд...');
    setTimeout(testConnection, 5000);
});

module.exports = sequelize; 