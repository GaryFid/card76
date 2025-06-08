// Инициализация Telegram WebApp
var tgApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tgApp) tgApp.expand();

// Настройка основного цвета из Telegram
if (tgApp && tgApp.themeParams) {
    document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');
}

// Проверка авторизации при загрузке страницы
window.addEventListener('DOMContentLoaded', function() {
    try {
        var user = localStorage.getItem('user');
        var userData = user ? JSON.parse(user) : null;
        if (!userData || !userData.id || !userData.username) {
            if (window.showToast) {
                window.showToast('Сначала зарегистрируйтесь или войдите', 'error');
            } else {
                alert('Сначала зарегистрируйтесь или войдите');
            }
            localStorage.removeItem('user');
            window.location.replace('/register.html');
            return;
        }
    } catch (error) {
        localStorage.removeItem('user');
        window.location.replace('/register.html');
    }
});

// Обработчик кнопки "Начать игру"
document.getElementById('start-game').addEventListener('click', function() {
    var user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '/register.html';
        return;
    }
    localStorage.setItem('gameSettings', JSON.stringify({ playerCount: 4, withAI: false }));
    window.location.href = '/game-setup';
});

document.getElementById('play-ai').addEventListener('click', function() {
    localStorage.setItem('gameSettings', JSON.stringify({ playerCount: 4, withAI: true }));
    window.location.href = '/game-setup';
});

document.getElementById('shop').addEventListener('click', function() {
    window.location.href = '/shop.html';
});

document.getElementById('profile-page-btn').addEventListener('click', function() {
    window.location.href = '/profile.html';
});

document.getElementById('rules').addEventListener('click', function() {
    window.showModal('Правила', '<p>Правила игры будут здесь.</p>');
});

document.getElementById('rating').addEventListener('click', function() {
    window.showToast('Рейтинг игроков будет доступен в ближайшее время!', 'info');
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