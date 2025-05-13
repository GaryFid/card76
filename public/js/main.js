document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Telegram WebApp
    const tgApp = window.Telegram.WebApp;
    tgApp.expand();
    
    // Настройка основного цвета из Telegram
    document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');
    
    // Проверка авторизации
    const user = localStorage.getItem('user');
    
    // Если пользователь не авторизован, перенаправляем на страницу регистрации
    if (!user) {
        console.log('Пользователь не авторизован. Перенаправление на страницу регистрации...');
        window.location.href = '/register';
        return;
    }
    
    try {
        // Получаем данные пользователя
        const userData = JSON.parse(user);
        console.log('Пользователь авторизован:', userData.username);
        
        // Проверяем наличие обязательных полей
        if (!userData.id || !userData.username) {
            console.log('Некорректные данные пользователя. Перенаправление на страницу регистрации...');
            localStorage.removeItem('user');
            window.location.href = '/register';
            return;
        }
        
        // Обработчики нажатий на кнопки
        document.getElementById('start-game').addEventListener('click', () => {
            // Вместо отправки данных в Telegram, перенаправляем на страницу настройки игры
            window.location.href = '/game-setup';
            
            // Если мы в Telegram WebApp, то также отправляем данные
            if (tgApp && tgApp.isExpanded) {
                tgApp.sendData('start_game');
            }
        });
        
        document.getElementById('play-ai').addEventListener('click', () => {
            // Сохраняем настройки игры с ботами и перенаправляем на страницу настройки
            localStorage.setItem('gameSettings', JSON.stringify({
                playerCount: 4,
                withAI: true
            }));
            window.location.href = '/game-setup';
            
            // Если мы в Telegram WebApp, то также отправляем данные
            if (tgApp && tgApp.isExpanded) {
                tgApp.sendData('play_ai');
            }
        });
        
        document.getElementById('rating').addEventListener('click', () => {
            // Показываем сообщение о том, что рейтинг будет доступен позже
            alert('Рейтинг игроков будет доступен в ближайшее время!');
            
            // Если мы в Telegram WebApp, то также отправляем данные
            if (tgApp && tgApp.isExpanded) {
                tgApp.sendData('rating');
            }
        });
        
        document.getElementById('rules').addEventListener('click', () => {
            // Создаем модальное окно с правилами
            showRules();
            
            // Если мы в Telegram WebApp, то также отправляем данные
            if (tgApp && tgApp.isExpanded) {
                tgApp.sendData('rules');
            }
        });
        
        // Функция для отображения правил игры
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
        console.error('Ошибка при обработке данных пользователя:', error);
        localStorage.removeItem('user');
        window.location.href = '/register';
    }
}); 