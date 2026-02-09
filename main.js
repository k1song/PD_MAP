const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

const monthTitle = document.getElementById('month-title');
const calendarBody = document.getElementById('calendar-body');
const prevBtn = document.getElementById('prev-month');
const nextBtn = document.getElementById('next-month');

const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');
const eventForm = document.getElementById('event-form');
const eventTitleInput = document.getElementById('event-title');
const eventStartInput = document.getElementById('event-start');
const eventEndInput = document.getElementById('event-end');
const eventList = document.getElementById('event-list');

let selectedDateKey = '';

// --- LocalStorage helpers ---
function getEvents() {
  return JSON.parse(localStorage.getItem('pdmap-events') || '{}');
}

function saveEvents(events) {
  localStorage.setItem('pdmap-events', JSON.stringify(events));
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// --- Modal ---
function openModal(year, month, day) {
  selectedDateKey = dateKey(year, month, day);
  modalTitle.textContent = `${year}년 ${month + 1}월 ${day}일`;
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
  if (e.key === 'Escape') closeModal();
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
  events[selectedDateKey].push({
    id: Date.now().toString(36),
    title,
    start,
    end,
    color,
  });
  saveEvents(events);

  eventTitleInput.value = '';
  eventStartInput.value = '';
  eventEndInput.value = '';
  renderEventList();
  renderCalendar(currentYear, currentMonth);
});

function deleteEvent(eventId) {
  const events = getEvents();
  const list = events[selectedDateKey];
  if (!list) return;
  events[selectedDateKey] = list.filter((ev) => ev.id !== eventId);
  if (events[selectedDateKey].length === 0) delete events[selectedDateKey];
  saveEvents(events);
  renderEventList();
  renderCalendar(currentYear, currentMonth);
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
    delBtn.setAttribute('aria-label', '삭제');
    delBtn.addEventListener('click', () => deleteEvent(ev.id));

    li.appendChild(dot);
    li.appendChild(info);
    li.appendChild(delBtn);
    eventList.appendChild(li);
  });
}

// --- Calendar rendering ---
function renderCalendar(year, month) {
  monthTitle.textContent = `${year}년 ${month + 1}월`;
  calendarBody.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + lastDate) / 7) * 7;
  const events = getEvents();

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.classList.add('day-cell');

    const dayNum = document.createElement('span');
    dayNum.classList.add('day-number');

    let date, isOtherMonth = false;
    let cellYear = year, cellMonth = month;

    if (i < firstDay) {
      date = prevLastDate - firstDay + 1 + i;
      isOtherMonth = true;
      cellMonth = month - 1;
      if (cellMonth < 0) { cellMonth = 11; cellYear--; }
    } else if (i >= firstDay + lastDate) {
      date = i - firstDay - lastDate + 1;
      isOtherMonth = true;
      cellMonth = month + 1;
      if (cellMonth > 11) { cellMonth = 0; cellYear++; }
    } else {
      date = i - firstDay + 1;
    }

    dayNum.textContent = date;

    if (isOtherMonth) {
      cell.classList.add('other-month');
    }

    const dayOfWeek = i % 7;
    if (dayOfWeek === 0) cell.classList.add('sunday');
    if (dayOfWeek === 6) cell.classList.add('saturday');

    if (
      !isOtherMonth &&
      year === today.getFullYear() &&
      month === today.getMonth() &&
      date === today.getDate()
    ) {
      cell.classList.add('today');
    }

    cell.appendChild(dayNum);

    // Render events for this cell
    const key = dateKey(cellYear, cellMonth, date);
    const dayEvents = events[key];
    if (dayEvents && dayEvents.length > 0) {
      const container = document.createElement('div');
      container.className = 'events-container';
      const maxShow = 2;
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
        more.textContent = `+${dayEvents.length - maxShow}개 더보기`;
        container.appendChild(more);
      }
      cell.appendChild(container);
    }

    // Click to open modal
    const cy = cellYear, cm = cellMonth, cd = date;
    cell.addEventListener('click', () => openModal(cy, cm, cd));

    calendarBody.appendChild(cell);
  }
}

prevBtn.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar(currentYear, currentMonth);
});

nextBtn.addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentYear, currentMonth);
});

renderCalendar(currentYear, currentMonth);
