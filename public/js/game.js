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
    
    // Инициализация игры
    function initGame() {
        console.log('Инициализация новой игры...');
        
        // Предзагрузка изображений карт
        preloadCardImages();
        
        // Очищаем предыдущую игру, если она была
        if (game) {
            console.log('Очистка предыдущей игры');
        }
        
        // Создание новой игры с учетом выбранного количества игроков
        const playerCount = gameSettings.playerCount || 4;
        game = {
            players: [
                { name: 'Вы', cards: [], isAI: false }
            ],
            deck: [],
            discardPile: [],
            gameStage: 'stage1',
            settings: {
                useCardImages: true // Флаг для использования изображений карт
            }
        };
        
        // Добавляем ботов в соответствии с выбранным количеством игроков
        for (let i = 1; i < playerCount; i++) {
            game.players.push({ name: `Бот ${i}`, cards: [], isAI: true });
        }
        
        // Создаем колоду
        initializeDeck();
        
        // Перемешиваем колоду
        shuffleDeck();
        
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
            player.cards.forEach((card, cardIndex) => {
                const cardElement = document.createElement('div');
                cardElement.className = 'table-card';
                
                // Добавляем id карты для идентификации
                cardElement.dataset.cardId = card.id;
                
                // Размещаем карты веером
                const offset = cardIndex * 15;
                cardElement.style.transform = `translateX(${offset}px) rotate(${cardIndex * 5}deg)`;
                
                // Показываем лицевую или оборотную сторону карты в зависимости от ее состояния
                if (card.faceUp) {
                    cardElement.classList.add('card-front');
                    
                    // Используем изображения карт если включены в настройках
                    if (game.settings.useCardImages) {
                        // Используем изображение карты
                        const cardImg = document.createElement('img');
                        cardImg.src = getCardImageUrl(card);
                        cardImg.className = 'card-image';
                        cardImg.alt = `${card.value}${card.suit}`;
                        cardElement.appendChild(cardImg);
                    } else {
                        // Стандартное отображение
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
                    }
                } else {
                    cardElement.classList.add('card-back');
                    
                    // Добавляем изображение рубашки карты
                    if (game.settings.useCardImages) {
                        const cardBackImg = document.createElement('img');
                        cardBackImg.src = 'img/card-back.svg';
                        cardBackImg.className = 'card-back-image';
                        cardBackImg.alt = 'Рубашка карты';
                        cardElement.appendChild(cardBackImg);
                    }
                }
                
                // Добавляем подсказку
                cardElement.title = card.faceUp ? `${card.value}${card.suit}` : 'Закрытая карта';
                
                // Эффект при наведении
                cardElement.addEventListener('mouseover', function() {
                    if (!cardElement.classList.contains('highlighted')) {
                        cardElement.style.transform = `translateX(${offset}px) translateY(-5px) rotate(${cardIndex * 5}deg)`;
                        cardElement.style.boxShadow = '0 5px 10px rgba(0,0,0,0.2)';
                        cardElement.style.zIndex = '10';
                    }
                });
                
                cardElement.addEventListener('mouseout', function() {
                    if (!cardElement.classList.contains('highlighted')) {
                        cardElement.style.transform = `translateX(${offset}px) rotate(${cardIndex * 5}deg)`;
                        cardElement.style.boxShadow = '';
                        cardElement.style.zIndex = '';
                    }
                });
                
                cardsContainer.appendChild(cardElement);
            });
            
            // Собираем все вместе в правильном порядке
            playerElement.appendChild(playerName); // Имя игрока теперь первый элемент
            playerElement.appendChild(playerAvatar);
            playerElement.appendChild(activeIndicator);
            playerElement.appendChild(cardCount);
            playerElement.appendChild(cardsContainer);
            
            // Добавляем игрока на игровое поле
            playersContainer.appendChild(playerElement);
        });
    }
    
    // Обновление отображения колоды и сброса
    function updateDeckInfo() {
        console.log('Обновление отображения колоды и сброса');
        
        // Обновляем визуальное отображение карт в колоде
        const deckElement = document.querySelector('.card-pile.deck');
        deckElement.innerHTML = ''; // Очищаем содержимое
        
        // Позиционируем колоду карт по центру стола
        const cardDeck = document.querySelector('.card-deck');
        cardDeck.style.position = 'absolute';
        cardDeck.style.top = '50%';
        cardDeck.style.left = '50%';
        cardDeck.style.transform = 'translate(-50%, -50%)';
        
        // Определяем сколько карт показывать в стопке (максимум 5)
        const numCardsToShow = Math.min(5, game.deck.length);
        
        // Проверяем, что колода не пуста
        if (numCardsToShow > 0) {
            // Создаем карты для стопки
            for (let i = 0; i < numCardsToShow; i++) {
                const cardElem = document.createElement('div');
                cardElem.className = 'card mini-card card-back';
                // Располагаем карты со смещением для эффекта стопки
                cardElem.style.position = 'absolute';
                cardElem.style.top = `${i * 2}px`;
                cardElem.style.left = `${i * 2}px`;
                cardElem.style.zIndex = i;
                
                // Добавляем изображение рубашки карты
                if (game.settings.useCardImages) {
                    const cardBackImg = document.createElement('img');
                    cardBackImg.src = 'img/card-back.svg';
                    cardBackImg.className = 'card-back-image';
                    cardBackImg.alt = 'Рубашка карты';
                    cardElem.appendChild(cardBackImg);
                }
                
                // В первой стадии игры колода - это карты, которые можно взять
                if (game.gameStage === 'stage1') {
                    cardElem.title = 'Колода (нажмите "Взять карту")';
                }
                
                // Добавляем анимацию при наведении
                cardElem.addEventListener('mouseover', function() {
                    cardElem.style.transform = 'translateY(-5px)';
                    cardElem.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
                    cardElem.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
                });
                
                cardElem.addEventListener('mouseout', function() {
                    cardElem.style.transform = '';
                    cardElem.style.boxShadow = '';
                });
                
                deckElement.appendChild(cardElem);
            }
            
            // Добавляем счетчик карт
            const countElem = document.createElement('div');
            countElem.className = 'card-count';
            countElem.textContent = game.deck.length;
            deckElement.appendChild(countElem);
        } else {
            // Если колода пуста, показываем пустое место
            const emptyDeck = document.createElement('div');
            emptyDeck.className = 'card mini-card';
            emptyDeck.style.border = '2px dashed rgba(255,255,255,0.3)';
            emptyDeck.style.backgroundColor = 'transparent';
            
            // Подсказка для пустой колоды
            if (game.gameStage === 'stage1') {
                emptyDeck.title = 'Колода пуста, начинается вторая стадия';
            } else {
                emptyDeck.title = 'Колода пуста';
            }
            
            deckElement.appendChild(emptyDeck);
            
            // Сообщение о пустой колоде
            const emptyText = document.createElement('div');
            emptyText.className = 'card-count';
            emptyText.textContent = '0';
            deckElement.appendChild(emptyText);
        }
        
        // Обновляем отображение сброса
        const discardElement = document.querySelector('.card-pile.discard');
        discardElement.innerHTML = '';
        
        if (game.discardPile && game.discardPile.length > 0) {
            // Отображаем верхнюю карту сброса
            const topCard = game.discardPile[game.discardPile.length - 1];
            console.log(`Верхняя карта сброса: ${topCard.value}${topCard.suit}`);
            
            // Создаем элемент верхней карты сброса
            const cardElement = document.createElement('div');
            cardElement.className = 'card mini-card';
            
            // Показываем лицевую сторону карты в сбросе
            if (game.settings.useCardImages) {
                // Используем изображение карты
                const cardImg = document.createElement('img');
                cardImg.src = getCardImageUrl(topCard);
                cardImg.className = 'card-image';
                cardImg.alt = `${topCard.value}${topCard.suit}`;
                cardElement.appendChild(cardImg);
            } else {
                // Стандартное отображение
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
            }
            
            // Добавляем id карты
            cardElement.dataset.cardId = topCard.id;
            
            // Специальное оформление для первой стадии - это показывается карта на которую можно класть
            if (game.gameStage === 'stage1') {
                cardElement.title = 'На первой стадии игроки могут класть карты рангом выше на карты других игроков';
                // Добавляем стилизацию для карты сброса на первой стадии
                cardElement.classList.add('stage1-discard');
            } else {
                cardElement.title = 'Сброс';
            }
            
            // Добавляем анимацию при наведении на сброс
            cardElement.addEventListener('mouseover', function() {
                cardElement.style.transform = 'translateY(-5px) rotate(5deg)';
                cardElement.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
                cardElement.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
            });
            
            cardElement.addEventListener('mouseout', function() {
                cardElement.style.transform = '';
                cardElement.style.boxShadow = '';
            });
            
            discardElement.appendChild(cardElement);
            
            // Добавляем счетчик карт в сбросе, если их больше одной
            if (game.discardPile.length > 1) {
                const discardCount = document.createElement('div');
                discardCount.className = 'card-count';
                discardCount.textContent = game.discardPile.length;
                discardElement.appendChild(discardCount);
            }
        } else {
            // Если сброс пуст, показываем пустое место с соответствующим дизайном для 2-й стадии
            const emptyPile = document.createElement('div');
            emptyPile.className = 'card mini-card';
            emptyPile.style.border = '2px dashed rgba(255,255,255,0.3)';
            emptyPile.style.backgroundColor = 'transparent';
            
            // Разные стили и подсказки для разных стадий
            if (game.gameStage === 'stage2') {
                emptyPile.title = 'Сбросьте карту сюда';
                emptyPile.classList.add('stage2-empty-discard');
            } else {
                emptyPile.title = 'Сброс пуст';
            }
            
            discardElement.appendChild(emptyPile);
        }
    }
    
    // Создание элемента карты
    function createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.cardId = card.id;
        cardElement.dataset.cardValue = card.value;
        cardElement.dataset.cardSuit = card.suit;
        
        // Используем изображения карт, если они доступны и включены в настройках
        if (game.settings.useCardImages) {
            // Карта лицом вверх или вниз
            if (card.faceUp) {
                const cardImg = document.createElement('img');
                cardImg.src = getCardImageUrl(card);
                cardImg.className = 'card-image';
                cardImg.alt = `${card.value}${card.suit}`;
                cardElement.appendChild(cardImg);
            } else {
                const cardBackImg = document.createElement('img');
                cardBackImg.src = 'img/card-back.svg';
                cardBackImg.className = 'card-back-image';
                cardBackImg.alt = 'Рубашка карты';
                cardElement.appendChild(cardBackImg);
            }
        } else {
            // Стандартное отображение с HTML/CSS
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
        }
        
        return cardElement;
    }
    
    // Отрисовка руки игрока с использованием новой функции создания элемента карты
    function renderPlayerHand() {
        const playerHandContainer = document.querySelector('.player-hand');
        playerHandContainer.innerHTML = '';
        
        // Получаем карты текущего игрока
        const playerCards = game.players[0].cards;
        
        // Отображаем каждую карту
        playerCards.forEach((card, index) => {
            const cardElement = createCardElement(card);
            
            // Позиционируем карты в руке веером для лучшего отображения
            const handSize = playerCards.length;
            const maxOffset = Math.min(40, 200 / handSize); // Ограничиваем смещение для большого количества карт
            const offsetPercent = index / Math.max(1, handSize - 1); // От 0 до 1
            const offset = (offsetPercent - 0.5) * maxOffset * 2; // От -maxOffset до +maxOffset
            
            cardElement.style.transform = `translateY(${offset}px) rotate(${offset / 2}deg)`;
            cardElement.style.zIndex = index;
            cardElement.style.marginLeft = `-${Math.min(40, 70 / handSize)}px`; // Накладываем карты друг на друга
            
            // Добавляем класс для отображения карт в руке
            cardElement.classList.add('hand-card');
            
            // Добавляем порядковый номер карты для ясности
            cardElement.dataset.cardIndex = index;
            
            // Добавляем обработчик события клика по карте
            cardElement.addEventListener('click', cardClickHandler);
            
            // Эффект при наведении на карту в руке
            cardElement.addEventListener('mouseover', function() {
                if (!cardElement.classList.contains('selected')) {
                    cardElement.style.transform = `translateY(-20px) rotate(${offset / 2}deg)`;
                    cardElement.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
                    cardElement.style.zIndex = 100 + index;
                }
            });
            
            cardElement.addEventListener('mouseout', function() {
                if (!cardElement.classList.contains('selected')) {
                    cardElement.style.transform = `translateY(${offset}px) rotate(${offset / 2}deg)`;
                    cardElement.style.boxShadow = '';
                    cardElement.style.zIndex = index;
                }
            });
            
            // Добавляем карту в контейнер руки игрока
            playerHandContainer.appendChild(cardElement);
        });
        
        // Показываем все кнопки, но управляем их доступностью
        drawCardButton.style.display = 'block';
        playCardButton.style.display = 'block';
        selfCardButton.style.display = 'block';
        
        // Если не ход игрока - делаем кнопки недоступными
        if (!isMyTurn) {
            drawCardButton.disabled = true;
            playCardButton.disabled = true;
            selfCardButton.disabled = true;
            
            // Добавляем класс для визуального отображения недоступности
            drawCardButton.classList.add('disabled');
            playCardButton.classList.add('disabled');
            selfCardButton.classList.add('disabled');
            
            // Снимаем выделение со всех карт
            document.querySelectorAll('.player-hand .card.selected').forEach(card => {
                card.classList.remove('selected');
            });
            
            // Снимаем подсветку со всех карт на столе
            document.querySelectorAll('.table-card.highlighted').forEach(card => {
                card.classList.remove('highlighted');
            });
            
            // Если это ход бота, запускаем его логику с задержкой
            if (game.players[currentPlayerIndex].isAI) {
                showGameMessage(`Ход игрока ${game.players[currentPlayerIndex].name}`);
                
                setTimeout(playAITurn, 15000); // Увеличиваем время на ход бота до 15 секунд
            }
        } else {
            // Если ход игрока - делаем кнопки доступными
            drawCardButton.disabled = false;
            playCardButton.disabled = false;
            selfCardButton.disabled = false;
            
            // Убираем класс недоступности
            drawCardButton.classList.remove('disabled');
            playCardButton.classList.remove('disabled');
            selfCardButton.classList.remove('disabled');
        }
        
        // Активируем drag-and-drop для карт
        enableDragAndDrop();
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
            selfCardButton.style.display = 'block';
            showGameMessage('Ваш ход!');
        } else {
            drawCardButton.style.display = 'none';
            playCardButton.style.display = 'none';
            selfCardButton.style.display = 'none';
            
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
                
                setTimeout(playAITurn, 5000); // Увеличиваем время на ход бота до 5 секунд
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
            // Определяем ранг карт для сравнения
            const cardValues = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '3', '4', '5'];
            const cardRank = cardValues.indexOf(card.value);
            const targetRank = cardValues.indexOf(targetCard.value);
            
            // Проверка для туза (можно положить только 2 на туз)
            if (targetCard.value === 'A') {
                return card.value === '2';
            }
            
            // В первой стадии важен только ранг карты, масть не имеет значения
            // Проверяем, что наша карта на 1 ранг выше целевой
            return cardRank === targetRank + 1;
        } else if (game.gameStage === 'stage2') {
            // Во второй стадии карту можно сыграть, если совпадает масть или значение
            if (game.discardPile.length === 0) {
                // На пустой сброс можно положить любую карту
                return true;
            }
            
            const topCard = game.discardPile[game.discardPile.length - 1];
            return (card.suit === topCard.suit || card.value === topCard.value);
        }
        
        // Для третьей стадии или если стадия не определена
        return false;
    }
    
    // Проверка возможности сыграть карту на любую из карт на столе
    function canPlayCardOnTable(card) {
        // Проверяем каждого игрока, кроме первого (это сам игрок)
        for (let i = 1; i < game.players.length; i++) {
            const player = game.players[i];
            
            // Проверяем только открытые карты
            const openCards = player.cards.filter(c => c.faceUp);
            
            for (const targetCard of openCards) {
                if (canPlayCard(card, targetCard)) {
                    return true;
                }
            }
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
                
                // Ищем только верхние открытые карты на столе у каждого игрока
                // Для каждого игрока находим только самую верхнюю открытую карту
                const tableCards = playerElem.querySelectorAll('.table-card.card-front');
                if (tableCards.length > 0) {
                    // Берем только самую верхнюю (последнюю) открытую карту
                    const topCardElem = tableCards[tableCards.length - 1];
                    
                    const valueElem = topCardElem.querySelector('.card-value');
                    if (valueElem) {
                        const value = valueElem.textContent;
                        
                        // Если это туз - проверяем, подходит ли наша карта (только 2)
                        if (value === 'A') {
                            if (cardValue === '2') {
                                console.log(`  Найден туз - подходящая цель для карты ${cardValue}!`);
                                topCardElem.classList.add('highlighted');
                                topCardElem.dataset.targetFor = selectedCard.dataset.cardId;
                            }
                            return;
                        }
                        
                        const targetRank = cardValues.indexOf(value);
                        
                        console.log(`- Карта с рангом: ${targetRank}, значение: ${value}`);
                        
                        // Если выбранная карта на 1 ранг выше целевой - подсвечиваем как возможную цель
                        // В первой стадии масть не имеет значения
                        if (cardRank === targetRank + 1) {
                            console.log(`  Найдена подходящая цель! ${value}`);
                            topCardElem.classList.add('highlighted');
                            
                            // Устанавливаем атрибут, чтобы знать, на какую карту можно положить выбранную
                            topCardElem.dataset.targetFor = selectedCard.dataset.cardId;
                        }
                    }
                }
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
                // Сначала проверяем, может ли игрок сыграть какой-то из своих карт на карты соперников
                const canPlayAnyCard = playerCanMakeAnyMove();
                
                if (canPlayAnyCard) {
                    showGameMessage('Сначала попробуйте сыграть одной из своих карт!', 2000);
                    return;
                }
                
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
                        // Если нельзя сыграть карту на карты других игроков, проверяем возможность сыграть на свои карты
                        const canPlayOnSelf = checkCanPlayOnSelf(drawnCard);
                        
                        if (canPlayOnSelf) {
                            // Если можно сыграть на свои карты, показываем сообщение
                            showGameMessage('Вы можете положить взятую карту на свою карту', 2000);
                            
                            // Не передаем ход сразу, давая игроку возможность сыграть карту на свою
                            return;
                        } else {
                            // Если нельзя сыграть карту ни на чьи карты, передаем ход
                            setTimeout(() => {
                                showGameMessage('Ход переходит к следующему игроку', 1500);
                                const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                                setCurrentPlayer(nextPlayerIndex);
                            }, 2000);
                        }
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
                // Логика для второй стадии (оставляем без изменений)
                // ... existing code ...
            }
        }
    });

    // Обработчик нажатия на кнопку "Сыграть"
    playCardButton.addEventListener('click', function() {
        if (!isMyTurn) return;
        
        // Получаем выбранную карту
        const selectedCardElem = document.querySelector('.player-hand .card.selected');
        if (!selectedCardElem) {
            showGameMessage('Сначала выберите карту для игры');
            return;
        }
        
        // Получаем подсвеченную карту-цель
        const targetCardElem = document.querySelector('.table-card.highlighted');
        if (!targetCardElem) {
            showGameMessage('Выберите карту, на которую хотите сыграть, или возьмите новую карту');
            return;
        }
        
        // Получаем id выбранной карты и карты-цели
        const selectedCardId = selectedCardElem.dataset.cardId;
        const targetCardId = targetCardElem.dataset.cardId;
        
        // Находим карту в руке игрока
        const playerCards = game.players[0].cards;
        const cardIndex = playerCards.findIndex(card => card.id === selectedCardId);
        
        if (cardIndex === -1) {
            console.error('Выбранная карта не найдена в руке игрока');
            return;
        }
        
        const selectedCard = playerCards[cardIndex];
        
        // Определяем целевого игрока и индекс его карты
        let targetPlayerIndex = -1;
        let targetCardIndex = -1;
        
        // Находим игрока, которому принадлежит карта-цель
        document.querySelectorAll('.player').forEach((playerElem, playerIdx) => {
            // Проверяем, содержит ли игрок выбранную карту-цель
            const isTarget = playerElem.contains(targetCardElem);
            if (isTarget) {
                targetPlayerIndex = playerIdx;
                
                // Находим индекс карты у целевого игрока
                const targetPlayer = game.players[targetPlayerIndex];
                targetCardIndex = targetPlayer.cards.findIndex(card => card.id === targetCardId);
            }
        });
        
        // Проверяем, что цель была найдена
        if (targetPlayerIndex === -1 || targetCardIndex === -1) {
            console.error('Целевая карта не найдена');
            return;
        }
        
        // Получаем целевую карту
        const targetCard = game.players[targetPlayerIndex].cards[targetCardIndex];
        
        // Проверяем, можно ли сыграть выбранную карту на целевую
        if (!canPlayCard(selectedCard, targetCard)) {
            showGameMessage('Эту карту нельзя сыграть на выбранную цель');
            return;
        }
        
        // Играем карту - удаляем из руки игрока и кладем на место целевой карты
        const playedCard = playerCards.splice(cardIndex, 1)[0];
        game.players[targetPlayerIndex].cards[targetCardIndex] = playedCard;
        
        // Обновляем отображение
        renderPlayers();
        renderPlayerHand();
        
        // Сообщение о ходе
        showGameMessage(`Вы положили ${playedCard.value}${playedCard.suit} на карту игрока ${game.players[targetPlayerIndex].name}`);
        
        // Проверяем на победителя
        if (playerCards.length === 0) {
            // Игрок избавился от всех карт - победа!
            showGameMessage('Поздравляем! Вы победили!', 5000);
            checkForWinner();
            return;
        }
        
        // Берем новую карту из колоды, если это требуется по правилам
        if (game.gameStage === 'stage1' && game.deck.length > 0) {
            // Берем карту из колоды
            const drawnCard = game.deck.pop();
            drawnCard.faceUp = true; // Открываем карту
            
            // Добавляем карту игроку
            playerCards.push(drawnCard);
            
            // Обновляем отображение
            updateDeckInfo();
            renderPlayerHand();
            
            // Сообщение о взятой карте
            showGameMessage(`Вы взяли карту из колоды: ${drawnCard.value}${drawnCard.suit}`);
            
            // Проверяем, не закончилась ли колода
            if (game.deck.length === 0) {
                console.log('Колода закончилась, переходим ко второй стадии');
                checkGameStageProgress();
            }
            
            // Проверяем, может ли игрок сделать еще один ход
            const canPlay = canPlayCardOnTable(drawnCard);
            if (canPlay) {
                // Если новую карту можно сыграть, даем игроку еще один ход
                showGameMessage('Вы можете сыграть взятую карту');
                
                // Выделяем взятую карту
                setTimeout(() => {
                    const newCardElement = document.querySelector(`.player-hand .card[data-card-id="${drawnCard.id}"]`);
                    if (newCardElement) {
                        newCardElement.click(); // Имитируем клик по карте для её выделения
                    }
                }, 300);
                
                return; // Игрок может продолжить ход
            }
        }
        
        // Если игрок не может продолжить ход или это стадия 2, передаем ход следующему игроку
        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
        setCurrentPlayer(nextPlayerIndex);
    });
    
    // Обработчик кнопки "Положить себе"
    selfCardButton.addEventListener('click', function() {
        if (isMyTurn) {
            const selectedCard = document.querySelector('.player-hand .card.selected');
            
            if (selectedCard) {
                const cardId = selectedCard.dataset.cardId;
                const playerCards = game.players[0].cards;
                const cardIndex = playerCards.findIndex(card => card.id === cardId);
                
                if (cardIndex !== -1) {
                    const cardToPlay = playerCards[cardIndex];
                    
                    // Сначала проверяем, может ли игрок сыграть картой на карты соперников
                    const canPlayOnOpponents = canPlayCardOnTable(cardToPlay);
                    
                    if (canPlayOnOpponents) {
                        showGameMessage('Эту карту можно сыграть на карту соперника. Нажмите "Сыграть"', 2000);
                        return;
                    }
                    
                    // Проверяем, есть ли у игрока открытые карты, на которые можно положить выбранную
                    const openCards = playerCards.filter(card => card.faceUp);
                    let canSelfPlay = false;
                    let targetCardIndex = -1;
                    
                    for (let i = 0; i < openCards.length; i++) {
                        if (openCards[i].id === cardToPlay.id) continue; // Пропускаем саму карту
                        
                        // Проверяем, что карта на 1 ранг выше цели (как и при обычном ходе)
                        if (canPlayCard(cardToPlay, openCards[i])) {
                            canSelfPlay = true;
                            targetCardIndex = playerCards.findIndex(card => card.id === openCards[i].id);
                            break;
                        }
                    }
                    
                    if (canSelfPlay && targetCardIndex !== -1) {
                        // Удаляем выбранную карту из руки
                        const playedCard = playerCards.splice(cardIndex, 1)[0];
                        
                        // Заменяем целевую карту
                        playerCards[targetCardIndex] = playedCard;
                        
                        // Обновляем отображение
                        renderPlayerHand();
                        renderPlayers();
                        
                        // Показываем сообщение
                        showGameMessage(`Вы положили карту ${playedCard.value}${playedCard.suit} на свою карту`);
                        
                        // После хода берем карту из колоды
                        if (game.deck.length > 0) {
                            const drawnCard = game.deck.pop();
                            drawnCard.faceUp = true;
                            playerCards.push(drawnCard);
                            
                            renderPlayerHand();
                            updateDeckInfo();
                            
                            showGameMessage(`Вы взяли карту из колоды: ${drawnCard.value}${drawnCard.suit}`);
                            
                            // Проверяем, не закончилась ли колода
                            if (game.deck.length === 0) {
                                checkGameStageProgress();
                            }
                            
                            // Проверяем, может ли игрок снова сделать ход
                            const canPlayAgain = canPlayCardOnTable(drawnCard);
                            
                            if (canPlayAgain) {
                                // Выделяем взятую карту и подсвечиваем возможные цели
                                setTimeout(() => {
                                    const newCardElement = document.querySelector(`.player-hand .card[data-card-id="${drawnCard.id}"]`);
                                    if (newCardElement) {
                                        newCardElement.click(); // Имитируем клик по карте для её выделения
                                        showGameMessage('Вы можете сыграть взятую карту на карту соперника', 2000);
                                    }
                                }, 300);
                                
                                // Не передаем ход, так как игрок может снова ходить
                                return;
                            }
                        }
                        
                        // После того, как игрок сыграл на свою карту и уже не может сделать другой ход,
                        // передаем ход следующему игроку
                        setTimeout(() => {
                            showGameMessage('Ход переходит к следующему игроку', 1500);
                            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                            setCurrentPlayer(nextPlayerIndex);
                        }, 1500);
                    } else {
                        showGameMessage('Нельзя положить эту карту ни на одну из ваших карт');
                    }
                }
            } else {
                showGameMessage('Сначала выберите карту для хода');
            }
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
            
            let madeTurn = makeAIMove();
            
            // Если бот смог сделать ход
            if (madeTurn) {
                // Проверяем, может ли бот сделать еще ход (рекурсивно)
                setTimeout(() => {
                    playAITurn();
                }, 15000); // Увеличиваем время хода бота до 15 секунд
            } else {
                // Если бот не смог сделать ход, передаем ход следующему игроку
                setTimeout(() => {
                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                    console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                    setCurrentPlayer(nextPlayerIndex);
                }, 15000); // Увеличиваем время хода бота до 15 секунд
            }
        }
        // Для второй стадии используем другую логику (оставим на потом)
    }

    // Функция для выполнения одного хода ботом
    function makeAIMove() {
        const aiPlayer = game.players[currentPlayerIndex];
        
        // Выбираем все карты бота, которые можно использовать
        const playableCards = aiPlayer.cards.filter(card => card.faceUp);
        console.log(`У бота ${playableCards.length} открытых карт`);
        
        // Шаг 1: Проверяем, может ли бот положить карту на карты других игроков
        let bestMove = findBestMoveForAI(playableCards);
        
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
                
                return true; // Ход сделан успешно
            } else {
                // Колода закончилась - переходим ко второй стадии
                checkGameStageProgress();
                return true; // Ход сделан успешно, но карты не взяли
            }
        } else {
            console.log('Бот не нашел возможности положить карту на карты противников. Берет карту из колоды...');
            
            // Шаг 2: Если не можем сыграть на карты других, берём карту из колоды
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
                
                // Проверяем, можно ли сыграть только что взятой картой на карты противников
                for (let i = 0; i < game.players.length; i++) {
                    if (i === currentPlayerIndex) continue; // Пропускаем себя
                    
                    const targetPlayer = game.players[i];
                    // Ищем только открытые карты соперников
                    const targetOpenCards = targetPlayer.cards.filter(c => c.faceUp);
                    
                    for (const targetCard of targetOpenCards) {
                        if (canPlayCard(drawnCard, targetCard)) {
                            // Бот может сыграть взятой картой на карту соперника
                            
                            // Удаляем карту из руки бота
                            const cardIndex = aiPlayer.cards.findIndex(c => c.id === drawnCard.id);
                            const playedCard = aiPlayer.cards.splice(cardIndex, 1)[0];
                            
                            // Кладем карту поверх карты противника
                            const targetCardIndex = targetPlayer.cards.findIndex(c => c.id === targetCard.id);
                            targetPlayer.cards[targetCardIndex] = playedCard;
                            
                            // Обновляем отображение
                            renderPlayers();
                            
                            // Показываем сообщение
                            showGameMessage(`${aiPlayer.name} кладет взятую карту ${playedCard.value}${playedCard.suit} на карту игрока ${targetPlayer.name}`);
                            
                            // Берем еще одну карту из колоды
                            if (game.deck.length > 0) {
                                const newCard = game.deck.pop();
                                newCard.faceUp = true;
                                aiPlayer.cards.push(newCard);
                                
                                updateDeckInfo();
                                showGameMessage(`${aiPlayer.name} берет карту из колоды: ${newCard.value}${newCard.suit}`);
                                
                                if (game.deck.length === 0) {
                                    checkGameStageProgress();
                                }
                            }
                            
                            return true; // Ход сделан успешно
                        }
                    }
                }
                
                // Шаг 3: Если не можем сыграть взятой картой на карты противников, 
                // проверяем, можно ли положить карту на свои карты
                const selfMove = canAIPlayCardOnSelf(drawnCard);
                
                if (selfMove) {
                    console.log(`Бот нашел ход на свою карту со взятой картой ${drawnCard.value}${drawnCard.suit}`);
                    
                    // Удаляем карту из руки бота
                    const cardIndex = aiPlayer.cards.findIndex(c => c.id === drawnCard.id);
                    const playedCard = aiPlayer.cards.splice(cardIndex, 1)[0];
                    
                    // Находим подходящую открытую карту
                    const targetCards = aiPlayer.cards.filter(c => c.faceUp && canPlayCard(playedCard, c));
                    if (targetCards.length > 0) {
                        // Кладем карту поверх своей карты
                        const targetCardIndex = aiPlayer.cards.findIndex(c => c.id === targetCards[0].id);
                        aiPlayer.cards[targetCardIndex] = playedCard;
                        
                        // Обновляем отображение
                        renderPlayers();
                        
                        // Показываем сообщение
                        showGameMessage(`${aiPlayer.name} кладет взятую карту ${playedCard.value}${playedCard.suit} на свою карту`);
                        
                        // Берем карту из колоды после хода
                        if (game.deck.length > 0) {
                            const newCard = game.deck.pop();
                            newCard.faceUp = true;
                            aiPlayer.cards.push(newCard);
                            
                            updateDeckInfo();
                            showGameMessage(`${aiPlayer.name} берет карту из колоды: ${newCard.value}${newCard.suit}`);
                            
                            if (game.deck.length === 0) {
                                checkGameStageProgress();
                            }
                        }
                        
                        return false; // Бот положил на свою карту, ход завершается
                    }
                } else {
                    // Шаг 4: Если не можем сыграть взятой картой ни на карты противников, ни на свои карты,
                    // проверяем имеющиеся карты бота на возможность сыграть на свои карты
                    const selfMoveWithExistingCard = findSelfMoveForAI(playableCards);
                    
                    if (selfMoveWithExistingCard) {
                        console.log(`Бот нашел ход на свою карту с существующей картой ${selfMoveWithExistingCard.card.value}${selfMoveWithExistingCard.card.suit}`);
                        
                        // Удаляем карту из руки бота
                        const playedCard = aiPlayer.cards.splice(selfMoveWithExistingCard.cardIndex, 1)[0];
                        
                        // Кладем карту поверх своей карты
                        aiPlayer.cards[selfMoveWithExistingCard.targetCardIndex] = playedCard;
                        
                        // Обновляем отображение
                        renderPlayers();
                        
                        // Показываем сообщение
                        showGameMessage(`${aiPlayer.name} кладет карту ${playedCard.value}${playedCard.suit} на свою карту`);
                        
                        return false; // Ход завершен, бот положил карту себе
                    }
                    
                    console.log('Бот не нашел возможности положить карту на свои карты. Ход переходит к следующему игроку');
                }
                
                // Если не можем ни сыграть взятой картой на карты противников, ни положить на свои карты
                return false; // Ход завершен, бот просто взял карту
            } else {
                // Колода закончилась - проверяем переход ко второй стадии
                checkGameStageProgress();
                return false; // Ход завершен
            }
        }
    }
    
    // Поиск лучшего хода для ИИ
    function findBestMoveForAI(playableCards) {
        console.log(`Стадия 1: Бот ищет карты для хода...`);
        
        // Перебираем все карты, которыми можно сыграть
        for (const card of playableCards) {
            console.log(`Проверяем карту ${card.value}${card.suit}`);
            
            // Проверяем возможность сыграть на карты других игроков
            for (let i = 0; i < game.players.length; i++) {
                // Пропускаем себя
                if (i === currentPlayerIndex) continue;
                
                const targetPlayer = game.players[i];
                console.log(`Игрок ${i} имеет ${targetPlayer.cards.filter(c => c.faceUp).length} открытых карт`);
                
                // Берем только открытые карты игрока
                const openCards = targetPlayer.cards.filter(c => c.faceUp);
                if (openCards.length === 0) continue;
                
                // Берем только верхнюю открытую карту для проверки
                const topCard = openCards[openCards.length - 1];
                
                // Проверяем, можно ли положить карту на эту карту
                if (canPlayCard(card, topCard)) {
                    console.log(`Найдена подходящая цель: ${topCard.value}${topCard.suit}`);
                    
                    // Возвращаем информацию о найденном ходе
                    return {
                        card: card,
                        cardIndex: game.players[currentPlayerIndex].cards.indexOf(card),
                        targetPlayer: targetPlayer,
                        targetPlayerIndex: i,
                        targetCard: topCard,
                        targetCardIndex: targetPlayer.cards.indexOf(topCard)
                    };
                }
            }
        }
        
        // Если не нашли подходящий ход
        console.log('Бот не нашел возможности положить карту на карты противников. Бот ложит карту себе и передает ход уже по часовой стрелке.');
        return null;
    }
    
    // Функция поиска хода на свои карты для бота
    function findSelfMoveForAI(playableCards) {
        const aiPlayer = game.players[currentPlayerIndex];
        
        // Для каждой открытой карты в руке бота
        for (const card of playableCards) {
            console.log(`Проверяем возможность положить карту ${card.value}${card.suit} на свою карту`);
            
            // Ищем подходящие открытые карты в своей руке
            const selfTargetCards = aiPlayer.cards.filter(c => c.faceUp && c.id !== card.id);
            
            for (const targetCard of selfTargetCards) {
                // Проверка правила "на 1 ранг выше"
                const cardRank = cardValues.indexOf(card.value);
                const targetRank = cardValues.indexOf(targetCard.value);
                
                // Проверка для туза (можно положить только 2 на туз)
                if (targetCard.value === 'A' && card.value === '2') {
                    console.log(`Найдена подходящая своя карта: ${targetCard.value}${targetCard.suit}`);
                    return {
                        card: card,
                        cardIndex: aiPlayer.cards.findIndex(c => c.id === card.id),
                        targetCard: targetCard,
                        targetCardIndex: aiPlayer.cards.findIndex(c => c.id === targetCard.id)
                    };
                }
                // Проверка стандартного правила "на 1 ранг выше"
                else if (cardRank === targetRank + 1) {
                    console.log(`Найдена подходящая своя карта: ${targetCard.value}${targetCard.suit}`);
                    return {
                        card: card,
                        cardIndex: aiPlayer.cards.findIndex(c => c.id === card.id),
                        targetCard: targetCard,
                        targetCardIndex: aiPlayer.cards.findIndex(c => c.id === targetCard.id)
                    };
                }
            }
        }
        
        return null; // Не найдено подходящего хода
    }
    
    // Функция проверки, может ли бот положить карту на свою карту
    function canAIPlayCardOnSelf(card) {
        const aiPlayer = game.players[currentPlayerIndex];
        const openCards = aiPlayer.cards.filter(c => c.faceUp && c.id !== card.id); // Исключаем саму карту
        
        for (const targetCard of openCards) {
            if (canPlayCard(card, targetCard)) {
                return true;
            }
        }
        
        return false;
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

    // Обработчики для модального окна с правилами
    showRulesButton.addEventListener('click', function() {
        // Скрываем модальное окно настроек
        settingsModal.classList.remove('visible');
        // Показываем модальное окно с правилами
        rulesModal.classList.add('visible');
    });
    
    closeRulesButton.addEventListener('click', function() {
        // Скрываем модальное окно с правилами
        rulesModal.classList.remove('visible');
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

    // Функция для проверки возможности положить карту на одну из своих карт
    function checkCanPlayOnSelf(card) {
        const playerCards = game.players[0].cards.filter(c => c.faceUp && c.id !== card.id); // Исключаем саму карту
        
        for (const targetCard of playerCards) {
            if (canPlayCard(card, targetCard)) {
                return true;
            }
        }
        
        return false;
    }

    // Функция проверки, может ли игрок сделать любой ход
    function playerCanMakeAnyMove() {
        const myCards = game.players[0].cards.filter(card => card.faceUp);
        
        // Проверяем для каждой карты в руке, можно ли ее сыграть на карты соперников
        for (const card of myCards) {
            if (canPlayCardOnTable(card)) {
                return true;
            }
        }
        
        return false;
    }

    // Проверяет, может ли карта быть сыграна на карты других игроков
    function canPlayCardOnTable(card) {
        // Проверяем каждого игрока, кроме первого (это сам игрок)
        for (let i = 1; i < game.players.length; i++) {
            const player = game.players[i];
            
            // Проверяем только открытые карты
            const openCards = player.cards.filter(c => c.faceUp);
            
            for (const targetCard of openCards) {
                if (canPlayCard(card, targetCard)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // Добавляем поддержку перетаскивания карт (drag and drop)
    function enableDragAndDrop() {
        // Находим все карты в руке игрока
        const playerCards = document.querySelectorAll('.player-hand .card');
        
        // Для каждой карты добавляем обработчики перетаскивания
        playerCards.forEach(card => {
            card.setAttribute('draggable', 'true');
            
            // Начало перетаскивания
            card.addEventListener('dragstart', function(e) {
                // Проверяем, что сейчас ход игрока и кнопки активны
                if (!isMyTurn || drawCardButton.disabled) {
                    e.preventDefault();
                    return;
                }
                
                // Сохраняем ID карты в данных перетаскивания
                e.dataTransfer.setData('text/plain', card.dataset.cardId);
                
                // Добавляем класс перетаскивания
                card.classList.add('dragging');
                
                // Если ранее карта была выбрана, имитируем клик для выделения
                if (!card.classList.contains('selected')) {
                    card.click();
                }
                
                // Устанавливаем изображение при перетаскивании
                if (e.dataTransfer.setDragImage) {
                    e.dataTransfer.setDragImage(card, 35, 50);
                }
            });
            
            // Окончание перетаскивания
            card.addEventListener('dragend', function() {
                card.classList.remove('dragging');
            });
        });
        
        // Находим все возможные цели для перетаскивания
        const tablePlayers = document.querySelectorAll('.player');
        
        // Добавляем обработчики для зон перетаскивания
        tablePlayers.forEach(player => {
            // Когда карта перетаскивается над игроком
            player.addEventListener('dragover', function(e) {
                // Отменяем стандартное поведение (запрет перетаскивания)
                e.preventDefault();
                
                // Находим подсвеченные карты этого игрока
                const highlightedCards = player.querySelectorAll('.table-card.highlighted');
                if (highlightedCards.length > 0) {
                    player.classList.add('drag-target');
                }
            });
            
            // Когда карта уходит из зоны игрока
            player.addEventListener('dragleave', function() {
                player.classList.remove('drag-target');
            });
            
            // Когда карта брошена на игрока
            player.addEventListener('drop', function(e) {
                e.preventDefault();
                player.classList.remove('drag-target');
                
                // Получаем ID перетаскиваемой карты
                const cardId = e.dataTransfer.getData('text/plain');
                if (!cardId) return;
                
                // Находим первую подсвеченную карту этого игрока
                const targetCard = player.querySelector(`.table-card.highlighted[data-target-for="${cardId}"]`);
                if (targetCard) {
                    // Если нашли подходящую цель, симулируем нажатие на кнопку "Сыграть"
                    playCardButton.click();
                }
            });
        });
        
        // Добавляем обработчик для возможности положить карту себе
        const selfCardArea = document.querySelector('.current-player-info');
        if (selfCardArea) {
            selfCardArea.addEventListener('dragover', function(e) {
                e.preventDefault();
                
                // Проверяем, может ли игрок положить выбранную карту на свою
                const selectedCard = document.querySelector('.player-hand .card.selected');
                if (selectedCard && checkCanPlayOnSelf(game.players[0].cards.find(c => c.id === selectedCard.dataset.cardId))) {
                    selfCardArea.classList.add('self-drop-target');
                }
            });
            
            selfCardArea.addEventListener('dragleave', function() {
                selfCardArea.classList.remove('self-drop-target');
            });
            
            selfCardArea.addEventListener('drop', function(e) {
                e.preventDefault();
                selfCardArea.classList.remove('self-drop-target');
                
                // Получаем ID перетаскиваемой карты
                const cardId = e.dataTransfer.getData('text/plain');
                if (!cardId) return;
                
                // Проверяем, что выбрана эта карта
                const selectedCard = document.querySelector(`.player-hand .card.selected[data-card-id="${cardId}"]`);
                if (selectedCard) {
                    // Симулируем нажатие на кнопку "Положить себе"
                    selfCardButton.click();
                }
            });
        }
    }

    // Предзагрузка изображений карт
    function preloadCardImages() {
        // Путь к изображениям карт
        const cardBackImage = new Image();
        cardBackImage.src = 'img/card-back.svg';
        
        // Проверка наличия пользовательских изображений карт, если их нет - используем стандартное отображение
        const testImage = new Image();
        testImage.src = 'img/cards/ace_of_spades.png'; // Проверяем наличие туза пик как пример
        
        testImage.onload = function() {
            console.log('Пользовательские изображения карт успешно загружены');
            game.settings.useCardImages = true;
        };
        
        testImage.onerror = function() {
            console.log('Пользовательские изображения карт не найдены, используем стандартное отображение');
            game.settings.useCardImages = false;
        };
    }
    
    // Функция для получения URL изображения карты
    function getCardImageUrl(card) {
        if (!card) return 'img/card-back.svg';
        
        // Преобразование значения карты для формирования пути к изображению
        let value = '';
        switch(card.value) {
            case 'J': value = 'jack'; break;
            case 'Q': value = 'queen'; break;
            case 'K': value = 'king'; break;
            case 'A': value = 'ace'; break;
            default: value = card.value; // Остальные значения остаются без изменений
        }
        
        // Преобразование масти
        let suit = '';
        switch(card.suit) {
            case '♠': suit = 'spades'; break;
            case '♥': suit = 'hearts'; break;
            case '♦': suit = 'diamonds'; break;
            case '♣': suit = 'clubs'; break;
        }
        
        // Формирование пути к изображению карты в соответствии с нашей структурой
        return `img/cards/${value}_of_${suit}.png`;
    }
}); 