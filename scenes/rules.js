const { Scenes } = require('telegraf');

// Создаем сцену с правилами
const rulesScene = new Scenes.BaseScene('rules');

rulesScene.enter(async (ctx) => {
    await ctx.reply(
        'Правила игры P.I.D.R.:\n\n' +
        '1. В игре участвуют от 4 до 9 игроков\n' +
        '2. Каждый игрок получает 3 карты\n' +
        '3. Цель игры - избавиться от всех карт\n' +
        '4. Игрок может сделать ход только если у него есть подходящая карта\n' +
        '5. Победитель получает очки рейтинга\n\n' +
        'Для возврата в меню нажмите кнопку "Назад"',
        {
            reply_markup: {
                keyboard: [['Назад']],
                resize_keyboard: true
            }
        }
    );
});

module.exports = { rulesScene }; 