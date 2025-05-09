require('dotenv').config();
const express = require('express');
const { Telegraf, Scenes, session } = require('telegraf');
const mongoose = require('mongoose');
const passport = require('passport');
const expressSession = require('express-session');
const MongoStore = require('connect-mongo');
const config = require('./config');
const path = require('path');

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
    // Подключение к MongoDB (опционально)
    if (config.useMongoDB) {
      try {
        await mongoose.connect(config.mongodbUri);
        console.log('MongoDB подключена');
      } catch (err) {
        console.error('Ошибка подключения к MongoDB:', err);
        if (process.env.NODE_ENV === 'production' && !config.testMode) {
          console.error('Невозможно продолжить без MongoDB в production режиме');
          process.exit(1);
        } else {
          console.warn('Продолжаем без MongoDB - данные НЕ будут сохраняться!');
        }
      }
    } else {
      console.log('MongoDB отключена в настройках');
    }

    // Запуск бота (если не в тестовом режиме)
    if (bot && config.enableBot && !config.testMode) {
      try {
        await bot.launch();
        console.log('Бот запущен');
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

    // Добавляем MongoStore только если MongoDB подключена
    if (mongoose.connection.readyState === 1) {
      sessionConfig.store = MongoStore.create({
        mongoUrl: config.mongodbUri,
        collectionName: 'sessions'
      });
    }

    app.use(expressSession(sessionConfig));

    // Инициализация Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Маршруты для авторизации
    app.use('/auth', require('./routes/auth'));

    // Маршрут для API
    app.use('/api', require('./routes/api'));

    // Базовый маршрут
    app.get('/', (req, res) => {
      res.send(`Сервер карточной игры "Разгильдяй" запущен!
      <br>Статус MongoDB: ${mongoose.connection.readyState === 1 ? 'Подключена' : 'Отключена'}
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
      if (mongoose.connection.readyState === 1) {
        mongoose.disconnect();
      }
    });
    
    process.once('SIGTERM', () => {
      if (bot) bot.stop('SIGTERM');
      if (mongoose.connection.readyState === 1) {
        mongoose.disconnect();
      }
    });
  } catch (error) {
    console.error('Ошибка запуска приложения:', error);
    process.exit(1);
  }
}

// Запускаем приложение
startApp(); 