// Универсальные утилиты для клиента P.I.D.R.

export { showToast };

export function getCurrentUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) throw new Error('Нет пользователя');
    return user;
  } catch {
    window.location.href = '/register.html';
    return null;
  }
}

export async function apiRequest(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Ошибка запроса');
    return data;
  } catch (e) {
    showToast(e.message || 'Ошибка соединения', 'error');
    throw e;
  }
}

export function showModal(html, { onClose, title = '', type = 'info' } = {}) {
  // Удаляем старую модалку
  const old = document.getElementById('universal-modal');
  if (old) old.remove();
  // Создаём фон
  const bg = document.createElement('div');
  bg.id = 'universal-modal';
  bg.className = 'universal-modal-bg active';
  // Бокс
  const box = document.createElement('div');
  box.className = 'universal-modal-box';
  if (title) {
    const header = document.createElement('div');
    header.className = 'universal-modal-header';
    header.textContent = title;
    box.appendChild(header);
  }
  box.innerHTML += html;
  // Кнопка закрытия
  const close = document.createElement('button');
  close.innerHTML = '&times;';
  close.className = 'universal-modal-close';
  close.onclick = () => {
    bg.remove();
    if (onClose) onClose();
  };
  box.appendChild(close);
  bg.appendChild(box);
  document.body.appendChild(bg);
}

export function showToast(message, type = 'info', timeout = 2500) {
  let toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('visible'); }, 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, timeout);
}

export function goToPage(url) {
  window.location.href = url;
} 