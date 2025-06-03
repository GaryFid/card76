const { Scenes, Markup } = require('telegraf');
const User = require('../models/user');

// Создаем сцену авторизации
const authScene = new Scenes.BaseScene('auth');

// Обработчик входа в сцену
authScene.enter(async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    let user = await User.findOne({ where: { telegramId } });
    if (!user) {
      user = await User.create({
        telegramId,
        username: ctx.from.username
      });
    }
    ctx.session.user = user;
    await ctx.reply(`Добро пожаловать, ${user.username || 'Игрок'}!`);
    return ctx.scene.enter('menu');
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    await ctx.reply('Произошла ошибка при авторизации. Пожалуйста, попробуйте снова.');
  }
});

module.exports = { authScene }; 