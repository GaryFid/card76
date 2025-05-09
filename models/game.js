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

  // Начать игру
  async start() {
    this.status = 'active';
    this.startedAt = new Date().toISOString();
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