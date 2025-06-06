const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user');
const logger = require('../utils/logger');

const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'waiting',
    validate: {
      isIn: [['waiting', 'in_progress', 'finished']]
    }
  },
  players: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  deck: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  discardPile: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  currentPlayer: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  winnerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  withAI: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  aiTestMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  gameStage: {
    type: DataTypes.STRING,
    defaultValue: 'init'
  },
  currentPlayerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  gameData: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'games',
  timestamps: true,
  hooks: {
    afterCreate: (game) => {
      logger.game({
        event: 'game_created',
        gameId: game.id,
        players: game.players,
        withAI: game.withAI
      });
    },
    afterUpdate: (game) => {
      logger.game({
        event: 'game_updated',
        gameId: game.id,
        status: game.status,
        currentPlayer: game.currentPlayer,
        gameStage: game.gameStage
      });
    }
  }
});

// Статические методы для модели Game
Game.countActivePlayers = async function() {
  const activeGames = await this.findAll({
    where: {
      status: 'active'
    }
  });
  
  const players = new Set();
  activeGames.forEach(game => {
    game.players.forEach(player => {
      if (!player.isBot) {
        players.add(player.userId);
      }
    });
  });
  
  return players.size;
};

// Метод для получения статистики игр
Game.getStats = async function() {
  const stats = {
    totalGames: await this.count(),
    activePlayers: await this.countActivePlayers(),
    activeGames: await this.count({ where: { status: 'active' } }),
    completedGames: await this.count({ where: { status: 'completed' } })
  };
  
  logger.game({
    event: 'stats_requested',
    stats
  });
  
  return stats;
};

// Методы экземпляра
Game.prototype.initializeDeck = function() {
  // Масти карт: черви, бубны, крести, пики
  const suits = ['♥', '♦', '♣', '♠'];
  // Значения карт
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  // Создаем колоду
  this.deck = [];
  
  // Заполняем колоду картами
  for (const suit of suits) {
    for (const value of values) {
      this.deck.push({
        id: `${value}-${suit}`,
        value: value,
        suit: suit,
        isRed: suit === '♥' || suit === '♦',
        faceUp: false
      });
    }
  }
  
  // Перемешиваем колоду
  this.shuffleDeck();
};

Game.prototype.shuffleDeck = function() {
  for (let i = this.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
  }
};

Game.prototype.dealInitialCards = function() {
  // Проверяем, что колода создана
  if (this.deck.length === 0) {
    this.initializeDeck();
  }
  
  // Раздаем каждому игроку по 2 закрытые карты и 1 открытую
  for (let player of this.players) {
    // Если у игрока еще нет карт, создаем массив для них
    if (!player.cards) {
      player.cards = [];
    }
    
    // Раздаем 2 закрытые карты
    for (let i = 0; i < 2; i++) {
      const card = this.deck.pop();
      card.faceUp = false;
      player.cards.push(card);
    }
    
    // Раздаем 1 открытую карту
    const openCard = this.deck.pop();
    openCard.faceUp = true;
    player.cards.push(openCard);
  }
  
  // Кладем одну открытую карту в центр стола (сброс)
  const tableCard = this.deck.pop();
  tableCard.faceUp = true;
  this.discardPile = [tableCard];
  
  // Устанавливаем стадию игры на первую
  this.gameStage = 'stage1';
};

Game.prototype.start = async function() {
  this.status = 'active';
  this.startedAt = new Date();
  
  // Инициализируем колоду и раздаем начальные карты
  this.initializeDeck();
  this.dealInitialCards();
  
  // Определяем первого игрока по старшей открытой карте
  this.determineFirstPlayer();
  
  return await this.save();
};

Game.prototype.finish = async function(winnerId) {
  this.status = 'finished';
  this.winnerId = winnerId;
  this.finishedAt = new Date();
  
  // Обновляем статистику победителя
  if (winnerId) {
    const winner = await User.findByPk(winnerId);
    if (winner) {
      winner.gamesWon = (winner.gamesWon || 0) + 1;
      winner.rating += 10; // Добавляем рейтинг за победу
      await winner.save();
    }
    
    // Обновляем статистику всех игроков
    for (const player of this.players) {
      if (player.userId !== winnerId) {
        const user = await User.findByPk(player.userId);
        if (user) {
          user.rating = Math.max(0, user.rating - 3); // Уменьшаем рейтинг за поражение
          await user.save();
        }
      }
    }
  }
  
  return await this.save();
};

Game.prototype.determineFirstPlayer = function() {
  const cardValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  let highestCardValue = -1;
  let highestCardPlayer = 0;
  
  // Проходим по всем игрокам и ищем самую высокую открытую карту
  this.players.forEach((player, playerIndex) => {
    // Ищем открытую карту у игрока (должна быть последней в массиве)
    const openCard = player.cards.find(card => card.faceUp);
    
    if (openCard) {
      // Получаем ранг карты
      const cardRank = cardValues.indexOf(openCard.value);
      
      // Если карта старше предыдущей найденной, обновляем данные
      if (cardRank > highestCardValue) {
        highestCardValue = cardRank;
        highestCardPlayer = playerIndex;
      }
    }
  });
  
  // Устанавливаем текущий ход на игрока с самой высокой картой
  this.currentPlayer = highestCardPlayer;
  
  return highestCardPlayer;
};

Game.prototype.canPlayCard = function(card, targetCard) {
  // В первой стадии игры карту можно сыграть, если она на 1 ранг выше целевой карты
  if (this.gameStage === 'stage1') {
    const cardValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const cardRank = cardValues.indexOf(card.value);
    const targetRank = cardValues.indexOf(targetCard.value);
    
    // Для Туза можно положить только 2
    if (targetCard.value === 'A' && card.value === '2') {
      return true;
    }
    
    return cardRank === targetRank + 1;
  }
  
  // В других стадиях проверяем совпадение масти или значения
  return (card.suit === targetCard.suit || card.value === targetCard.value);
};

Game.prototype.getAvailableTargets = function(card) {
  const targets = [];
  const cardValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const cardRank = cardValues.indexOf(card.value);
  
  // В первой стадии ищем карты на 1 ранг ниже
  if (this.gameStage === 'stage1') {
    // Проходим по всем игрокам
    for (let i = 0; i < this.players.length; i++) {
      if (i === this.currentPlayer) continue; // Пропускаем текущего игрока
      
      const player = this.players[i];
      
      // Проверяем все открытые карты игрока
      for (let j = 0; j < player.cards.length; j++) {
        const targetCard = player.cards[j];
        if (targetCard.faceUp) {
          const targetRank = cardValues.indexOf(targetCard.value);
          
          // Если нашли карту на 1 ранг ниже
          if (cardRank === targetRank + 1) {
            targets.push({
              playerId: player.userId,
              playerIndex: i,
              cardIndex: j,
              card: targetCard
            });
          }
        }
      }
    }
  }
  
  return targets;
};

module.exports = Game;