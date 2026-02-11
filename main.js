// --- i18n ---
const i18n = {
  ko: {
    days: ['일', '월', '화', '수', '목', '금', '토'],
    monthTitle: (y, m) => `${y}년 ${m + 1}월`,
    dateModal: (y, m, d) => `${y}년 ${m + 1}월 ${d}일`,
    more: (n) => `+${n}개 더보기`,
    settings: '설정',
    lang: '언어',
    theme: '테마',
    startDay: '시작 요일',
    light: '라이트',
    dark: '다크',
    sun: '일요일',
    mon: '월요일',
    save: '저장',
    placeholder: '일정 제목',
    layout: '배치',
    layoutMW: '월|주',
    layoutWM: '주|월',
  },
  en: {
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthTitle: (y, m) => {
      const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return `${names[m]} ${y}`;
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
    light: 'Light',
    dark: 'Dark',
    sun: 'Sunday',
    mon: 'Monday',
    save: 'Save',
    placeholder: 'Event title',
    layout: 'Layout',
    layoutMW: 'M|W',
    layoutWM: 'W|M',
  },
};

// --- Settings ---
const defaultSettings = { lang: 'ko', theme: 'light', startDay: '0', layout: 'mw' };

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

const weeklyDayHeaders = document.getElementById('weekly-day-headers');
const weeklyGrid = document.getElementById('weekly-grid');
const weeklyScroll = document.getElementById('weekly-scroll');

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
  document.querySelector('[data-i18n="layout"]').textContent = t.layout;

  // Update settings button labels
  document.querySelector('[data-i18n-btn="light"]').textContent = t.light;
  document.querySelector('[data-i18n-btn="dark"]').textContent = t.dark;
  document.querySelector('[data-i18n-btn="sun"]').textContent = t.sun;
  document.querySelector('[data-i18n-btn="mon"]').textContent = t.mon;
  document.querySelector('[data-i18n-btn="layoutMW"]').textContent = t.layoutMW;
  document.querySelector('[data-i18n-btn="layoutWM"]').textContent = t.layoutWM;

  // Apply layout order
  const calendarContent = document.querySelector('.calendar-content');
  if (settings.layout === 'wm') {
    calendarContent.classList.add('layout-wm');
  } else {
    calendarContent.classList.remove('layout-wm');
  }
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

// --- Render day headers (monthly) ---
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

// --- Render ---
function render() {
  applySettings();
  renderDayHeaders();
  renderMonthly();
  renderWeeklyGrid();
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
    cell.addEventListener('click', () => {
      // Update weekly to show this day's week
      currentWeekStart = getWeekStart(new Date(cy, cm, cd));
      renderWeeklyGrid();
      openModal(cy, cm, cd);
    });
    calendarBody.appendChild(cell);
  }
}

// --- Weekly time grid ---
function renderWeeklyGrid() {
  const t = i18n[settings.lang];

  // Render day headers
  weeklyDayHeaders.innerHTML = '';
  const corner = document.createElement('div');
  corner.className = 'weekly-corner';
  weeklyDayHeaders.appendChild(corner);

  for (let i = 0; i < 7; i++) {
    const d = addDays(currentWeekStart, i);
    const dayIdx = d.getDay();
    const header = document.createElement('div');
    header.className = 'weekly-day-header';
    if (dayIdx === 0) header.classList.add('sunday');
    if (dayIdx === 6) header.classList.add('saturday');

    const isToday = d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    if (isToday) header.classList.add('today-col');

    const dateNum = document.createElement('div');
    dateNum.className = 'weekly-day-date';
    dateNum.textContent = d.getDate();
    const dayName = document.createElement('div');
    dayName.className = 'weekly-day-name';
    dayName.textContent = t.days[dayIdx];
    header.appendChild(dateNum);
    header.appendChild(dayName);
    weeklyDayHeaders.appendChild(header);
  }

  // Render time grid
  weeklyGrid.innerHTML = '';
  const events = getEvents();

  for (let hour = 0; hour < 24; hour++) {
    const isAM = hour < 12;
    const period = isAM ? 'am' : 'pm';

    // Time label
    const label = document.createElement('div');
    label.className = `weekly-time-label ${period}`;
    if (hour === 12) label.classList.add('hour-12');
    label.textContent = `${hour}:00`;
    weeklyGrid.appendChild(label);

    // Day cells
    for (let i = 0; i < 7; i++) {
      const d = addDays(currentWeekStart, i);
      const cell = document.createElement('div');
      cell.className = `weekly-cell ${period}`;
      cell.classList.add(`hour-${hour}`);

      // Today column highlight
      const isToday = d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();
      if (isToday) cell.classList.add('today-col');

      // Events in this hour
      const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEvents = events[key] || [];
      dayEvents.forEach((ev) => {
        if (ev.start) {
          const evHour = parseInt(ev.start.split(':')[0]);
          if (evHour === hour) {
            const chip = document.createElement('div');
            chip.className = 'weekly-event-chip';
            chip.style.background = ev.color;
            chip.textContent = ev.title;
            cell.appendChild(chip);
          }
        }
      });

      const cy = d.getFullYear(), cm = d.getMonth(), cd = d.getDate();
      cell.dataset.dayIndex = i;
      cell.dataset.hour = hour;
      cell.dataset.year = cy;
      cell.dataset.month = cm;
      cell.dataset.date = cd;
      weeklyGrid.appendChild(cell);
    }
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

// --- Drag to select time (weekly) ---
let isTimeSelecting = false;
let timeSelectStart = null;
let timeSelectCurrent = null;

function getWeeklyCells() {
  return weeklyGrid.querySelectorAll('.weekly-cell');
}

function clearTimeSelection() {
  getWeeklyCells().forEach(c => c.classList.remove('drag-selecting'));
}

function highlightTimeSelection() {
  clearTimeSelection();
  if (!timeSelectStart || !timeSelectCurrent) return;
  if (timeSelectStart.dayIndex !== timeSelectCurrent.dayIndex) return;

  const minHour = Math.min(timeSelectStart.hour, timeSelectCurrent.hour);
  const maxHour = Math.max(timeSelectStart.hour, timeSelectCurrent.hour);

  getWeeklyCells().forEach(cell => {
    const di = parseInt(cell.dataset.dayIndex);
    const h = parseInt(cell.dataset.hour);
    if (di === timeSelectStart.dayIndex && h >= minHour && h <= maxHour) {
      cell.classList.add('drag-selecting');
    }
  });
}

weeklyGrid.addEventListener('mousedown', (e) => {
  const cell = e.target.closest('.weekly-cell');
  if (!cell) return;
  e.preventDefault();
  isTimeSelecting = true;
  timeSelectStart = {
    dayIndex: parseInt(cell.dataset.dayIndex),
    hour: parseInt(cell.dataset.hour),
    year: parseInt(cell.dataset.year),
    month: parseInt(cell.dataset.month),
    date: parseInt(cell.dataset.date),
  };
  timeSelectCurrent = { ...timeSelectStart };
  highlightTimeSelection();
});

document.addEventListener('mousemove', (e) => {
  if (!isTimeSelecting) return;
  const cell = e.target.closest('.weekly-cell');
  if (!cell) return;
  const di = parseInt(cell.dataset.dayIndex);
  if (di !== timeSelectStart.dayIndex) return;
  timeSelectCurrent = {
    dayIndex: di,
    hour: parseInt(cell.dataset.hour),
  };
  highlightTimeSelection();
});

document.addEventListener('mouseup', () => {
  if (!isTimeSelecting) return;
  isTimeSelecting = false;
  clearTimeSelection();
  if (!timeSelectStart || !timeSelectCurrent) return;
  if (timeSelectStart.dayIndex !== timeSelectCurrent.dayIndex) return;

  const minHour = Math.min(timeSelectStart.hour, timeSelectCurrent.hour);
  const maxHour = Math.max(timeSelectStart.hour, timeSelectCurrent.hour);

  selectedDateKey = dateKey(timeSelectStart.year, timeSelectStart.month, timeSelectStart.date);
  const t = i18n[settings.lang];
  modalTitle.textContent = t.dateModal(timeSelectStart.year, timeSelectStart.month, timeSelectStart.date);
  eventTitleInput.value = '';
  eventStartInput.value = `${String(minHour).padStart(2, '0')}:00`;
  const endHour = maxHour + 1;
  eventEndInput.value = endHour >= 24 ? '23:59' : `${String(endHour).padStart(2, '0')}:00`;
  eventForm.querySelector('input[name="event-color"][value="#4361ee"]').checked = true;
  modalOverlay.classList.remove('hidden');
  renderEventList();
  eventTitleInput.focus();

  timeSelectStart = null;
  timeSelectCurrent = null;
});

// --- Navigation ---
prevBtn.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  currentWeekStart = getWeekStart(new Date(currentYear, currentMonth, 1));
  render();
});

nextBtn.addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  currentWeekStart = getWeekStart(new Date(currentYear, currentMonth, 1));
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

    if (key === 'startDay') {
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
