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
        
        // Добавляем текущего игрока
        const currentUser = JSON.parse(user);
        game.players.push({
            userId: currentUser.id,
            name: currentUser.username,
            avatar: currentUser.avatar || '',
            cards: [],
            isAI: false
        });
        
        // Добавляем других игроков/ботов
        for (let i = 1; i < gameSettings.playerCount; i++) {
            game.players.push({
                userId: `bot-${i}`,
                name: gameSettings.withAI ? `Бот ${i}` : `Игрок ${i+1}`,
                avatar: '',
                cards: [],
                isAI: gameSettings.withAI
            });
        }
        
        // Инициализируем колоду
        initializeDeck();
        
        // Раздаем карты
        dealInitialCards();
        
        // Определяем первого игрока по старшей открытой карте
        const firstPlayerIndex = determineFirstPlayer();
        
        // Отображаем игроков
        renderPlayers();
        
        // Обновляем информацию о колоде и сбросе
        updateDeckInfo();
        
        // Отображаем карты текущего игрока
        renderPlayerHand();
        
        // Устанавливаем первого игрока
        setCurrentPlayer(firstPlayerIndex);
        
        // Показываем информационное сообщение о начале игры
        showGameMessage(`Игрок ${game.players[firstPlayerIndex].name} начинает игру с самой высокой картой!`);
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
        
        // Получаем позиции для текущего количества игроков
        const playerPositions = positions[totalPlayers] || positions[4];
        
        // Создаем элементы игроков
        game.players.forEach((player, index) => {
            const playerElement = document.importNode(playerTemplate.content, true).querySelector('.player');
            
            // Устанавливаем имя и аватар
            playerElement.querySelector('.player-name').textContent = player.name;
            const avatarImg = playerElement.querySelector('.player-avatar img');
            if (player.avatar) {
                avatarImg.src = player.avatar;
            } else {
                // Базовый аватар если нет своего
                avatarImg.src = 'images/avatar-placeholder.png';
            }
            
            // Устанавливаем количество карт
            playerElement.querySelector('.card-count').textContent = player.cards.length;
            
            // Устанавливаем позицию
            const pos = playerPositions[index];
            playerElement.style.top = pos.top;
            playerElement.style.left = pos.left;
            playerElement.style.transform = 'translate(-50%, -50%)';
            
            // Добавляем класс для текущего игрока
            if (index === currentPlayerIndex) {
                playerElement.classList.add('active');
            }
            
            // Добавляем атрибут с ID игрока
            playerElement.setAttribute('data-player-id', player.userId);
            
            // Визуализация карт на столе
            if (index !== 0) { // Не для текущего игрока
                const cardsContainer = document.createElement('div');
                cardsContainer.className = 'player-table-cards';
                
                // Создаем элементы карт
                player.cards.forEach((card, cardIndex) => {
                    const cardElement = document.createElement('div');
                    cardElement.className = 'table-card';
                    
                    // Добавляем классы в зависимости от положения и открытости карты
                    if (cardIndex < 2) { // Первые две карты закрыты
                        cardElement.classList.add('card-back');
                        cardElement.style.transform = `rotate(${(cardIndex - 1) * 20}deg) translateX(${cardIndex * 5}px)`;
                    } else { // Третья карта открыта
                        cardElement.classList.add('card-front');
                        cardElement.dataset.cardId = card.id;
                        
                        if (card.isRed) {
                            cardElement.classList.add('red');
                        }
                        
                        cardElement.innerHTML = `
                            <div class="card-value">${card.value}</div>
                            <div class="card-suit">${card.suit}</div>
                        `;
                        cardElement.style.transform = `rotate(${10}deg) translateY(-10px)`;
                    }
                    
                    cardsContainer.appendChild(cardElement);
                });
                
                playerElement.appendChild(cardsContainer);
            }
            
            // Добавляем игрока на стол
            playersContainer.appendChild(playerElement);
        });
    }
    
    // Обновление отображения колоды и сброса
    function updateDeckInfo() {
        // Обновляем колоду
        const deckCount = document.querySelector('.card-pile.deck .card-count');
        deckCount.textContent = game.deck.length;
        
        // Обновляем сброс
        discardElement.innerHTML = '';
        if (game.discardPile.length > 0) {
            const topCard = game.discardPile[game.discardPile.length - 1];
            const cardElement = createCardElement(topCard);
            discardElement.appendChild(cardElement);
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
                    // Снимаем выделение со всех карт
                    document.querySelectorAll('.player-hand .card').forEach(c => {
                        c.classList.remove('selected');
                    });
                    
                    // Выделяем текущую карту
                    this.classList.add('selected');
                    
                    // Активируем кнопку "Сыграть" только если карту можно сыграть на какую-либо карту на столе
                    playCardButton.disabled = !canPlayCardOnTable(card);
                    
                    // При выборе карты для игры, подсвечиваем возможные цели для этой карты
                    highlightPossibleTargets(card);
                }
            });
            
            playerHandElement.appendChild(cardElement);
        });
    }
    
    // Установка текущего игрока
    function setCurrentPlayer(index) {
        currentPlayerIndex = index;
        
        // Обновляем классы active у игроков
        document.querySelectorAll('.player').forEach((playerElem, idx) => {
            if (idx === currentPlayerIndex) {
                playerElem.classList.add('active');
            } else {
                playerElem.classList.remove('active');
            }
        });
        
        // Определяем, является ли текущий ход - ходом пользователя
        isMyTurn = currentPlayerIndex === 0;
        
        // Обновляем текст индикатора хода
        playerIndicatorElement.textContent = isMyTurn ? 'Ваш ход' : 'Ждите хода';
        
        // Включаем/выключаем кнопки действий
        drawCardButton.disabled = !isMyTurn;
        passTurnButton.disabled = !isMyTurn;
        playCardButton.disabled = true; // Всегда выключена, пока не выбрана карта
        
        // Если ход не игрока, и бот должен ходить - делаем автоматический ход ИИ
        if (!isMyTurn && game.players[currentPlayerIndex].isAI) {
            setTimeout(playAITurn, 1500);
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
            
            return cardRank === targetRank + 1;
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
        
        // В других стадиях - другая логика
        return true;
    }
    
    // Подсветка возможных целей для выбранной карты
    function highlightPossibleTargets(selectedCard) {
        // Сначала убираем подсветку со всех карт на столе
        document.querySelectorAll('.table-card.highlighted').forEach(card => {
            card.classList.remove('highlighted');
        });
        
        // Если не первая стадия или карта не выбрана - выходим
        if (game.gameStage !== 'stage1' || !selectedCard) return;
        
        const cardRank = cardValues.indexOf(selectedCard.value);
        
        // Подсвечиваем все карты на 1 ранг ниже выбранной
        document.querySelectorAll('.player').forEach((playerElem, playerIdx) => {
            if (playerIdx === currentPlayerIndex) return; // Пропускаем текущего игрока
            
            // Ищем открытые карты у игрока
            playerElem.querySelectorAll('.table-card.card-front').forEach(cardElem => {
                const value = cardElem.querySelector('.card-value')?.textContent;
                if (value) {
                    const targetRank = cardValues.indexOf(value);
                    if (cardRank === targetRank + 1) {
                        cardElem.classList.add('highlighted');
                        cardElem.dataset.targetFor = `${selectedCard.value}-${selectedCard.suit}`;
                    }
                }
            });
        });
    }
    
    // Обработчики событий для кнопок
    drawCardButton.addEventListener('click', function() {
        if (isMyTurn && game.discardPile.length > 0) {
            // В первой стадии игрок берет карту из колоды сброса (биты)
            const drawnCard = game.discardPile.pop();
            drawnCard.faceUp = true; // Открываем карту
            
            // Добавляем карту текущему игроку
            game.players[0].cards.push(drawnCard);
            
            // Обновляем отображение
            renderPlayerHand();
            updateDeckInfo();
            
            // Показываем сообщение о взятой карте
            showGameMessage(`Вы взяли карту из биты: ${drawnCard.value}${drawnCard.suit}`);
            
            // Проверяем, можно ли сыграть взятую карту
            const canPlay = canPlayCardOnTable(drawnCard);
            
            if (canPlay) {
                // Если взятую карту можно сыграть, даем возможность игроку это сделать
                // Не переходим ход, пока игрок не решит, что делать с этой картой
                showGameMessage('Вы можете сыграть взятую карту');
            } else {
                // Если карту нельзя сыграть, переходим к следующему игроку
                showGameMessage('Вы не можете сыграть взятую карту. Ход переходит следующему игроку');
                
                // Переход хода к следующему игроку
                setTimeout(() => {
                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                    setCurrentPlayer(nextPlayerIndex);
                }, 2000);
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
                
                // Ищем подсвеченную карту на столе как цель
                const targetCardElem = document.querySelector(`.table-card.highlighted[data-target-for="${cardToPlay.value}-${cardToPlay.suit}"]`);
                
                if (targetCardElem) {
                    // Находим игрока и карту для игры
                    const targetPlayerId = targetCardElem.closest('.player').dataset.playerId;
                    const targetPlayer = game.players.find(p => p.userId === targetPlayerId);
                    
                    if (targetPlayer) {
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
                            
                            // Показываем сообщение
                            showGameMessage(`Вы сыграли карту ${playedCard.value}${playedCard.suit} на карту игрока ${targetPlayer.name}`);
                            
                            // Переход хода к следующему игроку
                            setTimeout(() => {
                                const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                                setCurrentPlayer(nextPlayerIndex);
                            }, 1500);
                        }
                    }
                } else {
                    // Если нет подсвеченной цели, просто кладем в сброс (для других стадий игры)
                    if (game.gameStage !== 'stage1') {
                        // Убираем карту из руки игрока
                        const playedCard = playerCards.splice(cardIndex, 1)[0];
                        
                        // Добавляем её в сброс
                        game.discardPile.push(playedCard);
                        
                        // Обновляем отображение
                        renderPlayerHand();
                        updateDeckInfo();
                        
                        // Показываем сообщение
                        showGameMessage(`Вы сыграли карту: ${playedCard.value}${playedCard.suit}`);
                        
                        // Переход хода к следующему игроку
                        setTimeout(() => {
                            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                            setCurrentPlayer(nextPlayerIndex);
                        }, 1500);
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
        const aiPlayer = game.players[currentPlayerIndex];
        
        // Для первой стадии игры - логика набора и выкладывания карт
        if (game.gameStage === 'stage1') {
            // Ищем карту, которую можно сыграть на карту другого игрока
            let bestCardIndex = -1;
            let bestTargetPlayer = null;
            let bestTargetCardIndex = -1;
            
            // Проверяем все открытые карты ИИ
            for (let i = 0; i < aiPlayer.cards.length; i++) {
                const card = aiPlayer.cards[i];
                if (!card.faceUp) continue;
                
                const cardRank = cardValues.indexOf(card.value);
                
                // Проверяем все карты других игроков
                for (let j = 0; j < game.players.length; j++) {
                    if (j === currentPlayerIndex) continue; // Пропускаем текущего игрока
                    
                    const targetPlayer = game.players[j];
                    
                    // Ищем открытые карты соперника
                    for (let k = 0; k < targetPlayer.cards.length; k++) {
                        const targetCard = targetPlayer.cards[k];
                        if (!targetCard.faceUp) continue;
                        
                        const targetRank = cardValues.indexOf(targetCard.value);
                        
                        // Если нашли карту на 1 ранг ниже - можно сыграть
                        if (cardRank === targetRank + 1) {
                            bestCardIndex = i;
                            bestTargetPlayer = targetPlayer;
                            bestTargetCardIndex = k;
                            break;
                        }
                    }
                    
                    if (bestCardIndex !== -1) break; // Если нашли карту для игры, прекращаем поиск
                }
                
                if (bestCardIndex !== -1) break; // Если нашли карту для игры, прекращаем поиск
            }
            
            // Если нашли карту для игры
            if (bestCardIndex !== -1 && bestTargetPlayer && bestTargetCardIndex !== -1) {
                // Играем найденную карту
                const playedCard = aiPlayer.cards.splice(bestCardIndex, 1)[0];
                
                // Показываем сообщение
                showGameMessage(`${aiPlayer.name} играет карту ${playedCard.value}${playedCard.suit} на карту игрока ${bestTargetPlayer.name}`);
                
                // Кладем карту поверх карты соперника
                bestTargetPlayer.cards[bestTargetCardIndex] = playedCard;
                
                // Обновляем отображение
                renderPlayers();
                updateDeckInfo();
                
                // Переход хода к следующему игроку
                setTimeout(() => {
                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                    setCurrentPlayer(nextPlayerIndex);
                }, 2000);
            }
            // Если не нашли карту для игры, берем из колоды сброса (биты)
            else if (game.discardPile.length > 0) {
                const drawnCard = game.discardPile.pop();
                drawnCard.faceUp = true;
                
                // Добавляем карту ИИ
                aiPlayer.cards.push(drawnCard);
                
                // Обновляем отображение
                updateDeckInfo();
                renderPlayers();
                
                // Показываем сообщение
                showGameMessage(`${aiPlayer.name} берет карту из биты`);
                
                // Проверяем, можно ли сыграть взятую карту
                let canPlayDrawnCard = false;
                const cardRank = cardValues.indexOf(drawnCard.value);
                
                // Ищем карту рангом ниже у других игроков
                for (let j = 0; j < game.players.length; j++) {
                    if (j === currentPlayerIndex) continue; // Пропускаем текущего игрока
                    
                    const targetPlayer = game.players[j];
                    
                    // Ищем открытые карты соперника
                    for (let k = 0; k < targetPlayer.cards.length; k++) {
                        const targetCard = targetPlayer.cards[k];
                        if (!targetCard.faceUp) continue;
                        
                        const targetRank = cardValues.indexOf(targetCard.value);
                        
                        // Если нашли карту на 1 ранг ниже - можно сыграть
                        if (cardRank === targetRank + 1) {
                            canPlayDrawnCard = true;
                            
                            // Играем взятую карту
                            aiPlayer.cards.pop(); // Убираем карту, которую только что взяли
                            
                            // Показываем сообщение
                            showGameMessage(`${aiPlayer.name} играет взятую карту ${drawnCard.value}${drawnCard.suit} на карту игрока ${targetPlayer.name}`);
                            
                            // Кладем карту поверх карты соперника
                            targetPlayer.cards[k] = drawnCard;
                            
                            // Обновляем отображение
                            renderPlayers();
                            
                            break;
                        }
                    }
                    
                    if (canPlayDrawnCard) break; // Если смогли сыграть карту, прекращаем поиск
                }
                
                // Переход хода к следующему игроку
                setTimeout(() => {
                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                    setCurrentPlayer(nextPlayerIndex);
                }, 2000);
            }
            // Если нет карт ни для игры, ни в колоде - пропускаем ход
            else {
                // Показываем сообщение
                showGameMessage(`${aiPlayer.name} пропускает ход`);
                
                // Переход хода к следующему игроку
                setTimeout(() => {
                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                    setCurrentPlayer(nextPlayerIndex);
                }, 1500);
            }
        }
        // Для других стадий используем стандартную логику
        else {
            // Стандартная логика игры для других стадий...
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
}); 