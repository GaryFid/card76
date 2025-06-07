document.addEventListener('DOMContentLoaded', function() {
    var tgApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    if (tgApp) tgApp.expand();
    if (tgApp && tgApp.themeParams) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');
    }
    // Здесь разместить основную игровую логику, используя window.getCurrentUser, window.showToast и т.д.
    // Например, получить пользователя:
    var user = window.getCurrentUser ? window.getCurrentUser() : null;
    // Получить id игры из URL
    var params = new URLSearchParams(window.location.search);
    var gameId = params.get('id');
    if (!gameId) {
        window.showToast('Не указан id игры!', 'error');
        window.goToPage('/index.html');
        return;
    }
    // Здесь разместить остальной игровой код (отрисовка, обработка ходов и т.д.)
    // ...
    // Для примера:
    window.showToast('Игра загружена! (заглушка)', 'success');
}); 