import { getCurrentUser, apiRequest, showModal, goToPage, showToast } from './utils.js';

// Инициализация Telegram WebApp
const tgApp = window.Telegram.WebApp;
tgApp.expand();

// Настройка основного цвета из Telegram
document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');

document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  let playerCount = 4;
  let withAI = false;

  // Выбор стола
  document.querySelectorAll('.oval-table').forEach(table => {
    table.addEventListener('click', () => {
      playerCount = +table.dataset.players;
      document.querySelectorAll('.oval-table').forEach(t => t.classList.remove('selected'));
      table.classList.add('selected');
    });
  });

  // Переключатель ботов
  const aiCheckbox = document.getElementById('with-ai');
  if (aiCheckbox) {
    aiCheckbox.addEventListener('change', e => {
      withAI = e.target.checked;
    });
  }

  // Кнопка "Начать игру"
  document.getElementById('start-game-btn').addEventListener('click', async () => {
    try {
      const data = await apiRequest('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          playerCount,
          withAI
        })
      });
      if (data.game && data.game.id) {
        window.location.href = `/game.html?id=${data.game.id}`;
      }
    } catch (e) {
      showToast('Ошибка при создании игры: ' + e.message, 'error');
    }
  });

  // Кнопка "Назад"
  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = '/index.html';
  });

  // Кнопка "Правила игры"
  document.getElementById('rules-btn').addEventListener('click', () => {
    document.getElementById('rules-modal').style.display = 'block';
  });
  document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('rules-modal').style.display = 'none';
  });
});

// Получение элементов интерфейса
const ovalTables = document.querySelectorAll('.oval-table');
const withAIToggle = document.getElementById('with-ai');
const aiTestModeToggle = document.getElementById('ai-test-mode');
const startGameBtn = document.getElementById('start-game-btn');
const backBtn = document.getElementById('back-btn');
const rulesBtn = document.getElementById('rules-btn');
const rulesModal = document.getElementById('rules-modal');
const closeModal = document.querySelector('.close-modal');

// Переменная для хранения выбранного количества игроков
let selectedPlayerCount = 4;

// Выбираем по умолчанию стол для 4 игроков
ovalTables[0].classList.add('selected');

// Обработчик выбора стола
ovalTables.forEach(table => {
    table.addEventListener('click', function() {
        // Убираем класс selected у всех столов
        ovalTables.forEach(t => t.classList.remove('selected'));
        
        // Добавляем класс selected к выбранному столу
        this.classList.add('selected');
        
        // Обновляем выбранное количество игроков
        selectedPlayerCount = parseInt(this.getAttribute('data-players'));
        console.log(`Выбрано игроков: ${selectedPlayerCount}`);
    });
});

// Обработчик переключения режима тестирования с ИИ
aiTestModeToggle.addEventListener('change', function() {
    if (this.checked) {
        // Если включен режим тестирования с ИИ, автоматически включаем и обычный режим с ботами
        withAIToggle.checked = true;
    }
});

// Обработчик переключения режима с ботами
withAIToggle.addEventListener('change', function() {
    if (!this.checked && aiTestModeToggle.checked) {
        // Если отключаем ботов, то отключаем и режим тестирования с ИИ
        aiTestModeToggle.checked = false;
    }
});

// Обработчик открытия модального окна с правилами
rulesBtn.addEventListener('click', function() {
    rulesModal.style.display = 'block';
});

// Обработчик закрытия модального окна с правилами
closeModal.addEventListener('click', function() {
    rulesModal.style.display = 'none';
});

// Закрытие модального окна при клике за его пределами
window.addEventListener('click', function(event) {
    if (event.target === rulesModal) {
        rulesModal.style.display = 'none';
    }
});

// Обработчик кнопки "Назад"
backBtn.addEventListener('click', function() {
    window.location.href = '/webapp';
});

// Обработчик кнопки "Начать игру"
startGameBtn.addEventListener('click', function() {
    try {
        // Сохраняем настройки игры
        const gameSettings = {
            playerCount: selectedPlayerCount,
            withAI: withAIToggle.checked,
            aiTestMode: aiTestModeToggle.checked
        };
        localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
        console.log(`Сохранены настройки игры: ${JSON.stringify(gameSettings)}`);
        
        // Если используем Telegram WebApp, отправляем данные в бота
        if (tgApp && tgApp.isExpanded) {
            const userData = JSON.parse(user);
            tgApp.sendData(JSON.stringify({
                action: 'start_game',
                userId: userData.id,
                playerCount: selectedPlayerCount,
                withAI: withAIToggle.checked,
                aiTestMode: aiTestModeToggle.checked
            }));
        }
        
        // Переходим на страницу игры
        window.location.href = '/game';
    } catch (error) {
        console.error('Ошибка при начале игры:', error);
        showToast('Произошла ошибка при начале игры. Пожалуйста, попробуйте еще раз.', 'error');
    }
}); 