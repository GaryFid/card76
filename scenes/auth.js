const { Scenes, Markup } = require('telegraf');
const User = require('../models/user');

// Создаем сцену авторизации
const authScene = new Scenes.BaseScene('auth');

// Обработчик входа в сцену
authScene.enter(async (ctx) => {
  try {
    // Проверяем, зарегистрирован ли уже пользователь
    const telegramId = ctx.from.id;
    let user = await User.findOne({ 'telegram.id': telegramId });
    
    if (!user) {
      // Создаем нового пользователя напрямую через данные Telegram
      user = new User({
        telegram: {
          id: telegramId,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name
        }
      });
      await user.save();
    }
    
    // Пользователь авторизован через Telegram
    ctx.session.user = user;
    await ctx.reply(`Добро пожаловать, ${user.telegram.username || user.telegram.firstName || 'Игрок'}!`);
    return ctx.scene.enter('menu');
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    await ctx.reply('Произошла ошибка при авторизации. Пожалуйста, попробуйте снова.');
  }
});

module.exports = { authScene }; 