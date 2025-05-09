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
                <h3>Общие положения</h3>
                <p>«Разгильдяй» (также известный как «Пьяница») — карточная игра, в которой участники пытаются избавиться от всех своих карт.</p>
                
                <h3>Подготовка к игре</h3>
                <p>Для игры используется стандартная колода из 52 карт, без джокеров. Все карты раздаются игрокам поровну. Если число игроков не является делителем 52, некоторые игроки получат на одну карту больше.</p>
                
                <h3>Ход игры</h3>
                <p>1. Игроки держат свои карты рубашкой вверх.</p>
                <p>2. Ходы совершаются по очереди, начиная с первого игрока.</p>
                <p>3. В свой ход игрок выкладывает верхнюю карту из своей колоды в центр стола лицом вверх.</p>
                <p>4. Если выложенная карта не совпадает по достоинству с последней картой на столе, ход переходит к следующему игроку.</p>
                <p>5. Если выложенная карта совпадает по достоинству с предыдущей картой, все игроки должны как можно быстрее положить руку на колоду в центре стола.</p>
                <p>6. Игрок, который положил руку последним, забирает все карты из центральной колоды и добавляет их в низ своей колоды.</p>
                <p>7. Игра продолжается до тех пор, пока у одного из игроков не закончатся карты.</p>
                
                <h3>Цель игры</h3>
                <p>Целью игры является избавление от всех карт. Игрок, который первым избавляется от всех своих карт, объявляется победителем.</p>
                
                <h3>Дополнительные правила</h3>
                <p>- Если в процессе игры у игрока закончились карты, он выбывает из игры.</p>
                <p>- Если игрок положил руку на колоду, когда не было совпадения карт, он забирает все карты из колоды.</p>
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