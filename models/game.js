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
}

module.exports = Game; 