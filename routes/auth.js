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
    const { username, email, password, birthDate } = req.body;

    // Проверка наличия обязательных полей
    if (!username || !email || !password || !birthDate) {
      return res.json({ 
        success: false, 
        message: 'Все поля обязательны для заполнения' 
      });
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({ 
        success: false, 
        message: 'Некорректный email адрес' 
      });
    }

    // Проверка возраста (минимум 10 лет)
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    if (age < 10) {
      return res.json({ 
        success: false, 
        message: 'Минимальный возраст для регистрации - 10 лет' 
      });
    }

    // Проверка существования пользователя
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username },
          { email }
        ]
      } 
    });
    
    if (existingUser) {
      return res.json({ 
        success: false, 
        message: existingUser.username === username ? 
          'Пользователь с таким логином уже существует' : 
          'Пользователь с таким email уже существует'
      });
    }

    // Хеширование пароля
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Создание пользователя
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      birthDate,
      registrationDate: new Date()
    });

    res.json({ 
      success: true, 
      message: 'Регистрация успешна' 
    });

  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.json({ 
      success: false, 
      message: 'Ошибка при регистрации. Попробуйте позже.' 
    });
  }
});

// Вход через форму
router.post('/login', async (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Ошибка при входе:', err);
      return res.json({ 
        success: false, 
        message: 'Ошибка при входе. Попробуйте позже.' 
      });
    }

    if (!user) {
      return res.json({ 
        success: false, 
        message: info.message || 'Неверный логин или пароль' 
      });
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error('Ошибка при создании сессии:', err);
        return res.json({ 
          success: false, 
          message: 'Ошибка при входе. Попробуйте позже.' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Вход выполнен успешно' 
      });
    });
  })(req, res, next);
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

// Принудительный вход через Telegram (если уже есть данные в сессии)
router.post('/telegram/force-login', async (req, res) => {
    try {
        if (req.session && req.session.telegramId) {
            const user = await User.findOne({
                where: { telegramId: req.session.telegramId.toString() }
            });
            
            if (user) {
                req.login(user, (err) => {
                    if (err) {
                        return res.json({ success: false, message: 'Ошибка входа' });
                    }
                    return res.json({ success: true, user });
                });
            } else {
                res.json({ success: false, message: 'Пользователь не найден' });
            }
        } else {
            res.json({ success: false, message: 'Нет данных Telegram в сессии' });
        }
    } catch (error) {
        console.error('Ошибка force-login:', error);
        res.json({ success: false, message: 'Ошибка сервера' });
    }
});

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
  res.json({ 
    success: true, 
    message: 'Выход выполнен успешно' 
  });
});

module.exports = router; 