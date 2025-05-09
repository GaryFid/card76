const { Scenes, Markup } = require('telegraf');
const Game = require('../models/game');
const { canPlayCard, aiMove, updateRatings } = require('../utils/gameUtils');

// Создаем сцену игры
const gameScene = new Scenes.BaseScene('game');

// Функция для отображения карт в руке игрока
function renderPlayerCards(cards) {
  if (!cards || cards.length === 0) return 'У вас нет карт';
  
  return cards.map((card, index) => `${index + 1}. ${card.name}`).join('\n');
}

// Функция для отображения текущего состояния игры
async function renderGameState(ctx) {
  try {
    const game = await Game.findById(ctx.session.gameId)
      .populate('players.userId', 'telegram.username google.name yandex.name');
    
    if (!game) {
      await ctx.reply('Игра не найдена. Возвращаем вас в главное меню.');
      return ctx.scene.enter('menu');
    }
    
    // Определяем текущую карту на столе
    const topCard = game.discardPile.length > 0 ? game.discardPile[game.discardPile.length - 1] : null;
    
    // Определяем текущего игрока
    const currentPlayerIndex = game.currentPlayer;
    const currentPlayer = game.players[currentPlayerIndex];
    
    // Определяем имя текущего игрока
    let currentPlayerName = 'Неизвестный игрок';
    
    if (currentPlayer.isBot) {
      currentPlayerName = `Бот ${currentPlayerIndex + 1}`;
    } else if (currentPlayer.userId) {
      if (currentPlayer.userId.telegram && currentPlayer.userId.telegram.username) {
        currentPlayerName = currentPlayer.userId.telegram.username;
      } else if (currentPlayer.userId.google && currentPlayer.userId.google.name) {
        currentPlayerName = currentPlayer.userId.google.name;
      } else if (currentPlayer.userId.yandex && currentPlayer.userId.yandex.name) {
        currentPlayerName = currentPlayer.userId.yandex.name;
      }
    }
    
    // Находим индекс текущего пользователя
    const userIndex = game.players.findIndex(player => 
      player.userId && player.userId._id.equals(ctx.session.user._id)
    );
    
    if (userIndex === -1) {
      await ctx.reply('Вы не участвуете в этой игре. Возвращаем вас в главное меню.');
      return ctx.scene.enter('menu');
    }
    
    const userCards = game.players[userIndex].cards;
    
    // Формируем текст состояния игры
    let gameStateText = `🎮 *Игра "Разгильдяй"*\n\n`;
    
    // Информация о количестве карт у игроков
    gameStateText += '*Игроки и их карты:*\n';
    game.players.forEach((player, index) => {
      let playerName = 'Неизвестный игрок';
      
      if (player.isBot) {
        playerName = `Бот ${index + 1}`;
      } else if (player.userId) {
        if (player.userId.telegram && player.userId.telegram.username) {
          playerName = player.userId.telegram.username;
        } else if (player.userId.google && player.userId.google.name) {
          playerName = player.userId.google.name;
        } else if (player.userId.yandex && player.userId.yandex.name) {
          playerName = player.userId.yandex.name;
        }
      }
      
      const isCurrentPlayer = index === currentPlayerIndex;
      const cardCount = player.cards.length;
      
      gameStateText += `${isCurrentPlayer ? '👉 ' : ''}${playerName}: ${cardCount} карт${isCurrentPlayer ? ' (ходит)' : ''}\n`;
    });
    
    // Информация о верхней карте
    gameStateText += `\n*Текущая карта:* ${topCard ? topCard.name : 'Нет карт'}\n`;
    
    // Количество карт в колоде
    gameStateText += `*Карт в колоде:* ${game.deck.length}\n\n`;
    
    // Если ход текущего пользователя
    const isUserTurn = userIndex === currentPlayerIndex;
    
    if (isUserTurn) {
      gameStateText += '*Ваш ход!*\n\n';
    } else {
      gameStateText += `*Ход игрока:* ${currentPlayerName}\n\n`;
    }
    
    // Отображаем карты пользователя
    gameStateText += '*Ваши карты:*\n';
    gameStateText += renderPlayerCards(userCards);
    
    // Отправляем сообщение с игровым состоянием
    let replyMarkup;
    
    if (isUserTurn) {
      // Создаем кнопки для выбора карты
      const cardButtons = userCards.map((card, index) => 
        Markup.button.callback(card.name, `play_${index}`)
      );
      
      // Разбиваем кнопки на ряды по 3 кнопки
      const buttonRows = [];
      for (let i = 0; i < cardButtons.length; i += 3) {
        buttonRows.push(cardButtons.slice(i, i + 3));
      }
      
      // Добавляем кнопку "Взять карту"
      buttonRows.push([Markup.button.callback('Взять карту', 'draw_card')]);
      
      replyMarkup = Markup.inlineKeyboard(buttonRows);
    } else {
      replyMarkup = Markup.inlineKeyboard([
        [Markup.button.callback('Обновить', 'refresh_game')]
      ]);
    }
    
    await ctx.reply(gameStateText, {
      parse_mode: 'Markdown',
      ...replyMarkup
    });
    
    // Если ход бота, автоматически делаем ход
    if (currentPlayer.isBot) {
      setTimeout(async () => {
        await makeBotMove(ctx, game, currentPlayerIndex);
      }, 2000); // Небольшая задержка перед ходом бота для реалистичности
    }
    
    return game;
  } catch (error) {
    console.error('Ошибка отображения состояния игры:', error);
    await ctx.reply('Произошла ошибка при отображении состояния игры. Попробуйте обновить или вернуться в меню.');
  }
}

// Функция для хода бота
async function makeBotMove(ctx, game, botIndex) {
  try {
    const bot = game.players[botIndex];
    const topCard = game.discardPile.length > 0 ? game.discardPile[game.discardPile.length - 1] : null;
    
    // Ищем карту для хода
    const botCard = aiMove(bot.cards, topCard);
    
    if (botCard) {
      // Бот может сделать ход
      const cardIndex = bot.cards.findIndex(card => card.suit === botCard.suit && card.value === botCard.value);
      
      // Удаляем карту из руки бота
      const playedCard = bot.cards.splice(cardIndex, 1)[0];
      
      // Добавляем карту в сброс
      game.discardPile.push(playedCard);
      
      // Проверяем, закончились ли карты
      if (bot.cards.length === 0) {
        // Бот выиграл
        game.status = 'finished';
        game.winner = null; // У бота нет userId
        
        await game.save();
        
        await ctx.reply(`Бот ${botIndex + 1} выиграл игру!`);
        setTimeout(() => ctx.scene.enter('menu'), 3000);
        return;
      }
    } else {
      // Бот не может сделать ход, берет карту
      if (game.deck.length === 0) {
        // Перемешиваем сброс, если колода закончилась
        if (game.discardPile.length > 1) {
          const topCard = game.discardPile.pop();
          game.deck = shuffleDeck(game.discardPile);
          game.discardPile = [topCard];
        }
      }
      
      if (game.deck.length > 0) {
        // Берем карту из колоды
        const newCard = game.deck.pop();
        bot.cards.push(newCard);
      }
    }
    
    // Переход хода к следующему игроку
    game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
    
    await game.save();
    
    // Обновляем состояние игры
    await renderGameState(ctx);
  } catch (error) {
    console.error('Ошибка хода бота:', error);
  }
}

// Обработчик входа в сцену
gameScene.enter(async (ctx) => {
  await renderGameState(ctx);
});

// Обработчик кнопки "Обновить"
gameScene.action('refresh_game', async (ctx) => {
  await ctx.answerCbQuery('Обновляем игру...');
  await renderGameState(ctx);
});

// Обработчик кнопки "Взять карту"
gameScene.action('draw_card', async (ctx) => {
  try {
    await ctx.answerCbQuery('Берем карту...');
    
    const game = await Game.findById(ctx.session.gameId);
    
    if (!game) {
      await ctx.reply('Игра не найдена. Возвращаем вас в главное меню.');
      return ctx.scene.enter('menu');
    }
    
    // Проверяем, что сейчас ход пользователя
    const userIndex = game.players.findIndex(player => 
      player.userId && player.userId.equals(ctx.session.user._id)
    );
    
    if (userIndex === -1 || game.currentPlayer !== userIndex) {
      return ctx.answerCbQuery('Сейчас не ваш ход!');
    }
    
    // Проверяем, есть ли карты в колоде
    if (game.deck.length === 0) {
      // Перемешиваем сброс, если колода закончилась
      if (game.discardPile.length > 1) {
        const topCard = game.discardPile.pop();
        game.deck = shuffleDeck(game.discardPile);
        game.discardPile = [topCard];
      } else {
        return ctx.answerCbQuery('В колоде больше нет карт!');
      }
    }
    
    // Берем карту из колоды
    const newCard = game.deck.pop();
    game.players[userIndex].cards.push(newCard);
    
    // Переход хода к следующему игроку
    game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
    
    await game.save();
    
    await ctx.reply(`Вы взяли карту: ${newCard.name}`);
    
    // Обновляем состояние игры
    await renderGameState(ctx);
  } catch (error) {
    console.error('Ошибка при взятии карты:', error);
    await ctx.reply('Произошла ошибка при взятии карты. Попробуйте еще раз.');
  }
});

// Обработчик выбора карты для хода
gameScene.action(/^play_(\d+)$/, async (ctx) => {
  try {
    const cardIndex = parseInt(ctx.match[1]);
    
    const game = await Game.findById(ctx.session.gameId);
    
    if (!game) {
      await ctx.reply('Игра не найдена. Возвращаем вас в главное меню.');
      return ctx.scene.enter('menu');
    }
    
    // Проверяем, что сейчас ход пользователя
    const userIndex = game.players.findIndex(player => 
      player.userId && player.userId.equals(ctx.session.user._id)
    );
    
    if (userIndex === -1 || game.currentPlayer !== userIndex) {
      return ctx.answerCbQuery('Сейчас не ваш ход!');
    }
    
    // Получаем карту, которую хочет сыграть пользователь
    const userCards = game.players[userIndex].cards;
    
    if (cardIndex < 0 || cardIndex >= userCards.length) {
      return ctx.answerCbQuery('Неверный индекс карты!');
    }
    
    const selectedCard = userCards[cardIndex];
    const topCard = game.discardPile.length > 0 ? game.discardPile[game.discardPile.length - 1] : null;
    
    // Проверяем, можно ли сыграть этой картой
    if (!canPlayCard(selectedCard, topCard)) {
      return ctx.answerCbQuery('Этой картой нельзя ходить! Выберите другую карту или возьмите карту из колоды.');
    }
    
    // Удаляем карту из руки игрока
    const playedCard = userCards.splice(cardIndex, 1)[0];
    
    // Добавляем карту в сброс
    game.discardPile.push(playedCard);
    
    await ctx.answerCbQuery(`Вы сыграли карту: ${playedCard.name}`);
    
    // Проверяем, закончились ли карты у игрока
    if (userCards.length === 0) {
      // Игрок выиграл
      game.status = 'finished';
      game.winner = ctx.session.user._id;
      
      await game.save();
      
      // Обновляем рейтинги
      await updateRatings(ctx.session.user._id, game.players);
      
      await ctx.reply('Поздравляем! Вы выиграли игру! 🎉');
      setTimeout(() => ctx.scene.enter('menu'), 3000);
      return;
    }
    
    // Переход хода к следующему игроку
    game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
    
    await game.save();
    
    // Обновляем состояние игры
    await renderGameState(ctx);
  } catch (error) {
    console.error('Ошибка при ходе картой:', error);
    await ctx.reply('Произошла ошибка при ходе картой. Попробуйте еще раз.');
  }
});

// Обработчик команды выхода из игры
gameScene.command('exit', async (ctx) => {
  try {
    // Находим и обновляем игру
    const game = await Game.findById(ctx.session.gameId);
    
    if (game) {
      // Проверяем, не закончена ли уже игра
      if (game.status === 'active') {
        game.status = 'finished';
        await game.save();
      }
    }
    
    await ctx.reply('Вы вышли из игры. Возвращаем вас в главное меню.');
    return ctx.scene.enter('menu');
  } catch (error) {
    console.error('Ошибка при выходе из игры:', error);
    await ctx.reply('Произошла ошибка при выходе из игры. Возвращаем вас в главное меню.');
    return ctx.scene.enter('menu');
  }
});

module.exports = { gameScene }; 