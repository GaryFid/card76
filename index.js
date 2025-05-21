require('dotenv').config();
const express = require('express');
const { Telegraf, Scenes, session } = require('telegraf');
const passport = require('passport');
const expressSession = require('express-session');
const config = require('./config');
const path = require('path');
const { testConnection } = require('./config/database');
const { syncModels } = require('./models');
const FileStore = require('session-file-store')(expressSession);

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
    // Инициализация локального хранилища JSON
    try {
      // Проверка доступа к хранилищу
      const connected = await testConnection();
      if (connected) {
        // Синхронизация моделей
        await syncModels();
      } else {
        if (process.env.NODE_ENV === 'production' && !config.testMode) {
          console.error('Невозможно продолжить без доступа к хранилищу в production режиме');
          process.exit(1);
        } else {
          console.warn('Проблемы с доступом к хранилищу - данные могут НЕ сохраняться!');
        }
      }
    } catch (err) {
      console.error('Ошибка при работе с хранилищем:', err);
      if (process.env.NODE_ENV === 'production' && !config.testMode) {
        console.error('Невозможно продолжить без доступа к хранилищу в production режиме');
        process.exit(1);
      } else {
        console.warn('Проблемы с доступом к хранилищу - данные могут НЕ сохраняться!');
      }
    }

    // Веб-сервер для авторизации через OAuth
    const app = express();
    const PORT = config.port;

    // Настройка для обслуживания статических файлов мини-приложения
    app.use(express.static(path.join(__dirname, 'public')));
    
    // Добавляем middleware для парсинга JSON в теле запроса
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Настройка сессий с использованием файлового хранилища
    const sessionStore = new FileStore({
      path: path.join(__dirname, 'data', 'sessions'),
      ttl: 86400 // 1 день
    });
    
    app.use(expressSession({
      store: sessionStore,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { 
        maxAge: 86400000 // 1 день
      }
    }));

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
          
          // В режиме webhook бот не нужно останавливать специально
          bot.isPolling = false;
        } else {
          // В режиме разработки используем long polling
          await bot.launch();
          console.log('Бот запущен в режиме long polling');
          
          // Отмечаем, что бот запущен в режиме polling
          bot.isPolling = true;
        }
      } catch (error) {
        console.error('Ошибка запуска бота:', error);
        bot = null; // Полностью убираем ссылку на бота
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
      let botStatus = 'Отключен';
      if (config.testMode) {
        botStatus = 'Тестовый режим';
      } else if (bot) {
        botStatus = bot.isPolling ? 'Запущен (polling)' : 'Запущен (webhook)';
      }
      
      res.send(`Сервер карточной игры "Разгильдяй" запущен!
      <br>Статус хранилища: Локальное JSON
      <br>Статус бота: ${botStatus}`);
    });

    // Маршрут для мини-приложения
    app.get('/webapp', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Маршрут для страницы регистрации
    app.get('/register', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'register.html'));
    });
    
    // Маршрут для страницы настройки игры
    app.get('/game-setup', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'game-setup.html'));
    });
    
    // Маршрут для игровой страницы
    app.get('/game', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'game.html'));
    });

    // Маршрут для страницы проверки обновлений
    app.get('/check-updates', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'check-updates.html'));
    });

    // Маршрут для страницы ожидания игроков
    app.get('/wait-players', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'wait-players.html'));
    });

    // Запуск веб-сервера
    app.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });

    // Метод остановки бота с проверками
    function safeStopBot(reason) {
      try {
        // Останавливаем бота только если он существует и работает в режиме polling
        if (bot && bot.isPolling) {
          console.log(`Останавливаем бота (${reason})...`);
          bot.stop();
          console.log(`Бот успешно остановлен: ${reason}`);
        } else {
          console.log(`Бот не требует остановки (${reason})`);
        }
      } catch (error) {
        console.error(`Ошибка при остановке бота (${reason}):`, error.message);
      }
    }

    // Graceful shutdown
    process.once('SIGINT', () => {
      safeStopBot('SIGINT');
    });
    
    process.once('SIGTERM', () => {
      safeStopBot('SIGTERM');
    });
  } catch (error) {
    console.error('Ошибка запуска приложения:', error);
    process.exit(1);
  }
}

// Запускаем приложение
startApp(); 