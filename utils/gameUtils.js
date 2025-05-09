/**
 * Утилиты для игры "Разгильдяй"
 */

// Константы
const SUITS = ['♠', '♥', '♦', '♣']; // Масти: пики, черви, бубны, трефы
const VALUES = ['6', '7', '8', '9', '10', 'В', 'Д', 'К', 'Т']; // Значения карт

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
  const cardsPerPlayer = 4; // В начале игры каждый игрок получает 4 карты
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
 * @returns {Boolean} - Можно ли сделать ход
 */
function canPlayCard(card, topCard) {
  if (!topCard) return true; // Если первый ход, можно ходить любой картой
  
  // Правила игры "Разгильдяй": можно ходить картой того же номинала или той же масти
  return card.suit === topCard.suit || card.value === topCard.value;
}

/**
 * Ход AI (для игры с ботами)
 * @param {Array} hand - Карты в руке бота
 * @param {Object} topCard - Верхняя карта на столе
 * @returns {Object|null} - Карта для хода или null, если нет подходящих карт
 */
function aiMove(hand, topCard) {
  if (!topCard) {
    // Если первый ход, бот ходит случайной картой
    return hand[Math.floor(Math.random() * hand.length)];
  }
  
  // Ищем карты, которыми можно походить
  const playableCards = hand.filter(card => canPlayCard(card, topCard));
  
  if (playableCards.length === 0) return null; // Нет подходящих карт
  
  // Простая стратегия: выбираем случайную карту из доступных
  return playableCards[Math.floor(Math.random() * playableCards.length)];
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