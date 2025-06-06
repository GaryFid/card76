// Универсальные утилиты для клиента P.I.D.R.

// Функция для отображения всплывающего уведомления
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Функция для отображения модального окна
function showModal(title, content) {
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
}

// Функция для перехода на другую страницу
function goToPage(page) {
    window.location.href = page;
}

// Функция для получения текущего пользователя
async function getCurrentUser() {
    try {
        const response = await fetch('/api/current-user');
        if (!response.ok) throw new Error('Ошибка получения данных пользователя');
        return await response.json();
    } catch (error) {
        console.error('Ошибка:', error);
        return null;
    }
}

// Функция для выполнения API запросов
async function apiRequest(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(endpoint, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Ошибка запроса');
        }
        
        return result;
    } catch (error) {
        console.error('API ошибка:', error);
        throw error;
    }
}

// Экспортируем функции как свойства window для доступа из других скриптов
window.showToast = showToast;
window.showModal = showModal;
window.goToPage = goToPage;
window.getCurrentUser = getCurrentUser;
window.apiRequest = apiRequest; 