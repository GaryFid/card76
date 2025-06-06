const { Sequelize } = require('sequelize');
const config = require('./config');

let sequelize;

try {
    // Создаем экземпляр Sequelize с настройками из конфига
    sequelize = new Sequelize(config.database.url, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
} catch (error) {
    console.error('Ошибка инициализации Sequelize:', error);
    process.exit(1);
}

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