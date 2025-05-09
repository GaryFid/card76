const express = require('express');
const router = express.Router();
const Game = require('../models/game');
const User = require('../models/user');

// Middleware для проверки авторизации
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Требуется авторизация'
  });
};

// Получить информацию о текущем пользователе
router.get('/user', isAuthenticated, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Получить рейтинг игроков
router.get('/rating', async (req, res) => {
  try {
    const topPlayers = await User.find({
      gamesPlayed: { $gt: 0 }
    })
    .sort({ rating: -1 })
    .limit(100)
    .select('rating gamesPlayed gamesWon telegram.username google.name yandex.name');

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
    const { playerCount = 4, withAI = false } = req.body;
    
    if (playerCount < 4 || playerCount > 9) {
      return res.status(400).json({
        success: false,
        message: 'Количество игроков должно быть от 4 до 9'
      });
    }
    
    const game = new Game({
      players: [{
        userId: req.user._id,
        cards: [],
        score: 0,
        isBot: false
      }]
    });
    
    if (withAI) {
      // Добавляем ботов для игры против ИИ
      for (let i = 1; i < playerCount; i++) {
        game.players.push({
          cards: [],
          score: 0,
          isBot: true
        });
      }
      
      // Инициализация игры против ИИ
      // TODO: Добавить логику раздачи карт и начала игры
    }
    
    await game.save();
    
    res.json({
      success: true,
      game: game
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании игры',
      error: error.message
    });
  }
});

// Получить информацию об активной игре
router.get('/games/:id', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('players.userId', 'telegram.username google.name yandex.name');
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Игра не найдена'
      });
    }
    
    const isPlayerInGame = game.players.some(player => 
      player.userId && player.userId.equals(req.user._id)
    );
    
    if (!isPlayerInGame) {
      return res.status(403).json({
        success: false,
        message: 'Вы не участвуете в этой игре'
      });
    }
    
    res.json({
      success: true,
      game: game
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении информации об игре',
      error: error.message
    });
  }
});

// Присоединиться к игре
router.post('/games/:id/join', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Игра не найдена'
      });
    }
    
    if (game.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'Игра уже началась'
      });
    }
    
    // Проверяем, не присоединился ли игрок уже
    const isPlayerInGame = game.players.some(player => 
      player.userId && player.userId.equals(req.user._id)
    );
    
    if (isPlayerInGame) {
      return res.status(400).json({
        success: false,
        message: 'Вы уже присоединились к этой игре'
      });
    }
    
    // Проверяем лимит игроков
    if (game.players.filter(p => !p.isBot).length >= 9) {
      return res.status(400).json({
        success: false,
        message: 'Достигнут максимальный лимит игроков'
      });
    }
    
    // Добавляем игрока
    game.players.push({
      userId: req.user._id,
      cards: [],
      score: 0,
      isBot: false
    });
    
    await game.save();
    
    res.json({
      success: true,
      game: game
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при присоединении к игре',
      error: error.message
    });
  }
});

// Сделать ход в игре
router.post('/games/:id/move', isAuthenticated, async (req, res) => {
  try {
    // TODO: Реализовать логику хода в игре
    res.json({
      success: true,
      message: 'Ход принят'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при выполнении хода',
      error: error.message
    });
  }
});

module.exports = router; 