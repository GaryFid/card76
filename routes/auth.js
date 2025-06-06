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
            logger.error({
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
            logger.error({
                event: 'new_user_detected',
                telegramId: user.id,
                username: user.username
            });
            return res.json({ 
                success: false, 
                redirect: '/register' 
            });
        }

        logger.error({
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
        const { user } = req.body;

        if (!user || !user.id) {
            logger.error({
                event: 'force_login_error',
                error: 'No user data provided',
                payload: req.body
            });
            return res.status(400).json({
                success: false,
                error: 'Не предоставлены данные пользователя'
            });
        }

        logger.error({
            event: 'force_login_attempt',
            telegramId: user.id,
            payload: user
        });

        // Ищем существующего пользователя
        let dbUser = await User.findOne({
            where: {
                telegram_id: user.id.toString()
            }
        });

        if (!dbUser) {
            // Создаём нового пользователя
            const username = user.username || `user_${user.id}`;
            const avatarUrl = user.photo_url || null;

            logger.error({
                event: 'creating_new_user',
                username,
                telegramId: user.id
            });

            try {
                dbUser = await User.create({
                    username: username,
                    telegram_id: user.id.toString(),
                    telegram_username: user.username || null,
                    display_name: user.first_name || username,
                    avatar_url: avatarUrl,
                    rating: 1000,
                    coins: 0,
                    level: 1,
                    authType: 'telegram'
                });

                logger.error({
                    event: 'new_user_created',
                    userId: dbUser.id,
                    telegramId: user.id,
                    username: username
                });
            } catch (createError) {
                logger.error({
                    event: 'user_creation_error',
                    error: createError.message,
                    payload: user
                });
                throw createError;
            }
        } else {
            // Обновляем существующего пользователя
            const updates = {
                telegram_username: user.username || dbUser.telegram_username,
                display_name: user.first_name || dbUser.display_name,
                last_active: new Date()
            };

            // Обновляем аватар только если он предоставлен
            if (user.photo_url) {
                updates.avatar_url = user.photo_url;
            }

            await dbUser.update(updates);

            logger.error({
                event: 'user_updated',
                userId: dbUser.id,
                telegramId: user.id,
                updates
            });
        }

        // Создаем сессию
        if (req.session) {
            req.session.userId = dbUser.id;
            req.session.telegramId = user.id;
            req.session.username = dbUser.username;
        }

        res.json({
            success: true,
            user: {
                id: dbUser.id,
                username: dbUser.username,
                telegram_id: dbUser.telegram_id,
                display_name: dbUser.display_name,
                avatar_url: dbUser.avatar_url,
                rating: dbUser.rating,
                coins: dbUser.coins,
                level: dbUser.level
            }
        });
    } catch (error) {
        logger.error({
            event: 'force_login_error',
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            error: 'Ошибка при авторизации'
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