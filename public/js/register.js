// --- register.js без import/export ---

document.addEventListener('DOMContentLoaded', async function() {
    var tgApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    var registerForm = document.getElementById('register-form') || document.getElementById('registerForm');
    var tgLoader = document.getElementById('tg-loader');
    // Если WebApp открыт в Telegram, сразу редиректим на check-updates.html для авторизации через Telegram
    if (tgApp && tgApp.initDataUnsafe && tgApp.initDataUnsafe.user) {
        window.location.replace('/check-updates.html');
        return;
    }
    // Обычная форма регистрации/логина показывается только если НЕ в Telegram WebApp
    if (tgApp && tgApp.initDataUnsafe && tgApp.initDataUnsafe.user) {
        console.log('[register.js] Найдены данные Telegram:', tgApp.initDataUnsafe.user);
        // Скрываем форму регистрации, показываем лоадер
        if (registerForm) registerForm.style.display = 'none';
        if (tgLoader) tgLoader.style.display = '';
        if (window.showToast) window.showToast('Пробуем авторизацию через Telegram...', 'info');
        // Авторизация через Telegram
        try {
            const response = await fetch('/auth/telegram/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramData: tgApp.initDataUnsafe.user }),
                credentials: 'include'
            });
            const data = await response.json();
            console.log('[register.js] Ответ /auth/telegram/login:', data);
            if (data.success && data.user && data.user.id && data.user.username) {
                localStorage.setItem('user', JSON.stringify(data.user));
                if (window.showToast) window.showToast('Успешная авторизация через Telegram!', 'success');
                window.location.replace('/index.html');
            } else {
                if (window.showToast) window.showToast(data.error || 'Ошибка авторизации через Telegram', 'error');
                else alert(data.error || 'Ошибка авторизации через Telegram');
                // Показываем форму регистрации, скрываем лоадер
                if (registerForm) registerForm.style.display = '';
                if (tgLoader) tgLoader.style.display = 'none';
                console.warn('[register.js] Ошибка авторизации через Telegram:', data);
            }
        } catch (error) {
            if (window.showToast) window.showToast('Ошибка при авторизации через Telegram', 'error');
            else alert('Ошибка при авторизации через Telegram');
            if (registerForm) registerForm.style.display = '';
            if (tgLoader) tgLoader.style.display = 'none';
            console.error('[register.js] Ошибка при авторизации через Telegram:', error);
        }
    } else {
        // Если не через Telegram — показываем обычную форму регистрации, скрываем лоадер
        if (registerForm) registerForm.style.display = '';
        if (tgLoader) tgLoader.style.display = 'none';
    }

    // Настройка основных цветов из Telegram
    if (tgApp && tgApp.themeParams) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');
    }

    // Получаем элементы формы
    var tgLoginBtn = document.getElementById('tgLoginBtn');
    var errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.style.color = 'red';
    errorMessage.style.marginTop = '10px';
    errorMessage.style.fontSize = '14px';
    registerForm.appendChild(errorMessage);

    // Проверяем наличие сохраненного пользователя
    var savedUser = localStorage.getItem('user');
    if (savedUser) {
        console.log('[register.js] Пользователь уже авторизован:', savedUser);
        // Перенаправляем на главную, если пользователь уже авторизован
        window.location.href = '/index.html';
        return;
    }

    // Обработчик клика по кнопке Telegram
    if (tgLoginBtn && tgApp) {
        tgLoginBtn.addEventListener('click', async function() {
            var user = tgApp.initDataUnsafe && tgApp.initDataUnsafe.user;
            console.log('[register.js] Клик по кнопке Telegram, user:', user);
            if (!user) {
                if (window.showToast) window.showToast('Не удалось получить данные пользователя Telegram', 'error');
                else alert('Не удалось получить данные пользователя Telegram');
                return;
            }
            try {
                var response = await fetch('/auth/telegram/force-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user }),
                    credentials: 'include'
                });
                var data = await response.json();
                console.log('[register.js] Ответ /auth/telegram/force-login:', data);
                if (data.success && data.user && data.user.id && data.user.username) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    if (window.showToast) window.showToast('Успешная авторизация! Перенаправление...');
                    else alert('Успешная авторизация! Перенаправление...');
                    setTimeout(function() { window.location.replace('/index.html'); }, 1000);
                } else {
                    if (window.showToast) window.showToast(data.message || data.error || 'Ошибка авторизации', 'error');
                    else alert(data.message || data.error || 'Ошибка авторизации');
                    console.warn('[register.js] Ошибка force-login:', data);
                }
            } catch (error) {
                console.error('Ошибка при авторизации через Telegram:', error);
                if (window.showToast) window.showToast('Произошла ошибка при авторизации', 'error');
                else alert('Произошла ошибка при авторизации');
            }
        });
    }

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
    // Инициализация выпадающих списков для даты рождения
    const daySelect = document.getElementById('birth-day');
    const monthSelect = document.getElementById('birth-month');
    const yearSelect = document.getElementById('birth-year');

    // Заполняем дни
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        daySelect.appendChild(option);
    }

    // Заполняем месяцы
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                   'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    // Заполняем годы (от текущего года - 100 до текущего года - 5)
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year >= currentYear - 100; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // Обработчик формы регистрации
    const form = document.getElementById('register-form') || document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            var username = document.getElementById('username').value;
            var password = document.getElementById('password').value;
            var confirmPassword = document.getElementById('confirmPassword').value;
            // Валидация
            if (!username || username.length < 3) {
                if (window.showToast) window.showToast('Имя пользователя должно быть не менее 3 символов', 'error');
                else alert('Имя пользователя должно быть не менее 3 символов');
                return;
            }
            if (!password || password.length < 6) {
                if (window.showToast) window.showToast('Пароль должен быть не менее 6 символов', 'error');
                else alert('Пароль должен быть не менее 6 символов');
                return;
            }
            if (password !== confirmPassword) {
                if (window.showToast) window.showToast('Пароли не совпадают', 'error');
                else alert('Пароли не совпадают');
                return;
            }
            // Показываем лоадер
            var tgLoader = document.getElementById('tg-loader');
            if (tgLoader) tgLoader.style.display = '';
            try {
                var response = await fetch('/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });
                var data = await response.json();
                if (data.success && data.user && data.user.id && data.user.username) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    if (window.showToast) window.showToast('Регистрация успешна!', 'success');
                    setTimeout(function() { window.location.replace('/index.html'); }, 1000);
                } else {
                    if (window.showToast) window.showToast(data.error || 'Ошибка регистрации', 'error');
                    else alert(data.error || 'Ошибка регистрации');
                }
            } catch (error) {
                if (window.showToast) window.showToast('Ошибка при регистрации', 'error');
                else alert('Ошибка при регистрации');
            } finally {
                if (tgLoader) tgLoader.style.display = 'none';
            }
        });
    }

    // Кнопка входа через Telegram
    const telegramButton = document.getElementById('telegram-login');
    if (telegramButton) {
        telegramButton.addEventListener('click', () => {
            window.location.href = '/auth/telegram';
        });
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