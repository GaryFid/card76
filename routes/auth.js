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
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }
    let user = await User.findOne({ where: { username } });
    if (user) {
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
    }
    user = await User.create({ username, password });
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка аутентификации' });
      }
      return res.json({ success: true, user: { id: user.id, username: user.username, rating: user.rating } });
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Вход через форму
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }
    const valid = await user.checkPassword(password);
    if (!valid) {
      return res.status(400).json({ error: 'Неверный пароль' });
    }
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка аутентификации' });
      }
      return res.json({ success: true, user: { id: user.id, username: user.username, rating: user.rating } });
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
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

// --- Проверка Telegram-авторизации для постоянного входа ---
router.get('/auth/telegram/check', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.authType === 'telegram') {
        // Пользователь авторизован через Telegram
        return res.json({ success: true, user: {
            id: req.user.id,
            username: req.user.username,
            rating: req.user.rating,
            coins: req.user.coins,
            avatar: req.user.avatar,
            level: req.user.level,
            school: req.user.school,
            referralCode: req.user.referralCode
        }});
    } else if (req.user && req.user.username) {
        // Пользователь есть, но не Telegram
        return res.json({ success: false, username: req.user.username });
    } else if (req.user && req.user.telegramId) {
        // Telegram авторизация есть, но пользователя нет в базе
        return res.json({ success: false, telegramAvailable: true });
    } else {
        return res.json({ success: false });
    }
});

// --- Форсированный вход/регистрация через Telegram ---
router.post('/auth/telegram/force-login', async (req, res) => {
    try {
        if (!req.user || !req.user.telegramId) {
            return res.status(400).json({ success: false, error: 'Нет Telegram авторизации', telegramAvailable: false });
        }
        let user = await User.findOne({ where: { telegramId: req.user.telegramId } });
        if (!user) {
            let avatarUrl = '';
            if (req.user.username) {
                avatarUrl = `https://t.me/i/userpic/320/${req.user.username}.jpg`;
            }
            user = await User.create({
                telegramId: req.user.telegramId,
                username: req.user.username,
                avatar: avatarUrl,
                authType: 'telegram'
            });
        }
        req.login(user, (err) => {
            if (err) return res.status(500).json({ success: false, error: 'Ошибка авторизации' });
            return res.json({ success: true, user: {
                id: user.id,
                username: user.username,
                rating: user.rating,
                coins: user.coins,
                avatar: user.avatar,
                level: user.level,
                school: user.school,
                referralCode: user.referralCode
            }});
        });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router; 