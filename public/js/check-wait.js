document.addEventListener('DOMContentLoaded', function() {
    const cardNames = [
        '6_of_hearts','6_of_spades','6_of_diamonds','6_of_clubs',
        '7_of_hearts','7_of_spades','7_of_diamonds','7_of_clubs',
        '8_of_hearts','8_of_spades','8_of_diamonds','8_of_clubs',
        '9_of_hearts','9_of_spades','9_of_diamonds','9_of_clubs',
        '10_of_hearts','10_of_spades','10_of_diamonds','10_of_clubs',
        'J_of_hearts','J_of_spades','J_of_diamonds','J_of_clubs',
        'Q_of_hearts','Q_of_spades','Q_of_diamonds','Q_of_clubs',
        'K_of_hearts','K_of_spades','K_of_diamonds','K_of_clubs',
        'A_of_hearts','A_of_spades','A_of_diamonds','A_of_clubs',
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
        window.location.href = '/webapp';
    }, 2500);
}); 