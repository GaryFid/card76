require('dotenv').config();
const express = require('express');
const { Telegraf, Scenes, session } = require('telegraf');
const passport = require('passport');
const expressSession = require('express-session');
const config = require('./config/config');
const path = require('path');
const sequelize = require('./config/db');
const { syncModels } = require('./models');
const FileStore = require('session-file-store')(expressSession);
const logger = require('./utils/logger');

// Импорт сцен и обработчиков
const { authScene } = require('./scenes/auth');
const { menuScene } = require('./scenes/menu');
const { gameSetupScene } = require('./scenes/gameSetup');
const { gameScene } = require('./scenes/game');
const { rulesScene } = require('./scenes/rules');
const { ratingScene } = require('./scenes/rating');
const { shopScene } = require('./scenes/shop');

// Импорт стратегий аутентификации
require('./config/passport');

// Инициализация бота Telegram
let bot;
if (config.telegram.botToken) {
  bot = new Telegraf(config.telegram.botToken);

  // Настройка сцен
  const stage = new Scenes.Stage([
    authScene,
    menuScene,
    gameSetupScene,
    gameScene,
    rulesScene,
    ratingScene,
    shopScene
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

  // Запускаем бота
  bot.launch().then(() => {
    console.log('Telegram бот запущен');
  }).catch(err => {
    console.error('Ошибка запуска бота:', err);
  });
}

// Асинхронная функция запуска приложения
async function startApp() {
  try {
    // Проверка подключения к PostgreSQL
    try {
      await sequelize.authenticate();
      await syncModels();
      console.log('Подключение к PostgreSQL успешно!');
    } catch (err) {
      console.error('Ошибка подключения к PostgreSQL:', err);
      process.exit(1);
    }

    // Веб-сервер для авторизации через OAuth
    const app = express();
    const PORT = process.env.PORT || 3000;

    // Настройка сессий с использованием FileStore
    const sessionStore = new FileStore({
      path: './sessions',
      ttl: 604800, // 7 дней
      retries: 0,
      secret: config.session.secret
    });

    // Настройка middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(expressSession({
      store: sessionStore,
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false,
      cookie: config.session.cookie
    }));

    // Инициализация passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Настройка для обслуживания статических файлов
    app.use(express.static(path.join(__dirname, 'public'), {
      maxAge: '1d',
      etag: true,
      lastModified: true
    }));

    // Маршруты
    app.use('/auth', require('./routes/auth'));
    app.use('/api', require('./routes/api'));

    // Основные маршруты для веб-приложения
    app.get('/', (req, res) => {
      res.redirect('/webapp');
    });

    app.get('/webapp', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.get('/register', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'register.html'));
    });

    app.get('/game-setup', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'game-setup.html'));
    });

    app.get('/game', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'game.html'));
    });

    // Запуск сервера
    app.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
      logger.session({
        event: 'server_started',
        port: PORT,
        mode: process.env.NODE_ENV || 'development',
        appUrl: config.app.url,
        baseUrl: config.app.baseUrl
      });
    });

    // Graceful shutdown
    async function cleanup() {
      console.log('Выполняется graceful shutdown...');
      
      // Останавливаем бота если нужно
      if (bot) {
        console.log('Останавливаем бота...');
        await bot.stop();
        console.log('Бот остановлен');
      }
      
      process.exit(0);
    }

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

  } catch (error) {
    console.error('Ошибка запуска приложения:', error);
    process.exit(1);
  }
}

// Запускаем приложение
startApp(); 