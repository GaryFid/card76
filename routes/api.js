const express = require('express');
const router = express.Router();
const { User, Game } = require('../models');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

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

module.exports = router; 