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

    const { username, email, password } = req.body;

    // Валидация
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Имя пользователя должно быть не менее 3 символов' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Введите корректный email' });
    }

    // Проверяем существование пользователя
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
      }
    }

    // Хешируем пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Создаем нового пользователя
    const user = await User.create({
      username,
      email,
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

    // Автоматически входим после регистрации
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
      return res.status(400).json({ error: 'Введите имя пользователя и пароль' });
    }

    // Ищем пользователя
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }

    // Проверяем пароль
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }

    // Обновляем дату последнего входа
    await user.update({
      lastLoginDate: new Date()
    });

    // Входим
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

// Telegram авторизация через Web App
router.post('/telegram/login', async (req, res) => {
    try {
        const { telegramData } = req.body;
        
        if (!telegramData || !telegramData.id) {
            return res.status(400).json({ error: 'Отсутствуют данные Telegram' });
        }

        // Ищем или создаем пользователя
        let user = await User.findOne({
            where: { telegramId: telegramData.id.toString() }
        });

        if (!user) {
            // Создаем нового пользователя
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
        }

        // Обновляем данные пользователя если нужно
        if (telegramData.username && telegramData.username !== user.username) {
            await user.update({
                username: telegramData.username
            });
        }

        // Входим
        req.login(user, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка входа' });
            }
            return res.json(user.toPublicJSON());
        });
    } catch (error) {
        console.error('Ошибка входа через Telegram:', error);
        res.status(500).json({ error: 'Ошибка при входе через Telegram' });
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
router.post('/logout', (req, res) => {
  const userId = req.user?.id;
  req.logout(() => {
    logAuth('LOGOUT', { userId });
    res.json({ message: 'Выход выполнен успешно' });
  });
});

// Проверка аутентификации
router.get('/check', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user.toPublicJSON());
  } else {
    res.status(401).json({ error: 'Не аутентифицирован' });
  }
});

module.exports = router; 