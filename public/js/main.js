document.addEventListener('DOMContentLoaded', function() {
    // --- Анимация карт в header ---
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
    const headerCards = document.getElementById('header-cards');
    if (headerCards) {
        headerCards.innerHTML = '';
        let used = new Set();
        for (let i = 0; i < 5; i++) {
            let idx;
            do { idx = Math.floor(Math.random() * cardNames.length); } while (used.has(idx));
            used.add(idx);
            const card = document.createElement('img');
            card.className = 'header-card-img';
            card.src = `img/cards/${cardNames[idx]}.png`;
            card.alt = cardNames[idx];
            headerCards.appendChild(card);
        }
    }
    // --- Анимация полоски карт в main ---
    const mainLoader = document.getElementById('main-card-loader');
    if (mainLoader) {
        mainLoader.innerHTML = '';
        let used = new Set();
        for (let i = 0; i < 5; i++) {
            let idx;
            do { idx = Math.floor(Math.random() * cardNames.length); } while (used.has(idx));
            used.add(idx);
            const card = document.createElement('img');
            card.className = 'main-card-loader-img';
            card.src = `img/cards/${cardNames[idx]}.png`;
            card.alt = cardNames[idx];
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
        document.getElementById('start-game').addEventListener('click', () => {
            window.location.href = '/game-setup';
        });
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
            title.textContent = 'Правила игры "Разгильдяй"';
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
                    <li>В свой ход игрок может положить свою карту на открытую карту любого оппонента, если она на 1 ранг выше (например, 7 на 6).</li>
                    <li>Туз считается самым старшим, можно положить только 2 на туза.</li>
                    <li>После каждого хода игрок берёт новую карту из колоды и может продолжать ходить, пока у него есть возможность сделать ход.</li>
                    <li>Если игрок не может сделать ход картами из руки (положить на карты других игроков), он может положить карту на свою открытую карту по тем же правилам.</li>
                    <li>Если и это невозможно, игрок берёт карту из колоды и его ход завершается.</li>
                    <li>Стадия заканчивается, когда колода заканчивается.</li>
                </ul>
                
                <p><strong>Стадия 2:</strong> Сброс карт</p>
                <ul>
                    <li>Все закрытые карты открываются.</li>
                    <li>Игроки по очереди скидывают карты в центр по правилу: одинаковый ранг или одинаковая масть.</li>
                    <li>Если игрок не может сходить, он берёт карту из колоды.</li>
                    <li>Если колода закончилась, сброс перемешивается и становится новой колодой.</li>
                </ul>
                
                <p><strong>Стадия 3:</strong> Игра закрытыми картами</p>
                <ul>
                    <li>Начинается когда игроки избавились от всех открытых карт.</li>
                    <li>Игроки могут использовать закрытые карты, не зная их значений.</li>
                    <li>Если закрытая карта не подходит под правила (не подходит ни по масти, ни по рангу), игрок забирает все карты из центра.</li>
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
    const profileBlock = document.getElementById('profile-block');
    if (profileBlock) {
        profileBlock.addEventListener('click', function() {
            alert('Профиль пользователя. В будущем здесь появится личный кабинет!');
        });
    }
}); 