/**
 * Утилиты для игры "Разгильдяй"
 */

// Константы
const SUITS = ['♠', '♥', '♦', '♣']; // Масти: пики, черви, бубны, трефы
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'В', 'Д', 'К', 'Т']; // Значения карт от 2 до туза

/**
 * Создает новую колоду карт
 * @returns {Array} - Колода карт
 */
function createDeck() {
  const deck = [];
  
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({
        suit,
        value,
        name: `${value}${suit}`
      });
    }
  }
  
  return deck;
}

/**
 * Перемешивает колоду карт
 * @param {Array} deck - Колода карт
 * @returns {Array} - Перемешанная колода
 */
function shuffleDeck(deck) {
  const newDeck = [...deck];
  
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  
  return newDeck;
}

/**
 * Раздает карты игрокам
 * @param {Array} deck - Колода карт
 * @param {Number} playerCount - Количество игроков
 * @returns {Object} - Объект с розданными картами игрокам и оставшейся колодой
 */
function dealCards(deck, playerCount) {
  const cardsPerPlayer = 3; // В начале игры каждый игрок получает 3 карты
  const players = Array(playerCount).fill().map(() => []);
  
  let currentDeck = [...deck];
  
  // Раздаем по одной карте каждому игроку по кругу
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let j = 0; j < playerCount; j++) {
      const card = currentDeck.pop();
      players[j].push(card);
    }
  }
  
  return {
    players,
    deck: currentDeck
  };
}

/**
 * Определяет, может ли игрок сделать ход
 * @param {Object} card - Карта, которую игрок хочет сыграть
 * @param {Object} topCard - Верхняя карта на столе
 * @param {String} stage - Текущая стадия игры ('stage1', 'stage2', и т.д.)
 * @param {Boolean} isSelfCard - Флаг, указывающий, кладёт ли игрок карту на свою карту
 * @returns {Boolean} - Можно ли сделать ход
 */
function canPlayCard(card, topCard, stage = 'stage1', isSelfCard = false) {
  if (!topCard) return true; // Если первый ход, можно ходить любой картой
  
  // Определяем ранг карт для сравнения
  const VALUES_RANK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'В', 'Д', 'К', 'Т'];
  
  // Правила игры "Разгильдяй" для стадии 1:
  if (stage === 'stage1') {
    const cardIndex = VALUES_RANK.indexOf(card.value);
    const topCardIndex = VALUES_RANK.indexOf(topCard.value);
    
    // Для карты "Туз" можно положить только "2"
    if (topCard.value === 'Т' && card.value === '2') {
      return true;
    }
    
    // Для остальных карт - только на 1 ранг выше
    if (cardIndex === (topCardIndex + 1) % VALUES_RANK.length) {
      return true;
    }
    
    return false;
  }
  
  // Для других стадий (или если стадия не указана) - стандартное правило
  return card.suit === topCard.suit || card.value === topCard.value;
}

/**
 * Ход AI (для игры с ботами)
 * @param {Array} hand - Карты в руке бота
 * @param {Object} topCard - Верхняя карта на столе
 * @param {String} stage - Текущая стадия игры
 * @returns {Object|null} - Карта для хода или null, если нет подходящих карт
 */
function aiMove(hand, topCard, stage = 'stage1') {
  if (!topCard) {
    // Если первый ход, бот ходит случайной картой
    return hand[Math.floor(Math.random() * hand.length)];
  }
  
  // Ищем карты, которыми можно походить с учетом правил текущей стадии
  const playableCards = hand.filter(card => canPlayCard(card, topCard, stage));
  
  if (playableCards.length === 0) return null; // Нет подходящих карт
  
  // Стратегия для ИИ в зависимости от стадии игры
  if (stage === 'stage1') {
    // В стадии 1 предпочитаем класть более высокие карты
    const VALUES_RANK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'В', 'Д', 'К', 'Т'];
    
    // Сортируем карты по рангу (от высшего к низшему)
    playableCards.sort((a, b) => {
      return VALUES_RANK.indexOf(b.value) - VALUES_RANK.indexOf(a.value);
    });
    
    // Выбираем карту с наивысшим рангом
    return playableCards[0];
  } else {
    // В других стадиях используем случайный выбор
    return playableCards[Math.floor(Math.random() * playableCards.length)];
  }
}

/**
 * Обновляет рейтинг игроков после игры
 * @param {Object} winner - Победитель
 * @param {Array} players - Все игроки
 * @returns {Array} - Обновленный список игроков с новыми рейтингами
 */
async function updateRatings(winner, players) {
  // Увеличиваем счетчики игр для всех игроков
  for (const player of players) {
    if (player.userId && !player.isBot) {
      player.userId.gamesPlayed += 1;
      
      // Для победителя увеличиваем счетчик побед и рейтинг
      if (winner && player.userId.equals(winner)) {
        player.userId.gamesWon += 1;
        player.userId.rating += 10; // +10 очков за победу
      } else {
        // Проигравшие теряют небольшое количество очков
        player.userId.rating = Math.max(0, player.userId.rating - 3); // -3 очка за проигрыш, но не меньше 0
      }
      
      await player.userId.save();
    }
  }
  
  return players;
}

module.exports = {
  SUITS,
  VALUES,
  createDeck,
  shuffleDeck,
  dealCards,
  canPlayCard,
  aiMove,
  updateRatings
};