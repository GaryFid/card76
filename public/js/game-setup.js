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
    
    // Если пользователь не авторизован, перенаправляем на страницу регистрации
    if (!user) {
        window.location.href = '/register';
        return;
    }
    
    // Получение элементов интерфейса
    const ovalTables = document.querySelectorAll('.oval-table');
    const withAIToggle = document.getElementById('with-ai');
    const aiTestModeToggle = document.getElementById('ai-test-mode');
    const startGameBtn = document.getElementById('start-game-btn');
    const backBtn = document.getElementById('back-btn');
    
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
    
    // Обработчик кнопки "Назад"
    backBtn.addEventListener('click', function() {
        window.location.href = '/webapp';
    });
    
    // Обработчик кнопки "Начать игру"
    startGameBtn.addEventListener('click', function() {
        // Сохраняем настройки игры
        const gameSettings = {
            playerCount: selectedPlayerCount,
            withAI: withAIToggle.checked,
            aiTestMode: aiTestModeToggle.checked
        };
        
        localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
        console.log(`Сохранены настройки игры: ${JSON.stringify(gameSettings)}`);
        
        // Переходим на страницу игры
        window.location.href = '/game';
        
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
    });
}); 