import { showToast, showModal } from './utils.js';

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
    const tgLoginBtn = document.getElementById('tgLoginBtn');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.style.color = 'red';
    errorMessage.style.marginTop = '10px';
    errorMessage.style.fontSize = '14px';
    registerForm.appendChild(errorMessage);

    // Проверяем наличие сохраненного пользователя
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        // Перенаправляем на главную, если пользователь уже авторизован
        window.location.href = '/webapp';
        return;
    }

    // Обработчик клика по кнопке Telegram
    tgLoginBtn.addEventListener('click', async function() {
        try {
            // Получаем данные пользователя из Telegram WebApp
            const initData = tgApp.initData;
            const user = tgApp.initDataUnsafe.user;

            if (!user) {
                showToast('Не удалось получить данные пользователя Telegram', 'error');
                return;
            }

            // Отправляем запрос на сервер для регистрации/авторизации
            const response = await fetch('/auth/telegram/force-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData,
                    user: {
                        id: user.id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        username: user.username,
                        language_code: user.language_code,
                        photo_url: user.photo_url
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                // Сохраняем данные пользователя
                localStorage.setItem('user', JSON.stringify(data.user));
                // Показываем сообщение об успехе
                showToast('Успешная авторизация! Перенаправление...');
                // Перенаправляем на главную страницу
                setTimeout(() => {
                    window.location.href = '/webapp';
                }, 1000);
            } else {
                showToast(data.error || 'Ошибка авторизации', 'error');
            }
        } catch (error) {
            console.error('Ошибка при авторизации через Telegram:', error);
            showToast('Произошла ошибка при авторизации', 'error');
        }
    });

    // Функция отображения ошибки
    function showError(message) {
        errorMessage.style.color = 'red';
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    // Функция отображения успеха
    function showSuccess(message) {
        errorMessage.style.color = 'green';
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
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
});

// JS для форм входа и регистрации P.I.D.R.

document.addEventListener('DOMContentLoaded', () => {
    // Элементы форм
    const authForm = document.getElementById('auth-form');
    const registerForm = document.getElementById('register-form');
    const registerModal = document.getElementById('registerModal');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const closeRegisterBtn = document.getElementById('closeRegisterModal');
    const errorMessage = document.getElementById('error-message');

    // Элементы выбора даты
    const daySelect = document.getElementById('birth-day');
    const monthSelect = document.getElementById('birth-month');
    const yearSelect = document.getElementById('birth-year');

    // Инициализация селектов даты рождения
    const initDatePickers = () => {
        // Дни
        for (let i = 1; i <= 31; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i.toString().padStart(2, '0');
            daySelect.appendChild(option);
        }

        // Месяцы
        const months = [
            'Январь', 'Февраль', 'Март', 'Апрель',
            'Май', 'Июнь', 'Июль', 'Август',
            'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            monthSelect.appendChild(option);
        });

        // Годы (от текущего года - 100 до текущего года - 10)
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 10; i >= currentYear - 100; i--) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            yearSelect.appendChild(option);
        }
    };

    // Функция показа ошибки
    const showError = (message, element = errorMessage) => {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    };

    // Открытие модального окна
    showRegisterBtn.addEventListener('click', () => {
        registerModal.classList.add('active');
    });

    // Закрытие модального окна
    closeRegisterBtn.addEventListener('click', () => {
        registerModal.classList.remove('active');
    });

    // Закрытие по клику вне модального окна
    registerModal.addEventListener('click', (e) => {
        if (e.target === registerModal) {
            registerModal.classList.remove('active');
        }
    });

    // Обработка входа
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (data.success) {
                window.location.href = '/';
            } else {
                showError(data.message);
            }
        } catch (error) {
            showError('Ошибка при входе. Попробуйте позже.');
        }
    });

    // Обработка регистрации
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;
        const birthDate = `${yearSelect.value}-${monthSelect.value.toString().padStart(2, '0')}-${daySelect.value.toString().padStart(2, '0')}`;

        // Валидация
        if (password !== passwordConfirm) {
            showError('Пароли не совпадают');
            return;
        }

        if (password.length < 6) {
            showError('Пароль должен содержать минимум 6 символов');
            return;
        }

        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    birthDate
                })
            });

            const data = await response.json();
            if (data.success) {
                registerModal.classList.remove('active');
                showError('Регистрация успешна! Теперь вы можете войти.', errorMessage);
                registerForm.reset();
            } else {
                showError(data.message);
            }
        } catch (error) {
            showError('Ошибка при регистрации. Попробуйте позже.');
        }
    });

    // Telegram авторизация
    const tgLoginBtn = document.getElementById('tgLoginBtn');
    tgLoginBtn.addEventListener('click', async () => {
        try {
            const tg = window.Telegram.WebApp;
            if (tg.initDataUnsafe.user) {
                const response = await fetch('/auth/telegram', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        telegramData: tg.initDataUnsafe
                    })
                });

                const data = await response.json();
                if (data.success) {
                    window.location.href = '/';
                } else {
                    showError(data.message);
                }
            } else {
                showError('Ошибка авторизации через Telegram');
            }
        } catch (error) {
            showError('Ошибка при входе через Telegram');
        }
    });

    // Инициализация селектов даты
    initDatePickers();
});

// --- Кнопка и модалка для админа ---
function showAdminUsersButtonIfAdmin() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.username === '@GreenWood9009') {
    let btn = document.createElement('button');
    btn.textContent = 'Игроки в ПИДР';
    btn.className = 'admin-users-btn';
    btn.style.position = 'fixed';
    btn.style.left = '24px';
    btn.style.top = '24px';
    btn.style.zIndex = 1000;
    btn.style.background = '#2196f3';
    btn.style.color = '#fff';
    btn.style.fontWeight = 'bold';
    btn.style.borderRadius = '8px';
    btn.style.padding = '10px 18px';
    btn.style.boxShadow = '0 2px 8px #2196f3aa';
    btn.onclick = showAdminUsersModal;
    document.body.appendChild(btn);
  }
}

async function showAdminUsersModal() {
  let modal = document.createElement('div');
  modal.className = 'admin-users-modal';
  modal.style.position = 'fixed';
  modal.style.left = '0';
  modal.style.top = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(30,60,114,0.18)';
  modal.style.zIndex = 2000;
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';

  let box = document.createElement('div');
  box.style.background = '#fff';
  box.style.borderRadius = '18px';
  box.style.padding = '32px 24px';
  box.style.maxWidth = '700px';
  box.style.width = '95vw';
  box.style.maxHeight = '80vh';
  box.style.overflowY = 'auto';
  box.style.boxShadow = '0 8px 32px #1e3c72aa';

  let close = document.createElement('button');
  close.textContent = '×';
  close.style.position = 'absolute';
  close.style.right = '32px';
  close.style.top = '24px';
  close.style.fontSize = '2em';
  close.style.background = 'none';
  close.style.border = 'none';
  close.style.cursor = 'pointer';
  close.onclick = () => modal.remove();
  box.appendChild(close);

  let title = document.createElement('h2');
  title.textContent = 'Все пользователи P.I.D.R.';
  title.style.marginBottom = '18px';
  box.appendChild(title);

  let table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.innerHTML = `<tr style="background:#e3eafc"><th>ID</th><th>Ник</th><th>Рейтинг</th><th>Уровень</th><th>Telegram</th><th>Дата</th></tr>`;
  try {
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    const json = await res.json();
    if (json.success) {
      for (const u of json.users) {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td>${u.id}</td><td>${u.username}</td><td>${u.rating}</td><td>${u.level}</td><td>${u.telegramId || ''}</td><td>${new Date(u.createdAt).toLocaleDateString()}</td>`;
        table.appendChild(tr);
      }
    } else {
      let tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" style="color:#e53935">Ошибка: ${json.error}</td>`;
      table.appendChild(tr);
    }
  } catch (e) {
    let tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="color:#e53935">Ошибка загрузки пользователей</td>`;
    table.appendChild(tr);
  }
  box.appendChild(table);
  modal.appendChild(box);
  document.body.appendChild(modal);
}

showAdminUsersButtonIfAdmin(); 