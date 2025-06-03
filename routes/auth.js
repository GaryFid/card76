const express = require('express');
const passport = require('passport');
const router = express.Router();
const { User } = require('../models');

// Страница регистрации
router.get('/register', (req, res) => {
  res.sendFile('register.html', { root: './public' });
});

// Регистрация через форму
router.post('/register', async (req, res) => {
  try {
    const { username, type } = req.body;
    
    // Проверка существования пользователя
    let user = await User.findOne({ where: { username } });
    
    if (!user) {
      // Создаем нового пользователя
      user = await User.create({
        username,
        authType: type || 'basic'
      });
    }
    
    // Аутентификация пользователя
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка аутентификации' });
      }
      return res.json({ success: true, user });
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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

// Telegram OAuth
router.get('/telegram', passport.authenticate('telegram'));

router.get('/telegram/callback', 
  passport.authenticate('telegram', { failureRedirect: '/auth/register' }),
  (req, res) => {
    // Успешная аутентификация
    res.redirect('/webapp');
  }
);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

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
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/auth/register');
});

module.exports = router; 