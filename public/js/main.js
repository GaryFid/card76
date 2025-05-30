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
        // Массив для эмуляции руки игрока
        let hand = [];
        // Массив для эмуляции других игроков
        let otherPlayers = ['Игрок 2', 'Игрок 3', 'Игрок 4'];
        // Функция для обновления main-card-loader
        function updateMainCardLoader() {
            mainLoader.innerHTML = '';
            const topIdx = Math.floor(Math.random() * cardNames.length);
            const topCard = cardNames[topIdx];
            // Сначала рубашка (лежит под верхней картой)
            const back = document.createElement('img');
            back.className = 'main-card-loader-img';
            back.src = 'img/cards/back.png';
            back.alt = 'back';
            back.style.position = 'absolute';
            back.style.left = '0';
            back.style.top = '8px';
            back.style.zIndex = '1';
            mainLoader.style.position = 'relative';
            mainLoader.appendChild(back);
            // Затем верхняя карта (лицом вверх)
            const card = document.createElement('img');
            card.className = 'main-card-loader-img';
            card.src = `img/cards/${topCard}.png`;
            card.alt = topCard;
            card.style.position = 'absolute';
            card.style.left = '0';
            card.style.top = '0';
            card.style.zIndex = '2';
            mainLoader.appendChild(card);
            // --- Кнопки ---
            card.style.cursor = 'pointer';
            let buttonsShown = false;
            let btnTake = null;
            let btnPlay = null;
            function removeButtons() {
                if (btnTake) btnTake.remove();
                if (btnPlay) btnPlay.remove();
                btnTake = null;
                btnPlay = null;
                buttonsShown = false;
            }
            card.addEventListener('click', function(e) {
                e.stopPropagation();
                if (buttonsShown) {
                    removeButtons();
                    return;
                }
                // Создаём кнопки
                btnTake = document.createElement('button');
                btnTake.textContent = 'Взять себе';
                btnTake.style.position = 'absolute';
                btnTake.style.left = '60px';
                btnTake.style.top = '0px';
                btnTake.style.zIndex = '10';
                btnTake.style.padding = '8px 16px';
                btnTake.style.borderRadius = '8px';
                btnTake.style.background = '#43ea6d';
                btnTake.style.color = '#fff';
                btnTake.style.border = 'none';
                btnTake.style.fontWeight = 'bold';
                btnTake.style.cursor = 'pointer';
                btnTake.style.boxShadow = '0 2px 8px rgba(30,80,220,0.13)';
                btnTake.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    hand.push(topCard);
                    alert('Вы взяли карту себе! Ваша рука: ' + hand.join(', '));
                    removeButtons();
                    updateMainCardLoader();
                });
                btnPlay = document.createElement('button');
                btnPlay.textContent = 'Сыграть';
                btnPlay.style.position = 'absolute';
                btnPlay.style.left = '60px';
                btnPlay.style.top = '40px';
                btnPlay.style.zIndex = '10';
                btnPlay.style.padding = '8px 16px';
                btnPlay.style.borderRadius = '8px';
                btnPlay.style.background = '#3390ec';
                btnPlay.style.color = '#fff';
                btnPlay.style.border = 'none';
                btnPlay.style.fontWeight = 'bold';
                btnPlay.style.cursor = 'pointer';
                btnPlay.style.boxShadow = '0 2px 8px rgba(30,80,220,0.13)';
                btnPlay.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    // Выбор игрока (эмулируем prompt)
                    let target = prompt('Кому сыграть карту? Введите номер: 2, 3 или 4', '2');
                    if (target && ['2','3','4'].includes(target)) {
                        alert('Вы сыграли карту игроку ' + target + ': ' + topCard);
                    } else {
                        alert('Действие отменено');
                    }
                    removeButtons();
                    updateMainCardLoader();
                });
                mainLoader.appendChild(btnTake);
                mainLoader.appendChild(btnPlay);
                buttonsShown = true;
            });
            // Скрывать кнопки при клике вне карты
            document.addEventListener('click', function(e) {
                if (buttonsShown) {
                    removeButtons();
                }
            }, { once: true });
        }
        updateMainCardLoader();
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