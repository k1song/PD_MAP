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
    allDay: '종일',
    update: '수정',
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
    allDay: 'All Day',
    update: 'Update',
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
const weeklyAlldayRow = document.getElementById('weekly-allday-row');

const eventAlldayCheckbox = document.getElementById('event-allday');
const alldayLabel = document.getElementById('allday-label');
const timeRow = document.querySelector('.time-row');

const eventStartDateInput = document.getElementById('event-start-date');
const eventEndDateInput = document.getElementById('event-end-date');
const dateRow = document.querySelector('.date-row');

let selectedDateKey = '';
let selectedEndDateKey = '';
let editingEventId = null;
let editingEventKey = null;

// --- Edit helpers ---
function collectSpanningEvents(events, targetKey) {
  const result = [];
  const seen = new Set();
  for (const dk of Object.keys(events)) {
    for (const ev of events[dk]) {
      if (seen.has(ev.id)) continue;
      if (ev.endDate && dk <= targetKey && ev.endDate >= targetKey) {
        if (dk === targetKey) continue;
        seen.add(ev.id);
        result.push({ ...ev, _originKey: dk });
      }
    }
  }
  return result;
}

function clearEditState() {
  editingEventId = null;
  editingEventKey = null;
  const t = i18n[settings.lang];
  document.querySelector('[data-i18n-btn="save"]').textContent = t.save;
}

function openEventEdit(ev, originKey) {
  editingEventId = ev.id;
  editingEventKey = originKey;
  eventTitleInput.value = ev.title;
  eventStartDateInput.value = originKey;
  eventEndDateInput.value = ev.endDate || originKey;
  selectedDateKey = originKey;
  selectedEndDateKey = ev.endDate || '';
  if (ev.allDay) {
    eventAlldayCheckbox.checked = true;
    timeRow.classList.add('hidden');
    eventStartInput.value = '';
    eventEndInput.value = '';
  } else {
    eventAlldayCheckbox.checked = false;
    timeRow.classList.remove('hidden');
    eventStartInput.value = ev.start || '';
    eventEndInput.value = ev.end || '';
  }
  const colorRadio = eventForm.querySelector(`input[name="event-color"][value="${ev.color}"]`);
  if (colorRadio) colorRadio.checked = true;
  const t = i18n[settings.lang];
  document.querySelector('[data-i18n-btn="save"]').textContent = t.update;
  eventTitleInput.focus();
}

// --- Undo stack ---
const undoStack = [];
const UNDO_MAX = 50;

function pushUndo() {
  undoStack.push(JSON.parse(JSON.stringify(getEvents())));
  if (undoStack.length > UNDO_MAX) undoStack.shift();
}

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
  document.querySelector('[data-i18n-btn="save"]').textContent = editingEventId ? t.update : t.save;

  // Placeholder
  eventTitleInput.placeholder = t.placeholder;

  // All-day label
  alldayLabel.textContent = t.allDay;

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

function collectMultiDayEvents(events) {
  // Collect all multi-day events
  const allMD = [];
  for (const startKey of Object.keys(events)) {
    const dayEvents = events[startKey];
    for (const ev of dayEvents) {
      if (!ev.endDate || ev.endDate <= startKey) continue;
      allMD.push({ ...ev, _startKey: startKey });
    }
  }

  // Sort: earlier start first, longer duration first, then by id
  allMD.sort((a, b) => {
    if (a._startKey !== b._startKey) return a._startKey < b._startKey ? -1 : 1;
    if (a.endDate !== b.endDate) return a.endDate > b.endDate ? -1 : 1;
    return (a.id || '').localeCompare(b.id || '');
  });

  // Assign lanes greedily
  const lanes = [];
  for (const ev of allMD) {
    let lane = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] < ev._startKey) {
        lane = i;
        lanes[i] = ev.endDate;
        break;
      }
    }
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(ev.endDate);
    }
    ev._lane = lane;
  }

  // Build the day map
  const map = {};
  for (const ev of allMD) {
    const s = new Date(ev._startKey + 'T00:00:00');
    const e = new Date(ev.endDate + 'T00:00:00');
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dk = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (!map[dk]) map[dk] = [];
      map[dk].push({
        ...ev,
        _endKey: ev.endDate,
        _isStart: dk === ev._startKey,
        _isEnd: dk === ev.endDate,
      });
    }
  }
  return map;
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
  const multiDayMap = collectMultiDayEvents(events);

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

    const key = dateKey(cellYear, cellMonth, date);
    cell.dataset.dateKey = key;
    cell.dataset.year = cellYear;
    cell.dataset.month = cellMonth;
    cell.dataset.date = date;
    cell.dataset.cellIndex = i;

    appendEvents(cell, key, events, 2, multiDayMap[key] || [], i % 7);

    const cy = cellYear, cm = cellMonth, cd = date;
    cell.addEventListener('click', (e) => {
      if (monthlyDragMoved) return;
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
  weeklyAlldayRow.innerHTML = '';
  const events = getEvents();
  const multiDayMap = collectMultiDayEvents(events);

  // Collect all-day events for sticky row
  let hasAllDay = false;
  const multiDayByCol = [];
  const singleAllDayByCol = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(currentWeekStart, i);
    const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEvents = events[key] || [];
    const multiDay = multiDayMap[key] || [];
    const mdAllDay = multiDay.filter(md => md.allDay);
    const singleAllDay = dayEvents.filter(ev => ev.allDay && (!ev.endDate || ev.endDate <= key));
    multiDayByCol.push(mdAllDay);
    singleAllDayByCol.push(singleAllDay);
    if (mdAllDay.length > 0 || singleAllDay.length > 0) hasAllDay = true;
  }

  // Render all-day sticky row if any exist
  if (hasAllDay) {
    const label = document.createElement('div');
    label.className = 'weekly-allday-label';
    label.textContent = i18n[settings.lang].allDay;
    weeklyAlldayRow.appendChild(label);

    for (let i = 0; i < 7; i++) {
      const d = addDays(currentWeekStart, i);
      const cell = document.createElement('div');
      cell.className = 'weekly-allday-cell';
      const isToday = d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();
      if (isToday) cell.classList.add('today-col');

      // Sort multi-day events by lane
      const sortedMD = [...multiDayByCol[i]].sort((a, b) => (a._lane || 0) - (b._lane || 0));

      // Render with spacers for consistent lane positions
      let nextLane = 0;
      for (const ev of sortedMD) {
        const lane = ev._lane || 0;
        while (nextLane < lane) {
          const spacer = document.createElement('div');
          spacer.className = 'weekly-event-chip multi-day-spacer';
          spacer.textContent = '\u00A0';
          cell.appendChild(spacer);
          nextLane++;
        }
        const chip = document.createElement('div');
        chip.className = 'weekly-event-chip';
        chip.style.background = ev.color;
        chip.classList.add('multi-day');
        const isBarStart = ev._isStart || i === 0;
        const isBarEnd = ev._isEnd || i === 6;
        if (isBarStart) chip.classList.add('multi-bar-start');
        if (isBarEnd) chip.classList.add('multi-bar-end');
        chip.textContent = isBarStart ? ev.title : '\u00A0';
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal(d.getFullYear(), d.getMonth(), d.getDate());
          openEventEdit(ev, ev._startKey);
        });
        cell.appendChild(chip);
        nextLane = lane + 1;
      }

      // Render single-day all-day events after multi-day bars
      for (const ev of singleAllDayByCol[i]) {
        const chip = document.createElement('div');
        chip.className = 'weekly-event-chip';
        chip.style.background = ev.color;
        chip.textContent = ev.title;
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal(d.getFullYear(), d.getMonth(), d.getDate());
          openEventEdit(ev, key);
        });
        cell.appendChild(chip);
      }
      weeklyAlldayRow.appendChild(cell);
    }
  }

  for (let hour = 0; hour < 24; hour++) {
    const isAM = hour < 12;
    const period = isAM ? 'am' : 'pm';

    for (let quarter = 0; quarter < 4; quarter++) {
      // Time label only at quarter=0
      if (quarter === 0) {
        const label = document.createElement('div');
        label.className = `weekly-time-label ${period}`;
        if (hour === 12) label.classList.add('hour-12');
        label.textContent = `${hour}:00`;
        weeklyGrid.appendChild(label);
      }

      // Day cells
      for (let i = 0; i < 7; i++) {
        const d = addDays(currentWeekStart, i);
        const cell = document.createElement('div');
        cell.className = `weekly-cell ${period}`;
        cell.classList.add(`hour-${hour}`);
        cell.classList.add(`quarter-${quarter}`);

        // Today column highlight
        const isToday = d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate();
        if (isToday) cell.classList.add('today-col');

        const cy = d.getFullYear(), cm = d.getMonth(), cd = d.getDate();
        cell.dataset.dayIndex = i;
        cell.dataset.hour = hour;
        cell.dataset.quarter = quarter;
        cell.dataset.year = cy;
        cell.dataset.month = cm;
        cell.dataset.date = cd;
        weeklyGrid.appendChild(cell);
      }
    }
  }

  // Render timed event blocks with explicit grid positioning
  for (let i = 0; i < 7; i++) {
    const d = addDays(currentWeekStart, i);
    const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEvents = events[key] || [];
    dayEvents.forEach((ev) => {
      if (ev.allDay || !ev.start) return;
      const startParts = ev.start.split(':');
      const startH = parseInt(startParts[0]);
      const startM = parseInt(startParts[1] || '0');
      const startRow = startH * 4 + Math.floor(startM / 15) + 1;
      let endRow;
      if (ev.end) {
        const endParts = ev.end.split(':');
        const endH = parseInt(endParts[0]);
        const endM = parseInt(endParts[1] || '0');
        endRow = endH * 4 + Math.ceil(endM / 15) + 1;
      } else {
        endRow = startRow + 1;
      }
      if (endRow <= startRow) endRow = startRow + 1;
      if (endRow > 97) endRow = 97;

      const block = document.createElement('div');
      block.className = 'weekly-event-block';
      block.style.background = ev.color;
      block.style.gridColumn = `${i + 2}`;
      block.style.gridRow = `${startRow} / ${endRow}`;
      block.textContent = ev.title;
      block.addEventListener('mousedown', (e) => e.stopPropagation());
      block.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(d.getFullYear(), d.getMonth(), d.getDate());
        openEventEdit(ev, key);
      });
      weeklyGrid.appendChild(block);
    });
  }
}

function appendEvents(cell, key, events, maxShow, multiDayEvents, colIndex) {
  multiDayEvents = multiDayEvents || [];
  const dayEvents = events[key] || [];
  const singleDayEvents = dayEvents.filter(ev => !ev.endDate || ev.endDate <= key);
  const totalEvents = multiDayEvents.length + singleDayEvents.length;
  if (totalEvents === 0) return;

  const t = i18n[settings.lang];
  const container = document.createElement('div');
  container.className = 'events-container';
  let slots = 0;
  let eventsShown = 0;

  // Sort multi-day events by lane for consistent positions
  const sortedMD = [...multiDayEvents].sort((a, b) => (a._lane || 0) - (b._lane || 0));

  // Render multi-day bars in lane order with spacers
  let nextLane = 0;
  for (const mdEv of sortedMD) {
    const lane = mdEv._lane || 0;
    while (nextLane < lane && slots < maxShow) {
      const spacer = document.createElement('div');
      spacer.className = 'event-chip multi-day-spacer';
      spacer.textContent = '\u00A0';
      container.appendChild(spacer);
      slots++;
      nextLane++;
    }
    if (slots >= maxShow) break;

    const chip = document.createElement('div');
    chip.className = 'event-chip multi-day';
    chip.style.background = mdEv.color;
    const isBarStart = mdEv._isStart || colIndex === 0;
    const isBarEnd = mdEv._isEnd || colIndex === 6;
    if (isBarStart) chip.classList.add('multi-bar-start');
    if (isBarEnd) chip.classList.add('multi-bar-end');
    chip.textContent = isBarStart ? mdEv.title : '\u00A0';
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const cy = parseInt(cell.dataset.year), cm = parseInt(cell.dataset.month), cd = parseInt(cell.dataset.date);
      currentWeekStart = getWeekStart(new Date(cy, cm, cd));
      renderWeeklyGrid();
      openModal(cy, cm, cd);
      openEventEdit(mdEv, mdEv._startKey);
    });
    container.appendChild(chip);
    slots++;
    eventsShown++;
    nextLane = lane + 1;
  }

  // Render single-day events
  for (const ev of singleDayEvents) {
    if (slots >= maxShow) break;
    const chip = document.createElement('div');
    chip.className = 'event-chip';
    chip.style.background = ev.color;
    if (ev.allDay) {
      chip.textContent = ev.title;
    } else {
      chip.textContent = ev.start ? `${ev.start} ${ev.title}` : ev.title;
    }
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const cy = parseInt(cell.dataset.year), cm = parseInt(cell.dataset.month), cd = parseInt(cell.dataset.date);
      currentWeekStart = getWeekStart(new Date(cy, cm, cd));
      renderWeeklyGrid();
      openModal(cy, cm, cd);
      openEventEdit(ev, key);
    });
    container.appendChild(chip);
    slots++;
    eventsShown++;
  }

  if (totalEvents > eventsShown) {
    const more = document.createElement('div');
    more.className = 'event-more';
    more.textContent = t.more(totalEvents - eventsShown);
    container.appendChild(more);
  }
  cell.appendChild(container);
}

// --- Drag to select time (weekly) ---
let isTimeSelecting = false;
let timeSelectStart = null;
let timeSelectCurrent = null;

function slotIndex(hour, quarter) {
  return hour * 4 + quarter;
}

function getWeeklyCells() {
  return weeklyGrid.querySelectorAll('.weekly-cell');
}

function clearTimeSelection() {
  getWeeklyCells().forEach(c => c.classList.remove('drag-selecting'));
}

function globalSlot(dayIndex, hour, quarter) {
  return dayIndex * 96 + hour * 4 + quarter;
}

function highlightTimeSelection() {
  clearTimeSelection();
  if (!timeSelectStart || !timeSelectCurrent) return;

  const startGlobal = globalSlot(timeSelectStart.dayIndex, timeSelectStart.hour, timeSelectStart.quarter);
  const currentGlobal = globalSlot(timeSelectCurrent.dayIndex, timeSelectCurrent.hour, timeSelectCurrent.quarter);
  const minGlobal = Math.min(startGlobal, currentGlobal);
  const maxGlobal = Math.max(startGlobal, currentGlobal);

  getWeeklyCells().forEach(cell => {
    const g = globalSlot(parseInt(cell.dataset.dayIndex), parseInt(cell.dataset.hour), parseInt(cell.dataset.quarter));
    if (g >= minGlobal && g <= maxGlobal) {
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
    quarter: parseInt(cell.dataset.quarter),
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
  timeSelectCurrent = {
    dayIndex: parseInt(cell.dataset.dayIndex),
    hour: parseInt(cell.dataset.hour),
    quarter: parseInt(cell.dataset.quarter),
    year: parseInt(cell.dataset.year),
    month: parseInt(cell.dataset.month),
    date: parseInt(cell.dataset.date),
  };
  highlightTimeSelection();
});

document.addEventListener('mouseup', () => {
  if (!isTimeSelecting) return;
  isTimeSelecting = false;
  clearTimeSelection();
  if (!timeSelectStart || !timeSelectCurrent) return;

  // Use global slots for continuous selection
  const startGlobal = globalSlot(timeSelectStart.dayIndex, timeSelectStart.hour, timeSelectStart.quarter);
  const currentGlobal = globalSlot(timeSelectCurrent.dayIndex, timeSelectCurrent.hour, timeSelectCurrent.quarter);
  const minGlobal = Math.min(startGlobal, currentGlobal);
  const maxGlobal = Math.max(startGlobal, currentGlobal);

  // Derive start day/time from min global slot
  const startDayIdx = Math.floor(minGlobal / 96);
  const startSlotInDay = minGlobal % 96;
  const startHour = Math.floor(startSlotInDay / 4);
  const startQuarter = startSlotInDay % 4;

  // Derive end day/time from max global slot (+1 for end)
  const endGlobal = maxGlobal + 1;
  const endDayIdx = Math.floor(Math.min(endGlobal, 7 * 96 - 1) / 96);
  const endSlotInDay = endGlobal % 96;
  const endHour = endGlobal >= 7 * 96 ? 23 : Math.floor(endSlotInDay / 4);
  const endQuarter = endGlobal >= 7 * 96 ? 59 : endSlotInDay % 4;

  const startTime = `${String(startHour).padStart(2, '0')}:${String(startQuarter * 15).padStart(2, '0')}`;
  const endTime = endGlobal >= 7 * 96 ? '23:59' : (endHour >= 24 ? '23:59' : `${String(endHour).padStart(2, '0')}:${String(endQuarter * 15).padStart(2, '0')}`);

  const startDate = addDays(currentWeekStart, startDayIdx);
  const endDate = addDays(currentWeekStart, endDayIdx);

  selectedDateKey = dateKey(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDateKey = dateKey(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  if (endDateKey !== selectedDateKey) {
    selectedEndDateKey = endDateKey;
  } else {
    selectedEndDateKey = '';
  }

  const t = i18n[settings.lang];
  modalTitle.textContent = t.dateModal(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  eventTitleInput.value = '';
  eventStartInput.value = startTime;
  eventEndInput.value = endTime;
  eventStartDateInput.value = selectedDateKey;
  eventEndDateInput.value = selectedEndDateKey || selectedDateKey;
  eventAlldayCheckbox.checked = false;
  timeRow.classList.remove('hidden');
  eventForm.querySelector('input[name="event-color"][value="#4361ee"]').checked = true;
  modalOverlay.classList.remove('hidden');
  renderEventList();
  eventTitleInput.focus();

  timeSelectStart = null;
  timeSelectCurrent = null;
});

// --- Monthly drag for all-day events ---
let isMonthlySelecting = false;
let monthlySelectStart = null;
let monthlySelectCurrent = null;
let monthlyDragMoved = false;
let monthlyInlineInput = null;

function getMonthlyCells() {
  return calendarBody.querySelectorAll('.day-cell');
}

function clearMonthlySelection() {
  getMonthlyCells().forEach(c => c.classList.remove('month-drag-selecting'));
}

function highlightMonthlySelection() {
  clearMonthlySelection();
  if (!monthlySelectStart || !monthlySelectCurrent) return;

  const minIdx = Math.min(parseInt(monthlySelectStart.cellIndex), parseInt(monthlySelectCurrent.cellIndex));
  const maxIdx = Math.max(parseInt(monthlySelectStart.cellIndex), parseInt(monthlySelectCurrent.cellIndex));

  getMonthlyCells().forEach(cell => {
    const idx = parseInt(cell.dataset.cellIndex);
    if (idx >= minIdx && idx <= maxIdx) {
      cell.classList.add('month-drag-selecting');
    }
  });
}

calendarBody.addEventListener('mousedown', (e) => {
  const cell = e.target.closest('.day-cell');
  if (!cell) return;
  // Remove existing inline input
  if (monthlyInlineInput) {
    monthlyInlineInput.remove();
    monthlyInlineInput = null;
  }
  isMonthlySelecting = true;
  monthlyDragMoved = false;
  monthlySelectStart = {
    cellIndex: cell.dataset.cellIndex,
    year: parseInt(cell.dataset.year),
    month: parseInt(cell.dataset.month),
    date: parseInt(cell.dataset.date),
    dateKey: cell.dataset.dateKey,
  };
  monthlySelectCurrent = { ...monthlySelectStart };
  highlightMonthlySelection();
});

document.addEventListener('mousemove', (e) => {
  if (!isMonthlySelecting) return;
  const cell = e.target.closest('.day-cell');
  if (!cell) return;
  if (cell.dataset.cellIndex !== monthlySelectStart.cellIndex) {
    monthlyDragMoved = true;
  }
  monthlySelectCurrent = {
    cellIndex: cell.dataset.cellIndex,
    year: parseInt(cell.dataset.year),
    month: parseInt(cell.dataset.month),
    date: parseInt(cell.dataset.date),
    dateKey: cell.dataset.dateKey,
  };
  highlightMonthlySelection();
});

document.addEventListener('mouseup', (e) => {
  if (!isMonthlySelecting) return;
  isMonthlySelecting = false;
  if (!monthlySelectStart || !monthlySelectCurrent) {
    clearMonthlySelection();
    return;
  }
  if (!monthlyDragMoved) {
    clearMonthlySelection();
    return;
  }

  // Show inline input on the first selected cell
  const minIdx = Math.min(parseInt(monthlySelectStart.cellIndex), parseInt(monthlySelectCurrent.cellIndex));
  const cells = getMonthlyCells();
  let targetCell = null;
  cells.forEach(c => {
    if (parseInt(c.dataset.cellIndex) === minIdx) targetCell = c;
  });

  if (targetCell) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'monthly-inline-input';
    input.placeholder = i18n[settings.lang].placeholder;
    monthlyInlineInput = input;

    const startInfo = parseInt(monthlySelectStart.cellIndex) <= parseInt(monthlySelectCurrent.cellIndex)
      ? monthlySelectStart : monthlySelectCurrent;
    const endInfo = parseInt(monthlySelectStart.cellIndex) <= parseInt(monthlySelectCurrent.cellIndex)
      ? monthlySelectCurrent : monthlySelectStart;

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const title = input.value.trim();
        if (title) {
          pushUndo();
          const events = getEvents();
          const sKey = dateKey(startInfo.year, startInfo.month, startInfo.date);
          const eKey = dateKey(endInfo.year, endInfo.month, endInfo.date);
          if (!events[sKey]) events[sKey] = [];
          const newEvent = {
            id: Date.now().toString(36),
            title,
            start: '',
            end: '',
            color: '#4361ee',
            allDay: true,
          };
          if (sKey !== eKey) {
            newEvent.endDate = eKey;
          }
          events[sKey].push(newEvent);
          saveEvents(events);
        }
        input.remove();
        monthlyInlineInput = null;
        clearMonthlySelection();
        render();
      } else if (ev.key === 'Escape') {
        input.remove();
        monthlyInlineInput = null;
        clearMonthlySelection();
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (monthlyInlineInput === input) {
          input.remove();
          monthlyInlineInput = null;
          clearMonthlySelection();
        }
      }, 100);
    });

    targetCell.appendChild(input);
    input.focus();
  } else {
    clearMonthlySelection();
  }

  monthlySelectStart = null;
  monthlySelectCurrent = null;
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
  clearEditState();
  const t = i18n[settings.lang];
  selectedDateKey = dateKey(year, month, day);
  selectedEndDateKey = '';
  modalTitle.textContent = t.dateModal(year, month, day);
  eventTitleInput.value = '';
  eventStartInput.value = '';
  eventEndInput.value = '';
  eventStartDateInput.value = selectedDateKey;
  eventEndDateInput.value = selectedDateKey;
  eventAlldayCheckbox.checked = false;
  timeRow.classList.remove('hidden');
  eventForm.querySelector('input[name="event-color"][value="#4361ee"]').checked = true;
  modalOverlay.classList.remove('hidden');
  renderEventList();
  eventTitleInput.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  clearEditState();
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
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    if (undoStack.length === 0) return;
    const snapshot = undoStack.pop();
    saveEvents(snapshot);
    render();
    if (!modalOverlay.classList.contains('hidden')) {
      renderEventList();
    }
  }
});

// --- All-day toggle ---
eventAlldayCheckbox.addEventListener('change', () => {
  if (eventAlldayCheckbox.checked) {
    timeRow.classList.add('hidden');
    eventStartInput.value = '';
    eventEndInput.value = '';
  } else {
    timeRow.classList.remove('hidden');
  }
});

// --- Event CRUD ---
eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = eventTitleInput.value.trim();
  if (!title) return;

  const color = eventForm.querySelector('input[name="event-color"]:checked').value;
  const isAllDay = eventAlldayCheckbox.checked;
  const start = isAllDay ? '' : (eventStartInput.value || '');
  const end = isAllDay ? '' : (eventEndInput.value || '');

  const newStartKey = eventStartDateInput.value || selectedDateKey;
  const newEndKey = eventEndDateInput.value || '';

  pushUndo();
  const events = getEvents();

  if (editingEventId) {
    // Edit mode
    const oldKey = editingEventKey;
    const oldList = events[oldKey] || [];
    const evIdx = oldList.findIndex(ev => ev.id === editingEventId);
    if (evIdx !== -1) {
      const updatedEvent = { ...oldList[evIdx], title, start, end, color };
      if (isAllDay) updatedEvent.allDay = true; else delete updatedEvent.allDay;
      if (newEndKey && newEndKey !== newStartKey) {
        updatedEvent.endDate = newEndKey;
      } else {
        delete updatedEvent.endDate;
      }
      if (newStartKey !== oldKey) {
        oldList.splice(evIdx, 1);
        if (oldList.length === 0) delete events[oldKey];
        if (!events[newStartKey]) events[newStartKey] = [];
        events[newStartKey].push(updatedEvent);
      } else {
        oldList[evIdx] = updatedEvent;
      }
    }
    clearEditState();
  } else {
    // Create mode
    if (!events[newStartKey]) events[newStartKey] = [];
    const newEvent = { id: Date.now().toString(36), title, start, end, color };
    if (isAllDay) newEvent.allDay = true;
    if (newEndKey && newEndKey !== newStartKey) {
      newEvent.endDate = newEndKey;
    }
    events[newStartKey].push(newEvent);
  }

  selectedDateKey = newStartKey;
  selectedEndDateKey = newEndKey;
  saveEvents(events);

  eventTitleInput.value = '';
  eventStartInput.value = '';
  eventEndInput.value = '';
  eventStartDateInput.value = selectedDateKey;
  eventEndDateInput.value = selectedDateKey;
  eventAlldayCheckbox.checked = false;
  timeRow.classList.remove('hidden');
  selectedEndDateKey = '';
  renderEventList();
  render();
});

function deleteEvent(eventId, originKey) {
  const key = originKey || selectedDateKey;
  pushUndo();
  const events = getEvents();
  const list = events[key];
  if (!list) return;
  events[key] = list.filter((ev) => ev.id !== eventId);
  if (events[key].length === 0) delete events[key];
  saveEvents(events);
  clearEditState();
  renderEventList();
  render();
}

function renderEventList() {
  const t = i18n[settings.lang];
  const events = getEvents();
  const directList = (events[selectedDateKey] || []).map(ev => ({ ...ev, _originKey: selectedDateKey }));
  const spanningList = collectSpanningEvents(events, selectedDateKey);
  const list = [...directList, ...spanningList];
  eventList.innerHTML = '';
  list.forEach((ev) => {
    const li = document.createElement('li');
    if (ev._originKey !== selectedDateKey) {
      li.classList.add('spanning-event');
    }

    const dot = document.createElement('span');
    dot.className = 'event-dot';
    dot.style.background = ev.color;

    const info = document.createElement('div');
    info.className = 'event-info';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'ev-title';
    titleSpan.textContent = ev.title;
    info.appendChild(titleSpan);

    if (ev.allDay) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'ev-time';
      if (ev.endDate && ev.endDate !== ev._originKey) {
        timeSpan.textContent = `${t.allDay} (${ev._originKey} ~ ${ev.endDate})`;
      } else {
        timeSpan.textContent = t.allDay;
      }
      info.appendChild(timeSpan);
    } else if (ev.start) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'ev-time';
      if (ev.endDate && ev.endDate !== ev._originKey) {
        timeSpan.textContent = `${ev._originKey} ${ev.start} ~ ${ev.endDate} ${ev.end || ''}`.trim();
      } else {
        timeSpan.textContent = ev.end ? `${ev.start} ~ ${ev.end}` : ev.start;
      }
      info.appendChild(timeSpan);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.innerHTML = '&times;';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteEvent(ev.id, ev._originKey);
    });

    li.style.cursor = 'pointer';
    li.addEventListener('click', () => openEventEdit(ev, ev._originKey));

    li.appendChild(dot);
    li.appendChild(info);
    li.appendChild(delBtn);
    eventList.appendChild(li);
  });
}

// --- Init ---
render();
