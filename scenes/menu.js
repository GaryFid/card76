const { Scenes, Markup } = require('telegraf');
const config = require('../config');

// Создаем сцену главного меню
const menuScene = new Scenes.BaseScene('menu');

// Обработчик входа в сцену
menuScene.enter(async (ctx) => {
  // Создаем кнопки меню
  const keyboard = [
    ['🎮 Начать игру', '🤖 Играть с ИИ'],
    ['🏆 Рейтинг', '📋 Правила']
  ];
  
  // Формируем ответное сообщение
  const message = 'Главное меню игры "Разгильдяй":';
  
  // Создаем клавиатуру с кнопками
  const markup = Markup.keyboard(keyboard).resize();
  
  // Отправляем сообщение с клавиатурой
  await ctx.reply(message, markup);
  
  // Добавляем кнопку мини-приложения
  const webAppUrl = `${config.appUrl}/webapp`;
  await ctx.reply(
    'Вы также можете воспользоваться нашим мини-приложением:',
    Markup.inlineKeyboard([
      Markup.button.webApp('🎲 Открыть игровое приложение', webAppUrl)
    ])
  );
});

// Обработчик нажатия кнопки "Начать игру"
menuScene.hears('🎮 Начать игру', (ctx) => {
  ctx.scene.enter('gameSetup');
});

// Обработчик нажатия кнопки "Играть с ИИ"
menuScene.hears('🤖 Играть с ИИ', (ctx) => {
  ctx.session.withAI = true;
  ctx.scene.enter('gameSetup');
});

// Обработчик нажатия кнопки "Рейтинг"
menuScene.hears('🏆 Рейтинг', (ctx) => {
  ctx.scene.enter('rating');
});

// Обработчик нажатия кнопки "Правила"
menuScene.hears('📋 Правила', (ctx) => {
  ctx.scene.enter('rules');
});

// Обработчик неизвестных команд или сообщений
menuScene.on('message', (ctx) => {
  ctx.reply('Пожалуйста, выберите одну из опций в меню.');
});

module.exports = { menuScene }; 