const { Scenes } = require('telegraf');

const menuScene = new Scenes.BaseScene('menu');

menuScene.enter(async (ctx) => {
    await ctx.reply('Главное меню:', {
        reply_markup: {
            keyboard: [
                ['Начать игру', 'Рейтинг'],
                ['Правила', 'Магазин'],
                ['Выйти']
            ],
            resize_keyboard: true
        }
    });
});

module.exports = { menuScene }; 