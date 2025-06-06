const express = require('express');
const passport = require('passport');
const router = express.Router();
const { User } = require('../models');
const logger = require('../utils/logger');
const crypto = require('crypto');

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

// Telegram авторизация
router.get('/telegram', (req, res) => {
    const botUsername = process.env.BOT_USERNAME;
    // Генерируем случайную строку для защиты от подделки данных
    const nonce = crypto.randomBytes(16).toString('hex');
    // Сохраняем nonce в сессии
    req.session.telegramNonce = nonce;
    
    // Формируем URL для Telegram Login Widget
    const authUrl = `https://oauth.telegram.org/auth?bot_id=${process.env.BOT_TOKEN.split(':')[0]}&origin=${encodeURIComponent(process.env.APP_URL)}&request_access=write&return_to=${encodeURIComponent(process.env.APP_URL + '/auth/telegram/callback')}&auth_date=${Math.floor(Date.now() / 1000)}&hash=${nonce}`;
    
    res.redirect(authUrl);
});

// Обработчик callback от Telegram
router.get('/telegram/callback', async (req, res) => {
    try {
        const { id, first_name, username, photo_url, auth_date, hash } = req.query;
        
        // Проверяем валидность данных от Telegram
        const checkString = Object.keys(req.query)
            .filter(key => key !== 'hash')
            .sort()
            .map(key => `${key}=${req.query[key]}`)
            .join('\n');
        
        const secretKey = crypto.createHash('sha256')
            .update(process.env.BOT_TOKEN)
            .digest();
        
        const hmac = crypto.createHmac('sha256', secretKey)
            .update(checkString)
            .digest('hex');
        
        if (hmac !== hash) {
            logger.auth({
                event: 'telegram_auth_failed',
                error: 'Invalid hash',
                telegramId: id
            });
            return res.redirect('/register.html?error=invalid_auth');
        }

        // Проверяем, не устарели ли данные (не старше 1 часа)
        if (Math.abs(Date.now() / 1000 - auth_date) > 3600) {
            return res.redirect('/register.html?error=expired_auth');
        }

        // Ищем пользователя по telegram_id
        let user = await User.findOne({ where: { telegram_id: id } });

        if (!user) {
            // Создаем нового пользователя
            user = await User.create({
                username: username || `user_${id}`,
                telegram_id: id,
                telegram_username: username,
                display_name: first_name,
                avatar_url: photo_url,
                rating: 0,
                gamesWon: 0
            });

            logger.auth({
                event: 'telegram_user_created',
                userId: user.id,
                telegramId: id
            });
        } else {
            // Обновляем существующего пользователя
            await user.update({
                telegram_username: username,
                display_name: first_name,
                avatar_url: photo_url
            });
        }

        // Авторизуем пользователя
        req.login(user, (err) => {
            if (err) {
                logger.error({
                    event: 'telegram_login_error',
                    error: err.message,
                    userId: user.id
                });
                return res.redirect('/register.html?error=login_failed');
            }

            logger.auth({
                event: 'telegram_login_success',
                userId: user.id,
                telegramId: id
            });

            // Перенаправляем на главную страницу
            res.redirect('/webapp');
        });

    } catch (error) {
        logger.error({
            event: 'telegram_auth_error',
            error: error.message
        });
        res.redirect('/register.html?error=server_error');
    }
});

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