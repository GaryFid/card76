document.addEventListener('DOMContentLoaded', function() {
    var tgApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    if (tgApp) tgApp.expand();
    if (tgApp && tgApp.themeParams) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');
    }
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
    const stack = document.getElementById('card-stack');
    stack.innerHTML = '';
    let used = new Set();
    for (let i = 0; i < 4; i++) {
        let idx;
        do {
            idx = Math.floor(Math.random() * cardNames.length);
        } while (used.has(idx));
        used.add(idx);
        const card = document.createElement('img');
        card.className = 'card card'+(i+1);
        card.src = `img/cards/${cardNames[idx]}.png`;
        card.alt = cardNames[idx];
        stack.appendChild(card);
    }
    // Полоска загрузки из 5 карт
    const loader = document.getElementById('card-loader');
    loader.innerHTML = '';
    let usedLoader = new Set();
    for (let i = 0; i < 5; i++) {
        let idx;
        do {
            idx = Math.floor(Math.random() * cardNames.length);
        } while (usedLoader.has(idx));
        usedLoader.add(idx);
        const card = document.createElement('img');
        card.className = 'card-loader-img';
        card.src = `img/cards/${cardNames[idx]}.png`;
        card.alt = cardNames[idx];
        loader.appendChild(card);
    }
    setTimeout(function() {
        window.location.href = '/index.html';
    }, 2500);
}); 