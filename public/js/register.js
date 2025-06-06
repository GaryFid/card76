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
                showError('Не удалось получить данные пользователя Telegram');
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
                showSuccess('Успешная авторизация! Перенаправление...');
                // Перенаправляем на главную страницу
                setTimeout(() => {
                    window.location.href = '/webapp';
                }, 1000);
            } else {
                showError(data.error || 'Ошибка авторизации');
            }
        } catch (error) {
            console.error('Ошибка при авторизации через Telegram:', error);
            showError('Произошла ошибка при авторизации');
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