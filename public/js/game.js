document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Telegram WebApp
    const tgApp = window.Telegram.WebApp;
    tgApp.expand();
    
    // Настройка основного цвета из Telegram
    document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');

    // Проверка авторизации и настроек игры
    const user = localStorage.getItem('user');
    const gameSettings = localStorage.getItem('gameSettings');
    
    if (!user) {
        window.location.href = '/register';
        return;
    }
    
    if (!gameSettings) {
        window.location.href = '/game-setup';
        return;
    }
    
    // Получение элементов игрового интерфейса
    const playerContainer = document.querySelector('.players-container');
    const playerHand = document.querySelector('.player-hand');
    const playerName = document.querySelector('.current-player-info .player-name');
    const playerAvatar = document.querySelector('.current-player-info .player-avatar');
    const drawCardBtn = document.getElementById('draw-card');
    const playCardBtn = document.getElementById('play-card');
    const passBtn = document.getElementById('pass-turn');
    const settingsBtn = document.getElementById('open-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const leaveGameBtn = document.getElementById('leave-game');
    
    // Парсим данные пользователя и настройки игры
    const userData = JSON.parse(user);
    const settings = JSON.parse(gameSettings);
    
    // Отображаем имя текущего игрока
    playerName.textContent = userData.username;
    
    // Создаем игроков вокруг стола
    createPlayers(settings.playerCount);
    
    // Создаем демо-карты в руке игрока
    createPlayerHand();
    
    // Обработчики событий
    drawCardBtn.addEventListener('click', drawCard);
    playCardBtn.addEventListener('click', playSelectedCard);
    passBtn.addEventListener('click', passTurn);
    settingsBtn.addEventListener('click', openSettings);
    closeModalBtn.addEventListener('click', closeSettings);
    leaveGameBtn.addEventListener('click', leaveGame);
    
    // Функция для создания игроков вокруг стола
    function createPlayers(count) {
        // Очищаем контейнер игроков
        playerContainer.innerHTML = '';
        
        const playerTemplate = document.getElementById('player-template');
        const radius = Math.min(playerContainer.offsetWidth, playerContainer.offsetHeight) * 0.4;
        
        // Рассчитываем позиции игроков по кругу
        for (let i = 0; i < count; i++) {
            const angle = (i * 2 * Math.PI / count) - Math.PI / 2; // Начинаем с верхней точки
            
            // Клонируем шаблон игрока
            const playerNode = document.importNode(playerTemplate.content, true);
            const playerElement = playerNode.querySelector('.player');
            
            // Устанавливаем позицию игрока
            const x = radius * Math.cos(angle) + playerContainer.offsetWidth / 2;
            const y = radius * Math.sin(angle) + playerContainer.offsetHeight / 2;
            
            playerElement.style.left = `${x - 25}px`; // 25px - половина ширины аватара
            playerElement.style.top = `${y - 25}px`; // 25px - половина высоты аватара
            
            // Устанавливаем имя и аватар игрока
            const playerNameElement = playerElement.querySelector('.player-name');
            const playerAvatar = playerElement.querySelector('.player-avatar img');
            
            if (i === 0) {
                // Текущий игрок
                playerNameElement.textContent = userData.username;
                // Устанавливаем аватар (если есть)
                if (userData.avatarUrl) {
                    playerAvatar.src = userData.avatarUrl;
                } else {
                    // Случайный цвет для аватара
                    const colors = ['#f44336', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#795548'];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    playerElement.querySelector('.player-avatar').style.backgroundColor = randomColor;
                    playerAvatar.style.display = 'none';
                }
                playerElement.classList.add('current-player');
            } else {
                // Бот или другой игрок
                const isBot = settings.withAI;
                playerNameElement.textContent = isBot ? `Бот ${i}` : `Игрок ${i}`;
                
                if (isBot) {
                    // Для ботов используем фиксированную картинку робота
                    playerAvatar.src = 'img/bot-avatar.png';
                } else {
                    // Для других игроков используем случайный цвет
                    const colors = ['#f44336', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#795548'];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    playerElement.querySelector('.player-avatar').style.backgroundColor = randomColor;
                    playerAvatar.style.display = 'none';
                }
            }
            
            // Устанавливаем количество карт
            playerElement.querySelector('.card-count').textContent = i === 0 ? '5' : '5';
            
            // Добавляем игрока в контейнер
            playerContainer.appendChild(playerElement);
        }
        
        // Активируем первого игрока (себя)
        const firstPlayer = playerContainer.querySelector('.player.current-player');
        if (firstPlayer) {
            firstPlayer.classList.add('active');
        }
    }
    
    // Функция для создания демо-карт в руке игрока
    function createPlayerHand() {
        // Очищаем руку
        playerHand.innerHTML = '';
        
        const cardTemplate = document.getElementById('card-template');
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'В', 'Д', 'К', 'Т'];
        
        // Создаем 5 случайных карт
        for (let i = 0; i < 5; i++) {
            const randomSuit = suits[Math.floor(Math.random() * suits.length)];
            const randomValue = values[Math.floor(Math.random() * values.length)];
            
            // Клонируем шаблон карты
            const cardNode = document.importNode(cardTemplate.content, true);
            const cardElement = cardNode.querySelector('.card');
            
            // Устанавливаем масть и значение
            cardElement.querySelector('.card-value').textContent = randomValue;
            cardElement.querySelector('.card-suit').textContent = randomSuit;
            
            // Устанавливаем цвет в зависимости от масти
            if (randomSuit === '♥' || randomSuit === '♦') {
                cardElement.querySelector('.card-front').style.color = 'red';
            }
            
            // Добавляем обработчик для выбора карты
            cardElement.addEventListener('click', function() {
                // Снимаем выделение со всех карт
                playerHand.querySelectorAll('.card').forEach(card => {
                    card.classList.remove('selected');
                });
                
                // Выделяем текущую карту
                this.classList.add('selected');
                
                // Активируем кнопку "Сыграть"
                playCardBtn.disabled = false;
            });
            
            // Добавляем карту в руку
            playerHand.appendChild(cardElement);
        }
    }
    
    // Функция для взятия карты
    function drawCard() {
        const cardTemplate = document.getElementById('card-template');
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'В', 'Д', 'К', 'Т'];
        
        const randomSuit = suits[Math.floor(Math.random() * suits.length)];
        const randomValue = values[Math.floor(Math.random() * values.length)];
        
        // Клонируем шаблон карты
        const cardNode = document.importNode(cardTemplate.content, true);
        const cardElement = cardNode.querySelector('.card');
        
        // Устанавливаем масть и значение
        cardElement.querySelector('.card-value').textContent = randomValue;
        cardElement.querySelector('.card-suit').textContent = randomSuit;
        
        // Устанавливаем цвет в зависимости от масти
        if (randomSuit === '♥' || randomSuit === '♦') {
            cardElement.querySelector('.card-front').style.color = 'red';
        }
        
        // Добавляем обработчик для выбора карты
        cardElement.addEventListener('click', function() {
            // Снимаем выделение со всех карт
            playerHand.querySelectorAll('.card').forEach(card => {
                card.classList.remove('selected');
            });
            
            // Выделяем текущую карту
            this.classList.add('selected');
            
            // Активируем кнопку "Сыграть"
            playCardBtn.disabled = false;
        });
        
        // Добавляем карту в руку с анимацией
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0.8)';
        playerHand.appendChild(cardElement);
        
        setTimeout(() => {
            cardElement.style.opacity = '1';
            cardElement.style.transform = 'scale(1)';
        }, 10);
        
        // Уменьшаем счетчик карт в колоде
        const deckCount = document.querySelector('.card-pile.deck .card-count');
        let count = parseInt(deckCount.textContent);
        if (count > 0) {
            deckCount.textContent = count - 1;
        }
        
        // Деактивируем кнопку взятия карты и активируем пропуск хода
        drawCardBtn.disabled = true;
        passBtn.disabled = false;
    }
    
    // Функция для игры выбранной карты
    function playSelectedCard() {
        const selectedCard = playerHand.querySelector('.card.selected');
        
        if (!selectedCard) return;
        
        // Перемещаем карту в сброс (с анимацией)
        const discard = document.querySelector('.card-pile.discard');
        const rect = discard.getBoundingClientRect();
        const cardRect = selectedCard.getBoundingClientRect();
        
        // Создаем клон карты для анимации
        const clone = selectedCard.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.top = `${cardRect.top}px`;
        clone.style.left = `${cardRect.left}px`;
        clone.style.width = `${cardRect.width}px`;
        clone.style.height = `${cardRect.height}px`;
        clone.style.transition = 'all 0.5s ease';
        clone.style.zIndex = '1000';
        
        document.body.appendChild(clone);
        
        // Анимируем перемещение
        setTimeout(() => {
            clone.style.top = `${rect.top}px`;
            clone.style.left = `${rect.left}px`;
            clone.style.transform = 'rotate(5deg)';
        }, 10);
        
        // Удаляем оригинал и клон после анимации
        setTimeout(() => {
            selectedCard.remove();
            clone.remove();
            
            // Деактивируем кнопку "Сыграть"
            playCardBtn.disabled = true;
            
            // Переходим к следующему ходу (для демо активируем первого бота)
            nextTurn();
        }, 500);
    }
    
    // Функция для пропуска хода
    function passTurn() {
        // Деактивируем кнопки
        drawCardBtn.disabled = true;
        playCardBtn.disabled = true;
        passBtn.disabled = true;
        
        // Переходим к следующему ходу
        nextTurn();
    }
    
    // Функция для перехода к следующему ходу
    function nextTurn() {
        // Находим текущего активного игрока
        const currentActive = playerContainer.querySelector('.player.active');
        
        if (currentActive) {
            currentActive.classList.remove('active');
            
            // Находим следующего игрока
            let nextPlayer = currentActive.nextElementSibling;
            
            if (!nextPlayer || !nextPlayer.classList.contains('player')) {
                // Если следующего нет, возвращаемся к первому
                nextPlayer = playerContainer.querySelector('.player');
            }
            
            // Активируем следующего игрока
            nextPlayer.classList.add('active');
            
            // Если это текущий игрок (пользователь), активируем кнопки
            if (nextPlayer.classList.contains('current-player')) {
                drawCardBtn.disabled = false;
                passBtn.disabled = true;
                playCardBtn.disabled = true;
            } else {
                // Имитация хода бота
                setTimeout(() => {
                    // Бот делает ход (случайный)
                    if (Math.random() > 0.5) {
                        // Бот берет карту
                        const deckCount = document.querySelector('.card-pile.deck .card-count');
                        let count = parseInt(deckCount.textContent);
                        if (count > 0) {
                            deckCount.textContent = count - 1;
                        }
                        
                        // Обновляем количество карт у бота
                        const botCardCount = nextPlayer.querySelector('.card-count');
                        botCardCount.textContent = parseInt(botCardCount.textContent) + 1;
                    } else {
                        // Бот играет карту
                        const botCardCount = nextPlayer.querySelector('.card-count');
                        const currentCount = parseInt(botCardCount.textContent);
                        if (currentCount > 0) {
                            botCardCount.textContent = currentCount - 1;
                        }
                    }
                    
                    // Переходим к следующему ходу
                    nextTurn();
                }, 1000);
            }
        }
    }
    
    // Функция для открытия настроек
    function openSettings() {
        settingsModal.classList.add('visible');
    }
    
    // Функция для закрытия настроек
    function closeSettings() {
        settingsModal.classList.remove('visible');
    }
    
    // Функция для выхода из игры
    function leaveGame() {
        // Удаляем настройки игры
        localStorage.removeItem('gameSettings');
        
        // Возвращаемся в главное меню
        window.location.href = '/webapp';
    }
    
    // Закрытие модального окна по клику вне его
    window.addEventListener('click', function(event) {
        if (event.target === settingsModal) {
            closeSettings();
        }
    });
}); 