const express = require('express');
const router = express.Router();
const { User, Game } = require('../models');

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

// Регистрация/авторизация пользователя
router.post('/auth/register', async (req, res) => {
  try {
    const userData = req.body;
    let user = null;
    
    // Определяем тип регистрации: обычная или гостевая
    if (userData.type === 'guest') {
      // Создаем гостевого пользователя
      user = await User.create({
        username: userData.username,
        authType: 'guest'
      });
      
      console.log('Создан гостевой пользователь:', user.username);
    } else {
      // Проверяем существование пользователя с таким именем
      user = await User.findByUsername(userData.username);
      
      if (user) {
        // Обновляем время последней активности
        user = await user.update({
          lastActive: new Date().toISOString()
        });
        
        console.log('Вход существующего пользователя:', user.username);
      } else {
        // Создаем нового пользователя
        user = await User.create({
          username: userData.username,
          authType: 'basic'
        });
        
        console.log('Создан новый пользователь:', user.username);
      }
    }
    
    // Отправляем успешный ответ с данными пользователя
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        rating: user.rating,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        authType: user.authType
      } 
    });
  } catch (error) {
    console.error('Ошибка регистрации API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Получить информацию о текущем пользователе
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении информации о пользователе',
      error: error.message
    });
  }
});

// Получить рейтинг игроков
router.get('/rating', async (req, res) => {
  try {
    const topPlayers = await User.findTopByRating(20);
    
    res.json({
      success: true,
      players: topPlayers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении рейтинга',
      error: error.message
    });
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

module.exports = router; 