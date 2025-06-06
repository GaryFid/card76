const { Scenes } = require('telegraf');

const ratingScene = new Scenes.BaseScene('rating');

ratingScene.enter(async (ctx) => {
    await ctx.reply(
        'Рейтинг игроков:\n\n' +
        '1. Player1 - 1000 очков\n' +
        '2. Player2 - 800 очков\n' +
        '3. Player3 - 600 очков\n\n' +
        'Для возврата в меню нажмите кнопку "Назад"',
        {
            reply_markup: {
                keyboard: [['Назад']],
                resize_keyboard: true
            }
        }
    );
});

module.exports = { ratingScene }; 