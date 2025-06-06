// Инициализация Telegram WebApp
const tgApp = window.Telegram.WebApp;
tgApp.expand();

// Настройка основного цвета из Telegram
document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');

// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = localStorage.getItem('user');
        const gameSettings = localStorage.getItem('gameSettings');

        if (!user || !gameSettings) {
            console.error('Нет данных пользователя или настроек игры');
            window.location.href = '/';
            return;
        }

        const userData = JSON.parse(user);
        const settings = JSON.parse(gameSettings);

        // Устанавливаем значения в форме
        document.getElementById('player-count').value = settings.playerCount || 4;
        document.getElementById('with-ai').checked = settings.withAI || false;

        // Обработчик формы
        document.getElementById('game-setup-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                playerCount: parseInt(document.getElementById('player-count').value),
                withAI: document.getElementById('with-ai').checked,
                userId: userData.id,
                username: userData.username
            };

            try {
                const response = await fetch('/api/games/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem('currentGame', JSON.stringify(data.game));
                    window.location.href = '/game';
                } else {
                    alert(data.error || 'Ошибка при создании игры');
                }
            } catch (error) {
                console.error('Ошибка при создании игры:', error);
                alert('Произошла ошибка при создании игры');
            }
        });

    } catch (error) {
        console.error('Ошибка при инициализации страницы:', error);
        window.location.href = '/';
    }
});

// Получение элементов интерфейса
const ovalTables = document.querySelectorAll('.oval-table');
const withAIToggle = document.getElementById('with-ai');
const aiTestModeToggle = document.getElementById('ai-test-mode');
const startGameBtn = document.getElementById('start-game-btn');
const backBtn = document.getElementById('back-btn');
const rulesBtn = document.getElementById('rules-btn');
const rulesModal = document.getElementById('rules-modal');
const closeModal = document.querySelector('.close-modal');

// Переменная для хранения выбранного количества игроков
let selectedPlayerCount = 4;

// Выбираем по умолчанию стол для 4 игроков
ovalTables[0].classList.add('selected');

// Обработчик выбора стола
ovalTables.forEach(table => {
    table.addEventListener('click', function() {
        // Убираем класс selected у всех столов
        ovalTables.forEach(t => t.classList.remove('selected'));
        
        // Добавляем класс selected к выбранному столу
        this.classList.add('selected');
        
        // Обновляем выбранное количество игроков
        selectedPlayerCount = parseInt(this.getAttribute('data-players'));
        console.log(`Выбрано игроков: ${selectedPlayerCount}`);
    });
});

// Обработчик переключения режима тестирования с ИИ
aiTestModeToggle.addEventListener('change', function() {
    if (this.checked) {
        // Если включен режим тестирования с ИИ, автоматически включаем и обычный режим с ботами
        withAIToggle.checked = true;
    }
});

// Обработчик переключения режима с ботами
withAIToggle.addEventListener('change', function() {
    if (!this.checked && aiTestModeToggle.checked) {
        // Если отключаем ботов, то отключаем и режим тестирования с ИИ
        aiTestModeToggle.checked = false;
    }
});

// Обработчик открытия модального окна с правилами
rulesBtn.addEventListener('click', function() {
    rulesModal.style.display = 'block';
});

// Обработчик закрытия модального окна с правилами
closeModal.addEventListener('click', function() {
    rulesModal.style.display = 'none';
});

// Закрытие модального окна при клике за его пределами
window.addEventListener('click', function(event) {
    if (event.target === rulesModal) {
        rulesModal.style.display = 'none';
    }
});

// Обработчик кнопки "Назад"
backBtn.addEventListener('click', function() {
    window.location.href = '/webapp';
});

// Обработчик кнопки "Начать игру"
startGameBtn.addEventListener('click', function() {
    try {
        // Сохраняем настройки игры
        const gameSettings = {
            playerCount: selectedPlayerCount,
            withAI: withAIToggle.checked,
            aiTestMode: aiTestModeToggle.checked
        };
        localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
        console.log(`Сохранены настройки игры: ${JSON.stringify(gameSettings)}`);
        
        // Если используем Telegram WebApp, отправляем данные в бота
        if (tgApp && tgApp.isExpanded) {
            const userData = JSON.parse(user);
            tgApp.sendData(JSON.stringify({
                action: 'start_game',
                userId: userData.id,
                playerCount: selectedPlayerCount,
                withAI: withAIToggle.checked,
                aiTestMode: aiTestModeToggle.checked
            }));
        }
        
        // Переходим на страницу игры
        window.location.href = '/game';
    } catch (error) {
        console.error('Ошибка при начале игры:', error);
        alert('Произошла ошибка при начале игры. Пожалуйста, попробуйте еще раз.');
    }
}); 