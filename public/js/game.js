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
    let selectedCardIndex = -1;
    let targetPlayerIndex = -1;
    let targetCardIndex = -1;
    
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
    const selfCardButton = document.getElementById('self-card');
    const settingsButton = document.getElementById('open-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.querySelector('.close-btn');
    const leaveGameButton = document.getElementById('leave-game');
    const showRulesButton = document.getElementById('show-rules');
    const rulesModal = document.getElementById('rules-modal');
    const closeRulesButton = document.querySelector('.close-rules-btn');
    const stageNumberElement = document.querySelector('.stage-number');
    const stageDescriptionElement = document.querySelector('.stage-description');
    
    // Шаблоны для создания элементов
    const playerTemplate = document.getElementById('player-template');
    const cardTemplate = document.getElementById('card-template');
    
    // Вспомогательная функция задержки
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Асинхронная раздача карт с анимацией
    async function dealInitialCardsAnimated() {
        // Очищаем руки игроков
        game.players.forEach(p => p.cards = []);
        renderPlayers();

        // 2 круга по одной закрытой карте
        for (let round = 0; round < 2; round++) {
            for (let i = 0; i < game.players.length; i++) {
                const card = game.deck.pop();
                card.faceUp = false;
                game.players[i].cards.push(card);
                renderPlayers();
                await delay(350);
            }
        }
        // 1 круг по одной открытой карте
        for (let i = 0; i < game.players.length; i++) {
            const card = game.deck.pop();
            card.faceUp = true;
            game.players[i].cards.push(card);
            renderPlayers();
            await delay(350);
        }
        // Карта в центр (сброс)
        const tableCard = game.deck.pop();
        tableCard.faceUp = true;
        game.discardPile = [tableCard];
        updateDeckInfo();
        await delay(350);

        // После раздачи — обновить всё поле
        renderPlayers();
        renderPlayerHand();
        updateDeckInfo();
    }
    
    // Инициализация игры
    async function initGame() {
        console.log('Инициализация новой игры...');
        preloadCardImages();
        if (game) {
            console.log('Очистка предыдущей игры');
        }
        const playerCount = gameSettings.playerCount || 4;
        game = {
            players: [
                { name: 'Вы', cards: [], isAI: false }
            ],
            deck: [],
            discardPile: [],
            gameStage: 'stage1',
            settings: {
                useCardImages: true
            }
        };
        for (let i = 1; i < playerCount; i++) {
            game.players.push({ name: `Бот ${i}`, cards: [], isAI: true });
        }
        initializeDeck();
        shuffleDeck();
        await dealInitialCardsAnimated();
        const firstPlayerIndex = determineFirstPlayer();
        renderPlayers();
        renderPlayerHand();
        updateDeckInfo();
        stageNumberElement.textContent = 'Стадия 1';
        stageDescriptionElement.textContent = 'Выкладка карт на 1 ранг выше';
        setCurrentPlayer(firstPlayerIndex);
        console.log('Игра успешно инициализирована');
    }
    
    // Инициализация колоды
    function initializeDeck() {
        // Масти карт: черви, бубны, крести, пики
        const suits = ['♥', '♦', '♣', '♠'];
        // Значения карт: для корректной работы с изображениями используем английские обозначения
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
            // Если у игрока еще нет карт, создаем массив для них
            if (!player.cards) {
                player.cards = [];
            }
            
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
        
        // Кладем одну открытую карту в сброс для начала игры
        const tableCard = game.deck.pop();
        tableCard.faceUp = true;
        game.discardPile = [tableCard];
        
        console.log('Карты розданы, начальная карта в сбросе:', tableCard.value + tableCard.suit);
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
        // Количество игроков
        const playerCount = game.players.length;
        // Отображаем каждого игрока
        game.players.forEach((player, playerIndex) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player';
            // Позиционируем игрока вокруг стола в зависимости от индекса
            // Формула для размещения игроков по кругу
            const angle = (playerIndex / playerCount) * 2 * Math.PI;
            const tableRadius = 40; // В процентах от размера контейнера
            const left = 50 + tableRadius * Math.cos(angle - Math.PI/2);
            const top = 50 + tableRadius * Math.sin(angle - Math.PI/2);
            playerElement.style.left = `${left}%`;
            playerElement.style.top = `${top}%`;
            // Добавляем класс активного игрока
            if (playerIndex === currentPlayerIndex) {
                playerElement.classList.add('active');
            }
            // Добавляем класс для отличия ИИ и реального игрока
            if (player.isAI) {
                playerElement.classList.add('ai-player');
            } else {
                playerElement.classList.add('human-player');
            }
            // Создаем метку имени игрока
            const playerName = document.createElement('div');
            playerName.className = 'player-name';
            playerName.textContent = player.name;
            // Создаем аватар игрока
            const playerAvatar = document.createElement('div');
            playerAvatar.className = 'player-avatar';
            const playerAvatarImg = document.createElement('img');
            playerAvatarImg.src = 'img/bot-avatar.svg'; // Заглушка
            playerAvatar.appendChild(playerAvatarImg);
            // Добавляем индикатор активного игрока
            const activeIndicator = document.createElement('div');
            activeIndicator.className = 'player-active-indicator';
            // Создаем метку с количеством карт
            const cardCount = document.createElement('div');
            cardCount.className = 'player-cards';
            cardCount.textContent = `Карт: ${player.cards.length}`;
            // Создаем контейнер для карт на столе
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'player-table-cards';
            // Отображаем карты игрока на столе
            // Новый порядок: 2 закрытые снизу, 1 открытая сверху
            const closedCards = player.cards.filter(card => !card.faceUp);
            const openCards = player.cards.filter(card => card.faceUp);
            // Сначала закрытые карты (максимум 2)
            closedCards.slice(0, 2).forEach((card, cardIndex) => {
                const cardElement = createCardElement(card);
                cardElement.classList.add('table-card', 'card-back');
                // Смещение для веера
                cardElement.style.zIndex = cardIndex;
                cardElement.style.left = `${cardIndex * 10}px`;
                cardElement.style.top = `${20 - cardIndex * 2}px`;
                cardsContainer.appendChild(cardElement);
            });
            // Затем открытая карта (если есть)
            if (openCards.length > 0) {
                const card = openCards[openCards.length - 1]; // только верхняя открытая
                const cardElement = createCardElement(card);
                cardElement.classList.add('table-card', 'card-front');
                cardElement.style.zIndex = 10;
                cardElement.style.left = `10px`;
                cardElement.style.top = `0px`;
                cardsContainer.appendChild(cardElement);
            }
            // Собираем все вместе в правильном порядке
            playerElement.appendChild(playerName);
            playerElement.appendChild(playerAvatar);
            playerElement.appendChild(activeIndicator);
            playerElement.appendChild(cardCount);
            playerElement.appendChild(cardsContainer);
            // Добавляем игрока на игровое поле
            playersContainer.appendChild(playerElement);
        });
    }
    
    // --- Исправленный updateDeckInfo: только одна верхняя карта колоды ---
    function updateDeckInfo() {
        const deckElement = document.querySelector('.card-pile.deck');
        deckElement.innerHTML = '';
        // Показываем только одну верхнюю карту колоды (рубашка)
        if (game.deck.length > 0) {
            const cardElem = document.createElement('div');
            cardElem.className = 'card mini-card card-back';
            cardElem.style.position = 'absolute';
            cardElem.style.top = '0px';
            cardElem.style.left = '0px';
            cardElem.style.zIndex = 0;
            if (game.settings.useCardImages) {
                const cardBackImg = document.createElement('img');
                cardBackImg.src = 'img/cards/back.png';
                cardBackImg.className = 'card-back-image';
                cardBackImg.alt = 'Рубашка карты';
                cardElem.appendChild(cardBackImg);
            }
            cardElem.title = 'Колода (нажмите "Взять карту")';
            deckElement.appendChild(cardElem);
            // Счётчик
            const countElem = document.createElement('div');
            countElem.className = 'card-count';
            countElem.textContent = game.deck.length;
            deckElement.appendChild(countElem);
        } else {
            const emptyDeck = document.createElement('div');
            emptyDeck.className = 'card mini-card';
            emptyDeck.style.border = '2px dashed #e0e0e0';
            emptyDeck.style.backgroundColor = '#fff';
            emptyDeck.title = 'Колода пуста';
            deckElement.appendChild(emptyDeck);
            const emptyText = document.createElement('div');
            emptyText.className = 'card-count';
            emptyText.textContent = '0';
            deckElement.appendChild(emptyText);
        }
        // Верхняя карта сброса
        const discardElement = document.querySelector('.card-pile.discard');
        discardElement.innerHTML = '';
        if (game.discardPile && game.discardPile.length > 0) {
            const topCard = game.discardPile[game.discardPile.length - 1];
            const cardElement = document.createElement('div');
            cardElement.className = 'card mini-card';
            cardElement.style.position = 'absolute';
            cardElement.style.top = '0px';
            cardElement.style.left = '0px';
            cardElement.style.zIndex = 10;
            if (game.settings.useCardImages) {
                const cardImg = document.createElement('img');
                cardImg.src = getCardImageUrl(topCard);
                cardImg.className = 'card-image';
                cardImg.alt = `${topCard.value}${topCard.suit}`;
                cardElement.appendChild(cardImg);
            } else {
                const cardFront = document.createElement('div');
                cardFront.className = 'card-front';
                if (topCard.isRed) cardFront.classList.add('red');
                const valueElem = document.createElement('div');
                valueElem.className = 'card-value';
                valueElem.textContent = topCard.value;
                const suitElem = document.createElement('div');
                suitElem.className = 'card-suit';
                suitElem.textContent = topCard.suit;
                cardFront.appendChild(valueElem);
                cardFront.appendChild(suitElem);
                cardElement.appendChild(cardFront);
            }
            cardElement.dataset.cardId = topCard.id;
            cardElement.title = 'Верхняя карта сброса';
            deckElement.appendChild(cardElement);
        }
    }
    // ... существующий код ...
    // --- Возвращаю ручной режим для игрока ---
    drawCardButton.onclick = function() {
        if (isMyTurn && game.gameStage === 'stage1') {
            // Игрок вручную берёт карту из колоды
            if (game.deck.length > 0) {
                const drawnCard = game.deck.pop();
                drawnCard.faceUp = true;
                game.players[0].cards.push(drawnCard);
                updateDeckInfo();
                renderPlayerHand();
                showGameMessage(`Вы взяли карту из колоды: ${drawnCard.value}${drawnCard.suit}`);
            } else {
                showGameMessage('Колода пуста!');
            }
        }
    };
    // ... существующий код ...
}); 