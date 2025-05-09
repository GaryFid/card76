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
    
    // Получение элементов слайдера и отображения
    const playerCountSlider = document.getElementById('player-count');
    const playerCountValue = document.querySelector('.player-count-value');
    const playerIcons = document.querySelectorAll('.player-icon');
    const withAIToggle = document.getElementById('with-ai');
    const startGameBtn = document.getElementById('start-game-btn');
    const backBtn = document.getElementById('back-btn');
    
    // Обновление отображения количества игроков при изменении слайдера
    function updatePlayerCount() {
        const count = parseInt(playerCountSlider.value);
        playerCountValue.textContent = count;
        
        // Обновление иконок игроков
        playerIcons.forEach((icon, index) => {
            if (index < count) {
                icon.classList.add('active');
            } else {
                icon.classList.remove('active');
            }
        });
    }
    
    // Обработчик изменения слайдера
    playerCountSlider.addEventListener('input', updatePlayerCount);
    
    // Обработчик кнопки "Назад"
    backBtn.addEventListener('click', function() {
        window.location.href = '/webapp';
    });
    
    // Обработчик кнопки "Начать игру"
    startGameBtn.addEventListener('click', function() {
        const playerCount = parseInt(playerCountSlider.value);
        const withAI = withAIToggle.checked;
        
        // Сохраняем настройки игры
        const gameSettings = {
            playerCount,
            withAI
        };
        localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
        
        // Перенаправляем на страницу игры
        window.location.href = '/game';
        
        // Если используем Telegram WebApp, отправляем данные в бота
        if (tgApp && tgApp.isExpanded) {
            const userData = JSON.parse(user);
            tgApp.sendData(JSON.stringify({
                action: 'start_game',
                userId: userData.id,
                playerCount,
                withAI
            }));
        }
    });
    
    // Инициализация начального состояния
    updatePlayerCount();
}); 