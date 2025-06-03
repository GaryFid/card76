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
    const usernameInput = document.getElementById('username');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.style.color = 'red';
    errorMessage.style.marginTop = '10px';
    errorMessage.style.fontSize = '14px';
    usernameInput.parentNode.appendChild(errorMessage);

    // Проверяем наличие сохраненного пользователя
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        // Перенаправляем на главную, если пользователь уже авторизован
        window.location.href = '/webapp';
        return;
    }

    // Валидация имени пользователя
    function validateUsername(username) {
        if (!username) {
            return 'Пожалуйста, введите ваше имя';
        }
        if (username.length < 4) {
            return 'Имя должно содержать не менее 4 символов';
        }
        return null; // Нет ошибок
    }

    // Обработка обычной регистрации
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const error = validateUsername(username);
        
        if (error) {
            errorMessage.textContent = error;
            return;
        } else {
            errorMessage.textContent = '';
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
                return response.json().then(data => {
                    throw new Error(data.error || 'Ошибка при регистрации');
                });
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
            errorMessage.textContent = error.message || 'Произошла ошибка при регистрации. Пожалуйста, попробуйте снова.';
            tgApp.MainButton.hide();
        });
    }
});

// JS для форм входа и регистрации P.I.D.R.

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  function showMessage(form, msg, isError = false) {
    let el = form.querySelector('.form-message');
    if (!el) {
      el = document.createElement('div');
      el.className = 'form-message';
      form.appendChild(el);
    }
    el.textContent = msg;
    el.style.color = isError ? '#e53935' : '#2196f3';
    el.style.marginTop = '8px';
    el.style.fontWeight = 'bold';
    el.style.fontSize = '1em';
  }

  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(loginForm));
      showMessage(loginForm, 'Вход...');
      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
          showMessage(loginForm, 'Успешный вход! Перенаправление...');
          setTimeout(() => window.location.href = '/game-setup', 800);
        } else {
          showMessage(loginForm, json.error || 'Ошибка входа', true);
        }
      } catch (err) {
        showMessage(loginForm, 'Ошибка сервера', true);
      }
    };
  }

  if (registerForm) {
    registerForm.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(registerForm));
      if (data.password !== data.password2) {
        showMessage(registerForm, 'Пароли не совпадают', true);
        return;
      }
      showMessage(registerForm, 'Регистрация...');
      try {
        const res = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.username, password: data.password })
        });
        const json = await res.json();
        if (json.success) {
          showMessage(registerForm, 'Успешная регистрация! Перенаправление...');
          setTimeout(() => window.location.href = '/game-setup', 800);
        } else {
          showMessage(registerForm, json.error || 'Ошибка регистрации', true);
        }
      } catch (err) {
        showMessage(registerForm, 'Ошибка сервера', true);
      }
    };
  }
}); 