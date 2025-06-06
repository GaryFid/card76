const sequelize = require('../config/db');
const User = require('./user');
const Game = require('./game');
const Friendship = require('./friendship');

async function initDatabase() {
    try {
        // Проверяем существование таблицы users
        const [tables] = await sequelize.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
        );
        
        const usersTableExists = tables.some(table => table.table_name === 'users');
        
        if (usersTableExists) {
            // Проверяем существование колонки birthDate
            const [columns] = await sequelize.query(
                "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'users';"
            );
            
            const birthDateColumn = columns.find(col => col.column_name === 'birthDate');
            
            if (!birthDateColumn) {
                // Если колонки нет, добавляем её
                await sequelize.query(
                    'ALTER TABLE users ADD COLUMN "birthDate" DATE;'
                );
                console.log('Колонка birthDate добавлена');
            } else if (birthDateColumn.is_nullable === 'NO') {
                // Если колонка существует и NOT NULL, делаем её nullable
                await sequelize.query(
                    'ALTER TABLE users ALTER COLUMN "birthDate" DROP NOT NULL;'
                );
                console.log('Колонка birthDate обновлена до nullable');
            }
        }

        // Синхронизируем модели
        await User.sync({ alter: true });
        await Game.sync({ alter: true });
        await Friendship.sync({ alter: true });
        
        console.log('База данных успешно инициализирована');
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
        throw error;
    }
}

// Экспортируем модели и функции
module.exports = {
    initDatabase,
    User,
    Game,
    Friendship
}; 