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
    
    // Получаем данные пользователя
    const userData = JSON.parse(user);
    
    // Обработчики нажатий на кнопки
    document.getElementById('start-game').addEventListener('click', () => {
        tgApp.sendData('start_game');
    });
    
    document.getElementById('play-ai').addEventListener('click', () => {
        tgApp.sendData('play_ai');
    });
    
    document.getElementById('rating').addEventListener('click', () => {
        tgApp.sendData('rating');
    });
    
    document.getElementById('rules').addEventListener('click', () => {
        tgApp.sendData('rules');
    });
}); 