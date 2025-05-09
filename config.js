// Конфигурация приложения
module.exports = {
  // Значения по умолчанию, если не указаны в .env
  botToken: process.env.BOT_TOKEN || 'ВАШ_ТОКЕН_БОТА',
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/razgilday',
  sessionSecret: process.env.SESSION_SECRET || 'секретный_ключ_для_сессий',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  appUrl: process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000',
  
  // Режимы работы
  useMongoDB: process.env.USE_MONGODB !== 'false',
  enableBot: process.env.ENABLE_BOT !== 'false',
  testMode: process.env.TEST_MODE === 'true' || !process.env.BOT_TOKEN,
  
  // Настройки игры
  minPlayers: 4,
  maxPlayers: 9,
  initialCards: 4,
  
  // Настройки рейтинга
  ratingWinPoints: 10,
  ratingLossPoints: 3
}; 