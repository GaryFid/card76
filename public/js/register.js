document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Telegram WebApp
    const tgApp = window.Telegram.WebApp;
    tgApp.expand();

    // Настройка основных цветов из Telegram
    document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');

    // Получаем элементы формы
    const registerForm = document.getElementById('register-form');
    const telegramAuthBtn = document.getElementById('telegram-auth');
    const googleAuthBtn = document.getElementById('google-auth');
    const guestAuthBtn = document.getElementById('guest-auth');

    // Обработка обычной регистрации
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        
        if (!username) {
            alert('Пожалуйста, введите ваше имя');
            return;
        }
        
        // Отправляем данные на сервер
        registerUser({
            username: username,
            type: 'basic'
        });
    });

    // Обработка авторизации через Telegram
    telegramAuthBtn.addEventListener('click', function() {
        // Если мы в Telegram WebApp, можем использовать данные пользователя
        if (tgApp.initDataUnsafe && tgApp.initDataUnsafe.user) {
            const user = tgApp.initDataUnsafe.user;
            registerUser({
                telegramId: user.id.toString(),
                username: user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                firstName: user.first_name,
                lastName: user.last_name,
                type: 'telegram'
            });
        } else {
            // Перенаправляем на страницу авторизации Telegram
            window.location.href = '/auth/telegram';
        }
    });

    // Обработка авторизации через Google
    googleAuthBtn.addEventListener('click', function() {
        // Перенаправляем на страницу авторизации Google
        window.location.href = '/auth/google';
    });

    // Обработка входа как гость
    guestAuthBtn.addEventListener('click', function() {
        // Генерируем случайное имя гостя
        const guestName = 'Гость_' + Math.floor(Math.random() * 10000);
        
        registerUser({
            username: guestName,
            type: 'guest'
        });
    });

    // Функция для отправки данных регистрации на сервер
    function registerUser(userData) {
        // Показываем индикатор загрузки
        tgApp.MainButton.setText('Загрузка...');
        tgApp.MainButton.show();
        
        fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка при регистрации');
            }
            return response.json();
        })
        .then(data => {
            // Успешная регистрация, перенаправляем в меню
            tgApp.MainButton.setText('Успешно!');
            
            // Сохраняем данные пользователя
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Перенаправляем на главную страницу
            setTimeout(() => {
                window.location.href = '/webapp';
            }, 1000);
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при регистрации. Пожалуйста, попробуйте снова.');
            tgApp.MainButton.hide();
        });
    }
}); 