const { Scenes } = require('telegraf');
const User = require('../models/user');

// Создаем сцену авторизации
const authScene = new Scenes.BaseScene('auth');

// Обработчик входа в сцену
authScene.enter(async (ctx) => {
  await ctx.reply('Добро пожаловать в P.I.D.R.! Выберите действие:', {
    reply_markup: {
      keyboard: [
        ['Войти через Telegram'],
        ['Правила игры'],
        ['О игре']
      ],
      resize_keyboard: true
    }
  });
});

authScene.hears('Войти через Telegram', async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    let user = await User.findOne({ where: { telegramId } });
    // Если пользователь новый, пробуем получить аватар из Telegram
    if (!user) {
      let avatarUrl = '';
      // Попытка получить аватар через Telegram API
      if (ctx.from && ctx.from.username) {
        // Можно использовать https://t.me/i/userpic/320/{username}.jpg
        avatarUrl = `https://t.me/i/userpic/320/${ctx.from.username}.jpg`;
      }
      user = await User.create({
        telegramId,
        username: ctx.from.username,
        avatar: avatarUrl
      });
    } else if (!user.avatar && ctx.from && ctx.from.username) {
      // Если у пользователя нет аватара, но есть username — обновим
      const avatarUrl = `https://t.me/i/userpic/320/${ctx.from.username}.jpg`;
      user.avatar = avatarUrl;
      await user.save();
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