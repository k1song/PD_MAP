document.addEventListener('DOMContentLoaded', () => {
    const monthYearElement = document.getElementById('month-year');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const calendarGrid = document.getElementById('calendar-grid');
    const modal = document.getElementById('event-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const saveEventBtn = document.getElementById('save-event-btn');
    const deleteEventBtn = document.getElementById('delete-event-btn');
    const eventTitleInput = document.getElementById('event-title');
    const langToggleBtn = document.getElementById('lang-toggle-btn');

    const translations = {
        ko: {
            sun: '일', mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토',
            addEvent: '일정 추가',
            eventTitlePlaceholder: '일정 제목',
            save: '저장',
            delete: '삭제',
            months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
            yearSuffix: '년'
        },
        en: {
            sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
            addEvent: 'Add Event',
            eventTitlePlaceholder: 'Event Title',
            save: 'Save',
            delete: 'Delete',
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            yearSuffix: ''
        }
    };

    let currentLanguage = 'ko';
    let currentDate = new Date();
    let events = JSON.parse(localStorage.getItem('calendarEvents')) || {};
    let selectedDate = null;
    let editingIndex = null;

    function setLanguage(lang) {
        currentLanguage = lang;
        document.documentElement.lang = lang;
        langToggleBtn.textContent = lang === 'ko' ? 'EN' : 'KO';

        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.getAttribute('data-lang-key');
            if (translations[lang][key]) {
                el.textContent = translations[lang][key];
            }
        });

        document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
            const key = el.getAttribute('data-lang-placeholder');
            if (translations[lang][key]) {
                el.placeholder = translations[lang][key];
            }
        });
        renderCalendar();
    }

    function renderCalendar() {
        // Clear previous month's cells
        const dayCells = Array.from(calendarGrid.children).filter(child => child.classList.contains('day-cell'));
        dayCells.forEach(cell => cell.remove());

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        if (currentLanguage === 'en') {
            monthYearElement.textContent = `${translations[currentLanguage].months[month]} ${year}`;
        } else {
            monthYearElement.textContent = `${year}${translations[currentLanguage].yearSuffix} ${translations[currentLanguage].months[month]}`;
        }
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Add empty cells for days before the first of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('day-cell', 'other-month');
            calendarGrid.appendChild(emptyCell);
        }

        // Add a cell for each day of the month
        for (let i = 1; i <= daysInMonth; i++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day-cell');
            const date = new Date(year, month, i);
            dayCell.dataset.date = date.toISOString().split('T')[0];

            const dayNumber = document.createElement('span');
            dayNumber.classList.add('day-number');
            dayNumber.textContent = i;
            dayCell.appendChild(dayNumber);

            if (year === new Date().getFullYear() && month === new Date().getMonth() && i === new Date().getDate()) {
                dayCell.classList.add('today');
            }

            dayCell.addEventListener('click', () => openModal(dayCell.dataset.date));
            
            calendarGrid.appendChild(dayCell);
        }
        
        renderEvents();
    }
    
    function renderEvents() {
        document.querySelectorAll('.event').forEach(eventEl => eventEl.remove());

        for (const date in events) {
            const dayCell = calendarGrid.querySelector(`[data-date="${date}"]`);
            if (dayCell) {
                events[date].forEach((event, index) => {
                    const eventElement = document.createElement('div');
                    eventElement.classList.add('event');
                    eventElement.textContent = event.title;
                    eventElement.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent opening a new modal
                        openModal(date, index);
                    });
                    dayCell.appendChild(eventElement);
                });
            }
        }
    }

    function openModal(date, index = null) {
        selectedDate = date;
        editingIndex = index;
        eventDateInput.value = selectedDate;

        if (index !== null && events[selectedDate] && events[selectedDate][index]) {
            eventTitleInput.value = events[selectedDate][index].title;
            deleteEventBtn.classList.remove('hidden');
        } else {
            eventTitleInput.value = '';
            deleteEventBtn.classList.add('hidden');
        }

        modal.style.display = 'flex';
    }

    function closeModal() {
        modal.style.display = 'none';
        editingIndex = null;
        selectedDate = null;
    }

    function saveEvent() {
        const title = eventTitleInput.value.trim();
        if (title && selectedDate) {
            if (!events[selectedDate]) {
                events[selectedDate] = [];
            }

            if (editingIndex !== null) {
                // Update existing event
                events[selectedDate][editingIndex] = { title };
            } else {
                // Add new event
                events[selectedDate].push({ title });
            }

            localStorage.setItem('calendarEvents', JSON.stringify(events));
            closeModal();
            renderCalendar();
        }
    }
    
    function deleteEvent() {
        if (selectedDate && editingIndex !== null && events[selectedDate] && events[selectedDate][editingIndex]) {
            events[selectedDate].splice(editingIndex, 1);

            // If no events are left for this date, remove the date key
            if (events[selectedDate].length === 0) {
                delete events[selectedDate];
            }

            localStorage.setItem('calendarEvents', JSON.stringify(events));
            closeModal();
            renderCalendar();
        }
    }


    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    langToggleBtn.addEventListener('click', () => {
        const newLang = currentLanguage === 'ko' ? 'en' : 'ko';
        setLanguage(newLang);
    });

    closeModalBtn.addEventListener('click', closeModal);
    saveEventBtn.addEventListener('click', saveEvent);
    deleteEventBtn.addEventListener('click', deleteEvent); // You'll need to show this button when editing

    setLanguage(currentLanguage);
