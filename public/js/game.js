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
        // Очищаем игровой стол
        playersContainer.innerHTML = '';
        playerHandElement.innerHTML = '';
        
        // Создаем объект игры
        game = {
            status: 'active',
            gameStage: 'stage1',
            players: [],
            deck: [],
            discardPile: [],
            currentTurn: 0,
            openCard: null // Добавляем свойство для открытой карты в центре стола
        };
        
        // Инициализируем информацию о стадии игры
        stageNumberElement.textContent = 'Стадия 1';
        stageDescriptionElement.textContent = 'Набор карт';
        
        // Добавляем текущего игрока
        const currentUser = JSON.parse(user);
        game.players.push({
            userId: currentUser.id,
            name: currentUser.username || 'Игрок',
            cards: [],
            isAI: false // Явно указываем, что это не бот
        });
        
        // Получаем количество игроков из настроек или используем значение по умолчанию
        let playerCount = 4;
        try {
            const settings = localStorage.getItem('gameSettings');
            if (settings) {
                const parsedSettings = JSON.parse(settings);
                playerCount = parsedSettings.playerCount || 4;
                withAI = parsedSettings.withAI || false;
            }
        } catch (e) {
            console.error('Ошибка при чтении настроек:', e);
        }
        
        // Добавляем ботов
        for (let i = 1; i < playerCount; i++) {
            game.players.push({
                userId: `bot_${i}`,
                name: `Бот ${i}`,
                cards: [],
                isAI: true // Явно указываем, что это бот
            });
        }
        
        // Инициализируем колоду
        initializeDeck();
        
        // Раздаем начальные карты
        dealInitialCards();
        
        // Определяем первого игрока
        const firstPlayer = determineFirstPlayer();
        
        // Отрисовываем игроков и колоду
        renderPlayers();
        renderPlayerHand();
        updateDeckInfo();
        
        // Логируем состояние колоды после инициализации
        logDeckState("Инициализация игры");
        
        // Устанавливаем первого игрока
        setCurrentPlayer(firstPlayer);
        
        // Показываем информационное сообщение о начале игры
        showGameMessage(`Игра начинается! Первым ходит игрок ${game.players[firstPlayer].name}!`);
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
        
        // Открываем одну карту в центре стола для первой стадии
        const tableCard = game.deck.pop();
        tableCard.faceUp = true;
        game.openCard = tableCard;
        
        // Логируем начальную открытую карту
        console.log(`Начальная открытая карта в центре: ${tableCard.value}${tableCard.suit}`);
        
        // Оставляем пустой сброс для первой стадии
        game.discardPile = [];
    }
    
    // Определение игрока с самой высокой открытой картой
    function determineFirstPlayer() {
        // Всегда начинаем с первого игрока (обычно это человек)
        return 0;
        
        /* Старая логика определения первого хода по самой высокой карте
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
        
        return highestCardPlayer;
        */
    }
    
    // Отрисовка игроков вокруг стола
    function renderPlayers() {
        // В этой функции отображаются игроки и их карты на столе
        // Важный момент: в первой стадии игры происходит наложение карт друг на друга.
        // Когда игрок или бот кладет карту поверх другой карты, в массиве game.players[i].cards
        // одна карта просто заменяется другой (индекс остается тем же).
        // Этот процесс виден на столе благодаря обновлению отображения после каждого такого хода.
        
        const totalPlayers = game.players.length;
        
        // Позиции для 4-9 игроков
        const positions = {
            4: [
                { top: '80%', left: '50%' }, // Текущий игрок (снизу)
                { top: '10%', left: '50%' }, // Напротив
                { top: '50%', left: '10%' }, // Слева
                { top: '50%', left: '90%' }  // Справа
            ],
            5: [
                { top: '80%', left: '50%' }, // Текущий игрок (снизу)
                { top: '10%', left: '30%' }, // Сверху слева
                { top: '10%', left: '70%' }, // Сверху справа
                { top: '50%', left: '10%' }, // Слева
                { top: '50%', left: '90%' }  // Справа
            ],
            6: [
                { top: '80%', left: '50%' }, // Текущий игрок (снизу)
                { top: '10%', left: '20%' }, // Сверху слева
                { top: '10%', left: '50%' }, // Сверху центр
                { top: '10%', left: '80%' }, // Сверху справа
                { top: '50%', left: '10%' }, // Слева
                { top: '50%', left: '90%' }  // Справа
            ],
            7: [
                { top: '80%', left: '50%' }, // Текущий игрок (снизу)
                { top: '10%', left: '20%' }, // Сверху слева
                { top: '10%', left: '50%' }, // Сверху центр
                { top: '10%', left: '80%' }, // Сверху справа
                { top: '45%', left: '10%' }, // Слева сверху
                { top: '65%', left: '10%' }, // Слева снизу
                { top: '45%', left: '90%' }  // Справа сверху
            ],
            8: [
                { top: '80%', left: '50%' }, // Текущий игрок (снизу)
                { top: '10%', left: '20%' }, // Сверху слева
                { top: '10%', left: '50%' }, // Сверху центр
                { top: '10%', left: '80%' }, // Сверху справа
                { top: '45%', left: '10%' }, // Слева сверху
                { top: '65%', left: '10%' }, // Слева снизу
                { top: '45%', left: '90%' }, // Справа сверху
                { top: '65%', left: '90%' }  // Справа снизу
            ],
            9: [
                { top: '80%', left: '50%' }, // Текущий игрок (снизу)
                { top: '10%', left: '20%' }, // Сверху слева
                { top: '10%', left: '50%' }, // Сверху центр
                { top: '10%', left: '80%' }, // Сверху справа
                { top: '40%', left: '10%' }, // Слева сверху
                { top: '60%', left: '10%' }, // Слева центр
                { top: '80%', left: '20%' }, // Слева снизу
                { top: '40%', left: '90%' }, // Справа сверху
                { top: '60%', left: '90%' }  // Справа центр
            ]
        };
        
        // Определяем набор позиций в зависимости от количества игроков
        const playerPositions = positions[totalPlayers] || positions[4];
        
        // Очищаем контейнер игроков
        playersContainer.innerHTML = '';
        
        // Создаем элементы игроков
        game.players.forEach((player, index) => {
            const playerElement = document.importNode(playerTemplate.content, true).querySelector('.player');
            
            // Устанавливаем id игрока
            playerElement.dataset.playerId = player.userId;
            
            // Устанавливаем имя игрока
            playerElement.querySelector('.player-name').textContent = player.name;
            
            // Устанавливаем количество карт
            playerElement.querySelector('.card-count').textContent = player.cards.length;
            
            // Позиционируем игрока
            const position = playerPositions[index];
            playerElement.style.top = position.top;
            playerElement.style.left = position.left;
            
            // Если это текущий игрок, добавляем соответствующий класс
            if (index === currentPlayerIndex) {
                playerElement.classList.add('active');
            }
            
            // Добавляем картам игрока отображение на столе
            renderTableCards(player, playerElement);
            
            // Добавляем элемент в контейнер
            playersContainer.appendChild(playerElement);
        });
    }
    
    // Функция для отображения карт игрока на столе
    function renderTableCards(player, playerElement) {
        // Создаем контейнер для карт на столе
        const tableCardsContainer = document.createElement('div');
        tableCardsContainer.className = 'player-table-cards';
        
        // В первой стадии показываем все карты игрока (2 закрытые и 1 открытую)
        if (game.gameStage === 'stage1') {
            // Отображаем закрытые и открытые карты в правильном порядке
            player.cards.forEach((card, cardIndex) => {
                const cardElement = document.createElement('div');
                cardElement.className = 'table-card';
                
                // Устанавливаем позицию карты с небольшим отступом
                const posX = cardIndex * 10;
                const posY = cardIndex * 5;
                let rotation = (cardIndex - 1) * 10;
                
                // Добавляем классы в зависимости от открытости карты
                if (!card.faceUp) {
                    cardElement.classList.add('card-back');
                    cardElement.style.transform = `rotate(${rotation}deg) translate(${posX}px, ${posY}px)`;
                } else {
                    cardElement.classList.add('card-front');
                    cardElement.dataset.cardId = card.id;
                    
                    if (card.isRed) {
                        cardElement.classList.add('red');
                    }
                    
                    cardElement.innerHTML = `
                        <div class="card-value">${card.value}</div>
                        <div class="card-suit">${card.suit}</div>
                    `;
                    
                    // Открытую карту немного приподнимаем
                    cardElement.style.transform = `rotate(${rotation}deg) translate(${posX}px, ${-10}px)`;
                }
                
                tableCardsContainer.appendChild(cardElement);
            });
        } else {
            // Для других стадий отображаем только открытые карты
            const visibleCards = player.cards.filter(card => card.faceUp);
            
            visibleCards.forEach((card, idx) => {
                const tableCard = document.createElement('div');
                tableCard.className = 'table-card card-front';
                if (card.isRed) {
                    tableCard.classList.add('red');
                }
                
                // Устанавливаем идентификатор карты
                tableCard.dataset.cardId = card.id;
                
                // Добавляем значение и масть
                tableCard.innerHTML = `
                    <div class="card-value">${card.value}</div>
                    <div class="card-suit">${card.suit}</div>
                `;
                
                // Позиционируем карту (с небольшим смещением, чтобы видеть все карты)
                tableCard.style.transform = `translateX(${idx * 10}px)`;
                
                tableCardsContainer.appendChild(tableCard);
            });
        }
        
        // Добавляем контейнер с картами к элементу игрока
        playerElement.appendChild(tableCardsContainer);
    }
    
    // Обновление отображения колоды и сброса
    function updateDeckInfo() {
        console.log('Обновление отображения колоды и центральной карты');
        
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
        
        // Добавляем счетчик колоды
        const countElement = document.createElement('div');
        countElement.className = 'card-count';
        countElement.textContent = game.deck.length;
        deckElement.appendChild(countElement);
        
        // Отображение открытой карты в центре стола для первой стадии
        if (game.gameStage === 'stage1' && game.openCard) {
            // Обновляем открытую карту в центре стола
            console.log(`Открытая карта в центре: ${game.openCard.value}${game.openCard.suit}`);
            
            const openCardElement = document.querySelector('.central-card');
            
            // Если элемент для открытой карты не существует, создаем его
            if (!openCardElement) {
                const newOpenCardElement = document.createElement('div');
                newOpenCardElement.className = 'central-card card-front';
                document.querySelector('.center-container').appendChild(newOpenCardElement);
            }
            
            const centerCardElement = document.querySelector('.central-card');
            
            // Устанавливаем классы в зависимости от цвета карты
            if (game.openCard.isRed) {
                centerCardElement.classList.add('red');
            } else {
                centerCardElement.classList.remove('red');
            }
            
            // Заполняем содержимое карты
            const valueElem = document.createElement('div');
            valueElem.className = 'card-value';
            valueElem.textContent = game.openCard.value;
            
            const suitElem = document.createElement('div');
            suitElem.className = 'card-suit';
            suitElem.textContent = game.openCard.suit;
            
            // Очищаем и добавляем новое содержимое
            centerCardElement.innerHTML = '';
            centerCardElement.appendChild(valueElem);
            centerCardElement.appendChild(suitElem);
            
            // Устанавливаем id карты в атрибут
            centerCardElement.dataset.cardId = game.openCard.id;
        }
        
        // Обновляем отображение сброса (для второй стадии)
        const discardElement = document.querySelector('.card-pile.discard');
        discardElement.innerHTML = ''; // Очищаем содержимое
        
        // Создаем элемент для отображения верхней карты сброса
        if (game.discardPile.length > 0) {
            const topCard = game.discardPile[game.discardPile.length - 1];
            
            // Создаем видимую карту сверху колоды сброса
            const topCardElement = document.createElement('div');
            topCardElement.className = 'card mini-card card-front';
            if (topCard.isRed) {
                topCardElement.classList.add('red');
            }
            
            topCardElement.innerHTML = `
                <div class="mini-value">${topCard.value}</div>
                <div class="mini-suit">${topCard.suit}</div>
            `;
            
            // Позиционируем верхнюю карту
            topCardElement.style.position = 'absolute';
            topCardElement.style.top = '0';
            topCardElement.style.left = '0';
            topCardElement.style.zIndex = game.discardPile.length;
            
            discardElement.appendChild(topCardElement);
            
            // Добавляем несколько карт позади для эффекта стопки (до 5 карт)
            const cardsToShow = Math.min(5, game.discardPile.length - 1);
            for (let i = 0; i < cardsToShow; i++) {
                const stackCard = document.createElement('div');
                stackCard.className = 'card mini-card card-back';
                // Смещение для видимости стопки
                stackCard.style.position = 'absolute';
                stackCard.style.top = `${(i + 1) * 2}px`;
                stackCard.style.left = `${(i + 1) * 2}px`;
                stackCard.style.zIndex = game.discardPile.length - i - 1;
                
                discardElement.appendChild(stackCard);
            }
        }
        
        // Добавляем счетчик сброса
        const discardCountElement = document.createElement('div');
        discardCountElement.className = 'card-count';
        discardCountElement.textContent = game.discardPile.length;
        discardElement.appendChild(discardCountElement);
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
    
    // Отображение карт текущего игрока с подсветкой возможных ходов
    function renderPlayerHand() {
        playerHandElement.innerHTML = '';
        
        // Получаем текущего игрока (индекс 0)
        const currentPlayer = game.players[0];
        
        // Обновляем имя игрока в панели
        playerNameElement.textContent = currentPlayer.name;
        
        // Отображаем карты
        currentPlayer.cards.forEach((card, index) => {
            const cardElement = createCardElement(card);
            
            // Добавляем информацию о возможности сыграть эту карту (для визуальной подсветки)
            if (card.faceUp) {
                cardElement.setAttribute('data-card-value', card.value);
                cardElement.setAttribute('data-card-suit', card.suit);
                
                // Проверяем, можно ли сыграть эту карту на какую-либо из карт на столе
                if (isMyTurn && canPlayCardOnTable(card)) {
                    cardElement.classList.add('playable');
                }
            }
            
            // Добавляем обработчик выбора карты
            cardElement.addEventListener('click', function() {
                if (isMyTurn && card.faceUp) {
                    const wasSelected = this.classList.contains('selected');
                    
                    // Снимаем выделение со всех карт
                    document.querySelectorAll('.player-hand .card').forEach(c => {
                        c.classList.remove('selected');
                    });
                    
                    // Если карта не была выбрана ранее, выбираем её
                    if (!wasSelected) {
                        // Выделяем текущую карту
                        this.classList.add('selected');
                        
                        // Проверяем, можно ли сыграть эту карту
                        const canPlay = canPlayCardOnTable(card);
                        
                        // Активируем кнопку "Сыграть" только если карту можно сыграть
                        playCardButton.disabled = !canPlay;
                        
                        // При выборе карты для игры, подсвечиваем возможные цели для этой карты
                        highlightPossibleTargets(card);
                        
                        // Если карту нельзя сыграть, показываем сообщение
                        if (!canPlay) {
                            showGameMessage('Эту карту нельзя сыграть на карты других игроков', 2000);
                        }
                    } else {
                        // Если нажали на уже выбранную карту, отменяем выбор
                        playCardButton.disabled = true;
                        
                        // Снимаем подсветку со всех возможных целей
                        document.querySelectorAll('.table-card.highlighted').forEach(card => {
                            card.classList.remove('highlighted');
                        });
                    }
                }
            });
            
            playerHandElement.appendChild(cardElement);
        });
        
        // Если мой ход, проверяем и подсвечиваем все карты, которые можно сыграть
        if (isMyTurn) {
            // Подсчитываем количество карт, которые можно сыграть
            const playableCards = currentPlayer.cards.filter(card => card.faceUp && canPlayCardOnTable(card));
            
            // Если есть карты для игры, подсвечиваем их и показываем подсказку
            if (playableCards.length > 0) {
                showGameMessage(`У вас есть ${playableCards.length} карт${playableCards.length > 1 ? 'ы' : 'а'}, которые можно сыграть!`, 2000);
            }
        }
    }
    
    // Функция установки текущего игрока
    function setCurrentPlayer(index) {
        // Обновляем индекс текущего игрока
        currentPlayerIndex = index;
        
        // Устанавливаем флаг "мой ход" только если текущий игрок - пользователь
        isMyTurn = (currentPlayerIndex === 0);
        
        // Обновляем отображение активного игрока
        document.querySelectorAll('.player').forEach((playerElem, playerIdx) => {
            // Сначала убираем все активные классы
            playerElem.classList.remove('active');
            playerElem.querySelector('.turn-timer')?.classList.remove('active');
            
            // Затем активируем для текущего игрока
            if (playerIdx === currentPlayerIndex) {
                playerElem.classList.add('active');
                const timer = playerElem.querySelector('.turn-timer');
                if (timer) {
                    // Сбрасываем анимацию и запускаем заново
                    timer.classList.remove('active');
                    setTimeout(() => {
                        timer.classList.add('active');
                    }, 50);
                }
            }
        });
        
        // Обновляем информацию о текущем игроке
        const currentPlayer = game.players[currentPlayerIndex];
        playerNameElement.textContent = currentPlayer.name;
        
        // Включаем или отключаем кнопки действий в зависимости от того, чей ход
        drawCardButton.disabled = !isMyTurn;
        playCardButton.disabled = true; // Сначала нужно выбрать карту
        passTurnButton.disabled = !isMyTurn;
        
        // Обновляем индикатор хода на панели
        playerIndicatorElement.textContent = isMyTurn ? 'Ваш ход' : `Ход игрока ${currentPlayer.name}`;
        
        // Логируем состояние колоды при смене игрока
        logDeckState(`Смена хода к игроку ${currentPlayer.name}`);
        
        // Проверяем, не закончилась ли первая стадия игры
        const stageChanged = checkGameStageProgress();
        
        // Если стадия изменилась, логируем это событие
        if (stageChanged) {
            console.log(`Произошел переход к стадии: ${game.gameStage}`);
            // Если ход был игрока, показываем сообщение про переход
            if (isMyTurn) {
                showGameMessage('Начинается вторая стадия игры: игра открытыми картами!', 3000);
            }
        }
        
        // Проверяем, есть ли победитель
        if (checkForWinner()) {
            return; // Если есть победитель, выходим
        }
        
        console.log(`Переход хода к игроку ${currentPlayerIndex} (${currentPlayer.name}), isAI: ${currentPlayer.isAI}`);
        
        // Если это компьютерный игрок, запускаем ИИ
        if (currentPlayer.isAI) {
            console.log('Инициируем ход ИИ...');
            // Делаем небольшую задержку перед ходом ИИ для естественности
            setTimeout(() => {
                // Проверяем, все еще ли ход этого бота
                if (currentPlayerIndex === index && game.players[currentPlayerIndex].isAI) {
                    console.log('Выполняем ход ИИ...');
                    playAITurn();
                } else {
                    console.log('Ход ИИ отменен, т.к. текущий игрок изменился');
                }
            }, 1500);
        }
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
        // Если целевой карты нет, то можно положить любую карту (первый ход)
        if (!targetCard) return true;
        
        // Получаем индексы карт в массиве значений
        const cardRank = cardValues.indexOf(card.value);
        const targetRank = cardValues.indexOf(targetCard.value);
        
        // В первой стадии игры
        if (game.gameStage === 'stage1') {
            // Особое правило для туза - на него можно положить только двойку
            if (targetCard.value === 'A') {
                return card.value === '2';
            }
            
            // Проверяем, что наша карта ровно на 1 ранг выше целевой
            // Обратите внимание: масть не имеет значения в первой стадии
            return cardRank === targetRank + 1;
        }
        
        // Во второй стадии игры (традиционная игра)
        // Карту можно положить, если совпадает масть или значение
        return card.suit === targetCard.suit || card.value === targetCard.value;
    }
    
    // Проверка возможности сыграть карту на любую из карт на столе
    function canPlayCardOnTable(card) {
        // В первой стадии игры ищем все карты на 1 ранг ниже
        if (game.gameStage === 'stage1') {
            const cardRank = cardValues.indexOf(card.value);
            
            // Ищем среди карт других игроков
            for (let i = 0; i < game.players.length; i++) {
                if (i === currentPlayerIndex) continue; // Пропускаем текущего игрока
                
                const targetPlayer = game.players[i];
                
                // Ищем открытые карты соперника
                for (const targetCard of targetPlayer.cards) {
                    if (targetCard.faceUp) {
                        // Если это туз, проверяем можно ли на него положить карту (только 2)
                        if (targetCard.value === 'A') {
                            return card.value === '2';
                        }
                        
                        const targetRank = cardValues.indexOf(targetCard.value);
                        
                        // Если нашли карту на 1 ранг ниже - можно сыграть (масть не важна в первой стадии)
                        if (cardRank === targetRank + 1) {
                            console.log(`Можно положить ${card.value}${card.suit} на ${targetCard.value}${targetCard.suit}`);
                            return true;
                        }
                    }
                }
            }
            
            return false;
        }
        
        // Во второй стадии проверяем возможность сыграть карту на верхнюю карту сброса
        if (game.gameStage === 'stage2') {
            // Если карт в сбросе нет, можно сыграть любую карту
            if (game.discardPile.length === 0) return true;
            
            // Получаем верхнюю карту сброса
            const topCard = game.discardPile[game.discardPile.length - 1];
            
            // Можно сыграть карту с тем же номиналом или мастью
            return (card.suit === topCard.suit || card.value === topCard.value);
        }
        
        // В других стадиях - другая логика
        return true;
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
    
    // Обработчики событий для кнопок
    drawCardButton.addEventListener('click', function() {
        if (isMyTurn) {
            if (game.gameStage === 'stage1') {
                // В первой стадии игрок берет открытую карту из центра
                if (game.openCard) {
                    console.log(`Игрок берет открытую карту из центра: ${game.openCard.value}${game.openCard.suit}`);
                    
                    // Сохраняем взятую карту
                    const drawnCard = game.openCard;
                    drawnCard.faceUp = true; // Убедимся, что карта открыта
                    
                    // Добавляем карту текущему игроку
                    game.players[0].cards.push(drawnCard);
                    
                    // Если в колоде остались карты, открываем новую карту
                    if (game.deck.length > 0) {
                        console.log(`Открываем новую карту из колоды, осталось карт: ${game.deck.length}`);
                        const newOpenCard = game.deck.pop();
                        newOpenCard.faceUp = true;
                        game.openCard = newOpenCard;
                        console.log(`Новая открытая карта: ${newOpenCard.value}${newOpenCard.suit}`);
                    } else {
                        // Колода закончилась, переходим на вторую стадию
                        console.log('Колода закончилась, переходим на вторую стадию');
                        game.openCard = null;
                        const stageChanged = checkGameStageProgress();
                        if (stageChanged) {
                            console.log('Переход ко второй стадии выполнен');
                        }
                    }
                    
                    // Обновляем отображение
                    renderPlayerHand();
                    updateDeckInfo();
                    
                    // Показываем сообщение о взятой карте
                    showGameMessage(`Вы взяли карту из центра: ${drawnCard.value}${drawnCard.suit}`);
                    
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
                        // Если карту нельзя сыграть ни на одну из карт противников, проверяем возможность положить на свою карту
                        console.log('Проверяем возможность положить взятую карту на свою открытую карту');
                        // Проверяем, есть ли у игрока открытая карта для наложения
                        const playerOpenCards = game.players[0].cards.filter(card => card.faceUp && card.id !== drawnCard.id);
                        console.log(`Открытых карт у игрока для наложения: ${playerOpenCards.length}`);
                        
                        if (playerOpenCards.length > 0) {
                            // Берем первую открытую карту игрока для наложения
                            const targetCard = playerOpenCards[0];
                            console.log(`Выбрана карта для наложения: ${targetCard.value}${targetCard.suit}`);
                            const targetCardIndex = game.players[0].cards.findIndex(card => card.id === targetCard.id);
                            
                            // Удаляем только что взятую карту
                            const takenCardIndex = game.players[0].cards.findIndex(card => card.id === drawnCard.id);
                            if (takenCardIndex !== -1) {
                                // Удаляем взятую карту из руки
                                game.players[0].cards.splice(takenCardIndex, 1);
                                console.log(`Удалена карта из руки: ${drawnCard.value}${drawnCard.suit}`);
                                
                                // Запоминаем старую карту чтобы показать в сообщении
                                const oldCard = game.players[0].cards[targetCardIndex];
                                
                                // Заменяем целевую карту
                                game.players[0].cards[targetCardIndex] = drawnCard;
                                console.log(`Заменена карта ${oldCard.value}${oldCard.suit} на ${drawnCard.value}${drawnCard.suit}`);
                                
                                // Показываем сообщение
                                showGameMessage(`Вы кладете взятую карту ${drawnCard.value}${drawnCard.suit} поверх своей карты ${oldCard.value}${oldCard.suit}`);
                                
                                // Обновляем отображение
                                renderPlayers();
                                renderPlayerHand();
                            } else {
                                console.error(`Ошибка: не найдена взятая карта ${drawnCard.value}${drawnCard.suit} в руке игрока`);
                                showGameMessage('Произошла ошибка при замене карты. Добавляем карту в вашу руку.');
                            }
                        } else {
                            console.log('У игрока нет открытых карт для наложения взятой карты');
                            showGameMessage('У вас нет открытых карт для наложения. Добавляем карту в вашу руку.');
                        }
                        
                        // Переход хода к следующему игроку
                        setTimeout(() => {
                            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                            setCurrentPlayer(nextPlayerIndex);
                        }, 2000);
                    }
                } else {
                    showGameMessage('Нет доступных карт для взятия. Ход передается следующему игроку.');
                    
                    // Переход хода к следующему игроку
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
                    // Проверяем, куда играть карту (на карту игрока или в сброс)
                    const isDiscardTarget = targetCardElem.dataset.isDiscard === 'true';
                    
                    if (isDiscardTarget) {
                        // Играем карту на сброс (для второй стадии)
                        // Убираем карту из руки игрока
                        const playedCard = playerCards.splice(cardIndex, 1)[0];
                        
                        // Добавляем карту в сброс
                        game.discardPile.push(playedCard);
                        
                        // Обновляем отображение
                        renderPlayerHand();
                        updateDeckInfo();
                        
                        // Снимаем подсветку
                        targetCardElem.classList.remove('highlighted');
                        
                        // Показываем сообщение
                        showGameMessage(`Вы сыграли карту ${playedCard.value}${playedCard.suit} в сброс`);
                        
                        // Проверяем наличие победителя
                        if (playerCards.length === 0) {
                            // Игрок выиграл
                            showGameMessage('Поздравляем! Вы выиграли игру!', 5000);
                            
                            setTimeout(() => {
                                alert('Игра окончена! Вы победили!');
                                // Перезапуск игры
                                initGame();
                            }, 3000);
                            
                            return;
                        }
                        
                        // Переход хода к следующему игроку
                        setTimeout(() => {
                            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                            setCurrentPlayer(nextPlayerIndex);
                        }, 1500);
                    } else {
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
                                
                                // Проверяем наличие победителя в зависимости от стадии игры
                                if (game.gameStage === 'stage1') {
                                    // В первой стадии проверяем, что у игрока не осталось открытых карт
                                    // и при этом нет закрытых карт
                                    const hasFaceDownCards = playerCards.some(card => !card.faceUp);
                                    
                                    if (playerCards.length === 0 && !hasFaceDownCards) {
                                        // Игрок выиграл
                                        showGameMessage('Поздравляем! Вы выиграли игру!', 5000);
                                        
                                        // Показываем сообщение о победе
                                        setTimeout(() => {
                                            alert('Игра окончена! Вы победили!');
                                            // Перезапуск игры
                                            initGame();
                                        }, 3000);
                                        
                                        return;
                                    }
                                } else if (playerCards.length === 0) {
                                    // Во второй стадии достаточно, чтобы не осталось карт вообще
                                    // Игрок выиграл
                                    showGameMessage('Поздравляем! Вы выиграли игру!', 5000);
                                    
                                    // Показываем сообщение о победе
                                    setTimeout(() => {
                                        alert('Игра окончена! Вы победили!');
                                        // Перезапуск игры
                                        initGame();
                                    }, 3000);
                                    
                                    return;
                                }
                                
                                // Переход хода к следующему игроку
                                setTimeout(() => {
                                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                                    setCurrentPlayer(nextPlayerIndex);
                                }, 1500);
                            }
                        } else {
                            showGameMessage('Ошибка: не удалось найти целевого игрока');
                        }
                    }
                } else {
                    // Если нет подсвеченной цели, пробуем играть в сброс (для второй стадии)
                    if (game.gameStage === 'stage2' && game.discardPile.length > 0) {
                        const topCard = game.discardPile[game.discardPile.length - 1];
                        
                        // Проверяем, можно ли сыграть карту на верхнюю карту сброса
                        if (cardToPlay.suit === topCard.suit || cardToPlay.value === topCard.value) {
                            // Убираем карту из руки игрока
                            const playedCard = playerCards.splice(cardIndex, 1)[0];
                            
                            // Добавляем в сброс
                            game.discardPile.push(playedCard);
                            
                            // Обновляем отображение
                            renderPlayerHand();
                            updateDeckInfo();
                            
                            // Показываем сообщение
                            showGameMessage(`Вы сыграли карту ${playedCard.value}${playedCard.suit} в сброс`);
                            
                            // Проверяем наличие победителя
                            if (game.gameStage === 'stage1') {
                                // В первой стадии проверяем, что у игрока не осталось открытых карт 
                                // при этом нет закрытых карт
                                const hasFaceDownCards = playerCards.some(card => !card.faceUp);
                                
                                if (playerCards.length === 0 && !hasFaceDownCards) {
                                    // Игрок выиграл
                                    showGameMessage('Поздравляем! Вы выиграли игру!', 5000);
                                    
                                    // Показываем сообщение о победе
                                    setTimeout(() => {
                                        alert('Игра окончена! Вы победили!');
                                        // Перезапуск игры
                                        initGame();
                                    }, 3000);
                                    
                                    return; // Выходим, так как игра завершена
                                }
                            } else if (playerCards.length === 0) {
                                // Во второй стадии достаточно, чтобы не осталось карт вообще
                                // Игрок выиграл
                                showGameMessage('Поздравляем! Вы выиграли игру!', 5000);
                                
                                // Показываем сообщение о победе
                                setTimeout(() => {
                                    alert('Игра окончена! Вы победили!');
                                    // Перезапуск игры
                                    initGame();
                                }, 3000);
                                
                                return; // Выходим, так как игра завершена
                            }
                            
                            // Переход хода к следующему игроку
                            setTimeout(() => {
                                const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                                console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                                setCurrentPlayer(nextPlayerIndex);
                            }, 2000);
                        } else {
                            showGameMessage('Эту карту нельзя сыграть на текущую карту сброса');
                        }
                    } else {
                        // В первой стадии нельзя играть карту без цели
                        showGameMessage('Нет подходящей карты для этого хода');
                    }
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
            console.log('Стадия 1: Бот проверяет возможность хода...');
            
            // Сначала пытаемся сыграть имеющимися картами на карты противников
            let bestMove = null;
            
            // Для каждой карты в руке бота
            for (const card of aiPlayer.cards) {
                console.log(`Проверяем карту ${card.value}${card.suit} (faceUp: ${card.faceUp})`);
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
                // Делаем карту открытой, когда кладем на стол
                playedCard.faceUp = true;
                
                // Кладем карту поверх карты противника
                game.players[bestMove.targetPlayerIndex].cards[bestMove.targetCardIndex] = playedCard;
                
                // Обновляем отображение
                renderPlayers();
                
                // Показываем сообщение
                showGameMessage(`${aiPlayer.name} кладет карту ${playedCard.value}${playedCard.suit} на карту игрока ${bestMove.targetPlayer.name}`);
                
                // Проверяем, закончились ли карты у бота
                if (aiPlayer.cards.length === 0) {
                    // В первой стадии проверяем, что у бота не осталось закрытых карт
                    const hasFaceDownCards = aiPlayer.cards.some(card => !card.faceUp);
                    
                    if (!hasFaceDownCards) {
                        // Бот выиграл в первой стадии
                        showGameMessage(`${aiPlayer.name} выиграл игру!`, 5000);
                        
                        // Добавляем логику завершения игры
                        setTimeout(() => {
                            alert(`Игра окончена! ${aiPlayer.name} победил!`);
                            // Перезапуск игры
                            initGame();
                        }, 3000);
                        
                        return; // Выходим, так как игра завершена
                    }
                }
                
                // Бот продолжает ход, проверяя наличие других возможных ходов
                setTimeout(() => {
                    playAITurn();
                }, 1500);
                return;
            }
            
            // Если не можем сыграть ни на одну из карт противников, 
            // берем открытую карту из центра (если она есть)
            if (game.openCard) {
                console.log(`Бот берет открытую карту из центра: ${game.openCard.value}${game.openCard.suit}`);
                
                // Сохраняем взятую карту
                const drawnCard = game.openCard;
                drawnCard.faceUp = true; // Открываем карту
                
                // Добавляем карту боту
                aiPlayer.cards.push(drawnCard);
                
                // Если в колоде остались карты, открываем новую карту
                if (game.deck.length > 0) {
                    const newOpenCard = game.deck.pop();
                    newOpenCard.faceUp = true;
                    game.openCard = newOpenCard;
                    console.log(`Новая открытая карта: ${newOpenCard.value}${newOpenCard.suit}`);
                } else {
                    // Колода закончилась, переходим на вторую стадию
                    console.log('Колода закончилась, переходим на вторую стадию');
                    game.openCard = null;
                    const stageChanged = checkGameStageProgress();
                    if (stageChanged) {
                        console.log('Переход ко второй стадии выполнен');
                    }
                }
                
                // Обновляем отображение
                updateDeckInfo();
                renderPlayers();
                
                // Показываем сообщение о взятой карте
                showGameMessage(`${aiPlayer.name} берет карту ${drawnCard.value}${drawnCard.suit} из центра`);
                
                // Пытаемся положить взятую карту на карты противников
                const cardRank = cardValues.indexOf(drawnCard.value);
                let foundMove = false;
                
                for (let i = 0; i < game.players.length; i++) {
                    if (i === currentPlayerIndex) continue; // Пропускаем себя
                    
                    const targetPlayer = game.players[i];
                    const targetOpenCards = targetPlayer.cards.filter(c => c.faceUp);
                    
                    for (const targetCard of targetOpenCards) {
                        // Обработка туза аналогично предыдущему случаю
                        if (targetCard.value === 'A') {
                            if (drawnCard.value === '2') {
                                console.log(`Бот может положить взятую 2 на туз`);
                                
                                // Удаляем взятую карту из руки бота
                                const cardIndex = aiPlayer.cards.findIndex(c => c.id === drawnCard.id);
                                const playedCard = aiPlayer.cards.splice(cardIndex, 1)[0];
                                
                                // Кладем карту поверх карты противника
                                const targetCardIndex = targetPlayer.cards.findIndex(c => c.id === targetCard.id);
                                targetPlayer.cards[targetCardIndex] = playedCard;
                                
                                // Обновляем отображение
                                renderPlayers();
                                
                                // Показываем сообщение
                                showGameMessage(`${aiPlayer.name} кладет взятую карту ${playedCard.value}${playedCard.suit} на карту игрока ${targetPlayer.name}`);
                                
                                foundMove = true;
                                break;
                            }
                            continue;
                        }
                        
                        const targetRank = cardValues.indexOf(targetCard.value);
                        
                        // Если наша карта на 1 ранг выше, чем карта противника
                        if (cardRank === targetRank + 1) {
                            console.log(`Бот может положить взятую карту на ${targetCard.value}${targetCard.suit}`);
                            
                            // Удаляем взятую карту из руки бота
                            const cardIndex = aiPlayer.cards.findIndex(c => c.id === drawnCard.id);
                            const playedCard = aiPlayer.cards.splice(cardIndex, 1)[0];
                            
                            // Кладем карту поверх карты противника
                            const targetCardIndex = targetPlayer.cards.findIndex(c => c.id === targetCard.id);
                            targetPlayer.cards[targetCardIndex] = playedCard;
                            
                            // Обновляем отображение
                            renderPlayers();
                            
                            // Показываем сообщение
                            showGameMessage(`${aiPlayer.name} кладет взятую карту ${playedCard.value}${playedCard.suit} на карту игрока ${targetPlayer.name}`);
                            
                            foundMove = true;
                            break;
                        }
                    }
                    
                    if (foundMove) break;
                }
                
                // Если не удалось положить карту на карты противников, 
                // пробуем положить на свои открытые карты
                if (!foundMove) {
                    const aiOpenCards = aiPlayer.cards.filter(card => card.faceUp && card.id !== drawnCard.id);
                    console.log(`У бота ${aiOpenCards.length} открытых карт для наложения`);
                    
                    if (aiOpenCards.length > 0) {
                        // Берем первую открытую карту для замены
                        const targetCard = aiOpenCards[0];
                        const targetCardIndex = aiPlayer.cards.findIndex(card => card.id === targetCard.id);
                        
                        // Удаляем взятую карту из руки
                        const cardIndex = aiPlayer.cards.findIndex(card => card.id === drawnCard.id);
                        if (cardIndex !== -1) {
                            const playedCard = aiPlayer.cards.splice(cardIndex, 1)[0];
                            
                            // Запоминаем старую карту для информационного сообщения
                            const oldCardValue = targetCard.value;
                            const oldCardSuit = targetCard.suit;
                            
                            // Заменяем целевую карту
                            aiPlayer.cards[targetCardIndex] = playedCard;
                            
                            // Обновляем отображение
                            renderPlayers();
                            
                            // Показываем сообщение с указанием, какая карта была заменена
                            showGameMessage(`${aiPlayer.name} кладет взятую карту ${playedCard.value}${playedCard.suit} поверх своей карты ${oldCardValue}${oldCardSuit}`);
                        }
                    }
                }
                
                // Проверяем, закончились ли карты у бота
                if (aiPlayer.cards.length === 0) {
                    // В первой стадии проверяем, что у бота не осталось закрытых карт
                    const hasFaceDownCards = aiPlayer.cards.some(card => !card.faceUp);
                    
                    if (!hasFaceDownCards) {
                        // Бот выиграл в первой стадии
                        showGameMessage(`${aiPlayer.name} выиграл игру!`, 5000);
                        
                        // Добавляем логику завершения игры
                        setTimeout(() => {
                            alert(`Игра окончена! ${aiPlayer.name} победил!`);
                            // Перезапуск игры
                            initGame();
                        }, 3000);
                        
                        return; // Выходим, так как игра завершена
                    }
                }
                
                // Передаем ход следующему игроку
                setTimeout(() => {
                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                    console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                    setCurrentPlayer(nextPlayerIndex);
                }, 2000);
            } else {
                // Нет открытой карты - переход на вторую стадию
                console.log('Открытой карты нет, должны быть на второй стадии');
                checkGameStageProgress();
                
                // Передаем ход следующему игроку
                setTimeout(() => {
                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                    console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                    setCurrentPlayer(nextPlayerIndex);
                }, 1500);
            }
        } else if (game.gameStage === 'stage2') {
            // Логика второй стадии игры (традиционная игра)
            // Сюда можно добавить вашу существующую логику для второй стадии
            console.log('Стадия 2: Бот ищет карты для сброса...');
            
            // Поиск подходящей карты для сброса
            let foundCard = false;
            
            if (game.discardPile.length > 0) {
                const topCard = game.discardPile[game.discardPile.length - 1];
                
                // Ищем карту, которая подходит по масти или значению
                for (let i = 0; i < aiPlayer.cards.length; i++) {
                    const card = aiPlayer.cards[i];
                    
                    if (card.suit === topCard.suit || card.value === topCard.value) {
                        // Нашли подходящую карту
                        const playedCard = aiPlayer.cards.splice(i, 1)[0];
                        
                        // Добавляем карту в сброс
                        game.discardPile.push(playedCard);
                        
                        // Обновляем отображение
                        updateDeckInfo();
                        renderPlayers();
                        
                        // Показываем сообщение
                        showGameMessage(`${aiPlayer.name} кладет карту ${playedCard.value}${playedCard.suit} в сброс`);
                        
                        foundCard = true;
                        
                        // Проверяем, выиграл ли бот
                        if (aiPlayer.cards.length === 0) {
                            // Во второй стадии достаточно, чтобы не осталось карт вообще
                            // Игра завершается, бот победил
                            showGameMessage(`${aiPlayer.name} выиграл игру!`, 5000);
                            
                            // Добавляем логику завершения игры
                            setTimeout(() => {
                                alert(`Игра окончена! ${aiPlayer.name} победил!`);
                                // Перезапуск игры
                                initGame();
                            }, 3000);
                            
                            return; // Выходим, так как игра завершена
                        }
                        
                        break;
                    }
                }
            }
            
            if (!foundCard) {
                // Если не нашли подходящую карту или сброс пуст
                if (game.deck.length > 0) {
                    // Берем карту из колоды
                    const drawnCard = game.deck.pop();
                    drawnCard.faceUp = true; // Открываем карту
                    
                    // Добавляем карту боту
                    aiPlayer.cards.push(drawnCard);
                    
                    // Обновляем отображение
                    updateDeckInfo();
                    renderPlayers();
                    
                    // Показываем сообщение о взятой карте
                    showGameMessage(`${aiPlayer.name} берет карту из колоды`);
                    
                    // Проверяем, можно ли сыграть взятую карту
                    if (game.discardPile.length > 0) {
                        const topCard = game.discardPile[game.discardPile.length - 1];
                        
                        if (drawnCard.suit === topCard.suit || drawnCard.value === topCard.value) {
                            // Можем сыграть взятую карту
                            setTimeout(() => {
                                // Удаляем карту из руки бота
                                const cardIndex = aiPlayer.cards.findIndex(card => card.id === drawnCard.id);
                                const playedCard = aiPlayer.cards.splice(cardIndex, 1)[0];
                                
                                // Добавляем карту в сброс
                                game.discardPile.push(playedCard);
                                
                                // Обновляем отображение
                                updateDeckInfo();
                                renderPlayers();
                                
                                // Показываем сообщение
                                showGameMessage(`${aiPlayer.name} кладет взятую карту ${playedCard.value}${playedCard.suit} в сброс`);
                                
                                // Проверяем, выиграл ли бот
                                if (aiPlayer.cards.length === 0) {
                                    // Бот выиграл
                                    showGameMessage(`${aiPlayer.name} выиграл игру!`, 5000);
                                    
                                    setTimeout(() => {
                                        alert(`Игра окончена! ${aiPlayer.name} победил!`);
                                        // Перезапуск игры
                                        initGame();
                                    }, 3000);
                                    
                                    return;
                                }
                                
                                // Переход хода к следующему игроку
                                setTimeout(() => {
                                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                                    console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                                    setCurrentPlayer(nextPlayerIndex);
                                }, 1500);
                            }, 1000);
                            
                            return;
                        }
                    }
                } else {
                    showGameMessage(`${aiPlayer.name} не может сделать ход (колода пуста)`);
                }
            }
            
            // Переход хода к следующему игроку
            setTimeout(() => {
                const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                setCurrentPlayer(nextPlayerIndex);
            }, 2000);
        }
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

    // Функция для проверки условий окончания стадии и перехода к следующей
    function checkGameStageProgress() {
        console.log(`Проверка прогресса стадии игры. Текущая стадия: ${game.gameStage}, карт в колоде: ${game.deck.length}`);
        
        // Проверка целостности состояния игры
        if (!game.deck) {
            console.error('Ошибка: объект колоды не найден!');
            game.deck = []; // Восстанавливаем массив колоды, если он отсутствует
        }
        
        // Проверяем текущую стадию игры
        if (game.gameStage === 'stage1') {
            // Если колода пуста - завершаем первую стадию
            if (game.deck.length === 0) {
                console.log('Колода пуста, выполняем переход ко второй стадии игры');
                
                // Переходим ко второй стадии
                game.gameStage = 'stage2';
                
                // Обновляем информацию о стадии в интерфейсе
                stageNumberElement.textContent = 'Стадия 2';
                stageDescriptionElement.textContent = 'Игра открытыми картами';
                
                // Открываем все закрытые карты у игроков
                game.players.forEach((player, idx) => {
                    console.log(`Открываем все карты игрока ${idx} (${player.name})`);
                    player.cards.forEach(card => {
                        card.faceUp = true;
                    });
                });
                
                // Перерисовываем игроков и карты
                renderPlayers();
                renderPlayerHand();
                
                // Показываем сообщение о начале новой стадии
                showGameMessage('Колода закончилась! Начинается вторая стадия игры: игра открытыми картами.', 5000);
                
                console.log('Переход ко второй стадии успешно выполнен');
                
                // Возвращаем true, т.к. произошло изменение стадии
                return true;
            }
            console.log(`Колода не пуста (${game.deck.length} карт), остаемся на первой стадии игры`);
        } else {
            console.log(`Текущая стадия игры: ${game.gameStage}, проверка перехода не требуется`);
        }
        
        // Если стадия не изменилась, возвращаем false
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