// backend/auth-check.js — подключается на каждой защищённой странице
// Использование: <script src="./backend/auth-check.js"></script>

(async function() {
    try {
      const res = await fetch('/api/auth/me', {credentials: "include"});
      if (!res.ok) {
        window.location.href = '/components/Login.html';
        return;
      }
      const user = await res.json();
  
      // Сохраняем в sessionStorage
      sessionStorage.setItem('user', JSON.stringify(user));
  
      // Вставляем имя и инициалы в шапку
      const avatarEl = document.getElementById('avatarInitials');
      const nameEl   = document.getElementById('headerUsername');
      if (avatarEl) avatarEl.textContent = initials(user.full_name);
      if (nameEl)   nameEl.textContent   = user.full_name;
  
      // Скрываем элементы по роли (data-role="admin,manager")
      document.querySelectorAll('[data-role]').forEach(el => {
        const allowed = el.dataset.role.split(',').map(r => r.trim());
        if (!allowed.includes(user.role)) {
          el.style.display = 'none';
        }
      });
  
      // Делаем пользователя доступным глобально
      window.currentUser = user;
  
    } catch {
      window.location.href = '/components/Login.html';
    }
  
    function initials(name) {
      if (!name) return '??';
      return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }
  })();
  
  // Функция выхода — доступна глобально
  function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
      .finally(() => {
        sessionStorage.removeItem('user');
        window.location.href = '/components/Login.html';
      });
  }