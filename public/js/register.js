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
    const guestAuthBtn = document.getElementById('guest-auth');

    // Проверяем наличие сохраненного пользователя
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        // Перенаправляем на главную, если пользователь уже авторизован
        window.location.href = '/webapp';
        return;
    }

    // Обработка обычной регистрации
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        
        if (!username) {
            alert('Пожалуйста, введите ваше имя');
            return;
        }
        
        // Показываем индикатор загрузки
        tgApp.MainButton.setText('Регистрация...');
        tgApp.MainButton.show();
        
        // Отправляем данные на сервер для регистрации
        registerUser({
            username: username,
            type: 'basic'
        });
    });

    // Обработка входа как гость
    guestAuthBtn.addEventListener('click', function() {
        // Генерируем случайное имя гостя
        const guestName = 'Гость_' + Math.floor(Math.random() * 10000);
        
        // Показываем индикатор загрузки
        tgApp.MainButton.setText('Входим как гость...');
        tgApp.MainButton.show();
        
        // Регистрируем гостя
        registerUser({
            username: guestName,
            type: 'guest'
        });
    });

    // Функция для отправки данных регистрации на сервер
    function registerUser(userData) {
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
            if (data.success) {
                // Успешная регистрация
                tgApp.MainButton.setText('Успешно!');
                
                // Сохраняем данные пользователя
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Перенаправляем на главную страницу
                setTimeout(() => {
                    window.location.href = '/webapp';
                }, 1000);
            } else {
                throw new Error(data.error || 'Ошибка при регистрации');
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при регистрации. Пожалуйста, попробуйте снова.');
            tgApp.MainButton.hide();
        });
    }
}); 