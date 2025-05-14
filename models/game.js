const { GAMES_FILE, readFromFile, writeToFile } = require('../config/database');
const User = require('./user');

class Game {
  constructor(data = {}) {
    this.id = data.id || Date.now().toString();
    this.status = data.status || 'waiting';
    this.players = data.players || [];
    this.deck = data.deck || [];
    this.discardPile = data.discardPile || [];
    this.currentTurn = data.currentTurn || 0;
    this.winnerId = data.winnerId || null;
    this.withAI = data.withAI || false;
    this.aiTestMode = data.aiTestMode || false;
    this.gameStage = data.gameStage || 'init';
    this.startedAt = data.startedAt || null;
    this.finishedAt = data.finishedAt || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Статические методы для работы с коллекцией игр
  
  // Получить все игры
  static async findAll() {
    return await readFromFile(GAMES_FILE);
  }

  // Найти игру по ID
  static async findById(id) {
    const games = await readFromFile(GAMES_FILE);
    const game = games.find(g => g.id === id);
    return game ? new Game(game) : null;
  }

  // Найти активные игры
  static async findActive() {
    const games = await readFromFile(GAMES_FILE);
    return games
      .filter(g => g.status === 'active')
      .map(game => new Game(game));
  }

  // Найти игры в ожидании
  static async findWaiting() {
    const games = await readFromFile(GAMES_FILE);
    return games
      .filter(g => g.status === 'waiting')
      .map(game => new Game(game));
  }

  // Создать новую игру
  static async create(gameData) {
    const games = await readFromFile(GAMES_FILE);
    const newGame = new Game(gameData);
    games.push(newGame);
    await writeToFile(GAMES_FILE, games);
    return newGame;
  }

  // Сохранить изменения игры
  async save() {
    const games = await readFromFile(GAMES_FILE);
    const index = games.findIndex(g => g.id === this.id);
    
    // Обновить временную метку
    this.updatedAt = new Date().toISOString();
    
    if (index !== -1) {
      games[index] = this;
    } else {
      games.push(this);
    }
    
    await writeToFile(GAMES_FILE, games);
    return this;
  }

  // Обновить данные игры
  async update(gameData) {
    Object.assign(this, gameData);
    return await this.save();
  }

  // Инициализация колоды
  initializeDeck() {
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
  }
  
  // Перемешать колоду
  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }
  
  // Раздать начальные карты игрокам
  dealInitialCards() {
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
  }

  // Начать игру
  async start() {
    this.status = 'active';
    this.startedAt = new Date().toISOString();
    
    // Инициализируем колоду и раздаем начальные карты
    this.initializeDeck();
    this.dealInitialCards();
    
    // Определяем первого игрока по старшей открытой карте
    this.determineFirstPlayer();
    
    return await this.save();
  }

  // Завершить игру
  async finish(winnerId) {
    this.status = 'finished';
    this.winnerId = winnerId;
    this.finishedAt = new Date().toISOString();
    
    // Обновляем статистику победителя
    if (winnerId) {
      const winner = await User.findById(winnerId);
      if (winner) {
        winner.gamesWon += 1;
        winner.rating += 10; // Добавляем рейтинг за победу
        await winner.save();
      }
      
      // Обновляем статистику всех игроков
      for (const player of this.players) {
        if (player.userId !== winnerId) {
          const user = await User.findById(player.userId);
          if (user) {
            user.rating = Math.max(0, user.rating - 3); // Уменьшаем рейтинг за поражение
            await user.save();
          }
        }
      }
    }
    
    return await this.save();
  }

  // Определить первого игрока по старшей открытой карте
  determineFirstPlayer() {
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
    this.currentTurn = highestCardPlayer;
    
    return highestCardPlayer;
  }

  // Проверка возможности сыграть карту на другую карту
  canPlayCard(card, targetCard) {
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
  }

  // Получить все доступные для игры карты на столе
  getAvailableTargets(card) {
    const targets = [];
    const cardValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const cardRank = cardValues.indexOf(card.value);
    
    // В первой стадии ищем карты на 1 ранг ниже
    if (this.gameStage === 'stage1') {
      // Проходим по всем игрокам
      for (let i = 0; i < this.players.length; i++) {
        if (i === this.currentTurn) continue; // Пропускаем текущего игрока
        
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
  }
}

module.exports = Game; 