const { Scenes, Markup } = require('telegraf');
const User = require('../models/user');

// Создаем сцену рейтинга
const ratingScene = new Scenes.BaseScene('rating');

// Обработчик входа в сцену
ratingScene.enter(async (ctx) => {
  try {
    const topPlayers = await User.findAll({ order: [['rating', 'DESC']], limit: 10 });
    if (topPlayers.length === 0) {
      await ctx.reply('В игре еще нет игроков с рейтингом.', Markup.keyboard([['« Назад в меню']]).resize());
      return;
    }
    let message = '🏆 *Рейтинг лучших игроков:*\n\n';
    topPlayers.forEach((player, index) => {
      let playerName = player.username || 'Неизвестный игрок';
      message += `${index + 1}. ${playerName} - ${player.rating} очков\n`;
    });
    const currentUser = ctx.session.user ? await User.findByPk(ctx.session.user.id) : null;
    if (currentUser) {
      const userRank = await User.count({ where: { rating: { $gt: currentUser.rating } } }) + 1;
      message += `\n*Ваша позиция:* ${userRank} место (${currentUser.rating} очков)`;
    }
    await ctx.reply(message, { parse_mode: 'Markdown', ...Markup.keyboard([['« Назад в меню']]).resize() });
  } catch (error) {
    console.error('Ошибка при получении рейтинга:', error);
    await ctx.reply('Произошла ошибка при загрузке рейтинга.', Markup.keyboard([['« Назад в меню']]).resize());
  }
});

// Обработчик кнопки "Назад в меню"
ratingScene.hears('« Назад в меню', (ctx) => {
  ctx.scene.enter('menu');
});

// Обработчик неизвестных команд или сообщений
ratingScene.on('message', (ctx) => {
  ctx.reply('Используйте кнопку "Назад в меню" для возврата в главное меню.', Markup.keyboard([['« Назад в меню']]).resize());
});

module.exports = { ratingScene }; 