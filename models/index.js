const sequelize = require('../config/db');
const User = require('./user');
const Game = require('./game');
const Friendship = require('./friendship');

async function initDatabase() {
    try {
        // Проверяем существование таблиц
        const [tables] = await sequelize.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
        );
        
        const usersTableExists = tables.some(table => table.table_name === 'users');
        const gamesTableExists = tables.some(table => table.table_name === 'games');
        
        if (gamesTableExists) {
            // Проверяем тип колонки status
            const [statusInfo] = await sequelize.query(
                "SELECT data_type, udt_name FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'status';"
            );

            // Если колонка status существует и это ENUM
            if (statusInfo.length > 0 && statusInfo[0].data_type === 'USER-DEFINED') {
                // Сначала преобразуем все значения в строки
                await sequelize.query(
                    'ALTER TABLE games ALTER COLUMN status TYPE VARCHAR(255) USING status::text;'
                );
                
                // Удаляем тип ENUM если он существует
                await sequelize.query(
                    "DROP TYPE IF EXISTS enum_games_status;"
                );
                
                console.log('Колонка status успешно преобразована в VARCHAR');
            }
        }

        if (usersTableExists) {
            // Проверяем существование колонок
            const [columns] = await sequelize.query(
                "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'users';"
            );
            
            // Обработка birthDate
            const birthDateColumn = columns.find(col => col.column_name === 'birthDate');
            if (!birthDateColumn) {
                await sequelize.query(
                    'ALTER TABLE users ADD COLUMN "birthDate" DATE;'
                );
                console.log('Колонка birthDate добавлена');
            } else if (birthDateColumn.is_nullable === 'NO') {
                await sequelize.query(
                    'ALTER TABLE users ALTER COLUMN "birthDate" DROP NOT NULL;'
                );
                console.log('Колонка birthDate обновлена до nullable');
            }

            // Обработка registrationDate
            const registrationDateColumn = columns.find(col => col.column_name === 'registrationDate');
            if (!registrationDateColumn) {
                await sequelize.query(
                    'ALTER TABLE users ADD COLUMN "registrationDate" TIMESTAMP WITH TIME ZONE;'
                );
                await sequelize.query(
                    'UPDATE users SET "registrationDate" = CURRENT_TIMESTAMP WHERE "registrationDate" IS NULL;'
                );
                console.log('Колонка registrationDate добавлена и заполнена');
            } else if (registrationDateColumn.is_nullable === 'NO') {
                await sequelize.query(
                    'UPDATE users SET "registrationDate" = CURRENT_TIMESTAMP WHERE "registrationDate" IS NULL;'
                );
                console.log('Пустые значения registrationDate заполнены');
            }
        }

        // Синхронизируем модели с force: false и alter: true
        const syncOptions = {
            alter: true,
            force: false
        };

        await User.sync(syncOptions);
        await Game.sync(syncOptions);
        await Friendship.sync(syncOptions);
        
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