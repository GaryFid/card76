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

    // --- Флаг: кто сейчас должен взять карту из колоды (0 — игрок, 1+ — ИИ, null — никто) ---
    let awaitingDeckActionPlayerIndex = null;

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
        for (let player of game.players) {
            player.cards = [];
            // 2 закрытые
            for (let i = 0; i < 2; i++) {
                const card = game.deck.pop();
                card.faceUp = false;
                player.cards.push(card);
            }
            // 1 открытая
            const openCard = game.deck.pop();
            openCard.faceUp = true;
            player.cards.push(openCard);
        }
        // Кладём одну открытую карту в сброс для начала игры
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
        
        console.log(`Первый ход у игрока ${highestCardPlayer} с самой высокой картой ранга ${highestCardValue}`);
        return highestCardPlayer;
    }
    
    // --- Функция сортировки карт: закрытые слева, открытые справа ---
    function sortPlayerCards(player) {
        player.cards.sort((a, b) => (a.faceUp === b.faceUp) ? 0 : a.faceUp ? 1 : -1);
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
            sortPlayerCards(player);
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
            // --- 2 закрытые слева ---
            let closed = player.cards.filter(c => !c.faceUp);
            for (let i = 0; i < Math.min(2, closed.length); i++) {
                const cardElem = document.createElement('div');
                cardElem.className = 'card table-card card-back';
                cardElem.style.zIndex = i;
                cardElem.style.left = `${i * 10}px`;
                cardElem.style.top = `${20 - i * 2}px`;
                cardElem.style.boxShadow = '0 2px 8px #2222, 0 8px 32px #3390ec22';
                cardElem.style.transition = 'box-shadow 0.2s';
                const cardBackImg = document.createElement('img');
                cardBackImg.src = 'img/cards/back.png';
                cardBackImg.className = 'card-back-image';
                cardBackImg.alt = 'Рубашка карты';
                cardElem.appendChild(cardBackImg);
                cardsContainer.appendChild(cardElem);
            }
            // --- все открытые карты справа ---
            const openCards = player.cards.filter(card => card.faceUp);
            openCards.forEach((card, idx) => {
                const cardElem = document.createElement('div');
                cardElem.className = 'card table-card card-front drop-target';
                cardElem.style.zIndex = 10 + idx;
                cardElem.style.left = `${30 + idx * 18}px`;
                cardElem.style.top = `0px`;
                cardElem.style.boxShadow = '0 2px 8px #2222, 0 8px 32px #3390ec22';
                cardElem.style.transition = 'box-shadow 0.2s';
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
            });
            playerElement.appendChild(playerName);
            playerElement.appendChild(playerAvatar);
            playerElement.appendChild(activeIndicator);
            playerElement.appendChild(cardCount);
            playerElement.appendChild(cardsContainer);
            playersContainer.appendChild(playerElement);
        });
        highlightValidDropTargets();
    }
    
    // --- Колода: стопка с анимацией и красивой тенью, всегда по центру, кликабельна ---
    let previewCard = null;
    function updateDeckInfo() {
        const deckElement = document.querySelector('.card-pile.deck');
        deckElement.innerHTML = '';
        // Колода всегда видна и кликабельна по центру стола
        const closedDeckElem = document.createElement('div');
        closedDeckElem.className = 'card mini-card card-back deck-closed';
        closedDeckElem.style.position = 'absolute';
        closedDeckElem.style.top = '0px';
        closedDeckElem.style.left = '0px';
        closedDeckElem.style.zIndex = 0;
        closedDeckElem.title = 'Показать верхнюю карту';
        closedDeckElem.style.width = '80px';
        closedDeckElem.style.height = '120px';
        closedDeckElem.style.display = 'flex';
        closedDeckElem.style.alignItems = 'center';
        closedDeckElem.style.justifyContent = 'center';
        closedDeckElem.style.boxShadow = '0 8px 32px #3390ec55, 0 2px 8px #2222';
        closedDeckElem.style.transition = 'box-shadow 0.2s';
        closedDeckElem.style.cursor = (awaitingDeckActionPlayerIndex === currentPlayerIndex) ? 'pointer' : 'not-allowed';
        closedDeckElem.addEventListener('mouseenter', function() {
            if (awaitingDeckActionPlayerIndex === currentPlayerIndex) {
                closedDeckElem.style.boxShadow = '0 0 0 6px #3390ec88, 0 8px 32px #3390ec55';
            }
        });
        closedDeckElem.addEventListener('mouseleave', function() {
            closedDeckElem.style.boxShadow = '0 8px 32px #3390ec55, 0 2px 8px #2222';
        });
        closedDeckElem.addEventListener('click', function() {
            if (game.deck.length > 0 && awaitingDeckActionPlayerIndex === currentPlayerIndex) {
                previewCard = game.deck[game.deck.length - 1];
                updateDeckInfo();
            }
        });
        // Анимация стопки (слегка смещённые рубашки)
        for (let i = 0; i < Math.min(4, game.deck.length); i++) {
            const stackCard = document.createElement('img');
            stackCard.src = 'img/cards/back.png';
            stackCard.className = 'card-back-image';
            stackCard.style.position = 'absolute';
            stackCard.style.left = `${i * 3}px`;
            stackCard.style.top = `${i * 2}px`;
            stackCard.style.width = '80px';
            stackCard.style.height = '120px';
            stackCard.style.opacity = 0.7 - i * 0.12;
            closedDeckElem.appendChild(stackCard);
        }
        deckElement.appendChild(closedDeckElem);
        // Счётчик
        const countElem = document.createElement('div');
        countElem.className = 'card-count';
        countElem.textContent = game.deck.length;
        countElem.style.position = 'absolute';
        countElem.style.left = '50%';
        countElem.style.top = '100%';
        countElem.style.transform = 'translate(-50%, 0)';
        countElem.style.fontWeight = 'bold';
        countElem.style.fontSize = '1.1em';
        countElem.style.color = '#3390ec';
        deckElement.appendChild(countElem);
        // Если есть previewCard — показываем её справа и 2 кнопки
        if (previewCard && game.deck.length > 0 && previewCard === game.deck[game.deck.length - 1]) {
            const previewElem = document.createElement('div');
            previewElem.className = 'card mini-card deck-preview';
            previewElem.style.position = 'absolute';
            previewElem.style.top = '0px';
            previewElem.style.left = '100px';
            previewElem.style.zIndex = 1;
            previewElem.style.width = '80px';
            previewElem.style.height = '120px';
            previewElem.style.display = 'flex';
            previewElem.style.alignItems = 'center';
            previewElem.style.justifyContent = 'center';
            previewElem.style.boxShadow = '0 8px 32px #3390ec55, 0 2px 8px #2222';
            if (game.settings.useCardImages) {
                const cardImg = document.createElement('img');
                cardImg.src = getCardImageUrl(previewCard);
                cardImg.className = 'card-image';
                cardImg.alt = `${previewCard.value}${previewCard.suit}`;
                cardImg.style.width = '70px';
                cardImg.style.height = '105px';
                previewElem.appendChild(cardImg);
            }
            previewElem.title = 'Верхняя карта колоды';
            deckElement.appendChild(previewElem);
            // Кнопки "Взять себе" и "Сыграть"
            if (awaitingDeckActionPlayerIndex === currentPlayerIndex) {
                const btnContainer = document.createElement('div');
                btnContainer.style.position = 'absolute';
                btnContainer.style.left = '200px';
                btnContainer.style.top = '10px';
                btnContainer.style.display = 'flex';
                btnContainer.style.flexDirection = 'column';
                btnContainer.style.gap = '8px';
                // Взять себе
                const takeBtn = document.createElement('button');
                takeBtn.textContent = 'Взять себе';
                takeBtn.className = 'game-btn';
                takeBtn.style.fontSize = '0.9em';
                takeBtn.style.padding = '4px 10px';
                takeBtn.style.minWidth = '80px';
                takeBtn.onclick = function() {
                    let card = game.deck.pop();
                    card.faceUp = true;
                    game.players[currentPlayerIndex].cards.push(card);
                    previewCard = null;
                    awaitingDeckActionPlayerIndex = null;
                    updateDeckInfo();
                    renderPlayerHand();
                    renderPlayers();
                    setTimeout(() => {
                        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                        setCurrentPlayer(nextPlayerIndex);
                    }, 1000);
                };
                // Сыграть (если можно)
                const playBtn = document.createElement('button');
                playBtn.textContent = 'Сыграть';
                playBtn.className = 'game-btn';
                playBtn.style.fontSize = '0.9em';
                playBtn.style.padding = '4px 10px';
                playBtn.style.minWidth = '80px';
                playBtn.onclick = function() {
                    let canPlay = false;
                    for (let i = 0; i < game.players.length; i++) {
                        if (i === currentPlayerIndex) continue;
                        let opp = game.players[i];
                        let oppOpen = opp.cards.filter(c => c.faceUp);
                        if (oppOpen.length > 0) {
                            let target = oppOpen[oppOpen.length - 1];
                            if (canPlayCard(previewCard, target)) {
                                game.deck.pop();
                                const idx = opp.cards.indexOf(target);
                                if (idx !== -1) {
                                    opp.cards[idx].faceUp = false;
                                    opp.cards.push(opp.cards[idx]);
                                    opp.cards.splice(idx, 1);
                                    previewCard.faceUp = true;
                                    opp.cards.push(previewCard);
                                }
                                showGameMessage(`${game.players[currentPlayerIndex].name} сыграл(а) ${previewCard.value}${previewCard.suit} на карту игрока ${opp.name}`);
                                previewCard = null;
                                awaitingDeckActionPlayerIndex = null;
                                updateDeckInfo();
                                renderPlayers();
                                renderPlayerHand();
                                setTimeout(() => {
                                    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                                    setCurrentPlayer(nextPlayerIndex);
                                }, 1000);
                                canPlay = true;
                                break;
                            }
                        }
                    }
                    if (!canPlay) {
                        showGameMessage('Нет подходящих целей для хода этой картой!');
                    }
                };
                btnContainer.appendChild(takeBtn);
                btnContainer.appendChild(playBtn);
                deckElement.appendChild(btnContainer);
            }
        } else {
            previewCard = null;
        }
        // --- Не отображаем карту сброса на столе (если не требуется по правилам) ---
        const discardElement = document.querySelector('.card-pile.discard');
        discardElement.innerHTML = '';
    }

    // --- Исправленный ход игрока: цикл до невозможности хода ---
    async function playerStage1Turn() {
        if (!isMyTurn || game.gameStage !== 'stage1') return;
        let player = game.players[0];
        while (true) {
            // Найти верхнюю открытую карту
            const openCards = player.cards.map((c, i) => c.faceUp ? i : -1).filter(i => i !== -1);
            if (openCards.length === 0) {
                // Если нет открытых — берём из колоды (если есть)
                if (game.deck.length > 0) {
                    let newCard = game.deck.pop();
                    newCard.faceUp = true;
                    player.cards.push(newCard);
                    updateDeckInfo();
                    renderPlayerHand();
                    showGameMessage(`Вы взяли карту из колоды: ${newCard.value}${newCard.suit}`);
                    continue; // Проверяем, можно ли сходить новой картой
                } else {
                    showGameMessage('У вас не осталось открытых карт. Ждите 2-й стадии!');
                    break;
                }
            }
            const topOpenIdx = openCards[openCards.length - 1];
            const topCard = player.cards[topOpenIdx];
            let moved = false;
            // Попробовать положить на любую открытую карту соперника
            for (let i = 1; i < game.players.length; i++) {
                let opp = game.players[i];
                let oppOpen = opp.cards.filter(c => c.faceUp);
                if (oppOpen.length > 0) {
                    let target = oppOpen[oppOpen.length - 1];
                    if (canPlayCard(topCard, target)) {
                        // Кладём карту на соперника
                        player.cards.splice(topOpenIdx, 1);
                        const idx = opp.cards.indexOf(target);
                        if (idx !== -1) {
                            opp.cards[idx].faceUp = false;
                            opp.cards.push(opp.cards[idx]);
                            opp.cards.splice(idx, 1);
                            topCard.faceUp = true;
                            opp.cards.push(topCard);
                        }
                        showGameMessage(`Вы положили ${topCard.value}${topCard.suit} на карту игрока ${opp.name}`);
                        renderPlayers();
                        renderPlayerHand();
                        // После успешного хода — берём карту из колоды (если есть)
                        if (game.deck.length > 0) {
                            let newCard = game.deck.pop();
                            newCard.faceUp = true;
                            player.cards.push(newCard);
                            updateDeckInfo();
                            renderPlayerHand();
                            showGameMessage(`Вы взяли карту из колоды: ${newCard.value}${newCard.suit}`);
                            moved = true;
                            break; // После взятия карты — снова цикл
                        } else {
                            moved = true;
                            break;
                        }
                    }
                }
            }
            if (!moved) {
                // Если некуда положить — завершить ход
                break;
            }
        }
        setTimeout(() => {
            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
            setCurrentPlayer(nextPlayerIndex);
        }, 1000);
    }

    // --- Исправленный ход ИИ: цикл до невозможности хода ---
    async function aiStage1Turn() {
        let aiPlayer = game.players[currentPlayerIndex];
        while (true) {
            // Найти верхнюю открытую карту
            const openCards = aiPlayer.cards.map((c, i) => c.faceUp ? i : -1).filter(i => i !== -1);
            if (openCards.length === 0) {
                // Если нет открытых — берём из колоды (если есть)
                if (game.deck.length > 0) {
                    let newCard = game.deck.pop();
                    newCard.faceUp = true;
                    aiPlayer.cards.push(newCard);
                    updateDeckInfo();
                    renderPlayers();
                    showGameMessage(`${aiPlayer.name} взял карту из колоды: ${newCard.value}${newCard.suit}`);
                    await delay(600);
                    continue; // Проверяем, можно ли сходить новой картой
                } else {
                    showGameMessage(`${aiPlayer.name} не может больше ходить (нет открытых карт). Ждём 2-й стадии!`);
                    break;
                }
            }
            const topOpenIdx = openCards[openCards.length - 1];
            const topCard = aiPlayer.cards[topOpenIdx];
            let moved = false;
            for (let i = 0; i < game.players.length; i++) {
                if (i === currentPlayerIndex) continue;
                let opp = game.players[i];
                let oppOpen = opp.cards.filter(c => c.faceUp);
                if (oppOpen.length > 0) {
                    let target = oppOpen[oppOpen.length - 1];
                    if (canPlayCard(topCard, target)) {
                        aiPlayer.cards.splice(topOpenIdx, 1);
                        const idx = opp.cards.indexOf(target);
                        if (idx !== -1) {
                            opp.cards[idx].faceUp = false;
                            opp.cards.push(opp.cards[idx]);
                            opp.cards.splice(idx, 1);
                            topCard.faceUp = true;
                            opp.cards.push(topCard);
                        }
                        showGameMessage(`${aiPlayer.name} кладёт ${topCard.value}${topCard.suit} на карту игрока ${opp.name}`);
                        renderPlayers();
                        await delay(600);
                        // После успешного хода — берёт карту из колоды (если есть)
                        if (game.deck.length > 0) {
                            let newCard = game.deck.pop();
                            newCard.faceUp = true;
                            aiPlayer.cards.push(newCard);
                            updateDeckInfo();
                            renderPlayers();
                            showGameMessage(`${aiPlayer.name} взял карту из колоды: ${newCard.value}${newCard.suit}`);
                            await delay(600);
                            moved = true;
                            break; // После взятия карты — снова цикл
                        } else {
                            moved = true;
                            break;
                        }
                    }
                }
            }
            if (!moved) {
                // Если некуда положить — завершить ход
                break;
            }
        }
        setTimeout(() => {
            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
            setCurrentPlayer(nextPlayerIndex);
        }, 1000);
    }

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
        sortPlayerCards(player);
        // 2 закрытые слева
        const closed = player.cards.filter(c => !c.faceUp);
        for (let i = 0; i < Math.min(2, closed.length); i++) {
            const cardElem = document.createElement('div');
            cardElem.className = 'hand-card card-back';
            cardElem.style.boxShadow = '0 2px 8px #2222, 0 8px 32px #3390ec22';
            cardElem.style.transition = 'box-shadow 0.2s';
            const cardBackImg = document.createElement('img');
            cardBackImg.src = 'img/cards/back.png';
            cardBackImg.className = 'card-back-image';
            cardBackImg.alt = 'Рубашка карты';
            cardElem.appendChild(cardBackImg);
            playerHandElement.appendChild(cardElem);
        }
        // все открытые справа
        const openCards = player.cards.filter(card => card.faceUp);
        openCards.forEach((card, idx) => {
            const cardElem = document.createElement('div');
            cardElem.className = 'hand-card';
            cardElem.style.boxShadow = '0 2px 8px #2222, 0 8px 32px #3390ec22';
            cardElem.style.transition = 'box-shadow 0.2s';
            const cardImg = document.createElement('img');
            cardImg.src = getCardImageUrl(card);
            cardImg.className = 'card-image';
            cardImg.alt = `${card.value}${card.suit}`;
            cardElem.appendChild(cardImg);
            // drag&drop только для верхней открытой карты
            if (idx === openCards.length - 1) {
                cardElem.setAttribute('draggable', 'true');
                cardElem.addEventListener('dragstart', function(e) {
                    e.dataTransfer.setData('card-index', player.cards.indexOf(card));
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
            playerHandElement.appendChild(cardElem);
        });
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
            updatePlayerActionButtons();
        } else {
            drawCardButton.disabled = true;
            playCardButton.disabled = true;
            endTurnButton.disabled = true;
            playAITurn();
        }
    }

    // --- Логика обработки drop ---
    function handlePlayerCardDrop(cardIdx, targetPlayerIdx) {
        if (!isMyTurn) return;
        const player = game.players[0];
        // Найти индекс верхней открытой карты
        const openCards = player.cards.map((c, i) => c.faceUp ? i : -1).filter(i => i !== -1);
        if (openCards.length === 0) return;
        const topOpenIdx = openCards[openCards.length - 1];
        if (cardIdx !== topOpenIdx) return; // Только верхней открытой картой можно ходить
        // Если targetPlayerIdx === -1, значит дроп на колоду (взять карту)
        if (targetPlayerIdx === -1) {
            takeCardFromDeck();
            return;
        }
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
        // --- Новая логика: карта, на которую кладут, остаётся в руке (кладём вниз), а сверху кладём новую ---
        player.cards.splice(cardIdx, 1);
        const idx = targetPlayer.cards.indexOf(targetCard);
        if (idx !== -1) {
            // Перемещаем старую открытую карту вниз (делаем её закрытой)
            targetPlayer.cards[idx].faceUp = false;
            targetPlayer.cards.push(targetPlayer.cards[idx]);
            targetPlayer.cards.splice(idx, 1); // удаляем из старого места
            // Кладём новую карту как открытую
            card.faceUp = true;
            targetPlayer.cards.push(card);
        }
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
        }, 10000);
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
        if (!card || !topCard) return true; // Если первый ход или нет карты, можно ходить любой картой
        const VALUES_RANK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        if (stage === 'stage1') {
            if (!card.value || !topCard.value) return false;
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
        if (!card.suit || !topCard.suit || !card.value || !topCard.value) return false;
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
        sortPlayerCards(player);
        updateDeckInfo();
        renderPlayerHand();
        showGameMessage(`Вы взяли карту из колоды: ${newCard.value}${newCard.suit}`);
        lastTookCardPlayerIndex = 0;
        highlightValidDropTargets();
        if (player.cards.filter(c => c.faceUp).length === 0) {
            showGameMessage('У вас не осталось открытых карт. Ждите 3-й стадии!');
            setTimeout(() => {
                const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                setCurrentPlayer(nextPlayerIndex);
                checkGameStageProgress();
            }, 10000);
        }
    }

    // --- ДОБАВЛЯЮ кнопку 'Передать ход' ---
    const endTurnButton = document.getElementById('end-turn');

    // --- Добавляю обработчики для кнопок игрока ---
    drawCardButton.onclick = function() {
        if (!isMyTurn || game.gameStage !== 'stage1') return;
        takeCardFromDeck();
        updatePlayerActionButtons();
    };

    playCardButton.onclick = function() {
        if (!isMyTurn || game.gameStage !== 'stage1') return;
        const player = game.players[0];
        const openCards = player.cards.filter(c => c.faceUp);
        if (openCards.length === 0) {
            showGameMessage('Нет открытых карт для хода!');
            updatePlayerActionButtons();
            return;
        }
        const topCard = openCards[openCards.length - 1];
        let moved = false;
        for (let i = 1; i < game.players.length; i++) {
            let opp = game.players[i];
            let oppOpen = opp.cards.filter(c => c.faceUp);
            if (oppOpen.length > 0) {
                let target = oppOpen[oppOpen.length - 1];
                if (canPlayCard(topCard, target)) {
                    const idx = player.cards.indexOf(topCard);
                    player.cards.splice(idx, 1);
                    const oppIdx = opp.cards.indexOf(target);
                    if (oppIdx !== -1) {
                        opp.cards[oppIdx].faceUp = false;
                        opp.cards.push(opp.cards[oppIdx]);
                        opp.cards.splice(oppIdx, 1);
                        topCard.faceUp = true;
                        opp.cards.push(topCard);
                    }
                    showGameMessage(`Вы положили ${topCard.value}${topCard.suit} на карту игрока ${opp.name}`);
                    renderPlayers();
                    renderPlayerHand();
                    // После успешного хода — берём карту из колоды (если есть)
                    if (game.deck.length > 0) {
                        let newCard = game.deck.pop();
                        newCard.faceUp = true;
                        player.cards.push(newCard);
                        sortPlayerCards(player);
                        updateDeckInfo();
                        renderPlayerHand();
                        showGameMessage(`Вы взяли карту из колоды: ${newCard.value}${newCard.suit}`);
                    }
                    moved = true;
                    break;
                }
            }
        }
        if (!moved) {
            showGameMessage('Нет подходящих целей для хода этой картой!');
        }
        updatePlayerActionButtons();
        if (moved) {
            setTimeout(() => {
                const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
                setCurrentPlayer(nextPlayerIndex);
            }, 1000);
        }
    };

    // Кнопка "Передать ход" уже реализована ниже (endTurnButton.onclick)

    // --- Добавляю функцию playAITurn для вызова хода ИИ ---
    function playAITurn() {
        if (game.gameStage === 'stage1') {
            aiStage1Turn();
        } else {
            // Здесь можно реализовать ход ИИ для других стадий
            // Например: aiStage2Turn();
        }
    }

    // --- Функция для активации только разрешённых кнопок игрока ---
    function updatePlayerActionButtons() {
        if (!isMyTurn || game.gameStage !== 'stage1') {
            drawCardButton.disabled = true;
            playCardButton.disabled = true;
            endTurnButton.disabled = true;
            return;
        }
        const player = game.players[0];
        sortPlayerCards(player);
        const closed = player.cards.filter(c => !c.faceUp);
        const openCards = player.cards.filter(c => c.faceUp);
        let canPlay = false;
        let canTake = false;
        // Можно ли сыграть? (только если верхняя открытая подходит на 1 ранг выше хотя бы к одной цели)
        if (openCards.length > 0) {
            const topCard = openCards[openCards.length - 1];
            for (let i = 1; i < game.players.length; i++) {
                let opp = game.players[i];
                let oppOpen = opp.cards.filter(c => c.faceUp);
                if (oppOpen.length > 0) {
                    let target = oppOpen[oppOpen.length - 1];
                    if (canPlayCard(topCard, target)) {
                        canPlay = true;
                        break;
                    }
                }
            }
        }
        // Можно ли взять карту? (только если ровно 2 закрытые и 1 открытая, и этой открытой нельзя сходить никуда)
        if (!canPlay && closed.length === 2 && openCards.length === 1 && game.deck.length > 0) {
            canTake = true;
        }
        // Кнопки
        playCardButton.disabled = !canPlay;
        drawCardButton.disabled = !canTake;
        endTurnButton.disabled = canPlay || canTake;
    }

    (async () => { await initGame(); })();
}); 