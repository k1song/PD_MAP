// --- i18n ---
const i18n = {
  ko: {
    days: ['일', '월', '화', '수', '목', '금', '토'],
    monthTitle: (y, m) => `${y}년 ${m + 1}월`,
    weekTitle: (y, m, d, m2, d2) => `${y}년 ${m + 1}월 ${d}일 ~ ${m2 + 1}월 ${d2}일`,
    dateModal: (y, m, d) => `${y}년 ${m + 1}월 ${d}일`,
    more: (n) => `+${n}개 더보기`,
    settings: '설정',
    lang: '언어',
    theme: '테마',
    startDay: '시작 요일',
    view: '보기',
    light: '라이트',
    dark: '다크',
    sun: '일요일',
    mon: '월요일',
    monthly: 'Monthly',
    weekly: 'Weekly',
    save: '저장',
    placeholder: '일정 제목',
  },
  en: {
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthTitle: (y, m) => {
      const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return `${names[m]} ${y}`;
    },
    weekTitle: (y, m, d, m2, d2) => {
      const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${names[m]} ${d} ~ ${names[m2]} ${d2}, ${y}`;
    },
    dateModal: (y, m, d) => {
      const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${names[m]} ${d}, ${y}`;
    },
    more: (n) => `+${n} more`,
    settings: 'Settings',
    lang: 'Language',
    theme: 'Theme',
    startDay: 'Start Day',
    view: 'View',
    light: 'Light',
    dark: 'Dark',
    sun: 'Sunday',
    mon: 'Monday',
    monthly: 'Monthly',
    weekly: 'Weekly',
    save: 'Save',
    placeholder: 'Event title',
  },
};

// --- Settings ---
const defaultSettings = { lang: 'ko', theme: 'light', startDay: '0', view: 'monthly' };

function loadSettings() {
  const saved = localStorage.getItem('pdmap-settings');
  return saved ? { ...defaultSettings, ...JSON.parse(saved) } : { ...defaultSettings };
}

function saveSettings(s) {
  localStorage.setItem('pdmap-settings', JSON.stringify(s));
}

let settings = loadSettings();

// --- DOM ---
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let currentWeekStart = getWeekStart(today);

const monthTitle = document.getElementById('month-title');
const calendarGrid = document.getElementById('calendar-grid');
const dayHeaders = document.getElementById('day-headers');
const calendarBody = document.getElementById('calendar-body');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const todayBtn = document.getElementById('today-btn');
const settingsBtn = document.getElementById('settings-btn');

const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose = document.getElementById('settings-close');
const settingsTitle = document.getElementById('settings-title');

const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');
const eventForm = document.getElementById('event-form');
const eventTitleInput = document.getElementById('event-title');
const eventStartInput = document.getElementById('event-start');
const eventEndInput = document.getElementById('event-end');
const eventList = document.getElementById('event-list');

let selectedDateKey = '';

// --- Events storage ---
function getEvents() {
  return JSON.parse(localStorage.getItem('pdmap-events') || '{}');
}

function saveEvents(events) {
  localStorage.setItem('pdmap-events', JSON.stringify(events));
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// --- Week helpers ---
function getWeekStart(date) {
  const d = new Date(date);
  const start = parseInt(settings.startDay);
  const day = d.getDay();
  const diff = (day - start + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// --- Apply settings to UI ---
function applySettings() {
  const t = i18n[settings.lang];

  // Theme
  document.documentElement.setAttribute('data-theme', settings.theme);

  // Update settings panel labels
  settingsTitle.textContent = t.settings;
  document.querySelector('[data-i18n="lang"]').textContent = t.lang;
  document.querySelector('[data-i18n="theme"]').textContent = t.theme;
  document.querySelector('[data-i18n="startDay"]').textContent = t.startDay;
  document.querySelector('[data-i18n="view"]').textContent = t.view;

  // Update settings button labels
  document.querySelector('[data-i18n-btn="light"]').textContent = t.light;
  document.querySelector('[data-i18n-btn="dark"]').textContent = t.dark;
  document.querySelector('[data-i18n-btn="sun"]').textContent = t.sun;
  document.querySelector('[data-i18n-btn="mon"]').textContent = t.mon;
  document.querySelector('[data-i18n-btn="monthly"]').textContent = t.monthly;
  document.querySelector('[data-i18n-btn="weekly"]').textContent = t.weekly;
  document.querySelector('[data-i18n-btn="save"]').textContent = t.save;

  // Placeholder
  eventTitleInput.placeholder = t.placeholder;

  // Active toggle buttons
  document.querySelectorAll('.toggle-btn').forEach((btn) => {
    const key = btn.dataset.setting;
    const val = btn.dataset.value;
    btn.classList.toggle('active', settings[key] === val);
  });
}

// --- Render day headers ---
function renderDayHeaders() {
  dayHeaders.innerHTML = '';
  const t = i18n[settings.lang];
  const start = parseInt(settings.startDay);
  for (let i = 0; i < 7; i++) {
    const idx = (start + i) % 7;
    const el = document.createElement('div');
    el.className = 'day-header';
    el.textContent = t.days[idx];
    if (idx === 0) el.classList.add('sunday');
    if (idx === 6) el.classList.add('saturday');
    dayHeaders.appendChild(el);
  }
}

// --- Render calendar ---
function render() {
  applySettings();
  renderDayHeaders();

  if (settings.view === 'weekly') {
    calendarGrid.classList.add('weekly');
    renderWeekly();
  } else {
    calendarGrid.classList.remove('weekly');
    renderMonthly();
  }
}

function renderMonthly() {
  const t = i18n[settings.lang];
  monthTitle.textContent = t.monthTitle(currentYear, currentMonth);
  calendarBody.innerHTML = '';

  const start = parseInt(settings.startDay);
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevLastDate = new Date(currentYear, currentMonth, 0).getDate();

  const offset = (firstDay - start + 7) % 7;
  const totalCells = Math.ceil((offset + lastDate) / 7) * 7;
  const events = getEvents();

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.classList.add('day-cell');

    const dayNum = document.createElement('span');
    dayNum.classList.add('day-number');

    let date, isOtherMonth = false;
    let cellYear = currentYear, cellMonth = currentMonth;

    if (i < offset) {
      date = prevLastDate - offset + 1 + i;
      isOtherMonth = true;
      cellMonth = currentMonth - 1;
      if (cellMonth < 0) { cellMonth = 11; cellYear--; }
    } else if (i >= offset + lastDate) {
      date = i - offset - lastDate + 1;
      isOtherMonth = true;
      cellMonth = currentMonth + 1;
      if (cellMonth > 11) { cellMonth = 0; cellYear++; }
    } else {
      date = i - offset + 1;
    }

    dayNum.textContent = date;
    if (isOtherMonth) cell.classList.add('other-month');

    const actualDay = (start + i) % 7;
    if (actualDay === 0) cell.classList.add('sunday');
    if (actualDay === 6) cell.classList.add('saturday');

    if (
      !isOtherMonth &&
      currentYear === today.getFullYear() &&
      currentMonth === today.getMonth() &&
      date === today.getDate()
    ) {
      cell.classList.add('today');
    }

    cell.appendChild(dayNum);
    appendEvents(cell, dateKey(cellYear, cellMonth, date), events, 2);

    const cy = cellYear, cm = cellMonth, cd = date;
    cell.addEventListener('click', () => openModal(cy, cm, cd));
    calendarBody.appendChild(cell);
  }
}

function renderWeekly() {
  const t = i18n[settings.lang];
  const weekEnd = addDays(currentWeekStart, 6);
  monthTitle.textContent = t.weekTitle(
    currentWeekStart.getFullYear(),
    currentWeekStart.getMonth(), currentWeekStart.getDate(),
    weekEnd.getMonth(), weekEnd.getDate()
  );
  calendarBody.innerHTML = '';

  const events = getEvents();
  const start = parseInt(settings.startDay);

  for (let i = 0; i < 7; i++) {
    const d = addDays(currentWeekStart, i);
    const cell = document.createElement('div');
    cell.classList.add('day-cell');

    const dayNum = document.createElement('span');
    dayNum.classList.add('day-number');
    dayNum.textContent = d.getDate();

    const actualDay = (start + i) % 7;
    if (actualDay === 0) cell.classList.add('sunday');
    if (actualDay === 6) cell.classList.add('saturday');

    if (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    ) {
      cell.classList.add('today');
    }

    cell.appendChild(dayNum);
    appendEvents(cell, dateKey(d.getFullYear(), d.getMonth(), d.getDate()), events, 10);

    const cy = d.getFullYear(), cm = d.getMonth(), cd = d.getDate();
    cell.addEventListener('click', () => openModal(cy, cm, cd));
    calendarBody.appendChild(cell);
  }
}

function appendEvents(cell, key, events, maxShow) {
  const dayEvents = events[key];
  if (!dayEvents || dayEvents.length === 0) return;
  const t = i18n[settings.lang];
  const container = document.createElement('div');
  container.className = 'events-container';
  dayEvents.slice(0, maxShow).forEach((ev) => {
    const chip = document.createElement('div');
    chip.className = 'event-chip';
    chip.style.background = ev.color;
    chip.textContent = ev.start ? `${ev.start} ${ev.title}` : ev.title;
    container.appendChild(chip);
  });
  if (dayEvents.length > maxShow) {
    const more = document.createElement('div');
    more.className = 'event-more';
    more.textContent = t.more(dayEvents.length - maxShow);
    container.appendChild(more);
  }
  cell.appendChild(container);
}

// --- Navigation ---
prevBtn.addEventListener('click', () => {
  if (settings.view === 'weekly') {
    currentWeekStart = addDays(currentWeekStart, -7);
  } else {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  }
  render();
});

nextBtn.addEventListener('click', () => {
  if (settings.view === 'weekly') {
    currentWeekStart = addDays(currentWeekStart, 7);
  } else {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  }
  render();
});

todayBtn.addEventListener('click', () => {
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();
  currentWeekStart = getWeekStart(today);
  render();
});

// --- Settings panel ---
settingsBtn.addEventListener('click', () => {
  settingsOverlay.classList.remove('hidden');
});

settingsClose.addEventListener('click', () => {
  settingsOverlay.classList.add('hidden');
});

settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) settingsOverlay.classList.add('hidden');
});

document.querySelectorAll('.toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.setting;
    const val = btn.dataset.value;
    settings[key] = val;
    saveSettings(settings);

    if (key === 'startDay' || key === 'view') {
      currentWeekStart = getWeekStart(today);
    }

    render();
  });
});

// --- Event modal ---
function openModal(year, month, day) {
  const t = i18n[settings.lang];
  selectedDateKey = dateKey(year, month, day);
  modalTitle.textContent = t.dateModal(year, month, day);
  eventTitleInput.value = '';
  eventStartInput.value = '';
  eventEndInput.value = '';
  eventForm.querySelector('input[name="event-color"][value="#4361ee"]').checked = true;
  modalOverlay.classList.remove('hidden');
  renderEventList();
  eventTitleInput.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!modalOverlay.classList.contains('hidden')) closeModal();
    else if (!settingsOverlay.classList.contains('hidden')) settingsOverlay.classList.add('hidden');
  }
});

// --- Event CRUD ---
eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = eventTitleInput.value.trim();
  if (!title) return;

  const color = eventForm.querySelector('input[name="event-color"]:checked').value;
  const start = eventStartInput.value || '';
  const end = eventEndInput.value || '';

  const events = getEvents();
  if (!events[selectedDateKey]) events[selectedDateKey] = [];
  events[selectedDateKey].push({ id: Date.now().toString(36), title, start, end, color });
  saveEvents(events);

  eventTitleInput.value = '';
  eventStartInput.value = '';
  eventEndInput.value = '';
  renderEventList();
  render();
});

function deleteEvent(eventId) {
  const events = getEvents();
  const list = events[selectedDateKey];
  if (!list) return;
  events[selectedDateKey] = list.filter((ev) => ev.id !== eventId);
  if (events[selectedDateKey].length === 0) delete events[selectedDateKey];
  saveEvents(events);
  renderEventList();
  render();
}

function renderEventList() {
  const events = getEvents();
  const list = events[selectedDateKey] || [];
  eventList.innerHTML = '';
  list.forEach((ev) => {
    const li = document.createElement('li');

    const dot = document.createElement('span');
    dot.className = 'event-dot';
    dot.style.background = ev.color;

    const info = document.createElement('div');
    info.className = 'event-info';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'ev-title';
    titleSpan.textContent = ev.title;
    info.appendChild(titleSpan);

    if (ev.start) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'ev-time';
      timeSpan.textContent = ev.end ? `${ev.start} ~ ${ev.end}` : ev.start;
      info.appendChild(timeSpan);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.innerHTML = '&times;';
    delBtn.addEventListener('click', () => deleteEvent(ev.id));

    li.appendChild(dot);
    li.appendChild(info);
    li.appendChild(delBtn);
    eventList.appendChild(li);
  });
}

// --- Init ---
render();
