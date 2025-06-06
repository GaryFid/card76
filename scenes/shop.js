const { Scenes } = require('telegraf');

// Создаем сцену магазина
const shopScene = new Scenes.BaseScene('shop');

shopScene.enter(async (ctx) => {
  await ctx.reply(
    'Магазин:\n\n' +
    '1. Аватар - 100 монет\n' +
    '2. Рамка - 200 монет\n' +
    '3. Эмодзи - 50 монет\n\n' +
    'Для возврата в меню нажмите кнопку "Назад"',
    {
      reply_markup: {
        keyboard: [['Назад']],
        resize_keyboard: true
      }
    }
  );
});

// Обработчик кнопки возврата в меню
shopScene.hears('⬅️ Назад в меню', (ctx) => {
  ctx.scene.enter('menu');
});

// Обработчик неизвестных команд
shopScene.on('message', (ctx) => {
  ctx.reply('Пожалуйста, используйте кнопки для навигации по магазину.');
});

module.exports = { shopScene }; 