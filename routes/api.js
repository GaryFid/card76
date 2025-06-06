const express = require('express');
const router = express.Router();
const { User, Game } = require('../models');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

// Добавим парсер JSON для обработки тела запроса
router.use(express.json());

// Middleware для проверки авторизации
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Проверка авторизации через заголовок Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7, authHeader.length);
    // Здесь можно добавить проверку токена
    // Для простоты мы просто пропускаем запрос дальше
    return next();
  }
  
  return res.status(401).json({
    success: false,
    message: 'Требуется авторизация'
  });
};

// Настройка multer для загрузки аватаров
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads/avatars');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'user_' + req.params.id + '_' + Date.now() + ext);
  }
});
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 2 * 1024 * 1024 } });

// Регистрация/авторизация пользователя
router.post('/auth/register', async (req, res) => {
  try {
    const userData = req.body;
    if (!userData.username) {
      return res.status(400).json({ success: false, error: 'Имя пользователя обязательно' });
    }
    if (userData.username.length < 4 && userData.type !== 'guest') {
      return res.status(400).json({ success: false, error: 'Имя должно содержать не менее 4 символов' });
    }
    let user = null;
    if (userData.type === 'guest') {
      user = await User.create({ username: userData.username, authType: 'guest' });
    } else {
      user = await User.findOne({ where: { username: userData.username } });
      if (user) {
        await user.update({ lastActive: new Date() });
      } else {
        user = await User.create({ username: userData.username, authType: 'basic' });
      }
    }
    res.json({ success: true, user: {
      id: user.id,
      username: user.username,
      rating: user.rating,
      authType: user.authType
    }});
  } catch (error) {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

// Получить информацию о текущем пользователе
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка при получении информации о пользователе', error: error.message });
  }
});

// Получить рейтинг игроков
router.get('/rating', async (req, res) => {
  try {
    const topPlayers = await User.findAll({ order: [['rating', 'DESC']], limit: 20 });
    res.json({ success: true, players: topPlayers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка при получении рейтинга', error: error.message });
  }
});

// Создать новую игру
router.post('/games', isAuthenticated, async (req, res) => {
  try {
    const { playerCount = 4, withAI = false, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID пользователя обязателен'
      });
    }
    
    if (playerCount < 4 || playerCount > 9) {
      return res.status(400).json({
        success: false,
        message: 'Количество игроков должно быть от 4 до 9'
      });
    }
    
    // Проверяем существование пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Создаем новую игру
    const game = await Game.create({
      players: [{
        userId: userId,
        cards: [],
        score: 0,
        isBot: false
      }],
      withAI
    });
    
    if (withAI) {
      // Добавляем ботов для игры против ИИ
      for (let i = 1; i < playerCount; i++) {
        game.players.push({
          userId: `bot_${i}`,
          cards: [],
          score: 0,
          isBot: true
        });
      }
      
      // Можно инициализировать игру против ИИ здесь
    }
    
    await game.save();
    
    res.json({
      success: true,
      game
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании игры',
      error: error.message
    });
  }
});

// Получить активные игры
router.get('/games/active', async (req, res) => {
  try {
    const activeGames = await Game.findActive();
    
    res.json({
      success: true,
      games: activeGames
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении активных игр',
      error: error.message
    });
  }
});

// Получить информацию об игре
router.get('/games/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Игра не найдена'
      });
    }
    
    res.json({
      success: true,
      game
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении информации об игре',
      error: error.message
    });
  }
});

// --- Админка: получить всех пользователей (только для @GreenWood9009) ---
router.get('/admin/users', async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.username !== '@GreenWood9009') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    const users = await User.findAll({
      attributes: ['id', 'username', 'rating', 'level', 'telegramId', 'createdAt']
    });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// --- Обновление профиля пользователя (ник, аватар) ---
// PATCH /api/user/:id — обновить профиль
router.patch('/user/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    const { username, avatar } = req.body;
    if (username && username.length < 4) {
      return res.status(400).json({ success: false, error: 'Имя должно быть не менее 4 символов' });
    }
    if (username) user.username = username;
    if (avatar) user.avatar = avatar;
    await user.save();
    res.json({ success: true, user: { id: user.id, username: user.username, avatar: user.avatar } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Ошибка обновления профиля' });
  }
});

// POST /api/user/:id/avatar — загрузка аватара
router.post('/user/:id/avatar', uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Файл не загружен' });
    // Формируем URL для доступа к аватару
    const avatarUrl = '/uploads/avatars/' + req.file.filename;
    res.json({ success: true, avatarUrl });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Ошибка загрузки аватара' });
  }
});

// --- ВРЕМЕННЫЙ ЭНДПОИНТ: удалить всех гостей (только для админа) ---
router.post('/admin/delete-guests', async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.username !== '@GreenWood9009') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    const { User } = require('../models');
    const count = await User.destroy({ where: { authType: 'guest' } });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание новой игры
router.post('/games/create', async (req, res) => {
    try {
        const { userId, username, playerCount, withAI } = req.body;

        if (!userId || !username) {
            return res.status(400).json({
                success: false,
                error: 'Не указан пользователь'
            });
        }

        // Проверяем существование пользователя
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }

        // Создаем новую игру
        const game = await Game.create({
            status: 'waiting',
            players: [{
                userId,
                username,
                isHost: true,
                isReady: true,
                isBot: false
            }],
            playerCount: playerCount || 4,
            withAI: withAI || false,
            gameStage: 'waiting'
        });

        logger.game({
            event: 'game_created',
            gameId: game.id,
            creator: {
                userId,
                username
            },
            settings: {
                playerCount,
                withAI
            }
        });

        res.json({
            success: true,
            game: {
                id: game.id,
                players: game.players,
                status: game.status,
                playerCount: game.playerCount,
                withAI: game.withAI
            }
        });
    } catch (error) {
        logger.error({
            event: 'game_creation_error',
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Ошибка при создании игры'
        });
    }
});

// Получение статистики игр
router.get('/games/stats', async (req, res) => {
    try {
        const stats = await Game.getStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        logger.error({
            event: 'stats_error',
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении статистики'
        });
    }
});

// Поиск пользователей
router.get('/users/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.json({ users: [] });
        }

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { username: { [Op.iLike]: `%${query}%` } },
                    { telegram_username: { [Op.iLike]: `%${query}%` } },
                    { display_name: { [Op.iLike]: `%${query}%` } }
                ],
                id: { [Op.ne]: req.user.id } // Исключаем текущего пользователя
            },
            limit: 10
        });

        res.json({
            users: users.map(user => ({
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                telegram_username: user.telegram_username,
                avatar_url: user.avatar_url
            }))
        });
    } catch (error) {
        logger.error({
            event: 'user_search_error',
            error: error.message,
            query: req.query.q
        });
        res.status(500).json({ error: 'Ошибка поиска пользователей' });
    }
});

// Получение списка друзей
router.get('/friends', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{
                model: User,
                as: 'friends',
                through: { attributes: [] }
            }]
        });

        const friends = user.friends.map(friend => ({
            id: friend.id,
            username: friend.username,
            display_name: friend.display_name,
            avatar_url: friend.avatar_url,
            online: friend.last_active && 
                    (new Date() - new Date(friend.last_active)) < 5 * 60 * 1000 // 5 минут
        }));

        res.json({ friends });
    } catch (error) {
        logger.error({
            event: 'friends_list_error',
            error: error.message,
            userId: req.user.id
        });
        res.status(500).json({ error: 'Ошибка получения списка друзей' });
    }
});

// Добавление друга
router.post('/friends/add', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findByPk(req.user.id);
        const friend = await User.findByPk(userId);

        if (!friend) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        await user.addFriend(friend);
        
        logger.info({
            event: 'friend_added',
            userId: req.user.id,
            friendId: userId
        });

        res.json({ success: true });
    } catch (error) {
        logger.error({
            event: 'add_friend_error',
            error: error.message,
            userId: req.user.id,
            friendId: req.body.userId
        });
        res.status(500).json({ error: 'Ошибка добавления друга' });
    }
});

// Отправка приглашения другу
router.post('/friends/invite', async (req, res) => {
    try {
        const { userId } = req.body;
        const friend = await User.findByPk(userId);

        if (!friend) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Здесь можно добавить логику отправки уведомления через бота
        // или веб-сокеты, если они реализованы

        logger.info({
            event: 'friend_invited',
            userId: req.user.id,
            friendId: userId
        });

        res.json({ success: true });
    } catch (error) {
        logger.error({
            event: 'invite_friend_error',
            error: error.message,
            userId: req.user.id,
            friendId: req.body.userId
        });
        res.status(500).json({ error: 'Ошибка отправки приглашения' });
    }
});

// Очистка базы данных (только для разработки)
router.post('/debug/clear-database', async (req, res) => {
    try {
        // Получаем все модели
        const models = sequelize.models;
        
        // Отключаем внешние ключи для всех таблиц
        await sequelize.query('SET session_replication_role = replica;');
        
        // Очищаем каждую таблицу
        for (const model of Object.values(models)) {
            if (model.tableName) {
                await sequelize.query(`TRUNCATE TABLE "${model.tableName}" CASCADE;`);
            }
        }
        
        // Включаем обратно внешние ключи
        await sequelize.query('SET session_replication_role = default;');

        // Сбрасываем автоинкремент для всех таблиц
        for (const model of Object.values(models)) {
            if (model.tableName) {
                await sequelize.query(`ALTER SEQUENCE "${model.tableName}_id_seq" RESTART WITH 1;`);
            }
        }

        res.json({ 
            success: true, 
            message: 'База данных успешно очищена' 
        });
    } catch (error) {
        console.error('Ошибка при очистке базы данных:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Тестовый маршрут для проверки пользователей (только для разработки)
router.get('/debug/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'telegram_id', 'rating', 'createdAt'],
            raw: true
        });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; 