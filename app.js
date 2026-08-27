// ========== КОНФИГ ==========
const API_URL = 'https://script.google.com/macros/s/AKfycbyf54TtfHN9LorU3iI4OoeyfQUIMgwxAqxY9IXyvE0_5O7BGdwV1PgIeG1DmanJ732c/exec'; // URL вашего веб-приложения

// ========== СОСТОЯНИЕ ==========
let currentUser = null;
let isAdmin = false;

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
  document.getElementById(id).style.display = 'block';
}

function callApi(action, data) {
  const formData = new URLSearchParams();
  formData.append('action', action);
  for (let key in data) {
    formData.append(key, data[key]);
  }
  return fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
  })
  .then(response => response.json())
  .catch(error => {
    console.error('Ошибка запроса:', error);
    throw error;
  });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
  // Проверяем сохранённую сессию
  const saved = localStorage.getItem('readingSession');
  if (saved) {
    try {
      const session = JSON.parse(saved);
      currentUser = session.username;
      isAdmin = session.isAdmin;
      showMainScreen();
      loadStats();
      if (isAdmin) document.getElementById('adminPanel').style.display = 'block';
    } catch (e) {
      localStorage.removeItem('readingSession');
    }
  }

  // Логин
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('loginPassword').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });

  // Отметка
  document.getElementById('markReadBtn').addEventListener('click', markRead);

  // Топы
  document.querySelectorAll('.topBtn').forEach(btn => {
    btn.addEventListener('click', () => loadTop(btn.dataset.period));
  });

  // Выход
  document.getElementById('logoutBtn').addEventListener('click', logout);
});

// ========== ЛОГИН ==========
function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorEl = document.getElementById('loginError');

  if (!username || !password) {
    errorEl.textContent = 'Заполните оба поля';
    return;
  }

  callApi('login', { username, password })
    .then(data => {
      if (data.success) {
        currentUser = data.username;
        isAdmin = data.isAdmin;
        localStorage.setItem('readingSession', JSON.stringify({ username: currentUser, isAdmin }));
        document.getElementById('usernameDisplay').textContent = currentUser;
        if (isAdmin) document.getElementById('adminPanel').style.display = 'block';
        showMainScreen();
        loadStats();
        errorEl.textContent = '';
      } else {
        errorEl.textContent = data.error || 'Ошибка входа';
      }
    })
    .catch(err => {
      errorEl.textContent = 'Ошибка соединения с сервером';
    });
}

function showMainScreen() {
  showScreen('mainScreen');
  document.getElementById('usernameDisplay').textContent = currentUser;
}

// ========== ОТМЕТКА ==========
function markRead() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  callApi('markRead', { username: currentUser, date: today })
    .then(data => {
      const result = document.getElementById('markResult');
      if (data.success) {
        result.textContent = '✅ Отмечено за сегодня!';
        result.style.color = 'green';
        loadStats(); // обновить статистику
      } else {
        result.textContent = '❌ Ошибка: ' + (data.error || 'неизвестная');
        result.style.color = 'red';
      }
    })
    .catch(() => {
      document.getElementById('markResult').textContent = '❌ Ошибка соединения';
    });
}

// ========== СТАТИСТИКА ==========
function loadStats() {
  callApi('getStats', { username: currentUser })
    .then(data => {
      if (data.success) {
        const s = data.stats;
        document.getElementById('statCurrentMonth').textContent = s.currentMonth;
        document.getElementById('statPrevMonth').textContent = s.previousMonth;
        document.getElementById('statCurrentYear').textContent = s.currentYear;
        document.getElementById('statPrevYear').textContent = s.previousYear;
        document.getElementById('statTotal').textContent = s.total;
      }
    })
    .catch(() => {});
}

// ========== ТОПЫ (админ) ==========
function loadTop(period) {
  if (!isAdmin) return;
  callApi('getTop', { period })
    .then(data => {
      const container = document.getElementById('topResult');
      if (data.success && data.top.length) {
        let html = '<ul>';
        data.top.forEach((item, idx) => {
          html += `<li>${idx+1}. ${item.user} — ${item.count} раз</li>`;
        });
        html += '</ul>';
        container.innerHTML = html;
      } else {
        container.innerHTML = 'Нет данных для топа.';
      }
    })
    .catch(() => {
      document.getElementById('topResult').textContent = 'Ошибка загрузки топа';
    });
}

// ========== ВЫХОД ==========
function logout() {
  localStorage.removeItem('readingSession');
  currentUser = null;
  isAdmin = false;
  showScreen('loginScreen');
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('adminPanel').style.display = 'none';
}
