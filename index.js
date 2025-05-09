require('dotenv').config();
const express = require('express');
const { Telegraf, Scenes, session } = require('telegraf');
const passport = require('passport');
const expressSession = require('express-session');
const config = require('./config');
const path = require('path');
const { testConnection, sequelize } = require('./config/database');
const { syncModels } = require('./models');
const SequelizeStore = require('connect-session-sequelize')(expressSession.Store);

// Импорт сцен и обработчиков
const { authScene } = require('./scenes/auth');
const { menuScene } = require('./scenes/menu');
const { gameSetupScene } = require('./scenes/gameSetup');
const { gameScene } = require('./scenes/game');
const { rulesScene } = require('./scenes/rules');
const { ratingScene } = require('./scenes/rating');

// Импорт стратегий аутентификации
require('./config/passport');

// Инициализация бота Telegram (только если не в тестовом режиме)
let bot;
if (config.enableBot && !config.testMode) {
  bot = new Telegraf(config.botToken);

  // Настройка сцен
  const stage = new Scenes.Stage([
    authScene,
    menuScene,
    gameSetupScene,
    gameScene,
    rulesScene,
    ratingScene
  ]);

  // Middleware
  bot.use(session());
  bot.use(stage.middleware());

  // Обработчик команды /start
  bot.command('start', ctx => ctx.scene.enter('auth'));
  
  // Обработчик данных от мини-приложения
  bot.on('web_app_data', async (ctx) => {
    const data = ctx.webAppData.data;
    
    // Обработка данных в зависимости от значения
    switch (data) {
      case 'start_game':
        await ctx.scene.enter('gameSetup');
        break;
      case 'play_ai':
        ctx.session.withAI = true;
        await ctx.scene.enter('gameSetup');
        break;
      case 'rating':
        await ctx.scene.enter('rating');
        break;
      case 'rules':
        await ctx.scene.enter('rules');
        break;
      default:
        await ctx.reply('Получена неизвестная команда от мини-приложения.');
    }
  });
}

// Асинхронная функция запуска приложения
async function startApp() {
  try {
    // Подключение к MySQL
    if (config.useMySQL) {
      try {
        // Проверка подключения к базе данных
        const connected = await testConnection();
        if (connected) {
          // Синхронизация моделей с базой данных
          await syncModels();
        } else {
          if (process.env.NODE_ENV === 'production' && !config.testMode) {
            console.error('Невозможно продолжить без MySQL в production режиме');
            process.exit(1);
          } else {
            console.warn('Продолжаем без MySQL - данные НЕ будут сохраняться!');
          }
        }
      } catch (err) {
        console.error('Ошибка при работе с MySQL:', err);
        if (process.env.NODE_ENV === 'production' && !config.testMode) {
          console.error('Невозможно продолжить без MySQL в production режиме');
          process.exit(1);
        } else {
          console.warn('Продолжаем без MySQL - данные НЕ будут сохраняться!');
        }
      }
    } else {
      console.log('MySQL отключена в настройках');
    }

    // Веб-сервер для авторизации через OAuth
    const app = express();
    const PORT = config.port;

    // Настройка для обслуживания статических файлов мини-приложения
    app.use(express.static(path.join(__dirname, 'public')));
    
    // Настройка сессий
    const sessionConfig = {
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false
    };

    // Добавляем SequelizeStore только если MySQL подключена
    if (sequelize && sequelize.authenticate) {
      const sessionStore = new SequelizeStore({
        db: sequelize,
        tableName: 'sessions'
      });
      
      // Синхронизируем таблицу сессий
      sessionStore.sync();
      
      sessionConfig.store = sessionStore;
    }

    app.use(expressSession(sessionConfig));

    // Инициализация Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Запуск бота (если не в тестовом режиме)
    if (bot && config.enableBot && !config.testMode) {
      try {
        // В продакшен-режиме используем webhook вместо long polling
        if (process.env.NODE_ENV === 'production') {
          const webhookUrl = `${config.baseUrl}/telegram-webhook`;
          await bot.telegram.setWebhook(webhookUrl);
          console.log(`Бот настроен на использование webhook: ${webhookUrl}`);
          
          // Добавляем обработчик webhook в Express
          app.use(bot.webhookCallback('/telegram-webhook'));
        } else {
          // В режиме разработки используем long polling
          await bot.launch();
          console.log('Бот запущен в режиме long polling');
        }
      } catch (error) {
        console.error('Ошибка запуска бота:', error);
        if (process.env.NODE_ENV === 'production') {
          console.error('Невозможно продолжить без работающего бота в production режиме');
          process.exit(1);
        } else {
          console.warn('Продолжаем без Telegram бота - веб-интерфейс будет доступен');
        }
      }
    } else if (config.testMode) {
      console.log('Бот работает в тестовом режиме (без подключения к Telegram API)');
    } else {
      console.log('Бот отключен в настройках');
    }

    // Маршруты для авторизации
    app.use('/auth', require('./routes/auth'));

    // Маршрут для API
    app.use('/api', require('./routes/api'));

    // Базовый маршрут
    app.get('/', (req, res) => {
      res.send(`Сервер карточной игры "Разгильдяй" запущен!
      <br>Статус MySQL: ${(sequelize && sequelize.authenticate) ? 'Подключена' : 'Отключена'}
      <br>Статус бота: ${config.testMode ? 'Тестовый режим' : (bot ? 'Запущен' : 'Отключен')}`);
    });

    // Маршрут для мини-приложения
    app.get('/webapp', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Запуск веб-сервера
    app.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });

    // Graceful shutdown
    process.once('SIGINT', () => {
      if (bot) bot.stop('SIGINT');
      if (sequelize && sequelize.close) {
        sequelize.close();
      }
    });
    
    process.once('SIGTERM', () => {
      if (bot) bot.stop('SIGTERM');
      if (sequelize && sequelize.close) {
        sequelize.close();
      }
    });
  } catch (error) {
    console.error('Ошибка запуска приложения:', error);
    process.exit(1);
  }
}

// Запускаем приложение
startApp(); 