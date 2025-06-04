// Конфигурация приложения
module.exports = {
  // Значения по умолчанию, если не указаны в .env
  botToken: process.env.BOT_TOKEN,
  botUsername: process.env.BOT_USERNAME,
  port: process.env.PORT || 10000,
  sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
  baseUrl: process.env.BASE_URL || 'http://localhost:10000',
  appUrl: process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000',
  
  // Режимы работы
  enableBot: process.env.ENABLE_BOT !== 'false',
  testMode: process.env.TEST_MODE === 'true' || !process.env.BOT_TOKEN,
  debug: process.env.DEBUG === 'true',
  
  // Настройки игры
  minPlayers: 4,
  maxPlayers: 9,
  initialCards: 3,
  
  // Настройки рейтинга
  ratingWinPoints: 10,
  ratingLossPoints: 3
}; 