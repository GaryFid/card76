// Инициализация Telegram WebApp
const tgApp = window.Telegram.WebApp;
tgApp.expand();

// Настройка основного цвета из Telegram
document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');

// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Получаем данные пользователя из Telegram WebApp
        const initData = tgApp.initData || '';
        const initDataUnsafe = tgApp.initDataUnsafe || {};
        
        if (!initData) {
            console.error('Нет данных инициализации Telegram WebApp');
            return;
        }

        // Отправляем запрос на сервер для проверки/создания пользователя
        const response = await fetch('/auth/telegram/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                initData,
                user: initDataUnsafe.user
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Сохраняем данные пользователя
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('Пользователь авторизован:', data.user);
        } else {
            console.error('Ошибка авторизации:', data.error);
            if (data.redirect) {
                window.location.href = data.redirect;
            }
        }
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
    }
});

// Обработчик кнопки "Начать игру"
document.getElementById('start-game').addEventListener('click', async () => {
    try {
        const user = localStorage.getItem('user');
        if (!user) {
            console.error('Пользователь не авторизован');
            // Пробуем получить данные из Telegram WebApp
            const initDataUnsafe = tgApp.initDataUnsafe || {};
            if (initDataUnsafe.user) {
                // Отправляем запрос на автоматическую авторизацию
                const response = await fetch('/auth/telegram/force-login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user: initDataUnsafe.user
                    })
                });

                const data = await response.json();
                if (data.success) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '/game-setup';
                    return;
                }
            }
            window.location.href = '/register';
            return;
        }

        // Проверяем валидность данных пользователя
        const userData = JSON.parse(user);
        if (!userData.id || !userData.username) {
            console.error('Некорректные данные пользователя');
            localStorage.removeItem('user');
            window.location.href = '/register';
            return;
        }

        // Сохраняем базовые настройки игры
        localStorage.setItem('gameSettings', JSON.stringify({
            playerCount: 4,
            withAI: false
        }));

        // Переходим к настройке игры
        window.location.href = '/game-setup';
    } catch (error) {
        console.error('Ошибка при начале игры:', error);
        alert('Произошла ошибка при начале игры. Попробуйте перезагрузить страницу.');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // --- Анимация карт в header ---
    const cardNames = [
        '6_of_hearts','6_of_spades','6_of_diamonds','6_of_clubs',
        '7_of_hearts','7_of_spades','7_of_diamonds','7_of_clubs',
        '8_of_hearts','8_of_spades','8_of_diamonds','8_of_clubs',
        '9_of_hearts','9_of_spades','9_of_diamonds','9_of_clubs',
        '10_of_hearts','10_of_spades','10_of_diamonds','10_of_clubs',
        'jack_of_hearts','jack_of_spades','jack_of_diamonds','jack_of_clubs',
        'queen_of_hearts','queen_of_spades','queen_of_diamonds','queen_of_clubs',
        'king_of_hearts','king_of_spades','king_of_diamonds','king_of_clubs',
        'ace_of_hearts','ace_of_spades','ace_of_diamonds','ace_of_clubs',
        '2_of_hearts','2_of_spades','2_of_diamonds','2_of_clubs',
        '3_of_hearts','3_of_spades','3_of_diamonds','3_of_clubs',
        '4_of_hearts','4_of_spades','4_of_diamonds','4_of_clubs',
        '5_of_hearts','5_of_spades','5_of_diamonds','5_of_clubs'
    ];
    // Выбираем 5 случайных уникальных карт для header и main
    let used = new Set();
    let selectedCards = [];
    for (let i = 0; i < 5; i++) {
        let idx;
        do { idx = Math.floor(Math.random() * cardNames.length); } while (used.has(idx));
        used.add(idx);
        selectedCards.push(cardNames[idx]);
    }
    // --- header-cards ---
    const headerCards = document.getElementById('header-cards');
    if (headerCards) {
        headerCards.innerHTML = '';
        for (let i = 0; i < selectedCards.length; i++) {
            const card = document.createElement('img');
            card.className = 'header-card-img';
            card.src = `img/cards/${selectedCards[i]}.png`;
            card.alt = selectedCards[i];
            headerCards.appendChild(card);
        }
    }
    // --- main-card-loader ---
    const mainLoader = document.getElementById('main-card-loader');
    if (mainLoader) {
        mainLoader.innerHTML = '';
        for (let i = 0; i < selectedCards.length; i++) {
            const card = document.createElement('img');
            card.className = 'main-card-loader-img';
            card.src = `img/cards/${selectedCards[i]}.png`;
            card.alt = selectedCards[i];
            mainLoader.appendChild(card);
        }
    }
    // --- Переходы между страницами ---
    // Проверка авторизации
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '/register';
        return;
    }
    try {
        const userData = JSON.parse(user);
        if (!userData.id || !userData.username) {
            localStorage.removeItem('user');
            window.location.href = '/register';
            return;
        }
        document.getElementById('play-ai').addEventListener('click', () => {
            localStorage.setItem('gameSettings', JSON.stringify({
                playerCount: 4,
                withAI: true
            }));
            window.location.href = '/game-setup';
        });
        document.getElementById('rating').addEventListener('click', () => {
            alert('Рейтинг игроков будет доступен в ближайшее время!');
        });
        document.getElementById('rules').addEventListener('click', () => {
            showRules();
        });
        function showRules() {
            // Создаем элементы модального окна
            const modal = document.createElement('div');
            modal.className = 'rules-modal';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            modal.style.zIndex = '1000';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'rules-content';
            modalContent.style.backgroundColor = 'var(--tg-theme-bg-color)';
            modalContent.style.borderRadius = '12px';
            modalContent.style.padding = '20px';
            modalContent.style.width = '90%';
            modalContent.style.maxWidth = '600px';
            modalContent.style.maxHeight = '80%';
            modalContent.style.overflow = 'auto';
            modalContent.style.boxShadow = '0 5px 20px rgba(0,0,0,0.3)';
            
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '10px';
            closeBtn.style.right = '10px';
            closeBtn.style.fontSize = '24px';
            closeBtn.style.border = 'none';
            closeBtn.style.background = 'none';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.color = 'var(--tg-theme-text-color)';
            
            const title = document.createElement('h2');
            title.textContent = 'Правила игры "P.I.D.R. - Punishment Inevitable: Dumb Rules"';
            title.style.textAlign = 'center';
            title.style.marginBottom = '20px';
            
            const rules = document.createElement('div');
            rules.innerHTML = `
                <h3>Цель игры</h3>
                <p>Избавиться от всех карт на руке раньше других игроков.</p>
                <h3>Колода и подготовка</h3>
                <p>Игра ведется стандартной колодой из 52 карт (от 2 до туза).</p>
                <p>Каждому игроку раздаются 3 карты: 2 закрытые и 1 открытая.</p>
                <h3>Ход игры</h3>
                <p><strong>Стадия 1:</strong> Выкладка карт</p>
                <ul>
                    <li>Игроки ходят по очереди. Начинает игрок с самой старшей открытой картой.</li>
                    <li>В свой ход игрок может положить только верхнюю карту своей стопки на открытую карту любого оппонента, если она на 1 ранг выше (например, 7 на 6, 2 на туза).</li>
                    <li>После успешного хода игрок сразу берёт новую карту из колоды (если есть) и продолжает ходить, пока есть возможность.</li>
                    <li>Если некуда положить верхнюю карту — берётся одна карта из колоды. Если и её некуда положить — игрок оставляет её себе и передаёт ход дальше.</li>
                    <li>Игрок не может остаться без открытой карты в первой стадии.</li>
                    <li>Стадия заканчивается, когда колода заканчивается.</li>
                </ul>
                <p><strong>Стадия 2:</strong> Игра с картами на руках</p>
                <ul>
                    <li>Закрытые карты остаются закрытыми.</li>
                    <li>Игроки продолжают играть с теми картами, что у них на руках.</li>
                    <li>Первым ходит тот, кто последним взял карту из колоды в первой стадии.</li>
                    <li>Дальнейшие правила определяются по договорённости или по сценарию игры.</li>
                </ul>
                <h3>Победа</h3>
                <p>Побеждает игрок, который первым избавится от всех своих карт.</p>
            `;
            // Добавляем элементы в DOM
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(rules);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            // Обработчик закрытия модального окна
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            // Закрытие при клике вне модального окна
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        }
    } catch (error) {
        localStorage.removeItem('user');
        window.location.href = '/register';
    }
    // --- Кошелек: бургер-меню ---
    const walletBlock = document.getElementById('wallet-block');
    const walletBtn = document.getElementById('wallet-btn');
    const walletDropdown = document.getElementById('wallet-dropdown');
    if (walletBtn && walletBlock && walletDropdown) {
        walletBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            walletBlock.classList.toggle('open');
        });
        // Закрытие меню при клике вне
        document.addEventListener('click', function(e) {
            if (!walletBlock.contains(e.target)) {
                walletBlock.classList.remove('open');
            }
        });
    }
    // --- Открытие модалки профиля из блока в шапке ---
    const profileBlock = document.querySelector('.profile-block');
    if (profileBlock) {
        profileBlock.addEventListener('click', function() {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const modalNick = document.getElementById('modalNick');
            const modalAvatar = document.getElementById('modalAvatar');
            const profileModal = document.getElementById('profileModal');
            const profileModalMsg = document.getElementById('profileModalMsg');
            if (modalNick) modalNick.value = user.username || '';
            if (modalAvatar) modalAvatar.src = user.avatar || 'img/player-avatar.svg';
            if (profileModal) profileModal.style.display = 'flex';
            if (profileModalMsg) profileModalMsg.textContent = '';
        });
    }
});

// --- Модальное окно друзей ---
window.showFriendsModal = async function() {
  // Проверяем, нет ли уже открытого модального окна
  if (document.getElementById('friends-modal-bg')) return;

  // Создаем фон модального окна
  const modalBg = document.createElement('div');
  modalBg.id = 'friends-modal-bg';
  modalBg.style.position = 'fixed';
  modalBg.style.left = '0';
  modalBg.style.top = '0';
  modalBg.style.width = '100vw';
  modalBg.style.height = '100vh';
  modalBg.style.background = 'rgba(30,60,114,0.18)';
  modalBg.style.zIndex = 3000;
  modalBg.style.display = 'flex';
  modalBg.style.alignItems = 'center';
  modalBg.style.justifyContent = 'center';

  // Бокс модального окна
  const box = document.createElement('div');
  box.style.background = '#fff';
  box.style.borderRadius = '18px';
  box.style.padding = '32px 24px';
  box.style.maxWidth = '400px';
  box.style.width = '95vw';
  box.style.boxShadow = '0 8px 32px #1e3c72aa';
  box.style.position = 'relative';
  box.style.textAlign = 'center';

  // Кнопка закрытия
  const close = document.createElement('button');
  close.textContent = '×';
  close.style.position = 'absolute';
  close.style.right = '18px';
  close.style.top = '12px';
  close.style.fontSize = '2em';
  close.style.background = 'none';
  close.style.border = 'none';
  close.style.cursor = 'pointer';
  close.style.color = '#2196f3';
  close.onclick = () => modalBg.remove();
  box.appendChild(close);

  // Заголовок
  const title = document.createElement('h2');
  title.textContent = 'Ваши друзья';
  title.style.marginBottom = '18px';
  box.appendChild(title);

  // Список друзей (заглушка)
  const list = document.createElement('div');
  list.style.textAlign = 'left';
  list.style.maxHeight = '300px';
  list.style.overflowY = 'auto';
  list.innerHTML = '<div style="color:#888;">Здесь будет список ваших друзей.</div>';
  box.appendChild(list);

  // TODO: Заменить заглушку на реальный fetch друзей
  // try {
  //   const res = await fetch('/api/friends', { credentials: 'include' });
  //   const json = await res.json();
  //   if (json.success && Array.isArray(json.friends)) {
  //     list.innerHTML = '';
  //     json.friends.forEach(f => {
  //       const item = document.createElement('div');
  //       item.textContent = f.username || f.display_name || f.telegram_username || 'Без имени';
  //       list.appendChild(item);
  //     });
  //   } else {
  //     list.innerHTML = '<div style="color:#e53935">Ошибка загрузки друзей</div>';
  //   }
  // } catch (e) {
  //   list.innerHTML = '<div style="color:#e53935">Ошибка загрузки друзей</div>';
  // }

  modalBg.appendChild(box);
  document.body.appendChild(modalBg);
} 