const express = require('express');
const passport = require('passport');
const router = express.Router();
const { User } = require('../models');
const logger = require('../utils/logger');

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

// Telegram callback
router.get('/telegram/callback', 
  passport.authenticate('telegram', { failureRedirect: '/auth/register' }),
  async (req, res) => {
    try {
      logAuth('TELEGRAM_CALLBACK', { user: req.user });

      // Проверяем и обновляем сессию
      if (req.session) {
        req.session.touch();
        req.session.save((err) => {
          if (err) {
            logAuth('SESSION_SAVE_ERROR', { error: err.message });
          } else {
            logAuth('SESSION_SAVED', { 
              sessionId: req.sessionID,
              user: req.user?.username
            });
          }
        });
      }

      res.redirect('/webapp');
    } catch (error) {
      console.error('Ошибка в telegram callback:', error);
      res.redirect('/auth/register');
    }
  }
);

// Проверка статуса авторизации
router.post('/telegram/check', async (req, res) => {
    try {
        const { initData, user } = req.body;
        
        if (!user) {
            logger.auth({
                event: 'auth_check_failed',
                error: 'No user data provided'
            });
            return res.json({ 
                success: false, 
                error: 'Нет данных пользователя' 
            });
        }

        // Ищем пользователя
        let dbUser = await User.findOne({
            where: {
                [User.sequelize.Op.or]: [
                    { telegramId: user.id.toString() },
                    { username: user.username }
                ]
            }
        });

        if (!dbUser) {
            logger.auth({
                event: 'new_user_detected',
                telegramId: user.id,
                username: user.username
            });
            return res.json({ 
                success: false, 
                redirect: '/register' 
            });
        }

        logger.auth({
            event: 'auth_check_success',
            userId: dbUser.id,
            username: dbUser.username
        });

        return res.json({
            success: true,
            user: {
                id: dbUser.id,
                username: dbUser.username,
                telegramId: dbUser.telegramId,
                rating: dbUser.rating,
                coins: dbUser.coins,
                level: dbUser.level
            }
        });
    } catch (error) {
        logger.error({
            event: 'auth_check_error',
            error: error.message
        });
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при проверке авторизации' 
        });
    }
});

// Форсированный вход через Telegram
router.post('/telegram/force-login', async (req, res) => {
  try {
    logAuth('FORCE_LOGIN_START', { user: req.user });

    if (!req.user || (!req.user.telegramId && !req.user.username)) {
      logAuth('FORCE_LOGIN_NO_CREDENTIALS', { user: req.user });
      return res.status(400).json({ 
        success: false, 
        error: 'Нет данных Telegram', 
        telegramAvailable: false 
      });
    }

    const { telegramId, username, photoUrl } = req.user;

    // Ищем существующего пользователя
    let user = await User.findOne({
      where: {
        [User.sequelize.Op.or]: [
          telegramId ? { telegramId } : null,
          username ? { username } : null
        ].filter(Boolean)
      }
    });

    logAuth('FORCE_LOGIN_SEARCH_RESULT', { 
      found: !!user,
      searchCriteria: { telegramId, username }
    });

    // Если пользователя нет - создаём
    if (!user) {
      const avatarUrl = photoUrl || (username ? `https://t.me/i/userpic/320/${username}.jpg` : '');
      
      user = await User.create({
        telegramId,
        username,
        avatar: avatarUrl,
        authType: 'telegram',
        registrationDate: new Date(),
        rating: 0,
        coins: 0,
        level: 1
      });

      logAuth('FORCE_LOGIN_USER_CREATED', { 
        userId: user.id,
        username: user.username
      });
    }
    // Если есть пользователь но нет telegramId - обновляем
    else if (!user.telegramId && telegramId) {
      user.telegramId = telegramId;
      if (photoUrl && !user.avatar) {
        user.avatar = photoUrl;
      }
      await user.save();
      logAuth('FORCE_LOGIN_USER_UPDATED', { 
        userId: user.id,
        telegramId
      });
    }

    // Обновляем сессию
    if (req.session) {
      req.session.regenerate((err) => {
        if (err) {
          logAuth('SESSION_REGENERATE_ERROR', { error: err.message });
          return res.status(500).json({ 
            success: false, 
            error: 'Ошибка сессии' 
          });
        }

        req.login(user, (err) => {
          if (err) {
            logAuth('FORCE_LOGIN_ERROR', { error: err.message });
            return res.status(500).json({ 
              success: false, 
              error: 'Ошибка авторизации' 
            });
          }

          req.session.telegramId = telegramId;
          req.session.username = username;
          
          req.session.save((err) => {
            if (err) {
              logAuth('SESSION_SAVE_ERROR', { error: err.message });
              return res.status(500).json({ 
                success: false, 
                error: 'Ошибка сохранения сессии' 
              });
            }

            logAuth('FORCE_LOGIN_SUCCESS', { 
              userId: user.id,
              username: user.username,
              sessionId: req.sessionID
            });

            return res.json({
              success: true,
              user: {
                id: user.id,
                username: user.username,
                rating: user.rating,
                coins: user.coins,
                avatar: user.avatar,
                level: user.level,
                school: user.school,
                referralCode: user.referralCode
              }
            });
          });
        });
      });
    } else {
      logAuth('NO_SESSION_ERROR', {});
      res.status(500).json({ 
        success: false, 
        error: 'Нет сессии' 
      });
    }
  } catch (error) {
    console.error('Ошибка в force-login:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера' 
    });
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
  logAuth('LOGOUT_START', { user: req.user });

  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        logAuth('LOGOUT_SESSION_ERROR', { error: err.message });
      } else {
        logAuth('LOGOUT_SUCCESS', { sessionId: req.sessionID });
      }
      res.redirect('/auth/register');
    });
  } else {
    res.redirect('/auth/register');
  }
});

module.exports = router; 