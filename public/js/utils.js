// Универсальные утилиты для клиента P.I.D.R.

// Функция для отображения всплывающего уведомления
window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
};

// Функция для отображения модального окна
window.showModal = function(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${title}</h2>
            <div>${content}</div>
            <button onclick="this.parentElement.parentElement.remove()">Закрыть</button>
        </div>
    `;
    document.body.appendChild(modal);
};

// Пример глобальной функции для перехода по страницам
window.goToPage = function(url) {
    window.location.href = url;
};

// Пример глобальной функции для получения текущего пользователя (заглушка)
window.getCurrentUser = function() {
    // Здесь должна быть логика получения пользователя из сессии или API
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user;
    } catch (e) {
        return null;
    }
};

// Пример глобального API-запроса
window.apiRequest = async function(url, options = {}) {
    const res = await fetch(url, {
        credentials: 'include',
        ...options
    });
    return await res.json();
}; 