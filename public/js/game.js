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
            currentTurn: 0
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
        
        // Кладем одну открытую карту в центр стола (сброс)
        const tableCard = game.deck.pop();
        tableCard.faceUp = true;
        game.discardPile = [tableCard];
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
        // Обновляем счетчик колоды
        const deckCount = document.querySelector('.card-pile.deck .card-count');
        deckCount.textContent = game.deck.length;
        
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
        
        // Обновляем сброс
        const discardElement = document.querySelector('.card-pile.discard');
        discardElement.innerHTML = '';
        
        if (game.discardPile.length > 0) {
            const topCard = game.discardPile[game.discardPile.length - 1];
            const cardElement = createCardElement(topCard);
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
        
        // Проверяем, не закончилась ли первая стадия игры
        checkGameStageProgress();
        
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
    
    // Функция проверки возможности сыграть карту
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
                        
                        // Если нашли карту на 1 ранг ниже - можно сыграть
                        if (cardRank === targetRank + 1) {
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
                        if (cardRank === targetRank + 1) {
                            console.log(`  Найдена подходящая цель!`);
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
            // Берем карту из колоды, если есть
            if (game.deck.length > 0) {
                const drawnCard = game.deck.pop();
                drawnCard.faceUp = true; // Открываем карту
                
                // Добавляем карту текущему игроку
                game.players[0].cards.push(drawnCard);
                
                // Обновляем отображение
                renderPlayerHand();
                updateDeckInfo();
                
                // Показываем сообщение о взятой карте
                showGameMessage(`Вы взяли карту из колоды: ${drawnCard.value}${drawnCard.suit}`);
                
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
                    if (game.gameStage === 'stage1') {
                        // Проверяем, есть ли у игрока открытая карта для наложения
                        const playerOpenCards = game.players[0].cards.filter(card => card.faceUp && card.id !== drawnCard.id);
                        
                        if (playerOpenCards.length > 0) {
                            // Берем первую открытую карту игрока для наложения
                            const targetCard = playerOpenCards[0];
                            const targetCardIndex = game.players[0].cards.findIndex(card => card.id === targetCard.id);
                            
                            // Удаляем только что взятую карту
                            const takenCardIndex = game.players[0].cards.findIndex(card => card.id === drawnCard.id);
                            if (takenCardIndex !== -1) {
                                // Удаляем взятую карту
                                game.players[0].cards.splice(takenCardIndex, 1);
                                
                                // Заменяем целевую карту
                                game.players[0].cards[targetCardIndex] = drawnCard;
                                
                                // Показываем сообщение
                                showGameMessage(`Вы кладете взятую карту ${drawnCard.value}${drawnCard.suit} поверх своей карты`);
                                
                                // Обновляем отображение
                                renderPlayers();
                                renderPlayerHand();
                            }
                        } else {
                            showGameMessage('У вас нет открытых карт для наложения. Добавляем карту в вашу руку.');
                        }
                    }
                    
                    // Переход хода к следующему игроку
                    setTimeout(() => {
                        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                        setCurrentPlayer(nextPlayerIndex);
                    }, 2000);
                }
            } else if (game.discardPile.length > 0) {
                // Если колода пуста, но есть сброс - берем карту из сброса
                const drawnCard = game.discardPile.pop();
                drawnCard.faceUp = true; // Открываем карту
                
                // Добавляем карту текущему игроку
                game.players[0].cards.push(drawnCard);
                
                // Обновляем отображение
                renderPlayerHand();
                updateDeckInfo();
                
                // Показываем сообщение о взятой карте
                showGameMessage(`Вы взяли карту из сброса: ${drawnCard.value}${drawnCard.suit}`);
                
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
                    // Если карту нельзя сыграть, передаем ход
                    setTimeout(() => {
                        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                        setCurrentPlayer(nextPlayerIndex);
                    }, 2000);
                }
            } else {
                // Если колода и сброс пусты, показываем сообщение
                showGameMessage('Колода и сброс пусты. Переходим ко второй стадии игры.');
                
                // Проверяем и переходим ко второй стадии
                checkGameStageProgress();
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
        
        // Для первой стадии игры - логика набора и выкладывания карт
        if (game.gameStage === 'stage1') {
            console.log('Стадия 1: Бот ищет карты для хода...');
            
            // Выбираем все карты бота
            const allCards = aiPlayer.cards;
            console.log(`Всего карт у бота: ${allCards.length}`);
            
            // Находим все возможные ходы
            let bestMove = null;
            
            // Для каждой карты в руке бота
            for (const card of allCards) {
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
                    // Бот выиграл
                    showGameMessage(`${aiPlayer.name} выиграл игру!`, 5000);
                    
                    setTimeout(() => {
                        alert(`Игра окончена! ${aiPlayer.name} победил!`);
                        // Перезапуск игры
                        initGame();
                    }, 3000);
                    
                    return;
                }
                
                // Передаем ход следующему игроку
                setTimeout(() => {
                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                    console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                    setCurrentPlayer(nextPlayerIndex);
                }, 2000);
            } else {
                console.log('Бот не нашел ход на карты противников. Проверяем, можно ли положить на свою карту...');
                
                // Если не можем сыграть ни на одну из карт противников
                // Проверяем, можно ли положить карту на свою открытую карту
                const aiOpenCards = aiPlayer.cards.filter(card => card.faceUp);
                console.log(`У бота ${aiOpenCards.length} открытых карт для наложения`);
                
                if (aiOpenCards.length > 0) {
                    // Берем первую открытую карту для замены
                    const targetCard = aiOpenCards[0];
                    const targetCardIndex = aiPlayer.cards.findIndex(card => card.id === targetCard.id);
                    
                    // Ищем любую другую карту (желательно закрытую)
                    const otherCards = aiPlayer.cards.filter(card => card.id !== targetCard.id);
                    
                    if (otherCards.length > 0) {
                        // Берем первую карту для хода
                        const cardToPlay = otherCards[0];
                        const cardIndex = aiPlayer.cards.findIndex(card => card.id === cardToPlay.id);
                        
                        console.log(`Бот кладет ${cardToPlay.value}${cardToPlay.suit} на свою карту ${targetCard.value}${targetCard.suit}`);
                        
                        // Удаляем карту
                        const playedCard = aiPlayer.cards.splice(cardIndex, 1)[0];
                        playedCard.faceUp = true; // Делаем карту открытой
                        
                        // Заменяем целевую карту
                        aiPlayer.cards[targetCardIndex] = playedCard;
                        
                        // Обновляем отображение
                        renderPlayers();
                        
                        // Показываем сообщение
                        showGameMessage(`${aiPlayer.name} кладет карту ${playedCard.value}${playedCard.suit} поверх своей карты`);
                        
                        // Передаем ход следующему игроку
                        setTimeout(() => {
                            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                            console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                            setCurrentPlayer(nextPlayerIndex);
                        }, 2000);
                        
                        return;
                    }
                }
                
                console.log('Бот не может сделать ход. Пропускает ход.');
                
                // Если и это невозможно, пропускаем ход
                showGameMessage(`${aiPlayer.name} пропускает ход`);
                
                // Передаем ход следующему игроку
                setTimeout(() => {
                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                    console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                    setCurrentPlayer(nextPlayerIndex);
                }, 1500);
            }
        }
        // Для второй стадии используем другую логику
        else if (game.gameStage === 'stage2') {
            console.log('Стадия 2: Бот ходит в сброс...');
            // Логика для второй стадии - игра в сброс картами одинаковой масти или значения
            let playableCardIndex = -1;
            
            // Если в сбросе есть карты
            if (game.discardPile.length > 0) {
                const topCard = game.discardPile[game.discardPile.length - 1];
                console.log(`Верхняя карта сброса: ${topCard.value}${topCard.suit}`);
                
                // Ищем подходящую карту для игры
                for (let i = 0; i < aiPlayer.cards.length; i++) {
                    const card = aiPlayer.cards[i];
                    
                    // Проверяем, подходит ли карта по масти или значению
                    if (card.suit === topCard.suit || card.value === topCard.value) {
                        playableCardIndex = i;
                        console.log(`Найдена подходящая карта для сброса: ${card.value}${card.suit}`);
                        break;
                    }
                }
                
                // Если нашли подходящую карту - играем её
                if (playableCardIndex !== -1) {
                    const playedCard = aiPlayer.cards.splice(playableCardIndex, 1)[0];
                    
                    // Добавляем карту в сброс
                    game.discardPile.push(playedCard);
                    
                    // Обновляем отображение
                    updateDeckInfo();
                    renderPlayers();
                    
                    // Показываем сообщение
                    showGameMessage(`${aiPlayer.name} играет карту ${playedCard.value}${playedCard.suit} в сброс`);
                    
                    // Проверяем, не закончились ли карты у бота
                    if (aiPlayer.cards.length === 0) {
                        // Игра завершается, бот победил
                        showGameMessage(`${aiPlayer.name} выиграл игру!`, 5000);
                        
                        // Можно добавить логику завершения игры
                        setTimeout(() => {
                            alert(`Игра окончена! ${aiPlayer.name} победил!`);
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
                    console.log('Бот не нашел подходящей карты для сброса');
                    // Если нет подходящей карты - пропускаем ход
                    showGameMessage(`${aiPlayer.name} не может сделать ход и пропускает`);
                    
                    // Переход хода к следующему игроку
                    setTimeout(() => {
                        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                        console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                        setCurrentPlayer(nextPlayerIndex);
                    }, 1500);
                }
            } else {
                console.log('Сброс пуст, бот кладет любую карту');
                // Если сброс пуст - кладем любую карту
                if (aiPlayer.cards.length > 0) {
                    // Берем первую карту
                    const playedCard = aiPlayer.cards.splice(0, 1)[0];
                    
                    // Добавляем карту в сброс
                    game.discardPile.push(playedCard);
                    
                    // Обновляем отображение
                    updateDeckInfo();
                    renderPlayers();
                    
                    // Показываем сообщение
                    showGameMessage(`${aiPlayer.name} кладет карту ${playedCard.value}${playedCard.suit} в сброс`);
                    
                    // Переход хода к следующему игроку
                    setTimeout(() => {
                        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                        console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                        setCurrentPlayer(nextPlayerIndex);
                    }, 2000);
                } else {
                    // Если нет карт вообще - пропускаем ход
                    showGameMessage(`${aiPlayer.name} не имеет карт и пропускает ход`);
                    
                    // Переход хода к следующему игроку
                    setTimeout(() => {
                        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                        console.log(`Бот передает ход следующему игроку: ${nextPlayerIndex}`);
                        setCurrentPlayer(nextPlayerIndex);
                    }, 1500);
                }
            }
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
        // Проверяем текущую стадию игры
        if (game.gameStage === 'stage1') {
            // Если колода пуста - завершаем первую стадию
            if (game.deck.length === 0) {
                // Переходим ко второй стадии
                game.gameStage = 'stage2';
                
                // Обновляем информацию о стадии в интерфейсе
                stageNumberElement.textContent = 'Стадия 2';
                stageDescriptionElement.textContent = 'Игра открытыми картами';
                
                // Открываем все закрытые карты у игроков
                game.players.forEach(player => {
                    player.cards.forEach(card => {
                        card.faceUp = true;
                    });
                });
                
                // Перерисовываем игроков и карты
                renderPlayers();
                renderPlayerHand();
                
                // Показываем сообщение о начале новой стадии
                showGameMessage('Колода закончилась! Начинается вторая стадия игры: игра открытыми картами.', 5000);
                
                // Возвращаем true, т.к. произошло изменение стадии
                return true;
            }
        }
        
        // Если стадия не изменилась, возвращаем false
        return false;
    }

    // Функция для проверки победителя
    function checkForWinner() {
        // Ищем игрока без карт
        for (let i = 0; i < game.players.length; i++) {
            if (game.players[i].cards.length === 0) {
                // Нашли победителя
                const winner = game.players[i];
                
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