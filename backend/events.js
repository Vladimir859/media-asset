// js/events.js — вся логика страницы мероприятий

//import { logAction } from "./logs";

const API = 'http://localhost:3000/api';


let allEvents   = [];
let filtered    = [];
let currentEventId = null;
let timerInterval  = null;
let countdownIntervals = {};

// ─── ДЕМО-ДАННЫЕ (если сервер недоступен) ────────────────────────────────
const DEMO = [
  {
    event_id: 1, name: 'Конференция "Цифровые технологии"',
    description: 'Ежегодная конференция по цифровым решениям в образовании.',
    comment: 'Зал будет открыт с 8:30',
    status: 'active', location: 'Room 101', responsible: 'Ivan Ivanov',
    responsible_email: 'ivan@example.com', responsible_phone: '+7 900 000-00-01',
    event_start: new Date(Date.now() - 3600_000).toISOString(),
    event_end:   new Date(Date.now() + 7200_000).toISOString(),
    equipment: [
      { equipment_id:1, name:'Laptop',    inventory_number:'INV001', status:'in_use' },
      { equipment_id:2, name:'Projector', inventory_number:'INV002', status:'in_use' },
    ],
  },
  {
    event_id: 2, name: 'Тренинг для сотрудников',
    description: 'Обучение работе с новым ПО.',
    comment: '', status: 'planned', location: 'Room 202', responsible: 'Petr Petrov',
    responsible_email: 'petr@example.com', responsible_phone: '',
    event_start: new Date(Date.now() + 86400_000).toISOString(),
    event_end:   new Date(Date.now() + 86400_000 + 7200_000).toISOString(),
    equipment: [
      { equipment_id:3, name:'Printer', inventory_number:'INV003', status:'available' },
    ],
  },
  {
    event_id: 3, name: 'Презентация отчёта Q3',
    description: '', comment: '', status: 'finished',
    location: 'Warehouse', responsible: 'Sergey Sidorov',
    responsible_email: '', responsible_phone: '',
    event_start: new Date(Date.now() - 172800_000).toISOString(),
    event_end:   new Date(Date.now() - 86400_000).toISOString(),
    equipment: [],
  },
];

// ─── ЗАГРУЗКА ─────────────────────────────────────────────────────────────
export async function loadEvents() {
  document.getElementById('eventsGrid').innerHTML = '<div class="events-loading">Загрузка…</div>';
  document.getElementById('errorBanner').style.display = 'none';

  try {
    const res = await fetch(`${API}/event`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allEvents = await res.json();
  } catch {
    document.getElementById('errorBanner').style.display = 'block';
    allEvents = DEMO;
  }

  applyFilters();
  updateStats();
}

// ─── СТАТИСТИКА ───────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('statTotal').textContent   = allEvents.length;
  document.getElementById('statActive').textContent  = allEvents.filter(e => e.status === 'active').length;
  document.getElementById('statDone').textContent    = allEvents.filter(e => e.status === 'finished').length;
  document.getElementById('statPlanned').textContent = allEvents.filter(e => e.status === 'planned').length;
}

// ─── ФИЛЬТРЫ ─────────────────────────────────────────────────────────────
function applyFilters() {
  const q  = document.getElementById('searchInput').value.toLowerCase();
  const st = document.getElementById('statusFilter').value;

  filtered = allEvents.filter(e => {
    const matchQ  = !q  || e.name?.toLowerCase().includes(q)
                        || e.responsible?.toLowerCase().includes(q);
    const matchSt = !st || e.status === st;
    return matchQ && matchSt;
  });

  renderGrid();
}

// ─── ОТРИСОВКА КАРТОЧЕК ───────────────────────────────────────────────────
function renderGrid() {
  // Останавливаем старые таймеры карточек
  Object.values(countdownIntervals).forEach(clearInterval);
  countdownIntervals = {};

  const grid = document.getElementById('eventsGrid');

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="events-empty">Мероприятия не найдены</div>';
    return;
  }

  grid.innerHTML = filtered.map(e => cardHTML(e)).join('');

  // Запускаем таймеры для активных
  filtered.filter(e => e.status === 'active').forEach(e => {
    startCardCountdown(e);
  });
}

function cardHTML(e) {
  const start = fmtDatetime(e.event_start);
  const end   = e.event_end ? fmtDatetime(e.event_end) : 'Не указано';
  const eqCount = (e.equipment || []).length;

  return `
    <div class="event-card status-${esc(e.status)}" onclick="openDetailModal(${e.event_id})">
      <div class="event-card-header">
        <div class="event-card-title">${esc(e.name)}</div>
        <span class="status-badge status-${statusClass(e.status)}">${statusLabel(e.status)}</span>
      </div>
      <div class="event-card-meta">
        <div class="event-meta-row">
          <svg viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.3"/><path d="M6.5 3.5v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          ${esc(start)} — ${esc(end)}
        </div>
        <div class="event-meta-row">
          <svg viewBox="0 0 13 13" fill="none"><path d="M6.5 1C4.567 1 3 2.567 3 4.5c0 2.625 3.5 7.5 3.5 7.5S10 7.125 10 4.5C10 2.567 8.433 1 6.5 1z" stroke="currentColor" stroke-width="1.3"/><circle cx="6.5" cy="4.5" r="1.2" stroke="currentColor" stroke-width="1.2"/></svg>
          ${esc(e.location || '—')}
        </div>
        <div class="event-meta-row">
          <svg viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="4" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          ${esc(e.responsible || '—')}
        </div>
      </div>
      <div class="event-card-footer">
        <div class="event-equip-count">
          <svg viewBox="0 0 13 13" fill="none"><rect x="1" y="3" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M8 5.5l3-1.5v5l-3-1.5" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
          ${eqCount} ед. оборудования
        </div>
        ${e.status === 'active'
          ? `<span class="event-countdown" id="countdown-${e.event_id}">…</span>`
          : ''}
      </div>
    </div>
  `;
}

function startCardCountdown(e) {
  const el = document.getElementById(`countdown-${e.event_id}`);
  if (!el || !e.event_end) return;

  const tick = () => {
    const diff = new Date(e.event_end) - Date.now();
    if (diff <= 0) {
      el.textContent = 'Истекло';
      el.classList.add('expired');
      clearInterval(countdownIntervals[e.event_id]);
    } else {
      el.textContent = formatDuration(diff);
    }
  };
  tick();
  countdownIntervals[e.event_id] = setInterval(tick, 1000);
}

// ─── МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ───────────────────────────────────────────────
window.openDetailModal = async function(id) {
  currentEventId = id;
  openModal('detailBackdrop');

  // Заполняем из кэша пока грузятся детали
  const cached = allEvents.find(e => e.event_id === id);
  if (cached) fillDetailBasic(cached);

  document.getElementById('detailEquipList').innerHTML =
    '<div class="equip-loading">Загрузка оборудования…</div>';

  try {
    const res = await fetch(`${API}/event/${id}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    fillDetail(data);
  } catch {
    if (cached) fillDetail({ ...cached });
  }
};

function fillDetailBasic(e) {
  document.getElementById('detailName').textContent = e.name || '—';
  const sb = document.getElementById('detailStatus');
  sb.className = `status-badge status-${statusClass(e.status)}`;
  sb.textContent = statusLabel(e.status);
}

function fillDetail(e) {
  fillDetailBasic(e);
  document.getElementById('detailResponsible').textContent = e.responsible || '—';
  document.getElementById('detailEmail').textContent = e.responsible_email || '';
  document.getElementById('detailPhone').textContent = e.responsible_phone || '';
  document.getElementById('detailLocation').textContent = e.location || '—';
  document.getElementById('detailStart').textContent = fmtDatetime(e.event_start);
  document.getElementById('detailEnd').textContent   = e.event_end ? fmtDatetime(e.event_end) : 'Не указано';

  // Описание и комментарий
  const descWrap = document.getElementById('detailDescWrap');
  if (e.description) {
    descWrap.style.display = 'block';
    document.getElementById('detailDesc').textContent = e.description;
  } else {
    descWrap.style.display = 'none';
  }

  const commentWrap = document.getElementById('detailCommentWrap');
  if (e.comment) {
    commentWrap.style.display = 'block';
    document.getElementById('detailComment').textContent = e.comment;
  } else {
    commentWrap.style.display = 'none';
  }

  // Таймер
  clearInterval(timerInterval);
  const timerBlock = document.getElementById('timerBlock');
  if (e.status === 'active' && e.event_end) {
    timerBlock.style.display = 'flex';
    const tv = document.getElementById('timerValue');
    const tick = () => {
      const diff = new Date(e.event_end) - Date.now();
      if (diff <= 0) {
        tv.textContent = 'Истекло';
        tv.classList.add('expired');
        clearInterval(timerInterval);
        
      } else {
        tv.textContent = formatDuration(diff);
        tv.classList.remove('expired');
      }
    };
    tick();
    timerInterval = setInterval(tick, 1000);
  } else {
    timerBlock.style.display = 'none';
  }

  // Кнопка завершения
  document.getElementById('finishBtn').style.display =
    e.status === 'active' ? 'block' : 'none';

  // Оборудование
  const list = document.getElementById('detailEquipList');
  const equipment = e.equipment || [];
  if (equipment.length === 0) {
    list.innerHTML = '<div class="equip-loading">Оборудование не привязано</div>';
  } else {
    list.innerHTML = equipment.map(eq => `
      <div class="equip-list-item">
        <div>
          <div class="equip-list-name">${esc(eq.name)}</div>
          ${eq.description ? `<div style="font-size:12px;color:var(--text-muted)">${esc(eq.description)}</div>` : ''}
        </div>
        <span class="inv-badge">${esc(eq.inventory_number || '—')}</span>
      </div>
    `).join('');
  }
}

window.closeDetailModal = function() {
  closeModal('detailBackdrop');
  clearInterval(timerInterval);
  currentEventId = null;
};

// ─── ЗАВЕРШЕНИЕ МЕРОПРИЯТИЯ ───────────────────────────────────────────────
window.finishCurrentEvent = async function() {
  if (!currentEventId) return;
  if (!confirm('Завершить мероприятие? Оборудование перейдёт в статус "Доступно".')) return;

  try {
    const res = await fetch(`${API}/event/${currentEventId}/finish`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    closeDetailModal();
    await loadEvents();

  } catch (err) {
    alert('Ошибка завершения: ' + err.message);
  }
};

// ─── МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ──────────────────────────────────────────────
window.openCreateModal = async function() {
  openModal('createBackdrop');
  document.getElementById('formError').style.display = 'none';
  resetCreateForm();
  await Promise.all([loadUsers(), loadLocations(), loadAvailableEquip()]);
};

window.closeCreateModal = function() {
  closeModal('createBackdrop');
};

async function loadUsers() {
  try {
    const res = await fetch(`${API}/user`);
    const data = await res.json();
    const sel = document.getElementById('fUser');
    sel.innerHTML = '<option value="">Выберите…</option>';
    data.forEach(u => {
      const o = document.createElement('option');
      o.value = u.user_id;
      o.textContent = u.full_name;
      sel.appendChild(o);
    });
  } catch { /* игнорируем */ }
}

async function loadLocations() {
  try {
    const res = await fetch(`${API}/location`);
    const data = await res.json();
    const sel = document.getElementById('fLocation');
    sel.innerHTML = '<option value="">Выберите…</option>';
    data.forEach(l => {
      const o = document.createElement('option');
      o.value = l.location_id;
      o.textContent = l.name;
      sel.appendChild(o);
    });
  } catch { /* игнорируем */ }
}

async function loadAvailableEquip() {
  const picker = document.getElementById('equipPicker');
  picker.innerHTML = '<div class="equip-loading">Загрузка…</div>';
  try {
    const res = await fetch(`${API}/equipment/available`);
    const data = await res.json();
    console.log("availableReqult", data)
    if (data.length === 0) {
      picker.innerHTML = '<div class="equip-loading">Нет свободного оборудования</div>';
      return;
    }
    picker.innerHTML = data.map(eq => `
      <div class="equip-picker-item" data-id="${eq.equipment_id}"
           onclick="toggleEquip(this)">
        <div class="equip-picker-check">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="white" stroke-width="1.6"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="equip-picker-info">
          <div class="equip-picker-name">${esc(eq.name)}</div>
          <div class="equip-picker-meta">
            ${eq.inventory_number ? eq.inventory_number + ' · ' : ''}${esc(eq.location || '')}
          </div>
        </div>
      </div>
    `).join('');
  } catch {
    picker.innerHTML = '<div class="equip-loading">Не удалось загрузить оборудование</div>';
  }
}

window.toggleEquip = function(el) {
  el.classList.toggle('selected');
};

function getSelectedEquipIds() {
  return [...document.querySelectorAll('.equip-picker-item.selected')]
    .map(el => parseInt(el.dataset.id));
}

function resetCreateForm() {
  ['fName','fDesc','fComment'].forEach(id => {
    document.getElementById(id).value = '';
  });
  ['fUser','fLocation'].forEach(id => {
    document.getElementById(id).value = '';
  });
  // Устанавливаем текущее время как дефолт для начала
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('fStart').value = now.toISOString().slice(0, 16);
  document.getElementById('fEnd').value   = '';
}

window.submitCreateEvent = async function() {
  const name    = document.getElementById('fName').value.trim();
  const user_id = document.getElementById('fUser').value;
  const start   = document.getElementById('fStart').value;

  const errEl = document.getElementById('formError');

  if (!name) {
    showFormError('Введите название мероприятия'); return;
  }
  if (!user_id) {
    showFormError('Выберите ответственного'); return;
  }
  if (!start) {
    showFormError('Укажите дату и время начала'); return;
  }

  errEl.style.display = 'none';

  const payload = {
    name,
    description:   document.getElementById('fDesc').value.trim() || null,
    comment:       document.getElementById('fComment').value.trim() || null,
    user_id:       parseInt(user_id),
    location_id:   parseInt(document.getElementById('fLocation').value) || null,
    status_id:     null,
    event_start:   start,
    event_end:     document.getElementById('fEnd').value || null,
    equipment_ids: getSelectedEquipIds(),
  };

  try {
    const res = await fetch(`${API}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    closeCreateModal();
    await loadEvents();
  } catch (err) {
    showFormError('Ошибка: ' + err.message);
  }
};

function showFormError(msg) {
  const el = document.getElementById('formError');
  el.textContent = msg;
  el.style.display = 'block';
}

// ─── ВСПОМОГАТЕЛЬНЫЕ ─────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function fmtDatetime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(ms) {
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function statusLabel(s) {
  return { active:'Активно', planned:'Запланировано', finished:'Завершено' }[s] || s || '—';
}

function statusClass(s) {
  return { active:'in_use', planned:'other', finished:'available' }[s] || 'other';
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── ИНИЦИАЛИЗАЦИЯ ────────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input',  applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);

loadEvents();