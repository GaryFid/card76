const { Scenes, Markup } = require('telegraf');
const User = require('../models/user');

// Создаем сцену авторизации
const authScene = new Scenes.BaseScene('auth');

// Обработчик входа в сцену
authScene.enter(async (ctx) => {
  try {
    await ctx.reply(
      'Добро пожаловать!\nВыберите способ входа или регистрации:',
      Markup.keyboard([
        ['Войти через Telegram'],
        ['Зарегистрироваться'],
        ['Войти по паролю']
      ]).resize()
    );
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    await ctx.reply('Произошла ошибка при авторизации. Пожалуйста, попробуйте снова.');
  }
});

authScene.hears('Войти через Telegram', async (ctx) => {
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
    await ctx.reply(`Вход выполнен! Добро пожаловать, ${user.username || 'Игрок'}!`);
    return ctx.scene.enter('menu');
  } catch (error) {
    console.error('Ошибка входа через Telegram:', error);
    await ctx.reply('Ошибка входа через Telegram. Попробуйте снова.');
  }
});

authScene.hears('Зарегистрироваться', async (ctx) => {
  await ctx.reply('Пожалуйста, перейдите на сайт и заполните форму регистрации.');
});

authScene.hears('Войти по паролю', async (ctx) => {
  await ctx.reply('Пожалуйста, перейдите на сайт и выполните вход по логину и паролю.');
});

module.exports = { authScene }; 