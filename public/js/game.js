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
        
        // Отображаем игроков
        renderPlayers();
        
        // Обновляем информацию о колоде и сбросе
        updateDeckInfo();
        
        // Отображаем карты текущего игрока
        renderPlayerHand();
        
        // Устанавливаем начальный ход
        setCurrentPlayer(0);
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
    
    // Отображение карт текущего игрока
    function renderPlayerHand() {
        playerHandElement.innerHTML = '';
        
        // Получаем текущего игрока (индекс 0)
        const currentPlayer = game.players[0];
        
        // Обновляем имя игрока
        playerNameElement.textContent = currentPlayer.name;
        
        // Отображаем карты
        currentPlayer.cards.forEach((card, index) => {
            const cardElement = createCardElement(card);
            
            // Добавляем обработчик выбора карты
            cardElement.addEventListener('click', function() {
                if (isMyTurn && card.faceUp) {
                    // Снимаем выделение со всех карт
                    document.querySelectorAll('.player-hand .card').forEach(c => {
                        c.classList.remove('selected');
                    });
                    
                    // Выделяем текущую карту
                    this.classList.add('selected');
                    
                    // Активируем кнопку "Сыграть"
                    playCardButton.disabled = false;
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
    }
    
    // Обработчики событий для кнопок
    drawCardButton.addEventListener('click', function() {
        if (isMyTurn && game.deck.length > 0) {
            const drawnCard = game.deck.pop();
            drawnCard.faceUp = true; // Открываем карту
            
            // Добавляем карту текущему игроку
            game.players[0].cards.push(drawnCard);
            
            // Обновляем отображение
            renderPlayerHand();
            updateDeckInfo();
            
            // Обновляем состояние кнопок
            this.disabled = true;
            passTurnButton.disabled = false;
        }
    });
    
    playCardButton.addEventListener('click', function() {
        const selectedCard = document.querySelector('.player-hand .card.selected');
        
        if (selectedCard && isMyTurn) {
            const cardId = selectedCard.dataset.cardId;
            const playerCards = game.players[0].cards;
            const cardIndex = playerCards.findIndex(card => card.id === cardId);
            
            if (cardIndex !== -1) {
                // Убираем карту из руки игрока
                const playedCard = playerCards.splice(cardIndex, 1)[0];
                
                // Добавляем её в сброс
                game.discardPile.push(playedCard);
                
                // Обновляем отображение
                renderPlayerHand();
                updateDeckInfo();
                
                // Переход хода к следующему игроку
                const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                setCurrentPlayer(nextPlayerIndex);
                
                // Здесь можно добавить логику хода ИИ
                if (game.players[nextPlayerIndex].isAI) {
                    // Симуляция хода ИИ через таймаут
                    setTimeout(playAITurn, 1500);
                }
            }
        }
    });
    
    passTurnButton.addEventListener('click', function() {
        if (isMyTurn) {
            // Переход хода к следующему игроку
            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
            setCurrentPlayer(nextPlayerIndex);
            
            // Если следующий игрок - ИИ, выполняем его ход
            if (game.players[nextPlayerIndex].isAI) {
                // Симуляция хода ИИ через таймаут
                setTimeout(playAITurn, 1500);
            }
        }
    });
    
    // Простая реализация хода ИИ
    function playAITurn() {
        // Здесь будет логика хода ИИ
        // Для простоты, просто переходим к следующему игроку
        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
        setCurrentPlayer(nextPlayerIndex);
        
        // Если следующий игрок - снова ИИ, повторяем
        if (game.players[nextPlayerIndex].isAI) {
            setTimeout(playAITurn, 1500);
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