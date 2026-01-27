document.addEventListener('DOMContentLoaded', () => {
    const monthYearElement = document.getElementById('month-year');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const calendarGrid = document.getElementById('calendar-grid');
    const langToggleBtn = document.getElementById('lang-toggle-btn');

    const translations = {
        ko: {
            sun: '일', mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토',
            months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
            yearSuffix: '년'
        },
        en: {
            sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            yearSuffix: ''
        }
    };

    let currentLanguage = 'ko';
    let currentDate = new Date();

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
            
            calendarGrid.appendChild(dayCell);
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

    setLanguage(currentLanguage);
});