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
    let lastTookCardPlayerIndex = 0; // Индекс игрока, который последним взял карту из колоды в 1-й стадии
    
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
        let playersContainer = document.querySelector('.players-container');
        if (!playersContainer) {
            playersContainer = document.createElement('div');
            playersContainer.className = 'players-container';
            document.body.appendChild(playersContainer);
        }
        playersContainer.innerHTML = '';
        const playerCount = game.players.length;
        game.players.forEach((player, playerIndex) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player';
            const angle = (playerIndex / playerCount) * 2 * Math.PI;
            const tableRadius = 40;
            const left = 50 + tableRadius * Math.cos(angle - Math.PI/2);
            const top = 50 + tableRadius * Math.sin(angle - Math.PI/2);
            playerElement.style.left = `${left}%`;
            playerElement.style.top = `${top}%`;
            if (playerIndex === currentPlayerIndex) playerElement.classList.add('active');
            if (player.isAI) playerElement.classList.add('ai-player');
            else playerElement.classList.add('human-player');
            const playerName = document.createElement('div');
            playerName.className = 'player-name';
            playerName.textContent = player.name;
            const playerAvatar = document.createElement('div');
            playerAvatar.className = 'player-avatar';
            const playerAvatarImg = document.createElement('img');
            playerAvatarImg.src = 'img/bot-avatar.svg';
            playerAvatar.appendChild(playerAvatarImg);
            const activeIndicator = document.createElement('div');
            activeIndicator.className = 'player-active-indicator';
            const cardCount = document.createElement('div');
            cardCount.className = 'player-cards';
            cardCount.textContent = `Карт: ${player.cards.length}`;
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'player-table-cards';
            // В renderPlayers для каждого игрока (кроме игрока 0) всегда показываю 2 карты рубашкой вверх и одну открытую (если есть)
            if (playerIndex !== 0) {
                // 2 закрытые карты (рубашкой вниз)
                let closedCount = 0;
                for (let i = 0; i < player.cards.length; i++) {
                    if (!player.cards[i].faceUp && closedCount < 2) {
                        const cardElem = document.createElement('div');
                        cardElem.className = 'card table-card card-back';
                        cardElem.style.zIndex = closedCount;
                        cardElem.style.left = `${closedCount * 10}px`;
                        cardElem.style.top = `${20 - closedCount * 2}px`;
                        const cardBackImg = document.createElement('img');
                        cardBackImg.src = 'img/cards/back.png';
                        cardBackImg.className = 'card-back-image';
                        cardBackImg.alt = 'Рубашка карты';
                        cardElem.appendChild(cardBackImg);
                        cardsContainer.appendChild(cardElem);
                        closedCount++;
                    }
                    if (closedCount === 2) break;
                }
                // 1 открытая карта (если есть)
                const openCards = player.cards.filter(card => card.faceUp);
                if (openCards.length > 0) {
                    const card = openCards[openCards.length - 1];
                    const cardElem = document.createElement('div');
                    cardElem.className = 'card table-card card-front drop-target';
                    cardElem.style.zIndex = 10;
                    cardElem.style.left = `10px`;
                    cardElem.style.top = `0px`;
                    const cardImg = document.createElement('img');
                    cardImg.src = getCardImageUrl(card);
                    cardImg.className = 'card-image';
                    cardImg.alt = `${card.value}${card.suit}`;
                    cardElem.appendChild(cardImg);
                    // --- drop events ---
                    cardElem.addEventListener('dragover', function(e) {
                        e.preventDefault();
                        cardElem.classList.add('drag-over');
                    });
                    cardElem.addEventListener('dragleave', function(e) {
                        cardElem.classList.remove('drag-over');
                    });
                    cardElem.addEventListener('drop', function(e) {
                        e.preventDefault();
                        cardElem.classList.remove('drag-over');
                        const cardIdx = +e.dataTransfer.getData('card-index');
                        handlePlayerCardDrop(cardIdx, playerIndex);
                    });
                    // Touch events (mobile)
                    cardElem.addEventListener('touchmove', function(e) {
                        e.preventDefault();
                    });
                    cardElem.addEventListener('touchend', function(e) {
                        // Для мобильных: обработка в handleTouchEnd
                    });
                    cardsContainer.appendChild(cardElem);
                }
            }
            playerElement.appendChild(playerName);
            playerElement.appendChild(playerAvatar);
            playerElement.appendChild(activeIndicator);
            playerElement.appendChild(cardCount);
            playerElement.appendChild(cardsContainer);
            playersContainer.appendChild(playerElement);
        });
        highlightValidDropTargets();
    }
    
    // --- Исправленный updateDeckInfo: только одна верхняя карта колоды ---
    function updateDeckInfo() {
        const deckElement = document.querySelector('.card-pile.deck');
        deckElement.innerHTML = '';
        // Показываем верхнюю карту колоды лицом вверх (реальную)
        if (game.deck.length > 0) {
            const topCard = game.deck[game.deck.length - 1];
            const cardElem = document.createElement('div');
            cardElem.className = 'card mini-card deck-draggable';
            cardElem.style.position = 'absolute';
            cardElem.style.top = '0px';
            cardElem.style.left = '0px';
            cardElem.style.zIndex = 0;
            cardElem.setAttribute('draggable', 'true');
            cardElem.title = 'Взять карту из колоды';
            if (game.settings.useCardImages) {
                const cardImg = document.createElement('img');
                cardImg.src = getCardImageUrl(topCard);
                cardImg.className = 'card-image';
                cardImg.alt = `${topCard.value}${topCard.suit}`;
                cardElem.appendChild(cardImg);
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
                cardElem.appendChild(cardFront);
            }
            // Drag&drop для взятия карты
            cardElem.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('take-card', '1');
            });
            // Клик по колоде для взятия карты
            cardElem.addEventListener('click', function(e) {
                if (isMyTurn && game.gameStage === 'stage1') {
                    takeCardFromDeck();
                }
            });
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
    // --- Новая логика первой стадии для игрока ---
    async function playerStage1Turn() {
        if (!isMyTurn || game.gameStage !== 'stage1') return;
        let player = game.players[0];
        while (true) {
            let topCard = player.cards[player.cards.length - 1];
            if (!topCard) break;
            let moveMade = false;
            for (let i = 1; i < game.players.length; i++) {
                let opp = game.players[i];
                let oppOpen = opp.cards.filter(c => c.faceUp);
                if (oppOpen.length > 0) {
                    let target = oppOpen[oppOpen.length - 1];
                    if (canPlayCard(topCard, target)) {
                        player.cards.pop();
                        opp.cards[opp.cards.indexOf(target)] = topCard;
                        showGameMessage(`Вы положили ${topCard.value}${topCard.suit} на карту игрока ${opp.name}`);
                        renderPlayers();
                        renderPlayerHand();
                        // После успешного хода игрок должен сам взять карту вручную
                        return;
                    }
                }
            }
            // Если некуда положить — игрок должен сам взять карту вручную
            showGameMessage('Не удалось сыграть карту, возьмите карту из колоды');
            return;
        }
        // Если не осталось карт — передаём ход
        setTimeout(() => {
            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
            setCurrentPlayer(nextPlayerIndex);
            checkGameStageProgress();
        }, 5000);
    }
    // ... существующий код ...
    // --- Кнопки для ручного управления ---
    drawCardButton.onclick = function() {
        if (isMyTurn && game.gameStage === 'stage1') playerStage1Turn();
    };
    playCardButton.onclick = function() {
        if (isMyTurn && game.gameStage === 'stage1') playerStage1Turn();
    };
    selfCardButton.onclick = function() {
        if (isMyTurn && game.gameStage === 'stage1') playerStage1Turn();
    };
    // ... существующий код ...
    // --- Новая логика для бота ---
    async function aiStage1Turn() {
        let aiPlayer = game.players[currentPlayerIndex];
        while (true) {
            let topCard = aiPlayer.cards[aiPlayer.cards.length - 1];
            if (!topCard) break;
            let moveMade = false;
            for (let i = 0; i < game.players.length; i++) {
                if (i === currentPlayerIndex) continue;
                let opp = game.players[i];
                let oppOpen = opp.cards.filter(c => c.faceUp);
                if (oppOpen.length > 0) {
                    let target = oppOpen[oppOpen.length - 1];
                    if (canPlayCard(topCard, target)) {
                        aiPlayer.cards.pop();
                        opp.cards[opp.cards.indexOf(target)] = topCard;
                        showGameMessage(`${aiPlayer.name} кладёт ${topCard.value}${topCard.suit} на карту игрока ${opp.name}`);
                        renderPlayers();
                        await delay(600);
                        if (game.deck.length > 0) {
                            let newCard = game.deck.pop();
                            newCard.faceUp = true;
                            aiPlayer.cards.push(newCard);
                            updateDeckInfo();
                            renderPlayers();
                            showGameMessage(`${aiPlayer.name} взял карту из колоды: ${newCard.value}${newCard.suit}`);
                            await delay(600);
                            lastTookCardPlayerIndex = currentPlayerIndex;
                            moveMade = true;
                            break;
                        } else {
                            showGameMessage('Колода пуста, ход завершён');
                            checkGameStageProgress();
                            setTimeout(() => {
                                const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                                setCurrentPlayer(nextPlayerIndex);
                            }, 5000);
                            return;
                        }
                    }
                }
            }
            if (moveMade) continue;
            if (game.deck.length > 0) {
                let newCard = game.deck.pop();
                newCard.faceUp = true;
                aiPlayer.cards.push(newCard);
                updateDeckInfo();
                renderPlayers();
                showGameMessage(`${aiPlayer.name} взял карту из колоды: ${newCard.value}${newCard.suit}`);
                await delay(600);
                lastTookCardPlayerIndex = currentPlayerIndex;
                let canPlace = false;
                for (let i = 0; i < game.players.length; i++) {
                    if (i === currentPlayerIndex) continue;
                    let opp = game.players[i];
                    let oppOpen = opp.cards.filter(c => c.faceUp);
                    if (oppOpen.length > 0) {
                        let target = oppOpen[oppOpen.length - 1];
                        if (canPlayCard(newCard, target)) {
                            canPlace = true;
                            break;
                        }
                    }
                }
                if (canPlace) continue;
            }
            showGameMessage(`${aiPlayer.name} не может сыграть карту, ход переходит дальше`);
            break;
        }
        setTimeout(() => {
            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
            setCurrentPlayer(nextPlayerIndex);
            checkGameStageProgress();
        }, 5000);
    }
    // --- Заменяю playAITurn на вызов aiStage1Turn ---
    function playAITurn() {
        if (game.gameStage === 'stage1') {
            aiStage1Turn();
        } else {
            // старая логика для других стадий
        }
    }
    // ... существующий код ...

    // --- ДОБАВЛЯЮ функцию для получения пути к картинке карты ---
    function getCardImageUrl(card) {
        // Преобразуем значения и масти к формату ace_of_hearts.png
        const valueMap = {
            'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack',
            '10': '10', '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2'
        };
        const suitMap = {
            '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs', '♠': 'spades'
        };
        const value = valueMap[card.value] || card.value;
        const suit = suitMap[card.suit] || card.suit;
        return `img/cards/${value}_of_${suit}.png`;
    }

    // --- Добавляю функцию для отображения руки игрока ---
    function renderPlayerHand() {
        if (!playerHandElement) return;
        playerHandElement.innerHTML = '';
        const player = game.players[0];
        player.cards.forEach((card, idx) => {
            const cardElem = document.createElement('div');
            cardElem.className = 'hand-card';
            if (card.faceUp) {
                const cardImg = document.createElement('img');
                cardImg.src = getCardImageUrl(card);
                cardImg.className = 'card-image';
                cardImg.alt = `${card.value}${card.suit}`;
                cardElem.appendChild(cardImg);
                // drag&drop только для верхней карты
                if (idx === player.cards.length - 1) {
                    cardElem.setAttribute('draggable', 'true');
                    cardElem.addEventListener('dragstart', function(e) {
                        e.dataTransfer.setData('card-index', idx);
                    });
                }
                // Touch events (mobile)
                cardElem.addEventListener('touchstart', function(e) {
                    cardElem.classList.add('dragging');
                    cardElem.dataset.touchStart = '1';
                });
                cardElem.addEventListener('touchend', function(e) {
                    cardElem.classList.remove('dragging');
                    delete cardElem.dataset.touchStart;
                });
            } else {
                const cardBackImg = document.createElement('img');
                cardBackImg.src = 'img/cards/back.png';
                cardBackImg.className = 'card-back-image';
                cardBackImg.alt = 'Рубашка карты';
                cardElem.appendChild(cardBackImg);
            }
            playerHandElement.appendChild(cardElem);
        });
        // Drop-зона для колоды (чтобы можно было бросить верхнюю карту в колоду, если потребуется по правилам)
        // --- Для мобильных: обработка touchmove/touchend на всём поле ---
        playerHandElement.addEventListener('touchmove', handleTouchMove, {passive:false});
        playerHandElement.addEventListener('touchend', handleTouchEnd, {passive:false});
        highlightValidDropTargets();
    }

    // --- Добавляю функцию смены текущего игрока ---
    function setCurrentPlayer(index) {
        currentPlayerIndex = index;
        isMyTurn = (currentPlayerIndex === 0);
        renderPlayers();
        renderPlayerHand();
        if (isMyTurn) {
            // Можно добавить активацию кнопок, подсветку и т.д.
        } else {
            playAITurn();
        }
    }

    // --- Логика обработки drop ---
    function handlePlayerCardDrop(cardIdx, targetPlayerIdx) {
        if (!isMyTurn) return;
        // Если targetPlayerIdx === -1, значит дроп на колоду (взять карту)
        if (targetPlayerIdx === -1) {
            takeCardFromDeck();
            return;
        }
        const player = game.players[0];
        const card = player.cards[cardIdx];
        if (!card || !card.faceUp) return;
        const targetPlayer = game.players[targetPlayerIdx];
        const targetOpen = targetPlayer.cards.filter(c => c.faceUp);
        if (targetOpen.length === 0) return;
        const targetCard = targetOpen[targetOpen.length - 1];
        if (!canPlayCard(card, targetCard)) {
            showGameMessage('Нельзя положить эту карту на выбранную!');
            return;
        }
        // Совершаем ход: кладём карту на соперника
        player.cards.splice(cardIdx, 1);
        targetPlayer.cards[targetPlayer.cards.indexOf(targetCard)] = card;
        showGameMessage(`Вы положили ${card.value}${card.suit} на карту игрока ${targetPlayer.name}`);
        renderPlayers();
        renderPlayerHand();
        // После успешного хода — берём новую карту и передаём ход
        if (game.deck.length > 0) {
            let newCard = game.deck.pop();
            newCard.faceUp = true;
            player.cards.push(newCard);
            updateDeckInfo();
            renderPlayerHand();
            showGameMessage(`Вы взяли карту из колоды: ${newCard.value}${newCard.suit}`);
        }
        setTimeout(() => {
            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
            setCurrentPlayer(nextPlayerIndex);
        }, 5000);
    }

    // --- Touch-Drag поддержка для мобильных ---
    let touchDragIdx = null;
    function handleTouchMove(e) {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        const elem = document.elementFromPoint(touch.clientX, touch.clientY);
        if (elem && elem.classList.contains('drop-target')) {
            elem.classList.add('drag-over');
        }
    }
    function handleTouchEnd(e) {
        const touch = e.changedTouches[0];
        const elem = document.elementFromPoint(touch.clientX, touch.clientY);
        if (elem && elem.classList.contains('drop-target')) {
            // Найти индекс карты, которую тащили
            const handCards = Array.from(playerHandElement.children);
            for (let i = 0; i < handCards.length; i++) {
                if (handCards[i].classList.contains('dragging')) {
                    handlePlayerCardDrop(i, +elem.closest('.player').dataset.playerIndex);
                    handCards[i].classList.remove('dragging');
                    break;
                }
            }
        }
        // Убрать подсветку
        document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drag-over'));
    }

    // === Функция проверки возможности хода карты ===
    function canPlayCard(card, topCard, stage = 'stage1', isSelfCard = false) {
        if (!topCard) return true; // Если первый ход, можно ходить любой картой
        const VALUES_RANK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        if (stage === 'stage1') {
            const cardIndex = VALUES_RANK.indexOf(card.value);
            const topCardIndex = VALUES_RANK.indexOf(topCard.value);
            if (topCard.value === 'A' && card.value === '2') {
                return true;
            }
            if (cardIndex === (topCardIndex + 1) % VALUES_RANK.length) {
                return true;
            }
            return false;
        }
        // Для других стадий — стандартное правило
        return card.suit === topCard.suit || card.value === topCard.value;
    }

    // === Функция для вывода сообщений о ходе ===
    function showGameMessage(msg) {
        console.log('[ХОД]', msg);
        // Можно добавить вывод на экран, если нужно:
        // let log = document.getElementById('game-log');
        // if (log) {
        //     const p = document.createElement('div');
        //     p.textContent = msg;
        //     log.appendChild(p);
        //     log.scrollTop = log.scrollHeight;
        // }
    }

    function checkGameStageProgress() {
        // Если колода пуста — переходим на 2-ю стадию
        if (game.deck.length === 0 && game.gameStage === 'stage1') {
            showGameMessage('Колода пуста! Начинается 2-я стадия.');
            game.gameStage = 'stage2';
            // Ходит тот, кто последний взял карту из колоды
            setCurrentPlayer(lastTookCardPlayerIndex);
            // Здесь можно вызвать функцию для логики 2-й стадии
            // Например: playerStage2Turn() / aiStage2Turn()
        }
    }

    function highlightValidDropTargets() {
        // Подсвечиваем только те drop-target, куда можно положить верхнюю карту игрока
        const player = game.players[0];
        const topCard = player.cards[player.cards.length - 1];
        document.querySelectorAll('.drop-target').forEach(el => {
            el.classList.remove('valid-drop');
        });
        if (!topCard) return;
        for (let i = 1; i < game.players.length; i++) {
            let opp = game.players[i];
            let oppOpen = opp.cards.filter(c => c.faceUp);
            if (oppOpen.length > 0) {
                let target = oppOpen[oppOpen.length - 1];
                if (canPlayCard(topCard, target)) {
                    // Найти DOM-элемент drop-target для этого игрока
                    const playerElems = document.querySelectorAll('.player');
                    if (playerElems[i]) {
                        const drop = playerElems[i].querySelector('.drop-target');
                        if (drop) drop.classList.add('valid-drop');
                    }
                }
            }
        }
    }

    // Функция для взятия карты из колоды игроком
    function takeCardFromDeck() {
        if (!isMyTurn || game.gameStage !== 'stage1') return;
        if (game.deck.length === 0) return;
        let player = game.players[0];
        let newCard = game.deck.pop();
        newCard.faceUp = true;
        player.cards.push(newCard);
        updateDeckInfo();
        renderPlayerHand();
        showGameMessage(`Вы взяли карту из колоды: ${newCard.value}${newCard.suit}`);
        lastTookCardPlayerIndex = 0;
        highlightValidDropTargets();
    }

    (async () => { await initGame(); })();
}); 