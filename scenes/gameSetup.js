const { Scenes, Markup } = require('telegraf');
const Game = require('../models/game');
const { createDeck, shuffleDeck, dealCards } = require('../utils/gameUtils');

// Создаем сцену настройки игры
const gameSetupScene = new Scenes.BaseScene('gameSetup');

// Обработчик входа в сцену
gameSetupScene.enter(async (ctx) => {
  // Если выбрана игра с ИИ
  if (ctx.session.withAI) {
    await ctx.reply(
      'Выберите количество игроков (включая вас):',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('4', 'players_4'),
          Markup.button.callback('5', 'players_5'),
          Markup.button.callback('6', 'players_6')
        ],
        [
          Markup.button.callback('7', 'players_7'),
          Markup.button.callback('8', 'players_8'),
          Markup.button.callback('9', 'players_9')
        ],
        [Markup.button.callback('Отмена', 'cancel')]
      ])
    );
  } else {
    // Создаем новую игру для игры с реальными игроками
    try {
      const game = new Game({
        players: [{
          userId: ctx.session.user._id,
          cards: [],
          score: 0,
          isBot: false
        }],
        status: 'waiting'
      });
      
      await game.save();
      
      ctx.session.gameId = game._id;
      
      await ctx.reply(
        'Игра создана!\n\n' +
        'Поделитесь ссылкой с друзьями, чтобы они могли присоединиться к игре:\n' +
        `https://t.me/${ctx.botInfo.username}?start=join_${game._id}\n\n` +
        'Когда будете готовы начать игру, нажмите кнопку "Начать игру"',
        Markup.inlineKeyboard([
          [Markup.button.callback('Начать игру', 'start_game')],
          [Markup.button.callback('Отмена', 'cancel')]
        ])
      );
    } catch (error) {
      console.error('Ошибка создания игры:', error);
      await ctx.reply('Произошла ошибка при создании игры. Попробуйте еще раз.');
      return ctx.scene.enter('menu');
    }
  }
});

// Обработчики выбора количества игроков для игры с ИИ
for (let i = 4; i <= 9; i++) {
  gameSetupScene.action(`players_${i}`, async (ctx) => {
    try {
      const playerCount = i;
      
      // Создаем новую игру
      const game = new Game({
        players: [{
          userId: ctx.session.user._id,
          cards: [],
          score: 0,
          isBot: false
        }],
        status: 'active'
      });
      
      // Добавляем ботов
      for (let j = 1; j < playerCount; j++) {
        game.players.push({
          cards: [],
          score: 0,
          isBot: true
        });
      }
      
      // Создаем и перемешиваем колоду
      const deck = shuffleDeck(createDeck());
      
      // Раздаем карты
      const { players: dealtCards, deck: remainingDeck } = dealCards(deck, playerCount);
      
      // Обновляем игру с розданными картами
      for (let j = 0; j < playerCount; j++) {
        game.players[j].cards = dealtCards[j];
      }
      
      game.deck = remainingDeck;
      game.discardPile = [remainingDeck.pop()]; // Первая карта открывается
      
      await game.save();
      
      ctx.session.gameId = game._id;
      await ctx.answerCbQuery(`Начинаем игру с ${playerCount} игроками!`);
      
      return ctx.scene.enter('game');
    } catch (error) {
      console.error('Ошибка создания игры с ИИ:', error);
      await ctx.reply('Произошла ошибка при создании игры. Попробуйте еще раз.');
      return ctx.scene.enter('menu');
    }
  });
}

// Обработчик начала игры с реальными игроками
gameSetupScene.action('start_game', async (ctx) => {
  try {
    const game = await Game.findById(ctx.session.gameId);
    
    if (!game) {
      await ctx.reply('Игра не найдена. Пожалуйста, создайте новую игру.');
      return ctx.scene.enter('menu');
    }
    
    const playerCount = game.players.length;
    
    if (playerCount < 4) {
      return ctx.answerCbQuery('Для начала игры необходимо минимум 4 игрока.');
    }
    
    // Создаем и перемешиваем колоду
    const deck = shuffleDeck(createDeck());
    
    // Раздаем карты
    const { players: dealtCards, deck: remainingDeck } = dealCards(deck, playerCount);
    
    // Обновляем игру с розданными картами
    for (let j = 0; j < playerCount; j++) {
      game.players[j].cards = dealtCards[j];
    }
    
    game.deck = remainingDeck;
    game.discardPile = [remainingDeck.pop()]; // Первая карта открывается
    game.status = 'active';
    
    await game.save();
    
    await ctx.answerCbQuery('Игра началась!');
    return ctx.scene.enter('game');
  } catch (error) {
    console.error('Ошибка начала игры:', error);
    await ctx.reply('Произошла ошибка при начале игры. Попробуйте еще раз.');
    return ctx.scene.enter('menu');
  }
});

// Обработчик отмены
gameSetupScene.action('cancel', async (ctx) => {
  // Если игра была создана, удаляем ее
  if (ctx.session.gameId) {
    try {
      await Game.findByIdAndDelete(ctx.session.gameId);
    } catch (error) {
      console.error('Ошибка удаления игры:', error);
    }
    
    delete ctx.session.gameId;
  }
  
  if (ctx.session.withAI) {
    delete ctx.session.withAI;
  }
  
  await ctx.answerCbQuery('Создание игры отменено');
  return ctx.scene.enter('menu');
});

// Обработчик команды /start с параметром для присоединения к игре
gameSetupScene.command(/^start join_(.+)$/, async (ctx) => {
  const gameId = ctx.match[1];
  
  try {
    const game = await Game.findById(gameId);
    
    if (!game) {
      await ctx.reply('Игра не найдена. Возможно, она уже закончилась или была отменена.');
      return ctx.scene.enter('menu');
    }
    
    if (game.status !== 'waiting') {
      await ctx.reply('Игра уже началась или закончилась.');
      return ctx.scene.enter('menu');
    }
    
    // Проверяем, не присоединился ли игрок уже
    const isPlayerInGame = game.players.some(player => 
      player.userId && player.userId.equals(ctx.session.user._id)
    );
    
    if (isPlayerInGame) {
      await ctx.reply('Вы уже присоединились к этой игре.');
      ctx.session.gameId = game._id;
      return;
    }
    
    // Добавляем игрока
    game.players.push({
      userId: ctx.session.user._id,
      cards: [],
      score: 0,
      isBot: false
    });
    
    await game.save();
    
    ctx.session.gameId = game._id;
    
    await ctx.reply('Вы успешно присоединились к игре! Ожидайте, пока создатель игры начнет игру.');
  } catch (error) {
    console.error('Ошибка присоединения к игре:', error);
    await ctx.reply('Произошла ошибка при присоединении к игре. Попробуйте еще раз.');
    return ctx.scene.enter('menu');
  }
});

// Обработчик неизвестных команд или сообщений
gameSetupScene.on('message', (ctx) => {
  ctx.reply('Пожалуйста, выберите опцию с помощью кнопок.');
});

module.exports = { gameSetupScene }; 