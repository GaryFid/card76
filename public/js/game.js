document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Telegram WebApp
    const tgApp = window.Telegram.WebApp;
    tgApp.expand();
    
    // Настройка основного цвета из Telegram
    document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');
    
    // Проверка авторизации
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '/register';
        return;
    }
    
    // Получение настроек игры
    const gameSettings = JSON.parse(localStorage.getItem('gameSettings') || '{"playerCount": 4, "withAI": false}');
    
    // Глобальные переменные для игры
    let game = null;
    let currentPlayerIndex = 0;
    let isMyTurn = false;
    
    // Порядок карт от наименьшей к наибольшей
    const cardValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    // Получение элементов DOM
    const playersContainer = document.querySelector('.players-container');
    const deckElement = document.querySelector('.card-pile.deck');
    const discardElement = document.querySelector('.card-pile.discard');
    const playerHandElement = document.querySelector('.player-hand');
    const playerNameElement = document.querySelector('.current-player-info .player-name');
    const playerIndicatorElement = document.querySelector('.player-indicator');
    const drawCardButton = document.getElementById('draw-card');
    const playCardButton = document.getElementById('play-card');
    const passTurnButton = document.getElementById('pass-turn');
    const settingsButton = document.getElementById('open-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.querySelector('.close-btn');
    const leaveGameButton = document.getElementById('leave-game');
    const stageNumberElement = document.querySelector('.stage-number');
    const stageDescriptionElement = document.querySelector('.stage-description');
    
    // Шаблоны для создания элементов
    const playerTemplate = document.getElementById('player-template');
    const cardTemplate = document.getElementById('card-template');
    
    // Инициализация игры
    function initGame() {
        console.log('Инициализация новой игры...');
        
        // Очищаем предыдущую игру, если она была
        if (game) {
            console.log('Очистка предыдущей игры');
        }
        
        // Создание новой игры
        game = {
            players: [
                { name: 'Вы', cards: [], isAI: false },
                { name: 'Бот 1', cards: [], isAI: true },
                { name: 'Бот 2', cards: [], isAI: true },
                { name: 'Бот 3', cards: [], isAI: true }
            ],
            deck: [],
            discardPile: [],
            gameStage: 'stage1'
        };
        
        // Создаем колоду
        game.deck = createDeck();
        
        // Перемешиваем колоду
        shuffleDeck(game.deck);
        
        // Раздаем карты игрокам
        dealInitialCards();
        
        // Определяем игрока с самой высокой открытой картой для первого хода
        const firstPlayerIndex = determineFirstPlayer();
        
        // Отображаем игровое поле
        renderPlayers();
        renderPlayerHand();
        updateDeckInfo();
        
        // Обновляем информацию о стадии игры
        stageNumberElement.textContent = 'Стадия 1';
        stageDescriptionElement.textContent = 'Выкладка карт на 1 ранг выше';
        
        // Начинаем с игрока с самой высокой картой
        setCurrentPlayer(firstPlayerIndex);
        
        console.log('Игра успешно инициализирована');
    }
    
    // Инициализация колоды
    function initializeDeck() {
        // Масти карт: черви, бубны, крести, пики
        const suits = ['♥', '♦', '♣', '♠'];
        // Значения карт
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        // Создаем колоду
        game.deck = [];
        
        // Заполняем колоду картами
        for (const suit of suits) {
            for (const value of values) {
                game.deck.push({
                    id: `${value}-${suit}`,
                    value: value,
                    suit: suit,
                    isRed: suit === '♥' || suit === '♦',
                    faceUp: false
                });
            }
        }
        
        // Перемешиваем колоду
        shuffleDeck();
    }
    
    // Перемешать колоду
    function shuffleDeck() {
        for (let i = game.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [game.deck[i], game.deck[j]] = [game.deck[j], game.deck[i]];
        }
    }
    
    // Раздать начальные карты игрокам
    function dealInitialCards() {
        // Раздаем каждому игроку по 2 закрытые карты и 1 открытую
        for (let player of game.players) {
            // Раздаем 2 закрытые карты
            for (let i = 0; i < 2; i++) {
                const card = game.deck.pop();
                card.faceUp = false;
                player.cards.push(card);
            }
            
            // Раздаем 1 открытую карту
            const openCard = game.deck.pop();
            openCard.faceUp = true;
            player.cards.push(openCard);
        }
    }
    
    // Определение игрока с самой высокой открытой картой
    function determineFirstPlayer() {
        let highestCardValue = -1;
        let highestCardPlayer = 0;
        
        // Проходим по всем игрокам и ищем самую высокую открытую карту
        game.players.forEach((player, playerIndex) => {
            // Ищем открытую карту у игрока (должна быть последней розданной)
            const openCard = player.cards.find(card => card.faceUp);
            
            if (openCard) {
                // Получаем ранг карты
                const cardRank = cardValues.indexOf(openCard.value);
                
                // Если карта старше предыдущей найденной, обновляем данные
                if (cardRank > highestCardValue) {
                    highestCardValue = cardRank;
                    highestCardPlayer = playerIndex;
                }
            }
        });
        
        console.log(`Первый ход у игрока ${highestCardPlayer} с самой высокой картой ранга ${highestCardValue}`);
        return highestCardPlayer;
    }
    
    // Отрисовка игроков и их карт
    function renderPlayers() {
        const playersContainer = document.querySelector('.players-container');
        playersContainer.innerHTML = '';
        
        // Отображаем каждого игрока
        game.players.forEach((player, playerIndex) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player';
            
            // Добавляем класс текущего игрока, если это его ход
            if (playerIndex === currentPlayerIndex) {
                playerElement.classList.add('current-player');
            }
            
            // Добавляем класс для отличия ИИ и реального игрока
            if (player.isAI) {
                playerElement.classList.add('ai-player');
            } else {
                playerElement.classList.add('human-player');
            }
            
            // Создаем заголовок с именем игрока
            const playerHeader = document.createElement('div');
            playerHeader.className = 'player-header';
            
            const playerName = document.createElement('div');
            playerName.className = 'player-name';
            playerName.textContent = player.name;
            
            const cardCount = document.createElement('div');
            cardCount.className = 'card-count';
            cardCount.textContent = `Карт: ${player.cards.length}`;
            
            playerHeader.appendChild(playerName);
            playerHeader.appendChild(cardCount);
            
            // Создаем контейнер для карт игрока
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'player-cards';
            
            // Отображаем карты игрока
            player.cards.forEach((card, cardIndex) => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card table-card';
                
                // Добавляем id карты для идентификации
                cardElement.dataset.cardId = card.id;
                
                // Показываем лицевую или оборотную сторону карты в зависимости от ее состояния
                if (card.faceUp) {
                    cardElement.classList.add('card-front');
                    
                    // Для открытых карт добавляем информацию о ранге и масти
                    if (card.isRed) {
                        cardElement.classList.add('red');
                    }
                    
                    // Добавляем значение и масть
                    const valueElem = document.createElement('div');
                    valueElem.className = 'card-value';
                    valueElem.textContent = card.value;
                    
                    const suitElem = document.createElement('div');
                    suitElem.className = 'card-suit';
                    suitElem.textContent = card.suit;
                    
                    cardElement.appendChild(valueElem);
                    cardElement.appendChild(suitElem);
                } else {
                    cardElement.classList.add('card-back');
                }
                
                cardsContainer.appendChild(cardElement);
            });
            
            // Собираем все вместе
            playerElement.appendChild(playerHeader);
            playerElement.appendChild(cardsContainer);
            
            // Добавляем игрока на игровое поле
            playersContainer.appendChild(playerElement);
        });
    }
    
    // Обновление отображения колоды и сброса
    function updateDeckInfo() {
        console.log('Обновление отображения колоды и сброса');
        
        // Обновляем счетчик колоды
        const deckCount = document.querySelector('.card-pile.deck .card-count');
        if (deckCount) deckCount.textContent = game.deck.length;
        
        // Обновляем визуальное отображение карт в колоде
        const deckElement = document.querySelector('.card-pile.deck');
        deckElement.innerHTML = ''; // Очищаем содержимое
        
        // Определяем сколько карт показывать в стопке (максимум 5)
        const numCardsToShow = Math.min(5, game.deck.length);
        
        // Создаем карты для стопки
        for (let i = 0; i < numCardsToShow; i++) {
            const cardElem = document.createElement('div');
            cardElem.className = 'card mini-card card-back';
            // Располагаем карты со смещением для эффекта стопки
            cardElem.style.position = 'absolute';
            cardElem.style.top = `${i * 2}px`;
            cardElem.style.left = `${i * 2}px`;
            cardElem.style.zIndex = i;
            deckElement.appendChild(cardElem);
        }
        
        // Добавляем счетчик карт
        const countElem = document.createElement('div');
        countElem.className = 'card-count';
        countElem.textContent = game.deck.length;
        deckElement.appendChild(countElem);
        
        // Обновляем отображение сброса во второй стадии
        const discardElement = document.querySelector('.card-pile.discard');
        discardElement.innerHTML = '';
        
        if (game.gameStage === 'stage2' && game.discardPile.length > 0) {
            // Во второй стадии отображаем сброс
            const topCard = game.discardPile[game.discardPile.length - 1];
            console.log(`Верхняя карта сброса: ${topCard.value}${topCard.suit}`);
            
            // Создаем элемент верхней карты сброса
            const cardElement = document.createElement('div');
            cardElement.className = 'card mini-card';
            
            // Показываем лицевую сторону карты в сбросе
            const cardFront = document.createElement('div');
            cardFront.className = 'card-front';
            if (topCard.isRed) {
                cardFront.classList.add('red');
            }
            
            // Добавляем значение и масть
            const valueElem = document.createElement('div');
            valueElem.className = 'card-value';
            valueElem.textContent = topCard.value;
            
            const suitElem = document.createElement('div');
            suitElem.className = 'card-suit';
            suitElem.textContent = topCard.suit;
            
            cardFront.appendChild(valueElem);
            cardFront.appendChild(suitElem);
            cardElement.appendChild(cardFront);
            
            // Добавляем id карты
            cardElement.dataset.cardId = topCard.id;
            
            discardElement.appendChild(cardElement);
            
            // Добавляем счетчик карт в сбросе, если их больше одной
            if (game.discardPile.length > 1) {
                const discardCount = document.createElement('div');
                discardCount.className = 'card-count';
                discardCount.textContent = game.discardPile.length;
                discardElement.appendChild(discardCount);
            }
        }
    }
    
    // Создание элемента карты
    function createCardElement(card) {
        const cardElement = document.importNode(cardTemplate.content, true).querySelector('.card');
        
        // Если карта лицом вверх, отображаем её значение и масть
        if (card.faceUp) {
            const cardFront = cardElement.querySelector('.card-front');
            cardFront.querySelector('.card-value').textContent = card.value;
            cardFront.querySelector('.card-suit').textContent = card.suit;
            
            if (card.isRed) {
                cardFront.classList.add('red');
            }
        } else {
            // Если карта закрыта, добавляем соответствующий класс
            cardElement.classList.add('flipped');
        }
        
        // Добавляем id карты в атрибуты
        cardElement.dataset.cardId = card.id;
        
        // Для отладки - добавляем видимое значение карты даже для закрытых карт
        if (card.id) {
            console.log(`Создана карта: ${card.id}, значение: ${card.value}${card.suit}, faceUp: ${card.faceUp}`);
        }
        
        return cardElement;
    }
    
    // Отрисовка руки игрока
    function renderPlayerHand() {
        const playerHandContainer = document.querySelector('.player-hand');
        playerHandContainer.innerHTML = '';
        
        // Получаем карты текущего игрока
        const playerCards = game.players[0].cards;
        
        // Отображаем каждую карту
        playerCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            
            // Добавляем id карты для идентификации
            cardElement.dataset.cardId = card.id;
            cardElement.dataset.cardValue = card.value;
            cardElement.dataset.cardSuit = card.suit;
            
            // Показываем лицевую или оборотную сторону карты в зависимости от ее состояния
            if (card.faceUp) {
                const cardFront = document.createElement('div');
                cardFront.className = 'card-front';
                
                if (card.isRed) {
                    cardFront.classList.add('red');
                }
                
                // Добавляем значение и масть
                const valueElem = document.createElement('div');
                valueElem.className = 'card-value';
                valueElem.textContent = card.value;
                
                const suitElem = document.createElement('div');
                suitElem.className = 'card-suit';
                suitElem.textContent = card.suit;
                
                cardFront.appendChild(valueElem);
                cardFront.appendChild(suitElem);
                cardElement.appendChild(cardFront);
            } else {
                const cardBack = document.createElement('div');
                cardBack.className = 'card-back';
                cardElement.appendChild(cardBack);
            }
            
            // Добавляем обработчик события клика по карте
            cardElement.addEventListener('click', cardClickHandler);
            
            // Добавляем карту в контейнер руки игрока
            playerHandContainer.appendChild(cardElement);
        });
        
        // Показываем или скрываем кнопки в зависимости от состояния игры
        if (isMyTurn) {
            drawCardButton.style.display = 'block';
            playCardButton.style.display = document.querySelector('.player-hand .card.selected') ? 'block' : 'none';
        } else {
            drawCardButton.style.display = 'none';
            playCardButton.style.display = 'none';
        }
    }
    
    // Функция установки текущего игрока
    function setCurrentPlayer(playerIndex) {
        // Устанавливаем текущего игрока
        currentPlayerIndex = playerIndex;
        
        // Обновляем отображение
        document.querySelectorAll('.player').forEach((element, index) => {
            if (index === playerIndex) {
                element.classList.add('current-player');
            } else {
                element.classList.remove('current-player');
            }
        });
        
        // Определяем, мой ли сейчас ход
        isMyTurn = (playerIndex === 0);
        
        // Обновляем доступность кнопок в зависимости от того, чей ход
        if (isMyTurn) {
            drawCardButton.style.display = 'block';
            showGameMessage('Ваш ход!');
        } else {
            drawCardButton.style.display = 'none';
            playCardButton.style.display = 'none';
            
            // Снимаем выделение со всех карт
            document.querySelectorAll('.player-hand .card.selected').forEach(card => {
                card.classList.remove('selected');
            });
            
            // Снимаем подсветку со всех карт на столе
            document.querySelectorAll('.table-card.highlighted').forEach(card => {
                card.classList.remove('highlighted');
            });
            
            // Если это ход бота, запускаем его логику с задержкой
            if (game.players[playerIndex].isAI) {
                showGameMessage(`Ход игрока ${game.players[playerIndex].name}`);
                
                setTimeout(playAITurn, 1500);
            }
        }
        
        // Обновляем отображение руки игрока
        renderPlayerHand();
    }
    
    // Показать сообщение в игре
    function showGameMessage(message, duration = 3000) {
        // Создаем элемент сообщения
        const messageElement = document.createElement('div');
        messageElement.className = 'game-message';
        messageElement.textContent = message;
        
        // Добавляем элемент на страницу
        document.querySelector('.game-container').appendChild(messageElement);
        
        // Анимируем появление
        setTimeout(() => {
            messageElement.classList.add('visible');
        }, 10);
        
        // Удаляем сообщение через указанное время
        setTimeout(() => {
            messageElement.classList.remove('visible');
            setTimeout(() => {
                messageElement.remove();
            }, 500);
        }, duration);
    }
    
    // Проверка возможности положить карту на другую карту
    function canPlayCard(card, targetCard) {
        // В первой стадии игры карту можно сыграть, если она на 1 ранг выше целевой карты
        if (game.gameStage === 'stage1') {
            const cardRank = cardValues.indexOf(card.value);
            const targetRank = cardValues.indexOf(targetCard.value);
            
            // Если целевая карта - туз, на неё можно положить только 2
            if (targetCard.value === 'A') {
                return card.value === '2';
            }
            
            // В первой стадии важен только ранг карты, масть не имеет значения
            // Проверяем, что наша карта на 1 ранг выше целевой
            console.log(`Проверяем карту ${card.value}${card.suit} (ранг ${cardRank}) на ${targetCard.value}${targetCard.suit} (ранг ${targetRank})`);
            return cardRank === targetRank + 1;
        }
        
        // Во второй стадии можно сыграть карту того же номинала или той же масти
        if (game.gameStage === 'stage2') {
            return (card.suit === targetCard.suit || card.value === targetCard.value);
        }
        
        // В других стадиях нужно соблюдать правила
        return (card.suit === targetCard.suit || card.value === targetCard.value);
    }
    
    // Проверка возможности сыграть карту на любую из карт на столе
    function canPlayCardOnTable(card) {
        // В первой стадии игры карту можно сыграть, если она на 1 ранг выше целевой карты
        if (game.gameStage === 'stage1') {
            const cardRank = cardValues.indexOf(card.value);
            
            // Перебираем всех игроков (кроме себя) и их карты
            for (let i = 0; i < game.players.length; i++) {
                if (i === currentPlayerIndex) continue; // Пропускаем текущего игрока
                
                const player = game.players[i];
                
                // Ищем открытые карты у других игроков
                const openCards = player.cards.filter(c => c.faceUp);
                
                for (const targetCard of openCards) {
                    // Если целевая карта - туз, на неё можно положить только 2
                    if (targetCard.value === 'A') {
                        if (card.value === '2') {
                            console.log(`Можно положить 2 на туз`);
                            return true;
                        }
                        continue;
                    }
                    
                    const targetRank = cardValues.indexOf(targetCard.value);
                    
                    // Проверяем, что наша карта на 1 ранг выше целевой
                    if (cardRank === targetRank + 1) {
                        console.log(`Можно положить ${card.value}${card.suit} на ${targetCard.value}${targetCard.suit}`);
                        return true;
                    }
                }
            }
            
            return false;
        } else if (game.gameStage === 'stage2') {
            // Для второй стадии другая логика
            if (game.discardPile.length === 0) {
                // На пустой сброс можно положить любую карту
                return true;
            }
            
            const topCard = game.discardPile[game.discardPile.length - 1];
            // Во второй стадии карту можно сыграть, если совпадает масть или значение
            return (card.suit === topCard.suit || card.value === topCard.value);
        }
        
        return false;
    }
    
    // Подсветка возможных целей для выбранной карты
    function highlightPossibleTargets(selectedCard) {
        // Сначала убираем подсветку со всех карт на столе
        document.querySelectorAll('.table-card.highlighted').forEach(card => {
            card.classList.remove('highlighted');
        });
        
        // Если карта не выбрана - выходим
        if (!selectedCard) return;
        
        // В зависимости от стадии игры используем разную логику
        if (game.gameStage === 'stage1') {
            // Получаем значение выбранной карты
            const cardValue = selectedCard.getAttribute('data-card-value');
            const cardRank = cardValues.indexOf(cardValue);
            console.log(`Выбрана карта с рангом: ${cardRank}, значение: ${cardValue}`);
            
            // Перебираем всех игроков и их карты для поиска возможных целей
            document.querySelectorAll('.player').forEach((playerElem, playerIdx) => {
                // Пропускаем текущего игрока
                if (playerIdx === currentPlayerIndex) return;
                
                console.log(`Проверяем игрока ${playerIdx}`);
                
                // Ищем все открытые карты на столе у игрока
                playerElem.querySelectorAll('.table-card.card-front').forEach(cardElem => {
                    const valueElem = cardElem.querySelector('.card-value');
                    if (valueElem) {
                        const value = valueElem.textContent;
                        
                        // Если это туз - проверяем, подходит ли наша карта (только 2)
                        if (value === 'A') {
                            if (cardValue === '2') {
                                console.log(`  Найден туз - подходящая цель для карты ${cardValue}!`);
                                cardElem.classList.add('highlighted');
                                cardElem.dataset.targetFor = selectedCard.dataset.cardId;
                            }
                            return;
                        }
                        
                        const targetRank = cardValues.indexOf(value);
                        
                        console.log(`- Карта с рангом: ${targetRank}, значение: ${value}`);
                        
                        // Если выбранная карта на 1 ранг выше целевой - подсвечиваем как возможную цель
                        // В первой стадии масть не имеет значения
                        if (cardRank === targetRank + 1) {
                            console.log(`  Найдена подходящая цель! ${value}`);
                            cardElem.classList.add('highlighted');
                            
                            // Устанавливаем атрибут, чтобы знать, на какую карту можно положить выбранную
                            cardElem.dataset.targetFor = selectedCard.dataset.cardId;
                        }
                    }
                });
            });
        } else if (game.gameStage === 'stage2') {
            // Во второй стадии подсвечиваем верхнюю карту сброса, если на неё можно сыграть
            if (game.discardPile.length > 0) {
                const topCard = game.discardPile[game.discardPile.length - 1];
                const cardValue = selectedCard.getAttribute('data-card-value');
                const cardSuit = selectedCard.getAttribute('data-card-suit');
                
                // Проверяем, можно ли сыграть карту на верхнюю карту сброса
                if (cardSuit === topCard.suit || cardValue === topCard.value) {
                    // Находим элемент верхней карты сброса
                    const discardTopCardElem = document.querySelector('.card-pile.discard .card');
                    if (discardTopCardElem) {
                        // Подсвечиваем карту сброса
                        discardTopCardElem.classList.add('highlighted');
                        
                        // Устанавливаем атрибут target
                        discardTopCardElem.dataset.targetFor = selectedCard.dataset.cardId;
                        discardTopCardElem.dataset.isDiscard = 'true';
                    }
                }
            }
        }
    }
    
    // Обработка выбора карты из руки игрока
    function cardClickHandler(event) {
        // Проверяем, что сейчас ход игрока
        if (isMyTurn) {
            // Проверяем, что выбрана карта (а не контейнер)
            if (event.target.classList.contains('card') || event.target.closest('.card')) {
                const cardElem = event.target.classList.contains('card') ? event.target : event.target.closest('.card');
                
                // Снимаем выделение с ранее выбранной карты
                document.querySelectorAll('.player-hand .card.selected').forEach(card => {
                    card.classList.remove('selected');
                });
                
                // Выделяем выбранную карту
                cardElem.classList.add('selected');
                
                // Получаем id карты из атрибута data-card-id
                const cardId = cardElem.dataset.cardId;
                console.log(`Выбрана карта с id: ${cardId}`);
                
                // Показываем кнопку для игры картой
                playCardButton.style.display = 'block';
                
                // Получаем объект карты из руки игрока
                const playerCards = game.players[0].cards;
                const selectedCard = playerCards.find(card => card.id === cardId);
                
                if (selectedCard) {
                    console.log(`Выбрана карта: ${selectedCard.value}${selectedCard.suit}`);
                    
                    // Подсветка возможных целей для игры
                    highlightPossibleTargets(cardElem);
                }
            }
        }
    }
    
    // Обработчики событий для кнопок
    drawCardButton.addEventListener('click', function() {
        if (isMyTurn) {
            if (game.gameStage === 'stage1') {
                // В первой стадии берем карту из колоды
                if (game.deck.length > 0) {
                    // Берем карту из колоды
                    const drawnCard = game.deck.pop();
                    drawnCard.faceUp = true; // Открываем карту
                    
                    // Добавляем карту текущему игроку
                    game.players[0].cards.push(drawnCard);
                    
                    // Обновляем отображение
                    renderPlayerHand();
                    updateDeckInfo();
                    
                    // Показываем сообщение о взятой карте
                    showGameMessage(`Вы взяли карту из колоды: ${drawnCard.value}${drawnCard.suit}`);
                    
                    // Проверяем, не закончилась ли колода
                    if (game.deck.length === 0) {
                        console.log('Колода закончилась, переходим ко второй стадии');
                        checkGameStageProgress();
                    }
                    
                    // Проверяем, можно ли сыграть взятую карту на карты других игроков
                    const canPlay = canPlayCardOnTable(drawnCard);
                    
                    if (canPlay) {
                        // Если взятую карту можно сыграть, даем возможность игроку это сделать
                        showGameMessage('Вы можете сыграть взятую карту на карту соперника', 2000);
                        
                        // Выделяем взятую карту
                        setTimeout(() => {
                            const newCardElement = document.querySelector(`.player-hand .card[data-card-id="${drawnCard.id}"]`);
                            if (newCardElement) {
                                newCardElement.click(); // Имитируем клик по карте для её выделения
                            }
                        }, 300);
                        
                        // Не передаем ход, так как игрок может сыграть карту
                    } else {
                        // Если нельзя сыграть карту, передаем ход
                        setTimeout(() => {
                            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                            setCurrentPlayer(nextPlayerIndex);
                        }, 2000);
                    }
                } else {
                    // Колода закончилась
                    showGameMessage('В колоде больше нет карт. Начинается вторая стадия игры.');
                    checkGameStageProgress();
                    
                    // Передаем ход следующему игроку
                    setTimeout(() => {
                        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                        setCurrentPlayer(nextPlayerIndex);
                    }, 1500);
                }
            } else {
                // Во второй стадии берем карту из колоды, если есть
                if (game.deck.length > 0) {
                    console.log(`Количество карт в колоде до взятия: ${game.deck.length}`);
                    const drawnCard = game.deck.pop();
                    console.log(`Количество карт в колоде после взятия: ${game.deck.length}`);
                    console.log(`Взята карта: ${drawnCard.value}${drawnCard.suit}`);
                    drawnCard.faceUp = true; // Открываем карту
                    
                    // Добавляем карту текущему игроку
                    game.players[0].cards.push(drawnCard);
                    
                    // Обновляем отображение
                    renderPlayerHand();
                    updateDeckInfo();
                    
                    // Показываем сообщение о взятой карте
                    showGameMessage(`Вы взяли карту из колоды: ${drawnCard.value}${drawnCard.suit}`);
                    
                    // Проверяем, можно ли сыграть взятую карту в сброс
                    if (game.discardPile.length > 0) {
                        const topCard = game.discardPile[game.discardPile.length - 1];
                        const canPlay = (drawnCard.suit === topCard.suit || drawnCard.value === topCard.value);
                        
                        if (canPlay) {
                            // Если взятую карту можно сыграть в сброс, даем возможность игроку это сделать
                            showGameMessage('Вы можете сыграть взятую карту в сброс', 2000);
                            
                            // Выделяем взятую карту
                            setTimeout(() => {
                                const newCardElement = document.querySelector(`.player-hand .card[data-card-id="${drawnCard.id}"]`);
                                if (newCardElement) {
                                    newCardElement.click(); // Имитируем клик по карте для её выделения
                                }
                            }, 300);
                            
                            // Не передаем ход, так как игрок может сыграть карту
                        } else {
                            // Если карту нельзя сыграть, передаем ход
                            setTimeout(() => {
                                const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                                setCurrentPlayer(nextPlayerIndex);
                            }, 2000);
                        }
                    } else {
                        // Если сброс пуст, игрок может положить любую карту
                        showGameMessage('Вы можете положить карту в пустой сброс', 2000);
                        
                        // Выделяем взятую карту
                        setTimeout(() => {
                            const newCardElement = document.querySelector(`.player-hand .card[data-card-id="${drawnCard.id}"]`);
                            if (newCardElement) {
                                newCardElement.click(); // Имитируем клик по карте для её выделения
                            }
                        }, 300);
                    }
                } else {
                    // Если колода пуста, проверяем сброс
                    if (game.discardPile.length > 1) {
                        // Берем верхнюю карту из сброса
                        const topCard = game.discardPile.pop();
                        // Перемешиваем оставшиеся карты сброса и делаем новую колоду
                        game.deck = shuffleDeck([...game.discardPile]);
                        game.discardPile = [topCard];
                        
                        showGameMessage('Колода пуста. Сброс перемешан и стал новой колодой.');
                        updateDeckInfo();
                    } else {
                        showGameMessage('Колода и сброс пусты. Невозможно взять карту.');
                        
                        // Переходим к следующему игроку
                        setTimeout(() => {
                            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                            setCurrentPlayer(nextPlayerIndex);
                        }, 1500);
                    }
                }
            }
        }
    });
    
    // Обработчик кнопки "Играть карту"
    playCardButton.addEventListener('click', function() {
        const selectedCard = document.querySelector('.player-hand .card.selected');
        
        if (selectedCard && isMyTurn) {
            const cardId = selectedCard.dataset.cardId;
            const playerCards = game.players[0].cards;
            const cardIndex = playerCards.findIndex(card => card.id === cardId);
            
            if (cardIndex !== -1) {
                const cardToPlay = playerCards[cardIndex];
                
                // Ищем подсвеченную карту как цель
                const targetCardElem = document.querySelector(`.highlighted[data-target-for="${cardId}"]`);
                
                if (targetCardElem) {
                    // Находим игрока и карту для игры (для первой стадии)
                    const targetPlayerElem = targetCardElem.closest('.player');
                    // Получаем индекс игрока по расположению элемента в контейнере
                    const playerElems = Array.from(document.querySelectorAll('.player'));
                    const targetPlayerIndex = playerElems.indexOf(targetPlayerElem);
                    
                    if (targetPlayerIndex !== -1 && targetPlayerIndex < game.players.length) {
                        const targetPlayer = game.players[targetPlayerIndex];
                        
                        // Находим карту в массиве карт игрока
                        const targetCardId = targetCardElem.dataset.cardId;
                        const targetCardIndex = targetPlayer.cards.findIndex(c => c.id === targetCardId);
                        
                        if (targetCardIndex !== -1) {
                            // Убираем карту из руки игрока
                            const playedCard = playerCards.splice(cardIndex, 1)[0];
                            
                            // Кладем сыгранную карту поверх карты соперника
                            targetPlayer.cards[targetCardIndex] = playedCard;
                            
                            // Обновляем отображение
                            renderPlayers();
                            renderPlayerHand();
                            
                            // Снимаем подсветку со всех карт
                            document.querySelectorAll('.table-card.highlighted').forEach(card => {
                                card.classList.remove('highlighted');
                            });
                            
                            // Показываем сообщение
                            showGameMessage(`Вы сыграли карту ${playedCard.value}${playedCard.suit} на карту игрока ${targetPlayer.name}`);
                            
                            // После успешного хода берем новую карту из колоды
                            if (game.deck.length > 0) {
                                // Берем карту из колоды
                                const drawnCard = game.deck.pop();
                                drawnCard.faceUp = true; // Открываем карту
                                
                                // Добавляем карту игроку
                                playerCards.push(drawnCard);
                                
                                // Обновляем отображение
                                renderPlayerHand();
                                updateDeckInfo();
                                
                                // Проверяем, не закончилась ли колода
                                if (game.deck.length === 0) {
                                    checkGameStageProgress();
                                }
                                
                                // Показываем сообщение о взятой карте
                                showGameMessage(`Вы взяли карту из колоды: ${drawnCard.value}${drawnCard.suit}`);
                                
                                // Проверяем, может ли игрок снова сделать ход
                                if (canPlayCardOnTable(drawnCard)) {
                                    // Выделяем взятую карту
                                    setTimeout(() => {
                                        const newCardElement = document.querySelector(`.player-hand .card[data-card-id="${drawnCard.id}"]`);
                                        if (newCardElement) {
                                            newCardElement.click(); // Имитируем клик по карте для её выделения
                                        }
                                    }, 300);
                                    
                                    // Не передаем ход, так как игрок может снова ходить
                                    return;
                                }
                            }
                            
                            // Передаем ход следующему игроку
                            setTimeout(() => {
                                const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                                setCurrentPlayer(nextPlayerIndex);
                            }, 1500);
                        }
                    } else {
                        showGameMessage('Ошибка: не удалось найти целевого игрока');
                    }
                } else {
                    // Если нет подсвеченной цели, показываем сообщение
                    showGameMessage('Выберите карту, на которую хотите положить свою карту');
                }
            }
        }
    });
    
    passTurnButton.addEventListener('click', function() {
        if (isMyTurn) {
            // Показываем сообщение
            showGameMessage('Вы пропускаете ход');
            
            // Переход хода к следующему игроку
            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
            setCurrentPlayer(nextPlayerIndex);
        }
    });
    
    // Реализация хода ИИ
    function playAITurn() {
        console.log('Бот начинает свой ход...');
        const aiPlayer = game.players[currentPlayerIndex];
        console.log(`Бот #${currentPlayerIndex} (${aiPlayer.name}) делает ход. Стадия игры: ${game.gameStage}`);
        console.log(`У бота ${aiPlayer.cards.length} карт в руке.`);
        
        // Проверяем, нужно ли перейти ко второй стадии игры
        if (game.deck.length === 0 && game.gameStage === 'stage1') {
            console.log('Колода пуста, переходим ко второй стадии игры...');
            if (checkGameStageProgress()) {
                console.log('Переход ко второй стадии игры выполнен');
                // Теперь игра в стадии stage2, продолжаем ход бота по правилам второй стадии
            }
        }
        
        // Для первой стадии игры - логика набора и выкладывания карт
        if (game.gameStage === 'stage1') {
            console.log('Стадия 1: Бот ищет карты для хода...');
            
            // Выбираем все карты бота, которые можно использовать
            const playableCards = aiPlayer.cards.filter(card => card.faceUp);
            console.log(`У бота ${playableCards.length} открытых карт`);
            
            // Находим все возможные ходы
            let bestMove = null;
            
            // Для каждой открытой карты в руке бота
            for (const card of playableCards) {
                console.log(`Проверяем карту ${card.value}${card.suit}`);
                const cardRank = cardValues.indexOf(card.value);
                
                // Ищем карты других игроков
                let foundMove = false;
                for (let i = 0; i < game.players.length; i++) {
                    if (i === currentPlayerIndex) continue; // Пропускаем себя
                    
                    const targetPlayer = game.players[i];
                    // Ищем только открытые карты соперников
                    const targetOpenCards = targetPlayer.cards.filter(c => c.faceUp);
                    console.log(`Игрок ${i} имеет ${targetOpenCards.length} открытых карт`);
                    
                    for (const targetCard of targetOpenCards) {
                        // Если целевая карта - туз, проверяем может ли бот положить только 2
                        if (targetCard.value === 'A') {
                            // Если у бота есть 2, то он может положить эту карту на туза
                            if (card.value === '2') {
                                console.log(`Найден туз ${targetCard.value}${targetCard.suit} - подходящая цель для ${card.value}${card.suit}!`);
                                bestMove = {
                                    card: card,
                                    cardIndex: aiPlayer.cards.findIndex(c => c.id === card.id),
                                    targetPlayer: targetPlayer,
                                    targetPlayerIndex: i,
                                    targetCard: targetCard,
                                    targetCardIndex: targetPlayer.cards.findIndex(c => c.id === targetCard.id)
                                };
                                foundMove = true;
                                break;
                            }
                            continue; // Пропускаем туз, если у бота нет 2
                        }
                        
                        const targetRank = cardValues.indexOf(targetCard.value);
                        
                        // Если наша карта на 1 ранг выше, чем карта противника
                        if (cardRank === targetRank + 1) {
                            console.log(`Найдена подходящая цель: ${targetCard.value}${targetCard.suit}`);
                            // Нашли ход
                            bestMove = {
                                card: card,
                                cardIndex: aiPlayer.cards.findIndex(c => c.id === card.id),
                                targetPlayer: targetPlayer,
                                targetPlayerIndex: i,
                                targetCard: targetCard,
                                targetCardIndex: targetPlayer.cards.findIndex(c => c.id === targetCard.id)
                            };
                            foundMove = true;
                            break;
                        }
                    }
                    
                    if (foundMove) break;
                }
                
                if (foundMove) break;
            }
            
            // Если нашли подходящий ход на карты противника
            if (bestMove) {
                console.log(`Бот нашел ход: ${bestMove.card.value}${bestMove.card.suit} -> ${bestMove.targetCard.value}${bestMove.targetCard.suit}`);
                
                // Удаляем карту из руки бота
                const playedCard = aiPlayer.cards.splice(bestMove.cardIndex, 1)[0];
                
                // Кладем карту поверх карты противника
                game.players[bestMove.targetPlayerIndex].cards[bestMove.targetCardIndex] = playedCard;
                
                // Обновляем отображение
                renderPlayers();
                
                // Показываем сообщение
                showGameMessage(`${aiPlayer.name} кладет карту ${playedCard.value}${playedCard.suit} на карту игрока ${bestMove.targetPlayer.name}`);
                
                // После хода берем новую карту из колоды
                if (game.deck.length > 0) {
                    console.log(`Бот берет карту из колоды. До взятия: ${game.deck.length} карт`);
                    
                    // Берем карту из колоды
                    const drawnCard = game.deck.pop();
                    drawnCard.faceUp = true; // Открываем карту
                    
                    // Добавляем карту в руку бота
                    aiPlayer.cards.push(drawnCard);
                    
                    // Обновляем отображение
                    updateDeckInfo();
                    
                    // Показываем сообщение
                    showGameMessage(`${aiPlayer.name} берет карту из колоды: ${drawnCard.value}${drawnCard.suit}`);
                    
                    // Проверяем, не закончилась ли колода
                    if (game.deck.length === 0) {
                        console.log('Колода закончилась, проверяем переход ко второй стадии');
                        checkGameStageProgress();
                    }
                    
                    // Проверяем, можно ли сделать ещё один ход
                    setTimeout(() => {
                        playAITurn(); // Рекурсивно вызываем для продолжения хода
                    }, 1500);
                    
                    return;
                } else {
                    // Колода закончилась - переходим ко второй стадии
                    checkGameStageProgress();
                }
            } else {
                console.log('Бот не нашел возможности положить карту на карты противников');
                
                // Если не можем сыграть ни на одну из карт противников, берём карту из колоды
                if (game.deck.length > 0) {
                    console.log(`Бот берет карту из колоды. До взятия: ${game.deck.length} карт`);
                    
                    // Берем карту из колоды
                    const drawnCard = game.deck.pop();
                    drawnCard.faceUp = true; // Открываем карту
                    
                    // Добавляем карту в руку бота
                    aiPlayer.cards.push(drawnCard);
                    
                    // Обновляем отображение
                    updateDeckInfo();
                    
                    // Показываем сообщение
                    showGameMessage(`${aiPlayer.name} берет карту из колоды: ${drawnCard.value}${drawnCard.suit}`);
                    
                    // Проверяем, не закончилась ли колода
                    if (game.deck.length === 0) {
                        console.log('Колода закончилась после хода бота, проверяем переход ко второй стадии');
                        checkGameStageProgress();
                    }
                    
                    // Передаем ход следующему игроку
                    setTimeout(() => {
                        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                        console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                        setCurrentPlayer(nextPlayerIndex);
                    }, 2000);
                } else {
                    // Колода закончилась - переходим ко второй стадии и передаем ход
                    checkGameStageProgress();
                    
                    setTimeout(() => {
                        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                        console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                        setCurrentPlayer(nextPlayerIndex);
                    }, 1500);
                }
            }
        }
        // Для второй стадии используем другую логику (оставим на потом)
    }
    
    // Настройки и модальное окно
    settingsButton.addEventListener('click', function() {
        settingsModal.classList.add('visible');
    });
    
    closeSettingsButton.addEventListener('click', function() {
        settingsModal.classList.remove('visible');
    });
    
    leaveGameButton.addEventListener('click', function() {
        // Возвращаемся на страницу настройки игры
        window.location.href = '/game-setup';
    });
    
    // Запускаем игру
    initGame();

    // Проверка и обработка перехода между стадиями игры
    function checkGameStageProgress() {
        console.log(`Проверка прогресса стадии игры. Текущая стадия: ${game.gameStage}`);
        
        // Если колода закончилась, переходим ко второй стадии
        if (game.gameStage === 'stage1' && game.deck.length === 0) {
            console.log('Колода закончилась - переходим ко второй стадии');
            
            // Переходим ко второй стадии
            game.gameStage = 'stage2';
            
            // Все карты становятся открытыми
            for (let player of game.players) {
                for (let card of player.cards) {
                    card.faceUp = true;
                }
            }
            
            // Инициализируем пустой сброс, если его еще нет
            if (!game.discardPile) {
                game.discardPile = [];
            }
            
            // Обновляем отображение
            renderPlayers();
            renderPlayerHand();
            
            // Обновляем счетчики колоды и сброса
            updateDeckInfo();
            
            // Показываем сообщение о смене стадии
            showGameMessage('Колода закончилась! Начинается вторая стадия игры. Все карты открыты.', 5000);
            
            return true;
        }
        
        return false;
    }
    
    // Функция для отладки состояния колоды
    function logDeckState(context = "") {
        if (!game || !game.deck) {
            console.error(`[${context}] Ошибка: объект игры или колоды не найден!`);
            return;
        }
        
        console.log(`[${context}] Состояние колоды:`);
        console.log(`- Количество карт в колоде: ${game.deck.length}`);
        console.log(`- Количество карт в сбросе: ${game.discardPile.length}`);
        console.log(`- Текущая стадия игры: ${game.gameStage}`);
        
        // Проверим общее количество карт в игре
        let totalCards = game.deck.length + game.discardPile.length;
        game.players.forEach((player, idx) => {
            totalCards += player.cards.length;
            console.log(`- У игрока ${player.name} (${idx}): ${player.cards.length} карт`);
        });
        
        console.log(`- Всего карт в игре: ${totalCards}`);
    }

    // Функция для проверки победителя
    function checkForWinner() {
        // Ищем игрока без карт
        for (let i = 0; i < game.players.length; i++) {
            const player = game.players[i];
            
            // В первой стадии игрок не может выиграть, если остаются закрытые карты
            if (game.gameStage === 'stage1') {
                // Считаем только случай, когда закрытых карт нет, а открытых тоже нет
                const hasFaceDownCards = player.cards.some(card => !card.faceUp);
                
                // Если есть закрытые карты, значит игрок еще не выиграл
                if (hasFaceDownCards) {
                    continue;
                }
            }
            
            // Проверяем, что у игрока нет карт
            if (player.cards.length === 0) {
                // Нашли победителя
                const winner = player;
                
                // Показываем сообщение о победе
                showGameMessage(`${winner.name} выиграл игру!`, 5000);
                
                // Завершаем игру
                setTimeout(() => {
                    alert(`Игра окончена! ${winner.name} победил!`);
                    // Перезапуск игры
                    initGame();
                }, 3000);
                
                return true; // Есть победитель
            }
        }
        
        return false; // Нет победителя
    }
}); 