const { Scenes, Markup } = require('telegraf');

// Создаем сцену магазина
const shopScene = new Scenes.BaseScene('shop');

shopScene.enter(async (ctx) => {
  await ctx.reply(
    'Добро пожаловать в магазин! Здесь вы можете приобрести различные товары для игры.\n\nВ будущем здесь появится красивый интерфейс и выбор товаров.',
    Markup.keyboard([
      ['⬅️ Назад в меню']
    ]).resize()
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