const { Scenes, Markup } = require('telegraf');
const User = require('../models/user');

// Создаем сцену рейтинга
const ratingScene = new Scenes.BaseScene('rating');

// Обработчик входа в сцену
ratingScene.enter(async (ctx) => {
  try {
    // Получаем топ-10 игроков по рейтингу
    const topPlayers = await User.find({
      gamesPlayed: { $gt: 0 }
    })
    .sort({ rating: -1 })
    .limit(10);
    
    if (topPlayers.length === 0) {
      await ctx.reply(
        'В игре еще нет игроков с рейтингом.',
        Markup.keyboard([['« Назад в меню']]).resize()
      );
      return;
    }
    
    // Формируем сообщение с рейтингом
    let message = '🏆 *Рейтинг лучших игроков:*\n\n';
    
    topPlayers.forEach((player, index) => {
      let playerName = 'Неизвестный игрок';
      
      if (player.telegram && player.telegram.username) {
        playerName = player.telegram.username;
      } else if (player.google && player.google.name) {
        playerName = player.google.name;
      } else if (player.yandex && player.yandex.name) {
        playerName = player.yandex.name;
      }
      
      message += `${index + 1}. ${playerName} - ${player.rating} очков (игр: ${player.gamesPlayed}, побед: ${player.gamesWon})\n`;
    });
    
    // Находим позицию текущего пользователя в рейтинге
    const currentUser = await User.findById(ctx.session.user._id);
    
    if (currentUser && currentUser.gamesPlayed > 0) {
      const userRank = await User.countDocuments({
        rating: { $gt: currentUser.rating },
        gamesPlayed: { $gt: 0 }
      }) + 1;
      
      message += `\n*Ваша позиция:* ${userRank} место (${currentUser.rating} очков)`;
    }
    
    await ctx.reply(
      message,
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([['« Назад в меню']]).resize()
      }
    );
  } catch (error) {
    console.error('Ошибка при получении рейтинга:', error);
    await ctx.reply(
      'Произошла ошибка при загрузке рейтинга.',
      Markup.keyboard([['« Назад в меню']]).resize()
    );
  }
});

// Обработчик кнопки "Назад в меню"
ratingScene.hears('« Назад в меню', (ctx) => {
  ctx.scene.enter('menu');
});

// Обработчик неизвестных команд или сообщений
ratingScene.on('message', (ctx) => {
  ctx.reply(
    'Используйте кнопку "Назад в меню" для возврата в главное меню.',
    Markup.keyboard([['« Назад в меню']]).resize()
  );
});

module.exports = { ratingScene }; 