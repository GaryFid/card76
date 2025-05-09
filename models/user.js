const { USERS_FILE, readFromFile, writeToFile } = require('../config/database');

class User {
  constructor(data = {}) {
    this.id = data.id || Date.now().toString();
    this.telegramId = data.telegramId || null;
    this.username = data.username || null;
    this.firstName = data.firstName || null;
    this.lastName = data.lastName || null;
    this.rating = data.rating || 1000;
    this.gamesPlayed = data.gamesPlayed || 0;
    this.gamesWon = data.gamesWon || 0;
    this.authType = data.authType || 'basic'; // basic, telegram, google, guest
    this.lastActive = data.lastActive || new Date().toISOString();
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  // Получить информацию для отображения
  get displayName() {
    return this.username || this.firstName || 'Игрок';
  }

  // Статические методы для работы с коллекцией пользователей
  
  // Получить всех пользователей
  static async findAll() {
    return await readFromFile(USERS_FILE);
  }

  // Найти пользователя по ID
  static async findById(id) {
    const users = await readFromFile(USERS_FILE);
    const user = users.find(u => u.id === id);
    return user ? new User(user) : null;
  }

  // Найти пользователя по Telegram ID
  static async findByTelegramId(telegramId) {
    const users = await readFromFile(USERS_FILE);
    const user = users.find(u => u.telegramId === telegramId);
    return user ? new User(user) : null;
  }

  // Найти пользователя по имени пользователя
  static async findByUsername(username) {
    const users = await readFromFile(USERS_FILE);
    const user = users.find(u => u.username === username);
    return user ? new User(user) : null;
  }

  // Создать нового пользователя
  static async create(userData) {
    const users = await readFromFile(USERS_FILE);
    const newUser = new User(userData);
    users.push(newUser);
    await writeToFile(USERS_FILE, users);
    return newUser;
  }

  // Сохранить изменения пользователя
  async save() {
    const users = await readFromFile(USERS_FILE);
    const index = users.findIndex(u => u.id === this.id);
    
    if (index !== -1) {
      users[index] = this;
    } else {
      users.push(this);
    }
    
    await writeToFile(USERS_FILE, users);
    return this;
  }

  // Обновить данные пользователя
  async update(userData) {
    Object.assign(this, userData);
    return await this.save();
  }

  // Найти топ игроков по рейтингу
  static async findTopByRating(limit = 10) {
    const users = await readFromFile(USERS_FILE);
    return users
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
      .map(user => new User(user));
  }
}

module.exports = User; 