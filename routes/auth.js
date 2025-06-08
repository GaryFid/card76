const express = require('express');
const passport = require('passport');
const router = express.Router();
const { User } = require('../models');
const logger = require('../utils/logger');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

// Вспомогательная функция для логирования
const logAuth = (step, data) => {
  console.log(`[AUTH ${step}]`, JSON.stringify(data, null, 2));
};

// Страница регистрации
router.get('/register', (req, res) => {
  res.sendFile('register.html', { root: './public' });
});

// Регистрация через форму
router.post('/register', async (req, res) => {
  try {
    logAuth('REGISTER_START', { body: req.body });
    const { username, password } = req.body;
    // Валидация
    if (!username || !password) {
      logAuth('REGISTER_ERROR', { error: 'Имя пользователя и пароль обязательны' });
      return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }
    if (username.length < 3) {
      logAuth('REGISTER_ERROR', { error: 'Имя пользователя должно быть не менее 3 символов' });
      return res.status(400).json({ error: 'Имя пользователя должно быть не менее 3 символов' });
    }
    if (password.length < 6) {
      logAuth('REGISTER_ERROR', { error: 'Пароль должен быть не менее 6 символов' });
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }
    // Проверяем существование пользователя
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      logAuth('REGISTER_ERROR', { error: 'Пользователь с таким именем уже существует' });
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
    }
    // Хешируем пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Создаем нового пользователя
    const user = await User.create({
      username,
      password: hashedPassword,
      authType: 'local',
      registrationDate: new Date(),
      rating: 1000,
      coins: 0,
      level: 1,
      experience: 0,
      gamesPlayed: 0,
      gamesWon: 0
    });
    logAuth('USER_CREATED', { userId: user.id, username: user.username });
    req.login(user, (err) => {
      if (err) {
        logAuth('LOGIN_ERROR', { error: err.message });
        return res.status(500).json({ error: 'Ошибка входа после регистрации' });
      }
      logAuth('LOGIN_SUCCESS', { userId: user.id });
      return res.json({
        success: true,
        user: user.toPublicJSON()
      });
    });
  } catch (error) {
    logAuth('REGISTER_ERROR', { error: error.message });
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка при регистрации. Попробуйте позже.' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    logAuth('LOGIN_START', { username: req.body.username });
    const { username, password } = req.body;
    if (!username || !password) {
      logAuth('LOGIN_ERROR', { error: 'Введите имя пользователя и пароль' });
      return res.status(400).json({ error: 'Введите имя пользователя и пароль' });
    }
    // Ищем пользователя только по username
    const user = await User.findOne({ where: { username } });
    logAuth('LOGIN_USER_FOUND', { user: user ? user.toPublicJSON() : null });
    if (!user) {
      logAuth('LOGIN_ERROR', { error: 'Пользователь не найден' });
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }
    // Проверяем пароль
    const isValid = await bcrypt.compare(password, user.password);
    logAuth('LOGIN_PASSWORD_CHECK', { isValid });
    if (!isValid) {
      logAuth('LOGIN_ERROR', { error: 'Пароль не совпадает' });
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }
    await user.update({ lastLoginDate: new Date() });
    req.login(user, (err) => {
      if (err) {
        logAuth('LOGIN_ERROR', { error: err.message });
        return res.status(500).json({ error: 'Ошибка входа' });
      }
      logAuth('LOGIN_SUCCESS', { userId: user.id });
      return res.json({
        success: true,
        user: user.toPublicJSON()
      });
    });
  } catch (error) {
    logAuth('LOGIN_ERROR', { error: error.message });
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка при входе. Попробуйте позже.' });
  }
});

// API для регистрации/авторизации
router.post('/api/auth/register', async (req, res) => {
  try {
    const userData = req.body;
    
    // Если это авторизация через Telegram, ищем по telegramId
    if (userData.type === 'telegram' && userData.telegramId) {
      let user = await User.findOne({ where: { telegramId: userData.telegramId } });
      
      if (user) {
        // Обновляем данные пользователя, если нужно
        await user.update({
          username: userData.username || user.username,
          lastActive: new Date()
        });
      } else {
        // Создаем нового пользователя
        user = await User.create({
          telegramId: userData.telegramId,
          username: userData.username,
          authType: 'telegram'
        });
      }
      
      return res.json({ success: true, user });
    }
    
    // Обычная регистрация или гостевой вход
    let user = null;
    
    if (userData.type === 'guest') {
      // Создаем гостевого пользователя
      user = await User.create({
        username: userData.username,
        authType: 'guest'
      });
    } else {
      // Проверяем существование пользователя
      user = await User.findOne({ where: { username: userData.username } });
      
      if (!user) {
        // Создаем нового пользователя
        user = await User.create({
          username: userData.username,
          authType: userData.type || 'basic'
        });
      }
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Ошибка регистрации API:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Telegram авторизация
router.get('/telegram', passport.authenticate('telegram'));

router.get('/telegram/callback', 
    passport.authenticate('telegram', { failureRedirect: '/register.html' }),
    (req, res) => {
        res.redirect('/index.html');
    }
);

// Проверка статуса авторизации через Telegram
router.get('/telegram/check', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ success: true, user: req.user });
    } else {
        res.json({ success: false, message: 'Не авторизован' });
    }
});

// Принудительный вход через Telegram (если уже есть данные в сессии или в теле запроса)
router.post('/telegram/force-login', async (req, res) => {
    try {
        let telegramId = null;
        if (req.session && req.session.telegramId) {
            telegramId = req.session.telegramId.toString();
        } else if (req.body && req.body.user && req.body.user.id) {
            telegramId = req.body.user.id.toString();
        }
        if (!telegramId) {
            return res.json({ success: false, message: 'Нет данных Telegram в сессии или запросе' });
        }
        // Ищем пользователя сначала по telegramId, потом по username
        let user = await User.findOne({ where: { telegramId } });
        if (!user && req.body && req.body.user && req.body.user.username) {
            user = await User.findOne({ where: { username: req.body.user.username } });
        }
        if (!user) {
            // Создаём нового пользователя
            user = await User.create({
                username: (req.body && req.body.user && req.body.user.username) ? req.body.user.username : `user${telegramId}`,
                telegramId,
                authType: 'telegram',
                registrationDate: new Date(),
                rating: 1000,
                coins: 0,
                level: 1,
                experience: 0,
                gamesPlayed: 0,
                gamesWon: 0
            });
        } else {
            // Обновляем username, если он изменился
            if (req.body && req.body.user && req.body.user.username && req.body.user.username !== user.username) {
                await user.update({ username: req.body.user.username });
            }
        }
        req.login(user, (err) => {
            if (err) {
                return res.json({ success: false, message: 'Ошибка входа' });
            }
            return res.json({ success: true, user: user.toPublicJSON() });
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.json({ success: false, message: 'Пользователь с таким именем уже существует. Попробуйте войти через Telegram.' });
        }
        console.error('Ошибка force-login:', error);
        res.json({ success: false, message: 'Ошибка сервера' });
    }
});

// Telegram авторизация через Web App
router.post('/telegram/login', async (req, res) => {
    try {
        const { telegramData } = req.body;
        if (!telegramData || !telegramData.id) {
            return res.status(400).json({ error: 'Отсутствуют данные Telegram' });
        }
        // Ищем пользователя сначала по telegramId, потом по username
        let user = await User.findOne({ where: { telegramId: telegramData.id.toString() } });
        if (!user && telegramData.username) {
            user = await User.findOne({ where: { username: telegramData.username } });
        }
        if (!user) {
            // Создаём нового пользователя
            user = await User.create({
                username: telegramData.username || `user${telegramData.id}`,
                telegramId: telegramData.id.toString(),
                authType: 'telegram',
                registrationDate: new Date(),
                rating: 1000,
                coins: 0,
                level: 1,
                experience: 0,
                gamesPlayed: 0,
                gamesWon: 0
            });
        } else {
            // Обновляем username, если он изменился
            if (telegramData.username && telegramData.username !== user.username) {
                await user.update({ username: telegramData.username });
            }
        }
        // Входим
        req.login(user, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка входа' });
            }
            return res.json({ success: true, user: user.toPublicJSON() });
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Пользователь с таким именем уже существует. Попробуйте войти через Telegram.' });
        }
        console.error('Ошибка входа через Telegram:', error);
        res.status(500).json({ error: 'Ошибка при входе через Telegram' });
    }
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/register' }),
  (req, res) => {
    // Успешная аутентификация
    res.redirect('/webapp');
  }
);

// Яндекс авторизация
router.get('/yandex/login', passport.authenticate('yandex'));
router.get('/yandex/callback', passport.authenticate('yandex', {
  successRedirect: '/auth/success',
  failureRedirect: '/auth/failure'
}));

// Страницы успеха и ошибки
router.get('/success', (req, res) => {
  res.json({
    success: true,
    message: 'Авторизация успешна',
    user: req.user
  });
});

router.get('/failure', (req, res) => {
  res.json({
    success: false,
    message: 'Ошибка авторизации'
  });
});

// Выход из аккаунта
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Ошибка при выходе:', err);
      return res.status(500).json({ error: 'Ошибка при выходе' });
    }
    res.json({ success: true });
  });
});

// Проверка авторизации
router.get('/check', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            authenticated: true,
            user: req.user.toPublicJSON()
        });
    } else {
        res.json({
            authenticated: false
        });
    }
});

module.exports = router; 