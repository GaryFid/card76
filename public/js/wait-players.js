// --- wait-players.js без import/export ---

document.addEventListener('DOMContentLoaded', function() {
    var tgApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    if (tgApp) tgApp.expand();
    if (tgApp && tgApp.themeParams) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');
    }
    // Получаем настройки игры (количество игроков)
    let settings = localStorage.getItem('gameSettings');
    let playerCount = 6;
    let withAI = false;
    if (settings) {
        try {
            const parsed = JSON.parse(settings);
            playerCount = parsed.playerCount || 6;
            withAI = parsed.withAI || false;
        } catch (e) {}
    }
    const table = document.getElementById('table-anim');
    table.innerHTML = '';
    // Список всех карт
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
    // Координаты мест за столом (по кругу)
    const radiusX = 140;
    const radiusY = 60;
    const centerX = 160;
    const centerY = 80;
    for (let i = 0; i < playerCount; i++) {
        const angle = (2 * Math.PI / playerCount) * i - Math.PI/2;
        const x = centerX + radiusX * Math.cos(angle) - 24;
        const y = centerY + radiusY * Math.sin(angle) - 24;
        const seat = document.createElement('div');
        seat.className = 'seat-anim';
        seat.style.left = x + 'px';
        seat.style.top = y + 'px';
        // Рандомная карта
        const card = document.createElement('img');
        card.className = 'card-anim';
        const cardName = cardNames[Math.floor(Math.random() * cardNames.length)];
        card.src = `img/cards/${cardName}.png`;
        card.alt = cardName;
        seat.appendChild(card);
        table.appendChild(seat);
    }
    // Добавляем полоску загрузки на стол
    const loader = document.createElement('div');
    loader.className = 'table-loader';
    const loaderBar = document.createElement('div');
    loaderBar.className = 'table-loader-bar';
    loader.appendChild(loaderBar);
    table.appendChild(loader);
    // Кнопка "Добить комнату AI" (только для создателя)
    let isCreator = true; // Здесь можно добавить свою логику проверки
    if (isCreator) {
        const btn = document.createElement('button');
        btn.textContent = 'Добить комнату AI';
        btn.className = 'btn-ai';
        btn.style.marginTop = '20px';
        btn.onclick = function() {
            // Добавляем недостающих ботов
            let settings = localStorage.getItem('gameSettings');
            let playerCount = 6;
            if (settings) {
                try {
                    const parsed = JSON.parse(settings);
                    playerCount = parsed.playerCount || 6;
                    parsed.withAI = true;
                    localStorage.setItem('gameSettings', JSON.stringify(parsed));
                } catch (e) {}
            }
            // Обновляем анимацию: все места с ботами (рандомные карты)
            table.innerHTML = '';
            for (let i = 0; i < playerCount; i++) {
                const angle = (2 * Math.PI / playerCount) * i - Math.PI/2;
                const x = centerX + radiusX * Math.cos(angle) - 24;
                const y = centerY + radiusY * Math.sin(angle) - 24;
                const seat = document.createElement('div');
                seat.className = 'seat-anim';
                seat.style.left = x + 'px';
                seat.style.top = y + 'px';
                const card = document.createElement('img');
                card.className = 'card-anim';
                const cardName = cardNames[Math.floor(Math.random() * cardNames.length)];
                card.src = `img/cards/${cardName}.png`;
                card.alt = cardName;
                seat.appendChild(card);
                table.appendChild(seat);
            }
            // Добавляем полоску загрузки на стол после обновления
            const loader = document.createElement('div');
            loader.className = 'table-loader';
            const loaderBar = document.createElement('div');
            loaderBar.className = 'table-loader-bar';
            loader.appendChild(loaderBar);
            table.appendChild(loader);
            showToast('Комната дополнена ботами!', 'info');
        };
        document.querySelector('.wait-table-animation').appendChild(btn);
    }
    // Имитация ожидания 2.5 сек, потом переход к игре
    setTimeout(function() {
        window.location.href = '/game.html';
    }, 2500);
}); 