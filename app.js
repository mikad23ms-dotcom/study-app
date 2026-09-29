// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyAaV59AdAZOXi1Q7KoDn2BhdsFIz_TrLYY",
  authDomain: "studyapp-659cc.firebaseapp.com",
  projectId: "studyapp-659cc",
  storageBucket: "studyapp-659cc.firebasestorage.app",
  messagingSenderId: "978388176644",
  appId: "1:978388176644:web:bff410bb3027427312ca51"
};

// Initialize Firebase only if we are in the browser and firebase is loaded
let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} catch (e) {
    console.log("Firebase not loaded yet or offline", e);
}

// User Identity
let studyUsername = localStorage.getItem('study_username');
let studyUserId = localStorage.getItem('study_userid');
let studyStage = localStorage.getItem('study_stage') || '';
let studySpecialty = localStorage.getItem('study_specialty') || '';
let appVersion = localStorage.getItem('study_app_version') || '1.0';

if (!studyUsername || !studyStage || appVersion !== '2.0') {
    // If the user already has a name from the old version, pre-fill it so they don't lose it
    if(studyUsername && studyUsername !== 'Ø·Ø§Ù„Ø¨') {
        document.getElementById('onboard-name').value = studyUsername;
    }
    document.getElementById('onboarding-modal').style.display = 'flex';
}

window.saveOnboarding = () => {
    let name = document.getElementById('onboard-name').value.trim();
    let role = document.getElementById('onboard-role').value; // 'student' or 'teacher'
    
    if (!name) {
        alert('أهلاً بك! من فضلك أدخل اسمك أولاً لنتمكن من حفظ بياناتك.');
        return;
    }

    let stage = '';
    let spec = '';
    let tCode = '';
    let tSubject = '';
    let generatedTeacherCode = '';

    if (role === 'student') {
        stage = document.getElementById('onboard-stage').value;
        if (!stage) {
            alert('من فضلك اختر المرحلة الدراسية الخاصة بك.');
            return;
        }
        if (stage === 'جامعة') {
            spec = document.getElementById('onboard-uni').value.trim();
            if (!spec) {
                alert('من فضلك أدخل اسم الكلية أو التخصص الخاص بك.');
                return;
            }
        } else if (stage === 'ابتدائي' || stage === 'إعدادي' || stage === 'ثانوي') {
            spec = document.getElementById('onboard-year').value;
        }
        tCode = document.getElementById('onboard-teacher-code').value.trim();
    } else if (role === 'teacher') {
        tSubject = document.getElementById('onboard-teacher-subject').value.trim();
        if (!tSubject) {
            alert('من فضلك أدخل المادة التي تقوم بتدريسها.');
            return;
        }
        stage = 'مدرس';
        spec = tSubject;
        generatedTeacherCode = 'T-' + Math.floor(1000 + Math.random() * 9000);
    }
    
    studyUsername = name;
    studyStage = stage;
    studySpecialty = spec;
    
    if (!studyUserId) {
        studyUserId = 'user_' + Date.now().toString();
    }
    
    localStorage.setItem('study_username', studyUsername);
    localStorage.setItem('study_userid', studyUserId);
    localStorage.setItem('study_stage', studyStage);
    localStorage.setItem('study_specialty', studySpecialty);
    localStorage.setItem('study_role', role);
    localStorage.setItem('study_app_version', '2.0');
    
    if (role === 'student' && tCode) {
        localStorage.setItem('study_my_teacher_code', tCode);
    }
    if (role === 'teacher') {
        localStorage.setItem('study_teacher_code', generatedTeacherCode);
    }
    
    document.getElementById('onboarding-modal').style.display = 'none';
    syncToCloud();
    
    if (role === 'teacher') {
        alert('أهلاً بك يا أستاذ ' + name + '\n\nكود المدرس الخاص بك هو:\n[ ' + generatedTeacherCode + ' ]\n\nقم بإعطاء هذا الكود لطلابك ليرتبطوا بك.');
    }
    
    setTimeout(() => {
        window.location.reload();
    }, 800);
};
// Force a sync on app load for returning users so the admin sees them even if they don't add tasks
if (studyUserId) {
    setTimeout(syncToCloud, 2000);
}

// --- State & Local Storage ---
let subjects = JSON.parse(localStorage.getItem('study_subjects')) || [];
let classes = JSON.parse(localStorage.getItem('study_classes')) || [];
let tasks = JSON.parse(localStorage.getItem('study_tasks')) || [];
let exams = JSON.parse(localStorage.getItem('study_exams')) || [];
let flashcards = JSON.parse(localStorage.getItem('study_flashcards')) || [];
let geminiApiKey = localStorage.getItem('study_gemini_api') || '';
let isDarkMode = localStorage.getItem('study_theme') === 'dark';

const daysOfWeek = ['Ø§Ù„Ø£Ø­Ø¯', 'Ø§Ù„Ø¥Ø«Ù†ÙŠÙ†', 'Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡', 'Ø§Ù„Ø£Ø±Ø¨Ø¹Ø§Ø¡', 'Ø§Ù„Ø®Ù…ÙŠØ³', 'Ø§Ù„Ø¬Ù…Ø¹Ø©', 'Ø§Ù„Ø³Ø¨Øª'];

// Initialize Theme
if (isDarkMode) document.body.setAttribute('data-theme', 'dark');
const themeBtn = document.getElementById('theme-toggle-btn');
themeBtn.innerHTML = isDarkMode ? '<i class="fa-solid fa-sun"></i> Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ù†Ù‡Ø§Ø±ÙŠ' : '<i class="fa-solid fa-moon"></i> Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ù„ÙŠÙ„ÙŠ';

themeBtn.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        document.body.setAttribute('data-theme', 'dark');
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i> Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ù†Ù‡Ø§Ø±ÙŠ';
        localStorage.setItem('study_theme', 'dark');
    } else {
        document.body.removeAttribute('data-theme');
        themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i> Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ù„ÙŠÙ„ÙŠ';
        localStorage.setItem('study_theme', 'light');
    }
});

function saveData() {
    localStorage.setItem('study_subjects', JSON.stringify(subjects));
    localStorage.setItem('study_classes', JSON.stringify(classes));
    localStorage.setItem('study_tasks', JSON.stringify(tasks));
    localStorage.setItem('study_exams', JSON.stringify(exams));
    localStorage.setItem('study_flashcards', JSON.stringify(flashcards));
    renderAll();
    syncToCloud();
}

function syncToCloud() {
    if (!db || !studyUserId) return;
    try {
        db.collection('users_data').doc(studyUserId).set({
            name: studyUsername || 'Ù…Ø¬Ù‡ÙˆÙ„',
            stage: studyStage || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯',
            specialty: studySpecialty || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯',
            tasks: tasks,
            classes: classes,
            lastUpdated: new Date().toISOString()
        }).catch(e => console.log("Cloud sync error: ", e));
    } catch(e) {}
}

// --- Navigation ---
const navItems = document.querySelectorAll('.nav-links li');
const pages = document.querySelectorAll('.page');
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active-page'));
        item.classList.add('active');
        document.getElementById(item.getAttribute('data-page')).classList.add('active-page');
    });
});

// --- Modals ---
window.openModal = id => document.getElementById(id).style.display = 'flex';
window.closeModal = id => document.getElementById(id).style.display = 'none';
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };

// --- Date Utils ---
function getTodayInfo() {
    const today = new Date();
    const dayIndex = today.getDay();
    const dateString = today.toISOString().split('T')[0];
    const arabicDate = today.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return { dayIndex, dateString, arabicDate, today };
}
document.getElementById('current-date').innerText = getTodayInfo().arabicDate;
function getSubject(id) { return subjects.find(s => s.id === id); }

// --- Render Functions ---
function renderSubjects() {
    const grid = document.getElementById('subjects-grid');
    const selects = ['class-subject', 'task-subject', 'exam-subject', 'flashcard-subject'].map(id => document.getElementById(id));
    grid.innerHTML = '';
    selects[0].innerHTML = '<option value="" disabled selected>Ø§Ø®ØªØ± Ø§Ù„Ù…Ø§Ø¯Ø©</option>';
    selects[1].innerHTML = '<option value="">Ø¨Ø¯ÙˆÙ† Ù…Ø§Ø¯Ø© Ù…Ø­Ø¯Ø¯Ø©</option>';
    selects[2].innerHTML = '<option value="" disabled selected>Ø§Ø®ØªØ± Ø§Ù„Ù…Ø§Ø¯Ø©</option>';
    selects[3].innerHTML = '<option value="">Ø¨Ø¯ÙˆÙ† Ù…Ø§Ø¯Ø© Ù…Ø­Ø¯Ø¯Ø©</option>';

    if(subjects.length === 0) grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ÙˆØ§Ø¯ Ù…Ø¶Ø§ÙØ© Ø¨Ø¹Ø¯.</p>';

    subjects.forEach(sub => {
        const div = document.createElement('div');
        div.className = 'subject-card';
        div.style.borderRight = `5px solid ${sub.color}`;
        div.innerHTML = `${sub.name}<button onclick="deleteSubject('${sub.id}')" style="display:block; margin: 10px auto 0; background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fa-solid fa-trash"></i> Ø­Ø°Ù</button>`;
        grid.appendChild(div);
        const opt = `<option value="${sub.id}">${sub.name}</option>`;
        selects.forEach(sel => sel.innerHTML += opt);
    });
}

function renderSchedule() {
    const grid = document.getElementById('schedule-grid');
    grid.innerHTML = '';
    daysOfWeek.forEach((dayName, index) => {
        const dayClasses = classes.filter(c => c.day === index.toString()).sort((a,b) => a.time.localeCompare(b.time));
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-card';
        dayDiv.innerHTML = `<h3>${dayName}</h3>`;
        const ul = document.createElement('ul');
        ul.className = 'item-list';
        if (dayClasses.length === 0) {
            ul.innerHTML = '<li class="list-item" style="justify-content:center; color:var(--text-muted); font-size:0.9rem;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¯Ø±ÙˆØ³</li>';
        } else {
            dayClasses.forEach(cls => {
                const sub = getSubject(cls.subjectId);
                if(!sub) return;
                let t = cls.time.split(':');
                let h = parseInt(t[0]) % 12 || 12;
                ul.innerHTML += `<li class="list-item" style="border-right-color:${sub.color}">
                    <div><strong>${sub.name}</strong><br><small style="color:var(--text-muted)"><i class="fa-regular fa-clock"></i> ${h}:${t[1]} ${parseInt(t[0])>=12?'Ù…':'Øµ'}</small></div>
                    <button onclick="deleteClass('${cls.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fa-solid fa-times"></i></button></li>`;
            });
        }
        dayDiv.appendChild(ul);
        grid.appendChild(dayDiv);
    });
}

let currentTaskFilter = 'all';
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTaskFilter = e.target.getAttribute('data-filter');
        renderTasks();
    });
});

function renderTasks() {
    const list = document.getElementById('all-tasks-list');
    list.innerHTML = '';
    let fTasks = tasks.filter(t => currentTaskFilter === 'all' ? true : (currentTaskFilter === 'completed' ? t.completed : !t.completed));
    fTasks.sort((a,b) => new Date(a.date) - new Date(b.date));
    if(fTasks.length === 0) return list.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù‡Ø§Ù….</p>';

    fTasks.forEach(task => {
        const sub = task.subjectId ? getSubject(task.subjectId) : null;
        list.innerHTML += `<li class="list-item ${task.completed ? 'completed' : ''}" style="border-right-color:${sub?sub.color:'var(--border-color)'}">
            <div class="task-text"><strong>${task.desc}</strong>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
                    <span style="background:var(--bg-color); border: 1px solid var(--border-color); padding:2px 6px; border-radius:4px; margin-left:10px;">${sub?sub.name:'Ø¹Ø§Ù…'}</span>
                    <i class="fa-regular fa-calendar"></i> ${task.date}</div></div>
            <div class="task-actions">
                <button class="check-btn" onclick="toggleTask('${task.id}')"><i class="fa-solid ${task.completed ? 'fa-circle-xmark' : 'fa-circle-check'}"></i></button>
                <button class="delete-btn" onclick="deleteTask('${task.id}')"><i class="fa-solid fa-trash"></i></button></div></li>`;
    });
}

function renderExams() {
    const mainList = document.getElementById('exams-list');
    const dashGrid = document.getElementById('dashboard-exams-grid');
    mainList.innerHTML = dashGrid.innerHTML = '';
    const sorted = [...exams].sort((a,b) => new Date(a.date) - new Date(b.date));
    const upcoming = sorted.filter(e => e.date >= getTodayInfo().dateString);

    if (upcoming.length === 0) {
        mainList.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø§Ù…ØªØ­Ø§Ù†Ø§Øª Ù‚Ø§Ø¯Ù…Ø© ðŸ¥³</p>';
        dashGrid.innerHTML = '<p style="color:var(--text-muted);">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø§Ù…ØªØ­Ø§Ù†Ø§Øª Ù‚Ø§Ø¯Ù…Ø©</p>';
        return;
    }

    upcoming.forEach((exam, index) => {
        const sub = getSubject(exam.subjectId);
        if(!sub) return;
        const diffDays = Math.ceil(Math.abs(new Date(exam.date) - new Date(getTodayInfo().dateString)) / (1000 * 60 * 60 * 24));
        const daysText = diffDays === 0 ? 'Ø§Ù„ÙŠÙˆÙ…!' : (diffDays === 1 ? 'ØºØ¯Ø§Ù‹' : `Ø¨Ø§Ù‚ÙŠ ${diffDays} Ø£ÙŠØ§Ù…`);
        const cardHTML = `<div class="exam-card" style="border-right-color: ${sub.color};">
            <div class="exam-actions"><button onclick="deleteExam('${exam.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fa-solid fa-trash"></i></button></div>
            <h3>${exam.title} - ${sub.name}</h3><p style="color:var(--text-muted)"><i class="fa-regular fa-calendar"></i> ${exam.date}</p>
            <div class="exam-countdown ${diffDays<=3?'text-danger':(diffDays<=7?'text-orange':'text-blue')}"><i class="fa-solid fa-clock"></i> ${daysText}</div></div>`;
        mainList.innerHTML += cardHTML;
        if(index < 2) dashGrid.innerHTML += cardHTML;
    });
}

function renderFlashcards() {
    const grid = document.getElementById('flashcards-grid');
    grid.innerHTML = '';
    if(flashcards.length === 0) return grid.innerHTML = '<p style="text-align:center; color:var(--text-muted); grid-column:1/-1;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨Ø·Ø§Ù‚Ø§Øª. Ø£Ø¶Ù Ø¨Ø·Ø§Ù‚ØªÙƒ Ø§Ù„Ø£ÙˆÙ„Ù‰!</p>';
    
    flashcards.forEach(card => {
        const sub = card.subjectId ? getSubject(card.subjectId) : null;
        const cColor = sub ? sub.color : 'var(--border-color)';
        grid.innerHTML += `
            <div class="flashcard" onclick="this.classList.toggle('flipped')">
                <div class="flashcard-inner">
                    <div class="flashcard-front" style="border-right-color: ${cColor}">
                        <button class="fc-delete" onclick="event.stopPropagation(); deleteFlashcard('${card.id}')"><i class="fa-solid fa-trash"></i></button>
                        <span style="position:absolute; top:10px; right:10px; font-size:0.8rem; color:var(--text-muted)">${sub?sub.name:'Ø¹Ø§Ù…'}</span>
                        <h3 style="font-size:1.3rem;">${card.q.replace(/\n/g, '<br>')}</h3>
                        <p style="position:absolute; bottom:10px; font-size:0.8rem; color:var(--text-muted)">Ø§Ù†Ù‚Ø± Ù„Ù„Ù‚Ù„Ø¨ <i class="fa-solid fa-rotate"></i></p>
                    </div>
                    <div class="flashcard-back" style="background-color: ${cColor}">
                        <button class="fc-delete" onclick="event.stopPropagation(); deleteFlashcard('${card.id}')"><i class="fa-solid fa-trash"></i></button>
                        <p style="font-size:1.1rem; line-height:1.5;">${card.a.replace(/\n/g, '<br>')}</p>
                    </div>
                </div>
            </div>`;
    });
}

function renderDashboard() {
    const today = getTodayInfo();
    const allT = tasks.filter(t => t.date === today.dateString || (!t.completed && t.date < today.dateString));
    const compT = allT.filter(t => t.completed);
    let p = allT.length > 0 ? Math.round((compT.length / allT.length) * 100) : 100;
    document.getElementById('daily-progress').style.width = p + '%';
    document.getElementById('progress-text').innerText = `${p}% (${compT.length} Ù…Ù† ${allT.length} Ù…Ù‡Ø§Ù…)`;

    const tdClasses = classes.filter(c => c.day === today.dayIndex.toString()).sort((a,b) => a.time.localeCompare(b.time));
    const clsList = document.getElementById('today-classes-list');
    clsList.innerHTML = tdClasses.length===0 ? '<li class="list-item" style="justify-content:center; color:var(--text-muted);">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¯Ø±ÙˆØ³ Ø§Ù„ÙŠÙˆÙ…! ðŸŽ‰</li>' : '';
    tdClasses.forEach(c => {
        const s = getSubject(c.subjectId);
        if(!s) return;
        let t = c.time.split(':');
        clsList.innerHTML += `<li class="list-item" style="border-right-color:${s.color}"><strong>${s.name}</strong> <span>${parseInt(t[0])%12||12}:${t[1]} ${parseInt(t[0])>=12?'Ù…':'Øµ'}</span></li>`;
    });

    const tskList = document.getElementById('today-tasks-list');
    const pendT = allT.filter(t => !t.completed);
    tskList.innerHTML = pendT.length===0 ? '<li class="list-item" style="justify-content:center; color:var(--text-muted);">Ø£Ù†Ø¬Ø²Øª Ø¬Ù…ÙŠØ¹ Ù…Ù‡Ø§Ù…ÙƒØŒ Ø¹Ù…Ù„ Ø±Ø§Ø¦Ø¹! ðŸŒŸ</li>' : '';
    pendT.forEach(task => {
        const s = task.subjectId ? getSubject(task.subjectId) : null;
        tskList.innerHTML += `<li class="list-item" style="border-right-color:${s?s.color:'var(--border-color)'}">
            <div class="task-text"><strong>${task.desc}</strong><div style="font-size:0.8rem; color:${task.date<today.dateString?'var(--danger)':'var(--text-muted)'}; margin-top:3px;">${task.date<today.dateString?'Ù…ØªØ£Ø®Ø± âš ï¸':'Ø§Ù„ÙŠÙˆÙ…'}</div></div>
            <button onclick="toggleTask('${task.id}')" style="background:none; border:none; color:var(--success); cursor:pointer; font-size:1.2rem;"><i class="fa-regular fa-circle-check"></i></button></li>`;
    });
}

function renderAll() {
    renderSubjects(); renderSchedule(); renderTasks(); renderExams(); renderFlashcards(); renderDashboard(); checkApiKey();
}

// --- Heavy Sleeper Alarm Logic ---
let alarmTime = null;
let isAlarmRinging = false;
let audioCtx;
let alarmOsc;
let alarmGain;
let sirenInterval;
let clockInterval;

window.toggleAlarm = () => {
    const input = document.getElementById('alarm-time-input').value;
    const btn = document.getElementById('set-alarm-btn');
    const status = document.getElementById('alarm-status');
    
    if (alarmTime) {
        // Cancel alarm
        alarmTime = null;
        btn.innerHTML = '<i class="fa-solid fa-clock"></i> Ø¶Ø¨Ø· Ø§Ù„Ù…Ù†Ø¨Ù‡';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-primary');
        status.style.display = 'none';
        document.getElementById('alarm-time-input').disabled = false;
    } else {
        // Set alarm
        if (!input) return alert('ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ ÙˆÙ‚Øª Ø§Ù„Ø§Ø³ØªÙŠÙ‚Ø§Ø¸ Ø£ÙˆÙ„Ø§Ù‹!');
        alarmTime = input;
        
        // Initialize AudioContext on user interaction to bypass autoplay restrictions
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        btn.innerHTML = '<i class="fa-solid fa-ban"></i> Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ù…Ù†Ø¨Ù‡';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-danger');
        status.innerText = `ØªÙ… Ø¶Ø¨Ø· Ø§Ù„Ù…Ù†Ø¨Ù‡ Ù„ÙŠØ±Ù† Ø§Ù„Ø³Ø§Ø¹Ø© ${input}ØŒ Ø§ØªØ±Ùƒ Ù‡Ø°Ù‡ Ø§Ù„ØµÙØ­Ø© Ù…ÙØªÙˆØ­Ø©!`;
        status.style.display = 'block';
        document.getElementById('alarm-time-input').disabled = true;
    }
}

// Check time every second
clockInterval = setInterval(() => {
    if (!alarmTime || isAlarmRinging) return;
    
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;
    
    if (currentTimeStr === alarmTime && now.getSeconds() < 2) {
        triggerLoudAlarm();
    }
}, 1000);

function triggerLoudAlarm() {
    isAlarmRinging = true;
    document.body.classList.add('alarm-flashing');
    document.getElementById('stop-alarm-container').style.display = 'block';
    
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create an extremely loud and annoying siren
    alarmOsc = audioCtx.createOscillator();
    alarmGain = audioCtx.createGain();
    
    alarmOsc.type = 'square'; // Very harsh sound
    alarmGain.gain.value = 1; // Max volume
    
    alarmOsc.connect(alarmGain);
    alarmGain.connect(audioCtx.destination);
    
    alarmOsc.start();
    
    let high = false;
    sirenInterval = setInterval(() => {
        // Modulate between two high frequencies rapidly
        if (alarmOsc) alarmOsc.frequency.setValueAtTime(high ? 1200 : 800, audioCtx.currentTime);
        high = !high;
    }, 200); // Very fast modulation to cause urgency
}

window.stopAlarmSound = () => {
    isAlarmRinging = false;
    alarmTime = null;
    
    if (alarmOsc) {
        alarmOsc.stop();
        alarmOsc.disconnect();
        alarmOsc = null;
    }
    clearInterval(sirenInterval);
    
    document.body.classList.remove('alarm-flashing');
    document.getElementById('stop-alarm-container').style.display = 'none';
    
    // Reset UI
    const btn = document.getElementById('set-alarm-btn');
    btn.innerHTML = '<i class="fa-solid fa-clock"></i> Ø¶Ø¨Ø· Ø§Ù„Ù…Ù†Ø¨Ù‡';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');
    document.getElementById('alarm-status').style.display = 'none';
    document.getElementById('alarm-time-input').disabled = false;
    document.getElementById('alarm-time-input').value = '';
}


// --- Pomodoro Logic ---
let pomodoroTimer; let timeLeft = 25 * 60; let isRunning = false; let currentMode = 'work';
function updateTimerDisplay() {
    let m = Math.floor(timeLeft / 60); let s = timeLeft % 60;
    document.getElementById('timer-display').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
window.setPomodoroMode = (mode, m) => {
    clearInterval(pomodoroTimer); isRunning = false; currentMode = mode; timeLeft = m * 60; updateTimerDisplay();
    document.getElementById('start-timer-btn').innerText = 'Ø§Ø¨Ø¯Ø£ Ø§Ù„Ù…Ø°Ø§ÙƒØ±Ø©';
    document.querySelectorAll('.pomo-mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}
window.toggleTimer = () => {
    const btn = document.getElementById('start-timer-btn');
    if (isRunning) { 
        clearInterval(pomodoroTimer); 
        btn.innerText = 'Ø§Ø³ØªØ¦Ù†Ø§Ù'; 
        isRunning = false; 
        if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    } else {
        btn.innerText = 'Ø¥ÙŠÙ‚Ø§Ù Ù…Ø¤Ù‚Øª'; 
        isRunning = true;
        
        // Save initial duration to track how much was completed
        const initialDuration = currentMode === 'work' ? 25 : (currentMode === 'longBreak' ? 15 : 5);
        
        try { if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); } catch(e){}
        pomodoroTimer = setInterval(() => {
            timeLeft--; updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(pomodoroTimer); isRunning = false; btn.innerText = 'Ø§Ù†ØªÙ‡Ù‰ Ø§Ù„ÙˆÙ‚Øª!';
                if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator(); osc.connect(ctx.destination); osc.frequency.value = 800; osc.start(); setTimeout(() => osc.stop(), 500);
                
                // Track study time if it was a work session
                if (currentMode === 'work') {
                    if(typeof addStudyTime === 'function') addStudyTime(25);
                }
            }
        }, 1000);
    }
}
window.resetTimer = () => {
    clearInterval(pomodoroTimer); isRunning = false;
    timeLeft = currentMode === 'work' ? 25*60 : (currentMode === 'shortBreak' ? 5*60 : 15*60);
    updateTimerDisplay(); document.getElementById('start-timer-btn').innerText = 'Ø§Ø¨Ø¯Ø£';
}

// --- Forms ---
document.getElementById('subject-form').onsubmit = e => { e.preventDefault(); subjects.push({ id: Date.now().toString(), name: e.target[0].value, color: e.target[1].value }); saveData(); closeModal('subject-modal'); e.target.reset(); };
document.getElementById('class-form').onsubmit = e => { e.preventDefault(); if(!e.target[0].value) return alert('Ø§Ø®ØªØ± Ù…Ø§Ø¯Ø©'); classes.push({ id: Date.now().toString(), subjectId: e.target[0].value, day: e.target[1].value, time: e.target[2].value }); saveData(); closeModal('class-modal'); e.target.reset(); };
document.getElementById('task-form').onsubmit = e => { e.preventDefault(); tasks.push({ id: Date.now().toString(), desc: e.target[0].value, subjectId: e.target[1].value, date: e.target[2].value, completed: false }); saveData(); closeModal('task-modal'); e.target.reset(); };
document.getElementById('exam-form').onsubmit = e => { e.preventDefault(); if(!e.target[1].value) return alert('Ø§Ø®ØªØ± Ù…Ø§Ø¯Ø©'); exams.push({ id: Date.now().toString(), title: e.target[0].value, subjectId: e.target[1].value, date: e.target[2].value }); saveData(); closeModal('exam-modal'); e.target.reset(); };
document.getElementById('flashcard-form').onsubmit = e => { e.preventDefault(); flashcards.push({ id: Date.now().toString(), subjectId: e.target[0].value, q: e.target[1].value, a: e.target[2].value }); saveData(); closeModal('flashcard-modal'); e.target.reset(); };

document.getElementById('task-date').value = getTodayInfo().dateString;

// --- Deletions ---
window.deleteSubject = id => { if(confirm('Ù…ØªØ£ÙƒØ¯ØŸ Ø³ÙŠØªÙ… Ø­Ø°Ù Ø§Ù„Ø¯Ø±ÙˆØ³ ÙˆØ§Ù„Ø§Ù…ØªØ­Ø§Ù†Ø§Øª Ø§Ù„Ù…ØªØ¹Ù„Ù‚Ø©.')){ subjects=subjects.filter(s=>s.id!==id); classes=classes.filter(c=>c.subjectId!==id); exams=exams.filter(e=>e.subjectId!==id); saveData(); } }
window.deleteClass = id => { if(confirm('Ø­Ø°Ù Ø§Ù„Ø¯Ø±Ø³ØŸ')) { classes = classes.filter(c=>c.id!==id); saveData(); } }
window.deleteTask = id => { if(confirm('Ø­Ø°Ù Ø§Ù„Ù…Ù‡Ù…Ø©ØŸ')) { tasks = tasks.filter(t=>t.id!==id); saveData(); } }
window.deleteExam = id => { if(confirm('Ø­Ø°Ù Ø§Ù„Ø§Ù…ØªØ­Ø§Ù†ØŸ')) { exams = exams.filter(e=>e.id!==id); saveData(); } }
window.deleteFlashcard = id => { if(confirm('Ø­Ø°Ù Ø§Ù„Ø¨Ø·Ø§Ù‚Ø©ØŸ')) { flashcards = flashcards.filter(f=>f.id!==id); saveData(); } }
window.toggleTask = id => { 
    const t = tasks.find(t=>t.id===id); 
    if(t) { 
        t.completed = !t.completed; 
        if(t.completed && typeof addCompletedTask === 'function') addCompletedTask();
        saveData(); 
    } 
}

// --- AI Assistant Logic ---
function checkApiKey() {
    if(geminiApiKey) { document.getElementById('api-key-alert').style.display = 'none'; }
    else { document.getElementById('api-key-alert').style.display = 'block'; }
}
window.saveApiKey = () => {
    const k = document.getElementById('api-key-input').value.trim();
    if(k) { geminiApiKey = k; localStorage.setItem('study_gemini_api', k); checkApiKey(); alert('ØªÙ… Ø§Ù„Ø­ÙØ¸ Ø¨Ù†Ø¬Ø§Ø­!'); }
}
window.switchAITab = tabId => {
    document.querySelectorAll('.ai-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.ai-tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// === Ø­ÙŠÙ„Ø© ØªØ®Ø·ÙŠ Ø­Ù…Ø§ÙŠØ© Neocities (Iframe Proxy) ===
const proxyUrl = "https://crazy-pony-6010.mikad23ms-dotcom.deno.net";
const aiProxy = document.createElement('iframe');
aiProxy.style.display = 'none';
aiProxy.src = proxyUrl;
document.body.appendChild(aiProxy);

// ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù…Ø¹Ù„Ù‚Ø©
const pendingRequests = {};

window.addEventListener('message', (event) => {
    if (event.origin !== new URL(proxyUrl).origin) return;
    
    const data = event.data;
    if (data && data.id && pendingRequests[data.id]) {
        pendingRequests[data.id].resolve(data.result || data);
        delete pendingRequests[data.id];
    }
});

function callProxy(payload) {
    return new Promise((resolve, reject) => {
        const id = 'req_' + Date.now() + Math.random();
        pendingRequests[id] = { resolve, reject };
        
        payload.id = id;
        aiProxy.contentWindow.postMessage(payload, proxyUrl);
        
        // Ù…Ù‡Ù„Ø© 60 Ø«Ø§Ù†ÙŠØ©
        setTimeout(() => {
            if (pendingRequests[id]) {
                reject(new Error("Ø§Ù†ØªÙ‡Øª Ø§Ù„Ù…Ù‡Ù„Ø©ØŒ Ø§Ù„Ø³ÙŠØ±ÙØ± Ù„Ù… ÙŠØ±Ø¯"));
                delete pendingRequests[id];
            }
        }, 60000);
    });
}

// === Ø§Ù„Ø¯Ø§Ù„Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© Ù„Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ ===
async function callGeminiAPI(parts) {
    document.getElementById('ai-loading').style.display = 'block';
    const outputContainer = document.getElementById('ai-output-container');
    if (outputContainer) outputContainer.style.display = 'none';
    
    try {
        if (!geminiApiKey) {
            alert("ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ù…ÙØªØ§Ø­ API Ø§Ù„Ø®Ø§Øµ Ø¨Ùƒ ÙÙŠ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø£ÙˆÙ„Ø§Ù‹!");
            document.getElementById('ai-loading').style.display = 'none';
            return null;
        }
        
        const payload = { 
            contents: [{ parts: parts }],
            apiKey: geminiApiKey 
        };
        const data = await callProxy(payload);
        
        if (data.error) {
            if (data.error.code === 503) {
                alert("Ø³ÙŠØ±ÙØ±Ø§Øª Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ø¹Ù„ÙŠÙ‡Ø§ Ø¶ØºØ· Ø­Ø§Ù„ÙŠØ§Ù‹. Ø­Ø§ÙˆÙ„ÙŠ ØªØ§Ù†ÙŠ Ø¨Ø¹Ø¯ Ù„Ø­Ø¸Ø§Øª.");
            } else {
                alert("Ø­Ø¯Ø« Ø®Ø·Ø£: " + data.error.message);
            }
            return null;
        }
        
        if (data.candidates && data.candidates[0]) {
            return data.candidates[0].content.parts[0].text;
        }
        
        alert("Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø±Ø¯. Ø¬Ø±Ø¨ÙŠ ØªØ§Ù†ÙŠ.");
        return null;
    } catch (e) {
        console.error("AI Error:", e);
        alert('Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„: ' + e.message);
        return null;
    } finally {
        document.getElementById('ai-loading').style.display = 'none';
    }
}

function processAIOutput(text) {
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/;
    const match = text.match(mermaidRegex);
    let mermaidCode = '';
    if(match) {
        mermaidCode = match[1];
        text = text.replace(mermaidRegex, ''); 
    }
    
    document.getElementById('ai-output-container').style.display = 'block';
    document.getElementById('ai-result-content').innerHTML = marked.parse(text);
    
    const mermaidContainer = document.getElementById('mermaid-container');
    if(mermaidCode) {
        mermaidContainer.style.display = 'block';
        mermaidContainer.innerHTML = '';
        mermaid.mermaidAPI.render('mermaid-graph', mermaidCode, svgCode => {
            mermaidContainer.innerHTML = '<h3>Ø§Ù„Ø®Ø±ÙŠØ·Ø© Ø§Ù„Ø°Ù‡Ù†ÙŠØ© ðŸ§ </h3>' + svgCode;
        });
    } else {
        mermaidContainer.style.display = 'none';
    }
}

window.generateMindmap = async () => {
    const text = document.getElementById('ai-lesson-text').value.trim();
    if(!text) return alert('ÙŠØ±Ø¬Ù‰ Ù„ØµÙ‚ Ù†Øµ Ø§Ù„Ø¯Ø±Ø³ Ø£ÙˆÙ„Ø§Ù‹');
    
    const prompt = `Ø£Ù†Øª Ù…Ø³Ø§Ø¹Ø¯ Ù…Ø°Ø§ÙƒØ±Ø© Ø°ÙƒÙŠ Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø¹Ø±Ø¨. Ø§Ù‚Ø±Ø£ Ø§Ù„Ù†Øµ Ø§Ù„ØªØ§Ù„ÙŠ ÙˆÙ„Ø®ØµÙ‡ ÙÙŠ Ù†Ù‚Ø§Ø· ÙˆØ§Ø³ØªØ®Ø±Ø¬ Ø´ÙØ±Ø§Øª Ù„ØªØ³Ù‡ÙŠÙ„ Ø­ÙØ¸Ù‡. Ø«Ù… Ø§Ù†Ø´Ø¦ ÙƒÙˆØ¯ Ø®Ø±ÙŠØ·Ø© Ø°Ù‡Ù†ÙŠØ© Ø¨Ù€ Mermaid.js Ø¯Ø§Ø®Ù„ Ø¨Ù„ÙˆÙƒ \`\`\`mermaid \`\`\`. Ø§Ù„Ù†Øµ: \n${text}`;
    const res = await callGeminiAPI([{ text: prompt }]);
    if(res) processAIOutput(res);
}

// --- YouTube Transcript Fetch ---
function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
        const match = url.match(p);
        if (match) return match[1];
    }
    return null;
}

window.fetchYouTubeTranscript = async () => {
    const url = document.getElementById('ai-youtube-url').value.trim();
    if (!url) return alert('Ø£Ù„ØµÙ‚ Ø±Ø§Ø¨Ø· ÙÙŠØ¯ÙŠÙˆ ÙŠÙˆØªÙŠÙˆØ¨ Ø£ÙˆÙ„Ø§Ù‹!');

    const videoId = extractYouTubeId(url);
    if (!videoId) return alert('Ø§Ù„Ø±Ø§Ø¨Ø· ØºÙŠØ± ØµØ­ÙŠØ­! ØªØ£ÙƒØ¯ Ù…Ù† Ø£Ù†Ù‡ Ø±Ø§Ø¨Ø· ÙŠÙˆØªÙŠÙˆØ¨.');

    const status = document.getElementById('yt-fetch-status');
    status.style.display = 'block';
    status.style.background = 'var(--bg-color)';
    status.style.color = 'var(--text-muted)';
    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Ø¬Ø§Ø±ÙŠ Ø¬Ù„Ø¨ Ù†Øµ Ø§Ù„ÙÙŠØ¯ÙŠÙˆ...';

    const invidiousInstances = [
        'https://inv.nadeko.net',
        'https://invidious.fdn.fr',
        'https://vid.puffyan.us',
        'https://invidious.nerdvpn.de',
        'https://invidious.jing.rocks',
        'https://invidious.perennialte.ch',
        'https://yt.artemislena.eu'
    ];

    let transcript = '';
    let success = false;

    for (const instance of invidiousInstances) {
        try {
            const res = await fetch(`${instance}/api/v1/captions/${videoId}`, { signal: AbortSignal.timeout(8000) });
            const captions = await res.json();
            
            if (captions && captions.length > 0) {
                // Get Arabic or English or first available caption
                let captionUrl = captions.find(c => c.language_code === 'ar')?.url 
                              || captions.find(c => c.language_code === 'en')?.url 
                              || captions[0]?.url;

                if (captionUrl) {
                    if (!captionUrl.startsWith('http')) captionUrl = instance + captionUrl;
                    const subRes = await fetch(captionUrl + '&fmt=json3', { signal: AbortSignal.timeout(8000) });
                    const subData = await subRes.json();
                    
                    if (subData && subData.events) {
                        transcript = subData.events
                            .filter(e => e.segs)
                            .map(e => e.segs.map(s => s.utf8).join(''))
                            .join(' ')
                            .replace(/\n/g, ' ')
                            .trim();
                    }
                }
            }
            if (transcript) { success = true; break; }
        } catch (e) {
            console.log(`Instance ${instance} failed:`, e.message);
            continue;
        }
    }

    if (success && transcript) {
        document.getElementById('ai-youtube-text').value = transcript;
        status.style.background = 'rgba(0,200,0,0.1)';
        status.style.color = 'var(--success)';
        status.innerHTML = 'âœ… ØªÙ… Ø¬Ù„Ø¨ Ù†Øµ Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ø¨Ù†Ø¬Ø§Ø­! Ø§Ø¶ØºØ· "Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø§Ù„Ø²Ø¨Ø¯Ø© ÙˆØ§Ù„Ù…Ù„Ø®Øµ" Ø§Ù„Ø¢Ù†.';
    } else {
        status.style.background = 'rgba(255,0,0,0.1)';
        status.style.color = 'var(--danger)';
        status.innerHTML = 'âš ï¸ Ù„Ù… Ù†ØªÙ…ÙƒÙ† Ù…Ù† Ø¬Ù„Ø¨ Ø§Ù„Ù†Øµ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ (Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ù‚Ø¯ Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ ØªØ±Ø¬Ù…Ø©). ÙŠÙ…ÙƒÙ†Ùƒ Ù„ØµÙ‚ Ø§Ù„Ù†Øµ ÙŠØ¯ÙˆÙŠØ§Ù‹ ÙÙŠ Ø§Ù„Ù…Ø±Ø¨Ø¹ Ø£Ø¯Ù†Ø§Ù‡.';
    }
}

window.summarizeYouTube = async () => {
    const text = document.getElementById('ai-youtube-text').value.trim();
    if(!text) return alert('ÙŠØ±Ø¬Ù‰ Ù„ØµÙ‚ Ù†Øµ ÙÙŠØ¯ÙŠÙˆ Ø§Ù„ÙŠÙˆØªÙŠÙˆØ¨ Ø£ÙˆÙ„Ø§Ù‹');
    
    const prompt = `Ø£Ù†Øª Ù…Ø³Ø§Ø¹Ø¯ Ù…Ø°Ø§ÙƒØ±Ø©. Ù‡Ø°Ø§ Ù†Øµ (Transcript) Ù„ÙÙŠØ¯ÙŠÙˆ ØªØ¹Ù„ÙŠÙ…ÙŠ. Ù‚Ù… Ø¨ØªÙ„Ø®ÙŠØµÙ‡ØŒ Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø§Ù„Ø²Ø¨Ø¯Ø© ÙˆØ£Ù‡Ù… Ø§Ù„Ù†Ù‚Ø§Ø· Ù„Ù„Ø­ÙØ¸ØŒ ÙˆØ±ØªØ¨Ù‡Ø§ Ø¨Ø´ÙƒÙ„ Ø¬Ù…ÙŠÙ„ Ø¨Ù€ Markdown. Ø§Ù„Ù†Øµ: \n${text}`;
    const res = await callGeminiAPI([{ text: prompt }]);
    if(res) processAIOutput(res);
}

window.summarizeImage = async () => {
    const fileInput = document.getElementById('ai-image-upload');
    if(fileInput.files.length === 0) return alert('ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± ØµÙˆØ±Ø© (Ø³ÙƒØ±ÙŠÙ† Ø´ÙˆØª) Ø£ÙˆÙ„Ø§Ù‹!');
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1];
        const mimeType = file.type;
        const promptText = `Ø£Ù†Øª Ù…Ø³Ø§Ø¹Ø¯ Ù…Ø°Ø§ÙƒØ±Ø© Ù„Ù„Ø·Ù„Ø§Ø¨. Ù‡Ø°Ù‡ ØµÙˆØ±Ø© (Ø³ÙƒØ±ÙŠÙ† Ø´ÙˆØª) Ù…Ù† Ù…Ù†ØµØ© ØªØ¹Ù„ÙŠÙ…ÙŠØ© (Ù‚Ø¯ ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø³Ø¨ÙˆØ±Ø©ØŒ Ø¹Ø±Ø¶ ØªÙ‚Ø¯ÙŠÙ…ÙŠØŒ Ø£Ùˆ Ø´Ø±Ø­).
Ù‚Ù… Ø¨Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù†Øµ Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ø§Ù„ØµÙˆØ±Ø© ÙˆØ§Ø´Ø±Ø­ Ø§Ù„Ø¯Ø±Ø³ Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠÙ‡Ø§ Ø¨ÙˆØ¶ÙˆØ­ ÙˆÙ„Ø®Øµ Ø£Ù‡Ù… Ø§Ù„Ù†Ù‚Ø§Ø·ØŒ ÙˆØ§Ù‚ØªØ±Ø­ 'Ø´ÙØ±Ø©' Ù„Ø­ÙØ¸Ù‡Ø§ Ø¨Ø³Ù‡ÙˆÙ„Ø©.`;
        const parts = [{ text: promptText }, { inlineData: { mimeType: mimeType, data: base64Data } }];
        const res = await callGeminiAPI(parts);
        if(res) processAIOutput(res);
    };
    reader.readAsDataURL(file);
}

let recognition; let isDictating = false;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'ar-EG'; recognition.maxAlternatives = 1;
    recognition.onresult = function(e) {
        let finalTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
        }
        if(finalTranscript) document.getElementById('dictation-text').value += finalTranscript;
    };
    recognition.onerror = function(e) { 
        if(e.error === 'not-allowed') { alert('Ø§Ø³Ù…Ø­ Ù„Ù„Ù…ÙŠÙƒØ±ÙˆÙÙˆÙ†!'); isDictating = false; }
        console.log('Speech error:', e.error);
    };
    // Auto-restart when recognition stops unexpectedly
    recognition.onend = function() {
        if (isDictating) {
            try { recognition.start(); } catch(e) {}
        }
    };
}

window.toggleDictation = () => {
    if (!recognition) return alert('Ù…ØªØµÙØ­Ùƒ Ù„Ø§ ÙŠØ¯Ø¹Ù… Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø§ØµÙŠØ©. Ø§Ø³ØªØ®Ø¯Ù… Ø¬ÙˆØ¬Ù„ ÙƒØ±ÙˆÙ….');
    const btn = document.getElementById('btn-dictation');
    if (isDictating) {
        recognition.stop(); isDictating = false;
        btn.innerHTML = '<i class="fa-solid fa-microphone"></i> Ø§Ø¨Ø¯Ø£ Ø§Ù„Ø§Ø³ØªÙ…Ø§Ø¹ ÙˆØ§Ù„ØªØ³Ø¬ÙŠÙ„'; btn.style.backgroundColor = 'var(--danger)';
    } else {
        recognition.start(); isDictating = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ø§Ø³ØªÙ…Ø§Ø¹'; btn.style.backgroundColor = 'var(--text-muted)';
    }
}

window.summarizeDictation = async () => {
    const text = document.getElementById('dictation-text').value.trim();
    if(!text) return alert('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù†Øµ. Ù‚Ù… Ø¨Ø§Ù„ØªØ´ØºÙŠÙ„ Ø£ÙˆÙ„Ø§Ù‹.');
    const prompt = `Ù‡Ø°Ø§ ØªÙØ±ÙŠØº ØµÙˆØªÙŠ Ù„Ø´Ø±Ø­ Ù…Ø¯Ø±Ø³. ØµØ­Ø­ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ ÙˆÙ„Ø®ØµÙ‡ Ø¨Ù€ "Ø§Ù„Ø²Ø¨Ø¯Ø©" Ù…Ø±ØªØ¨Ø© ÙÙŠ Ù†Ù‚Ø§Ø·.\n${text}`;
    const res = await callGeminiAPI([{ text: prompt }]);
    if(res) processAIOutput(res);
}

// --- PDF Summarization ---
window.summarizePDF = async () => {
    const fileInput = document.getElementById('ai-pdf-upload');
    if(fileInput.files.length === 0) return alert('ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ù…Ù„Ù PDF Ø£ÙˆÙ„Ø§Ù‹!');

    const file = fileInput.files[0];
    if(file.type !== 'application/pdf') return alert('ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ù…Ù„Ù Ø¨ØµÙŠØºØ© PDF ÙÙ‚Ø·!');

    try {
        document.getElementById('ai-loading').style.display = 'block';
        document.getElementById('ai-output-container').style.display = 'none';

        const arrayBuffer = await file.arrayBuffer();
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const totalPages = pdf.numPages;

        document.getElementById('pdf-page-info').style.display = 'block';
        document.getElementById('pdf-page-count').textContent = `ðŸ“„ ØªÙ… ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù„Ù: ${totalPages} ØµÙØ­Ø©`;

        let fullText = '';
        const maxPages = Math.min(totalPages, 30); // Limit to 30 pages for API
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += `\n--- ØµÙØ­Ø© ${i} ---\n${pageText}`;
        }

        if(!fullText.trim()) {
            alert('Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù ÙŠØ¨Ø¯Ùˆ Ø£Ù†Ù‡ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ ØµÙˆØ± ÙÙ‚Ø· (Scanned PDF) ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù†Øµ Ù…Ù†Ù‡. Ø¬Ø±Ø¨ Ø§Ù„ØªÙ‚Ø§Ø· ØµÙˆØ±Ø© (Screenshot) ÙˆØ§Ø³ØªØ®Ø¯Ù… ØªÙ„Ø®ÙŠØµ Ø§Ù„ØµÙˆØ± Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† Ø°Ù„Ùƒ.');
            document.getElementById('ai-loading').style.display = 'none';
            return;
        }

        // Truncate if text is too long for the API
        if(fullText.length > 25000) fullText = fullText.substring(0, 25000) + '\n...(ØªÙ… Ø§Ù‚ØªØ·Ø§Ø¹ Ø§Ù„Ø¨Ø§Ù‚ÙŠ Ù„ØªØ¬Ù†Ø¨ ØªØ¬Ø§ÙˆØ² Ø§Ù„Ø­Ø¯)';

        const prompt = `Ø£Ù†Øª Ù…Ø³Ø§Ø¹Ø¯ Ù…Ø°Ø§ÙƒØ±Ø© Ø°ÙƒÙŠ ÙˆÙ…ØªØ®ØµØµ Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø¹Ø±Ø¨. ØªÙ… Ø¥Ø¹Ø·Ø§Ø¤Ùƒ Ù†Øµ Ù…Ø³ØªØ®Ø±Ø¬ Ù…Ù† Ù…Ù„Ù PDF Ø¯Ø±Ø§Ø³ÙŠ.
Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ Ù…Ù†Ùƒ:
1. **Ù…Ù„Ø®Øµ Ø´Ø§Ù…Ù„ ÙˆÙ…Ù†Ø¸Ù…** Ù„Ù„Ù…Ø­ØªÙˆÙ‰ ÙÙŠ Ù†Ù‚Ø§Ø· ÙˆØ§Ø¶Ø­Ø© Ù…Ø¹ Ø¹Ù†Ø§ÙˆÙŠÙ† ÙØ±Ø¹ÙŠØ©
2. **Ø´ÙØ±Ø§Øª ÙˆØ£Ø³Ø§Ù„ÙŠØ¨ Ù„Ù„ØªØ°ÙƒØ±** (Mnemonics) Ù„Ø£Ù‡Ù… Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª ÙˆØ§Ù„Ù…ØµØ·Ù„Ø­Ø§Øª
3. **Ø®Ø±ÙŠØ·Ø© Ø°Ù‡Ù†ÙŠØ©** Ø¨ØµÙŠØºØ© Mermaid.js Ø¯Ø§Ø®Ù„ Ø¨Ù„ÙˆÙƒ \`\`\`mermaid \`\`\` ØªÙˆØ¶Ø­ Ø§Ù„Ø¹Ù„Ø§Ù‚Ø§Øª Ø¨ÙŠÙ† Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©
4. **Ø£Ø³Ø¦Ù„Ø© Ù…Ø±Ø§Ø¬Ø¹Ø© Ø³Ø±ÙŠØ¹Ø©** (3-5 Ø£Ø³Ø¦Ù„Ø©) Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„ÙÙ‡Ù…

Ø§Ù„Ù†Øµ Ø§Ù„Ù…Ø³ØªØ®Ø±Ø¬ Ù…Ù† Ø§Ù„Ù…Ù„Ù:
${fullText}`;

        const res = await callGeminiAPI([{ text: prompt }]);
        if(res) processAIOutput(res);
    } catch(e) {
        alert('Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ù„Ù: ' + e.message);
        document.getElementById('ai-loading').style.display = 'none';
    }
}

// --- Study Motivation Notifications ---
const motivationMessages = [
    "â° Ù‡Ù„ Ø¨Ø¯Ø£Øª Ù…Ø°Ø§ÙƒØ±ØªÙƒ Ø§Ù„ÙŠÙˆÙ…ØŸ ÙƒÙ„ Ø¯Ù‚ÙŠÙ‚Ø© Ø¨ØªÙØ±Ù‚!",
    "ðŸ“š Ù…Ø±Ø§Ø¬Ø¹Ø© Ø³Ø±ÙŠØ¹Ø© Ø£Ø­Ø³Ù† Ù…Ù† Ù…Ø±Ø§Ø¬Ø¹Ø© Ù…ØªØ£Ø®Ø±Ø©!",
    "ðŸ’ª Ø°Ø§ÙƒØ±Øª Ø´ÙˆÙŠØ© Ø§Ù„Ù†Ù‡Ø§Ø±Ø¯Ø©ØŸ Ø­ØªÙ‰ Ù„Ùˆ 10 Ø¯Ù‚Ø§ÙŠÙ‚ØŒ Ø§Ø¨Ø¯Ø£ Ø¯Ù„ÙˆÙ‚ØªÙŠ!",
    "ðŸŽ¯ ÙØ§ÙƒØ± Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ù„ÙŠ Ø¹Ù„ÙŠÙƒØŸ Ø§Ø¯Ø®Ù„ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ ÙˆØ®Ù„ØµÙ‡Ø§!",
    "ðŸ§  Ø¹Ù‚Ù„Ùƒ Ù…Ø­ØªØ§Ø¬ ØªÙ…Ø±ÙŠÙ†! Ø§ÙØªØ­ Ø¨Ø·Ø§Ù‚Ø§Øª Ø§Ù„Ø­ÙØ¸ ÙˆØ±Ø§Ø¬Ø¹ Ø´ÙˆÙŠØ©.",
    "ðŸŒŸ Ø§Ù„Ù†Ø¬Ø§Ø­ Ù…Ø´ Ø¨Ø§Ù„Ø­Ø¸ØŒ Ø§Ù„Ù†Ø¬Ø§Ø­ Ø¨Ø§Ù„Ø§Ø³ØªÙ…Ø±Ø§Ø±ÙŠØ©. Ø°Ø§ÙƒØ± Ø­ØªÙ‰ Ù„Ùˆ Ø´ÙˆÙŠØ©!",
    "ðŸ“– Ø£Ù‚Ø±Ø¨ Ø§Ù…ØªØ­Ø§Ù† Ø¨ÙŠÙ‚Ø±Ø¨.. Ù…ØªØ¶ÙŠØ¹Ø´ ÙˆÙ‚Øª!",
    "ðŸ”¥ Ø­Ø§ÙˆÙ„ ØªØ®Ù„Øµ Ù…Ù‡Ù…Ø© ÙˆØ§Ø­Ø¯Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ Ø§Ù„Ù†Ù‡Ø§Ø±Ø¯Ø©!"
];

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendStudyNotification() {
    const msg = motivationMessages[Math.floor(Math.random() * motivationMessages.length)];
    
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ù…ØªÙƒØ§Ù…Ù„ ðŸ“š', {
            body: msg,
            icon: 'https://cdn-icons-png.flaticon.com/512/3429/3429930.png'
        });
    }
}

// Request notification permission after user interacts
document.addEventListener('click', function requestOnce() {
    requestNotificationPermission();
    document.removeEventListener('click', requestOnce);
}, { once: true });

// Send motivation notification every 45 minutes
setInterval(sendStudyNotification, 45 * 60 * 1000);

// --- Backlog Tracker ("Ù„Ù…Ù‘ Ø§Ù„Ù…ØªØ±Ø§ÙƒÙ…") ---
let backlogs = JSON.parse(localStorage.getItem('study_backlogs')) || [];

document.getElementById('backlog-form').onsubmit = e => {
    e.preventDefault();
    const subj = document.getElementById('backlog-subject').value.trim();
    const lectures = parseInt(document.getElementById('backlog-lectures').value);
    const duration = parseInt(document.getElementById('backlog-duration').value);
    const deadline = document.getElementById('backlog-deadline').value;
    
    backlogs.push({
        id: Date.now().toString(),
        subject: subj,
        totalLectures: lectures,
        completedLectures: 0,
        lectureDuration: duration,
        deadline: deadline || null,
        startedAt: new Date().toISOString(),
        studyMinutes: 0
    });
    
    localStorage.setItem('study_backlogs', JSON.stringify(backlogs));
    renderBacklogs();
    closeModal('backlog-modal');
    e.target.reset();
};

function renderBacklogs() {
    const list = document.getElementById('backlog-list');
    const empty = document.getElementById('backlog-empty');
    list.innerHTML = '';
    
    if (backlogs.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    
    backlogs.forEach(b => {
        const progress = Math.round((b.completedLectures / b.totalLectures) * 100);
        const remaining = b.totalLectures - b.completedLectures;
        const startDate = new Date(b.startedAt).toLocaleDateString('ar-EG');
        const deadlineText = b.deadline ? `<br><i class="fa-solid fa-flag"></i> Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ: ${b.deadline}` : '';
        const isDone = b.completedLectures >= b.totalLectures;
        
        list.innerHTML += `
            <div class="card" style="border-top:4px solid ${isDone ? 'var(--success)' : 'var(--primary-color)'};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0;">${isDone ? 'âœ…' : 'ðŸ“¦'} ${b.subject}</h3>
                    <button onclick="deleteBacklog('${b.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.1rem;"><i class="fa-solid fa-trash"></i></button>
                </div>
                
                <div style="background:var(--bg-color); border-radius:8px; padding:10px; margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>${isDone ? 'ØªÙ… Ø§Ù„Ù„Ù…Ù‘! ðŸŽ‰' : `Ø¨Ø§Ù‚ÙŠ ${remaining} Ù…Ø­Ø§Ø¶Ø±Ø©`}</span>
                        <strong style="color:var(--primary-color);">${progress}%</strong>
                    </div>
                    <div style="height:10px; background:var(--border-color); border-radius:10px; overflow:hidden;">
                        <div style="height:100%; width:${progress}%; background:${isDone ? 'var(--success)' : 'var(--primary-color)'}; border-radius:10px; transition:width 0.3s;"></div>
                    </div>
                </div>
                
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px;">
                    <i class="fa-regular fa-clock"></i> Ø¨Ø¯Ø£Øª: ${startDate} | â±ï¸ ÙˆÙ‚Øª Ø§Ù„Ù…Ø°Ø§ÙƒØ±Ø©: ${Math.round(b.studyMinutes)} Ø¯Ù‚ÙŠÙ‚Ø©
                    ${deadlineText}
                </div>
                
                ${!isDone ? `
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-primary" onclick="completeBacklogLecture('${b.id}')" style="flex:1;"><i class="fa-solid fa-check"></i> Ø®Ù„ØµØª Ù…Ø­Ø§Ø¶Ø±Ø©!</button>
                    <button class="btn" onclick="generateBacklogPlan('${b.id}')" style="flex:1; background:var(--bg-color); border:1px solid var(--border-color); color:var(--text-main);"><i class="fa-solid fa-wand-magic-sparkles"></i> Ø®Ø·Ø© Ù„Ù…Ù‘</button>
                </div>` : '<p style="text-align:center; color:var(--success); font-weight:bold;">Ù…Ø¨Ø±ÙˆÙƒ! Ù„Ù…ÙŠØª ÙƒÙ„ Ø§Ù„Ù…ØªØ±Ø§ÙƒÙ… ðŸŽŠ</p>'}
            </div>
        `;
    });
}

window.completeBacklogLecture = (id) => {
    const b = backlogs.find(x => x.id === id);
    if (b && b.completedLectures < b.totalLectures) {
        b.completedLectures++;
        b.studyMinutes += b.lectureDuration;
        localStorage.setItem('study_backlogs', JSON.stringify(backlogs));
        renderBacklogs();
        
        if (b.completedLectures >= b.totalLectures) {
            alert(`ðŸŽ‰ Ù…Ø¨Ø±ÙˆÙƒ! Ù„Ù…ÙŠØª ÙƒÙ„ Ø§Ù„Ù…ØªØ±Ø§ÙƒÙ… ÙÙŠ Ù…Ø§Ø¯Ø© "${b.subject}"! ÙØ®ÙˆØ±ÙŠÙ† Ø¨ÙŠÙƒ!`);
        }
    }
};

window.deleteBacklog = (id) => {
    if (confirm('Ø­Ø°Ù Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø§Ø¯Ø© Ù…Ù† Ø§Ù„Ù…ØªØ±Ø§ÙƒÙ…ØŸ')) {
        backlogs = backlogs.filter(x => x.id !== id);
        localStorage.setItem('study_backlogs', JSON.stringify(backlogs));
        renderBacklogs();
    }
};

window.generateBacklogPlan = async (id) => {
    const b = backlogs.find(x => x.id === id);
    if (!b) return;
    
    const remaining = b.totalLectures - b.completedLectures;
    const deadlineInfo = b.deadline ? `Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ: ${b.deadline}` : 'Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¹Ø¯ Ù†Ù‡Ø§Ø¦ÙŠ Ù…Ø­Ø¯Ø¯';
    
    const prompt = `Ø£Ù†Øª Ù…Ø®Ø·Ø· Ø¯Ø±Ø§Ø³ÙŠ Ø°ÙƒÙŠ. Ø·Ø§Ù„Ø¨ Ø¹Ù†Ø¯Ù‡ Ù…Ø§Ø¯Ø© "${b.subject}" Ù…ØªØ±Ø§ÙƒÙ… Ø¹Ù„ÙŠÙ‡ ${remaining} Ù…Ø­Ø§Ø¶Ø±Ø©ØŒ ÙƒÙ„ Ù…Ø­Ø§Ø¶Ø±Ø© Ø­ÙˆØ§Ù„ÙŠ ${b.lectureDuration} Ø¯Ù‚ÙŠÙ‚Ø©. ${deadlineInfo}.
    
Ø§Ø¹Ù…Ù„Ù‡ Ø®Ø·Ø© ÙŠÙˆÙ…ÙŠØ© Ù…ÙØµÙ„Ø© ÙˆÙ…Ù†Ø¸Ù…Ø© Ù„Ù„Ù…Ù‘ Ø§Ù„Ù…ØªØ±Ø§ÙƒÙ… Ø¯Ù‡ Ø¨Ø´ÙƒÙ„ ÙˆØ§Ù‚Ø¹ÙŠ (Ù…Ø´ Ù…Ø±Ù‡Ù‚)ØŒ Ù…Ø¹ Ù†ØµØ§Ø¦Ø­ Ù„Ù„ØªØ±ÙƒÙŠØ² ÙˆÙƒÙŠÙ ÙŠÙ‚Ø³Ù… ÙˆÙ‚ØªÙ‡. Ø§ÙƒØªØ¨ Ø§Ù„Ø®Ø·Ø© Ø¨Ø§Ù„Ø¹Ø§Ù…ÙŠØ© Ø§Ù„Ù…ØµØ±ÙŠØ© Ø¨Ø´ÙƒÙ„ Ù…Ø­ÙØ² ÙˆÙˆØ¯ÙˆØ¯.`;
    
    const res = await callGeminiAPI([{ text: prompt }]);
    if (res) {
        // Navigate to AI page to show output
        document.querySelectorAll('.nav-links li').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
        document.querySelector('[data-page="ai-assistant"]').classList.add('active');
        document.getElementById('ai-assistant').classList.add('active-page');
        processAIOutput(res);
    }
};

renderBacklogs();

// --- Interactive Quiz Generator ---
let quizData = [];
let quizAnswers = {};

window.generateQuiz = async () => {
    let text = document.getElementById('quiz-text-input').value.trim();
    const pdfInput = document.getElementById('quiz-pdf-upload');
    
    // If PDF uploaded, extract text
    if (pdfInput.files.length > 0 && !text) {
        try {
            const file = pdfInput.files[0];
            const arrayBuffer = await file.arrayBuffer();
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + ' ';
            }
        } catch (e) {
            return alert('Ø®Ø·Ø£ ÙÙŠ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù€ PDF: ' + e.message);
        }
    }
    
    if (!text) return alert('Ø£Ù„ØµÙ‚ Ù†Øµ Ø§Ù„Ø¯Ø±Ø³ Ø£Ùˆ Ø§Ø±ÙØ¹ Ù…Ù„Ù PDF Ø£ÙˆÙ„Ø§Ù‹!');
    if (text.length > 20000) text = text.substring(0, 20000);
    
    const quizType = document.getElementById('quiz-type').value;
    const quizCount = document.getElementById('quiz-count').value;
    
    const typeMap = {
        'mcq': 'Ø§Ø®ØªÙŠØ§Ø± Ù…Ù† Ù…ØªØ¹Ø¯Ø¯ (4 Ø®ÙŠØ§Ø±Ø§Øª Ù„ÙƒÙ„ Ø³Ø¤Ø§Ù„)',
        'truefalse': 'ØµØ­ ÙˆØºÙ„Ø·',
        'fill': 'Ø£ÙƒÙ…Ù„ Ø§Ù„ÙØ±Ø§ØºØ§Øª',
        'mixed': 'Ø®Ù„ÙŠØ· Ù…Ù† Ø§Ø®ØªÙŠØ§Ø± Ù…Ù† Ù…ØªØ¹Ø¯Ø¯ ÙˆØµØ­ ÙˆØºÙ„Ø· ÙˆØ£ÙƒÙ…Ù„ Ø§Ù„ÙØ±Ø§ØºØ§Øª'
    };
    
    document.getElementById('quiz-loading').style.display = 'block';
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('quiz-result').style.display = 'none';
    
    const prompt = `Ø£Ù†Øª Ù…ÙØ¹Ù„Ù… Ø°ÙƒÙŠ. Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ù†Øµ Ø§Ù„ØªØ§Ù„ÙŠØŒ Ø£Ù†Ø´Ø¦ ${quizCount} Ø³Ø¤Ø§Ù„ Ù…Ù† Ù†ÙˆØ¹: ${typeMap[quizType]}.

Ø£Ø¬Ø¨ Ø¨ØµÙŠØºØ© JSON ÙÙ‚Ø· Ø¨Ø¯ÙˆÙ† Ø£ÙŠ Ù†Øµ Ø¥Ø¶Ø§ÙÙŠ. Ø§Ù„ØµÙŠØºØ©:
[
  {
    "type": "mcq",
    "question": "Ù†Øµ Ø§Ù„Ø³Ø¤Ø§Ù„",
    "options": ["Ø®ÙŠØ§Ø± Ø£", "Ø®ÙŠØ§Ø± Ø¨", "Ø®ÙŠØ§Ø± Ø¬", "Ø®ÙŠØ§Ø± Ø¯"],
    "correct": 0
  },
  {
    "type": "truefalse",
    "question": "Ù†Øµ Ø§Ù„Ø³Ø¤Ø§Ù„",
    "correct": true
  },
  {
    "type": "fill",
    "question": "Ø§Ù„Ø¬Ù…Ù„Ø© Ù…Ø¹ _____ Ù„Ù„ÙØ±Ø§Øº",
    "correct": "Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø§Ù„ØµØ­ÙŠØ­Ø©"
  }
]

Ø§Ù„Ù†Øµ:
${text}`;
    
    try {
        const res = await callGeminiAPI([{ text: prompt }]);
        document.getElementById('quiz-loading').style.display = 'none';
        
        if (!res) return;
        
        // Extract JSON from response
        let jsonStr = res;
        const jsonMatch = res.match(/\[[\s\S]*\]/);
        if (jsonMatch) jsonStr = jsonMatch[0];
        
        quizData = JSON.parse(jsonStr);
        quizAnswers = {};
        renderQuiz();
    } catch (e) {
        document.getElementById('quiz-loading').style.display = 'none';
        alert('Ø­ØµÙ„ Ø®Ø·Ø£ ÙÙŠ ØªØ¬Ù‡ÙŠØ² Ø§Ù„Ø£Ø³Ø¦Ù„Ø©. Ø¬Ø±Ø¨ Ù…Ø±Ø© ØªØ§Ù†ÙŠØ©!');
        console.error(e);
    }
};

function renderQuiz() {
    const container = document.getElementById('quiz-container');
    container.style.display = 'block';
    container.innerHTML = '';
    
    quizData.forEach((q, i) => {
        let qHtml = `<div class="card" style="margin-bottom:15px; border-right:4px solid var(--primary-color);">
            <h4 style="margin-bottom:12px;"><span style="background:var(--primary-color); color:white; padding:3px 10px; border-radius:20px; margin-left:8px;">${i + 1}</span> ${q.question}</h4>`;
        
        if (q.type === 'mcq' && q.options) {
            q.options.forEach((opt, j) => {
                qHtml += `<label style="display:block; padding:10px; margin:5px 0; background:var(--bg-color); border-radius:8px; cursor:pointer; border:2px solid transparent;" 
                    id="q${i}_opt${j}"
                    onclick="selectQuizAnswer(${i}, ${j}, 'mcq')">
                    <input type="radio" name="q${i}" value="${j}" style="margin-left:8px;"> ${opt}
                </label>`;
            });
        } else if (q.type === 'truefalse') {
            qHtml += `
                <label style="display:inline-block; padding:10px 25px; margin:5px; background:var(--bg-color); border-radius:8px; cursor:pointer; border:2px solid transparent;"
                    id="q${i}_opttrue" onclick="selectQuizAnswer(${i}, true, 'truefalse')">
                    <input type="radio" name="q${i}" value="true" style="margin-left:5px;"> âœ… ØµØ­
                </label>
                <label style="display:inline-block; padding:10px 25px; margin:5px; background:var(--bg-color); border-radius:8px; cursor:pointer; border:2px solid transparent;"
                    id="q${i}_optfalse" onclick="selectQuizAnswer(${i}, false, 'truefalse')">
                    <input type="radio" name="q${i}" value="false" style="margin-left:5px;"> âŒ ØºÙ„Ø·
                </label>`;
        } else if (q.type === 'fill') {
            qHtml += `<input type="text" id="q${i}_fill" class="search-input" placeholder="Ø§ÙƒØªØ¨ Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø©..." style="width:100%; margin-top:10px;" oninput="quizAnswers[${i}] = this.value">`;
        }
        
        qHtml += `</div>`;
        container.innerHTML += qHtml;
    });
    
    container.innerHTML += `<button class="btn btn-primary btn-large" onclick="submitQuiz()" style="width:100%; font-size:1.2rem; margin-top:10px;">
        <i class="fa-solid fa-paper-plane"></i> ØªØ³Ù„ÙŠÙ… Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø§Øª
    </button>`;
}

window.selectQuizAnswer = (qIndex, value, type) => {
    quizAnswers[qIndex] = value;
    // Visual highlight
    const q = quizData[qIndex];
    if (type === 'mcq' && q.options) {
        q.options.forEach((_, j) => {
            document.getElementById(`q${qIndex}_opt${j}`).style.borderColor = (j === value) ? 'var(--primary-color)' : 'transparent';
        });
    } else if (type === 'truefalse') {
        document.getElementById(`q${qIndex}_opttrue`).style.borderColor = (value === true) ? 'var(--primary-color)' : 'transparent';
        document.getElementById(`q${qIndex}_optfalse`).style.borderColor = (value === false) ? 'var(--primary-color)' : 'transparent';
    }
};

window.submitQuiz = () => {
    let correct = 0;
    
    quizData.forEach((q, i) => {
        const userAns = quizAnswers[i];
        let isCorrect = false;
        
        if (q.type === 'mcq') {
            isCorrect = (userAns === q.correct);
        } else if (q.type === 'truefalse') {
            isCorrect = (userAns === q.correct);
        } else if (q.type === 'fill') {
            isCorrect = userAns && q.correct && userAns.trim().toLowerCase() === q.correct.trim().toLowerCase();
        }
        
        if (isCorrect) correct++;
    });
    
    const total = quizData.length;
    const pct = Math.round((correct / total) * 100);
    const emoji = pct >= 80 ? 'ðŸ†' : (pct >= 60 ? 'ðŸ‘' : (pct >= 40 ? 'ðŸ’ª' : 'ðŸ“š'));
    const feedback = pct >= 80 ? 'Ù…Ù…ØªØ§Ø²! Ø£Ù†Øª ÙØ§Ù‡Ù… Ø§Ù„Ù…Ø§Ø¯Ø© ÙƒÙˆÙŠØ³ Ø¬Ø¯Ø§Ù‹!' :
                     pct >= 60 ? 'ÙƒÙˆÙŠØ³! Ø¨Ø³ ØªØ­ØªØ§Ø¬ ØªØ±Ø§Ø¬Ø¹ Ø´ÙˆÙŠØ© ÙƒÙ…Ø§Ù†.' :
                     pct >= 40 ? 'Ù…Ø­ØªØ§Ø¬ ØªØ°Ø§ÙƒØ± Ø£ÙƒØªØ± Ø´ÙˆÙŠØ©. Ø­Ø§ÙˆÙ„ ØªØ§Ù†ÙŠ!' :
                     'Ù„Ø§Ø²Ù… ØªØ±Ø§Ø¬Ø¹ Ø§Ù„Ø¯Ø±Ø³ ÙƒÙˆÙŠØ³ ÙˆØªØ­Ø§ÙˆÙ„ ØªØ§Ù†ÙŠ!';
    
    document.getElementById('quiz-score').textContent = `${emoji} ${correct} Ù…Ù† ${total} (${pct}%)`;
    document.getElementById('quiz-feedback').textContent = feedback;
    document.getElementById('quiz-result').style.display = 'block';
    document.getElementById('quiz-container').style.display = 'none';
};


// --- Focus Sounds Logic ---
let currentSound = null;
window.toggleSound = (soundId) => {
    // Stop all sounds first
    stopAllSounds();
    
    const audio = document.getElementById(`audio-${soundId}`);
    if(currentSound === soundId) {
        currentSound = null; // Just toggle off
    } else {
        if(audio) {
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play error:', e));
            currentSound = soundId;
            document.getElementById(`btn-sound-${soundId}`).style.borderColor = 'var(--primary-color)';
            document.getElementById(`btn-sound-${soundId}`).style.color = 'var(--primary-color)';
        }
    }
};

window.stopAllSounds = () => {
    ['rain', 'cafe', 'lofi'].forEach(id => {
        const a = document.getElementById(`audio-${id}`);
        if(a) { a.pause(); a.currentTime = 0; }
        const btn = document.getElementById(`btn-sound-${id}`);
        if(btn) {
            btn.style.borderColor = 'var(--border-color)';
            btn.style.color = 'var(--text-main)';
        }
    });
    currentSound = null;
};


// --- Statistics Tracker ---
let studyStats = JSON.parse(localStorage.getItem('study_stats')) || {
    streak: 0,
    lastLogin: null,
    totalMinutes: 0,
    completedTasks: 0
};

function updateStatsDisplay() {
    const hours = (studyStats.totalMinutes / 60).toFixed(1);
    document.getElementById('stat-streak').innerText = studyStats.streak;
    document.getElementById('stat-hours').innerText = hours;
    document.getElementById('stat-tasks').innerText = studyStats.completedTasks;
    
    // Level Logic
    let level = 'Ù…Ø¨ØªØ¯Ø¦ Ø·Ù…ÙˆØ­ ðŸŒ±';
    const score = (studyStats.totalMinutes / 60) * 10 + studyStats.completedTasks * 5;
    if(score > 500) level = 'Ø£Ø³Ø·ÙˆØ±Ø© Ø§Ù„Ù…Ø°Ø§ÙƒØ±Ø© ðŸ‘‘';
    else if(score > 300) level = 'Ø¹Ø¨Ù‚Ø±ÙŠ Ø§Ù„Ø¬Ø§Ù…Ø¹Ø© ðŸŽ“';
    else if(score > 150) level = 'Ø·Ø§Ù„Ø¨ Ù…Ø¬ØªÙ‡Ø¯ ðŸ”¥';
    else if(score > 50) level = 'Ø¨Ø·Ù„ Ø§Ù„ØªØ±ÙƒÙŠØ² â³';
    
    document.getElementById('stat-level').innerText = level;
}

window.addStudyTime = (mins) => {
    studyStats.totalMinutes += mins;
    localStorage.setItem('study_stats', JSON.stringify(studyStats));
    updateStatsDisplay();
};

window.addCompletedTask = () => {
    studyStats.completedTasks += 1;
    localStorage.setItem('study_stats', JSON.stringify(studyStats));
    updateStatsDisplay();
};

function checkDailyStreak() {
    const todayStr = new Date().toISOString().split('T')[0];
    if (studyStats.lastLogin !== todayStr) {
        if (studyStats.lastLogin) {
            const lastDate = new Date(studyStats.lastLogin);
            const today = new Date(todayStr);
            const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                studyStats.streak += 1; // Consecutive day
            } else if (diffDays > 1) {
                studyStats.streak = 1; // Broken streak, reset
            }
        } else {
            studyStats.streak = 1; // First time
        }
        studyStats.lastLogin = todayStr;
        localStorage.setItem('study_stats', JSON.stringify(studyStats));
    }
}
checkDailyStreak();
setTimeout(updateStatsDisplay, 500);


// --- GPA Calculator Logic ---
let gpaCourses = JSON.parse(localStorage.getItem('study_gpa_courses')) || [];

function saveGPACourses() {
    localStorage.setItem('study_gpa_courses', JSON.stringify(gpaCourses));
    renderGPACourses();
}

window.addGPACourse = () => {
    gpaCourses.push({
        id: Date.now().toString(),
        name: `Ù…Ø§Ø¯Ø© ${gpaCourses.length + 1}`,
        credits: 3,
        grade: 'A'
    });
    saveGPACourses();
};

window.updateGPACourse = (id, field, value) => {
    const c = gpaCourses.find(x => x.id === id);
    if(c) {
        c[field] = field === 'credits' ? parseFloat(value) : value;
        saveGPACourses();
    }
};

window.deleteGPACourse = (id) => {
    gpaCourses = gpaCourses.filter(x => x.id !== id);
    saveGPACourses();
};

function renderGPACourses() {
    const list = document.getElementById('gpa-courses-list');
    list.innerHTML = '';
    
    gpaCourses.forEach(c => {
        list.innerHTML += `
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; margin-bottom: 10px; align-items: center;">
                <input type="text" class="search-input" value="${c.name}" onchange="updateGPACourse('${c.id}', 'name', this.value)">
                <input type="number" class="search-input" value="${c.credits}" min="1" max="10" onchange="updateGPACourse('${c.id}', 'credits', this.value)">
                <select class="search-input" onchange="updateGPACourse('${c.id}', 'grade', this.value)">
                    <option value="A+" ${c.grade==='A+'?'selected':''}>A+</option>
                    <option value="A" ${c.grade==='A'?'selected':''}>A</option>
                    <option value="B+" ${c.grade==='B+'?'selected':''}>B+</option>
                    <option value="B" ${c.grade==='B'?'selected':''}>B</option>
                    <option value="C+" ${c.grade==='C+'?'selected':''}>C+</option>
                    <option value="C" ${c.grade==='C'?'selected':''}>C</option>
                    <option value="D+" ${c.grade==='D+'?'selected':''}>D+</option>
                    <option value="D" ${c.grade==='D'?'selected':''}>D</option>
                    <option value="F" ${c.grade==='F'?'selected':''}>F</option>
                </select>
                <button onclick="deleteGPACourse('${c.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
    calculateGPA();
}

window.calculateGPA = () => {
    const scale = parseInt(document.getElementById('gpa-scale').value);
    
    // Grade points mapping
    const gradePoints4 = { 'A+': 4.0, 'A': 3.7, 'B+': 3.3, 'B': 3.0, 'C+': 2.7, 'C': 2.4, 'D+': 2.2, 'D': 2.0, 'F': 0.0 };
    const gradePoints5 = { 'A+': 5.0, 'A': 4.75, 'B+': 4.5, 'B': 4.0, 'C+': 3.5, 'C': 3.0, 'D+': 2.5, 'D': 2.0, 'F': 0.0 };
    
    const pointsMap = scale === 5 ? gradePoints5 : gradePoints4;
    
    let totalPoints = 0;
    let totalCredits = 0;
    
    gpaCourses.forEach(c => {
        totalPoints += (pointsMap[c.grade] * c.credits);
        totalCredits += c.credits;
    });
    
    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
    document.getElementById('gpa-result').innerText = gpa;
};
setTimeout(renderGPACourses, 500);



// --- Quran Wird Logic ---
let quranData = JSON.parse(localStorage.getItem('study_quran')) || {
    goal: '',
    doneCount: 0,
    lastDate: ''
};

function initQuran() {
    const todayStr = new Date().toISOString().split('T')[0];
    if(quranData.lastDate !== todayStr) {
        quranData.doneCount = 0;
        quranData.lastDate = todayStr;
        localStorage.setItem('study_quran', JSON.stringify(quranData));
    }
    document.getElementById('quran-goal-display').innerText = quranData.goal || 'Ù„Ù… ÙŠØªÙ… Ø§Ù„ØªØ­Ø¯ÙŠØ¯';
    document.getElementById('quran-done-display').innerText = quranData.doneCount;
}

document.getElementById('quran-form').onsubmit = (e) => {
    e.preventDefault();
    const selectVal = document.getElementById('quran-goal-select').value;
    const customVal = document.getElementById('custom-quran-goal').value;
    quranData.goal = selectVal === 'custom' ? customVal : selectVal;
    localStorage.setItem('study_quran', JSON.stringify(quranData));
    initQuran();
    closeModal('quran-modal');
};

window.updateQuranWird = (val) => {
    quranData.doneCount = Math.max(0, quranData.doneCount + val);
    localStorage.setItem('study_quran', JSON.stringify(quranData));
    initQuran();
};

window.completeQuranWird = () => {
    document.getElementById('btn-complete-quran').innerHTML = '<i class="fa-solid fa-check-double"></i> Ø¨Ø§Ø±Ùƒ Ø§Ù„Ù„Ù‡ ÙÙŠÙƒ';
    setTimeout(() => {
        document.getElementById('btn-complete-quran').innerHTML = '<i class="fa-solid fa-check"></i> Ø£ØªÙ…Ù…Øª Ø§Ù„ÙˆØ±Ø¯';
    }, 3000);
    // Send a gentle visual confetti or toast? Let's just use alert for now.
    alert('ØªÙ‚Ø¨Ù„ Ø§Ù„Ù„Ù‡ Ø·Ø§Ø¹ØªÙƒ! Ø§Ø³ØªÙ…Ø± Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„ÙˆØ±Ø¯ ÙŠÙˆÙ…ÙŠØ§Ù‹ ðŸ¤');
};

initQuran();

// --- Prayer Monitor (Auto-Pause) ---
let notifiedPrayers = {}; // Track which prayers we already notified today

setInterval(() => {
    if(window.dailyPrayers) {
        const now = new Date();
        const currentHHMM = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        const todayStr = now.toISOString().split('T')[0];
        
        // Reset notified prayers on new day
        if(notifiedPrayers.date !== todayStr) {
            notifiedPrayers = { date: todayStr };
        }
        
        for(const [name, time] of Object.entries(window.dailyPrayers)) {
            if(time === currentHHMM && !notifiedPrayers[name]) {
                notifiedPrayers[name] = true;
                
                // Show Notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('ÙˆÙ‚Øª Ø§Ù„ØµÙ„Ø§Ø©! ðŸ•Œ', {
                        body: `Ø­Ø§Ù† Ø§Ù„Ø¢Ù† Ù…ÙˆØ¹Ø¯ ØµÙ„Ø§Ø© ${name}. Ù‚ÙˆÙ… ØµÙ„ÙŠ ÙˆØ§Ø±Ø¬Ø¹ ÙƒÙ…Ù„ Ù…Ø°Ø§ÙƒØ±Ø©!`,
                        icon: 'https://cdn-icons-png.flaticon.com/512/3429/3429930.png'
                    });
                } else {
                    alert(`ðŸ•Œ Ø­Ø§Ù† Ø§Ù„Ø¢Ù† Ù…ÙˆØ¹Ø¯ ØµÙ„Ø§Ø© ${name}. Ù‚ÙˆÙ… ØµÙ„ÙŠ ÙˆØ§Ø±Ø¬Ø¹ ÙƒÙ…Ù„!`);
                }
                
                // Auto Pause Pomodoro
                if(typeof isRunning !== 'undefined' && isRunning) {
                    toggleTimer(); // This will pause it because it's running
                    alert('ØªÙ… Ø¥ÙŠÙ‚Ø§Ù Ù…Ø¤Ù‚Øª Ø§Ù„Ù…Ø°Ø§ÙƒØ±Ø© ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¨Ø³Ø¨Ø¨ ÙˆÙ‚Øª Ø§Ù„ØµÙ„Ø§Ø©. ØªÙ‚Ø¨Ù„ Ø§Ù„Ù„Ù‡!');
                }
            }
        }
    }
}, 30000); // Check every 30 seconds

// --- AI Schedule Generator ---
document.getElementById('ai-schedule-form').onsubmit = async (e) => {
    e.preventDefault();
    const timePref = document.getElementById('ai-schedule-time').value;
    const hours = document.getElementById('ai-schedule-hours').value;
    const subjectsInput = document.getElementById('ai-schedule-subjects').value;
    
    document.getElementById('ai-schedule-loading').style.display = 'block';
    
    const prompt = `Ø£Ù†Øª Ù…Ø®Ø·Ø· Ø¯Ø±Ø§Ø³ÙŠ Ø®Ø¨ÙŠØ± Ù„Ù„Ø·Ù„Ø§Ø¨.
Ø§Ù„Ø·Ø§Ù„Ø¨ Ø·Ù„Ø¨ Ø¬Ø¯ÙˆÙ„ Ù…Ø°Ø§ÙƒØ±Ø© Ù„Ù„ÙŠÙˆÙ… Ø¨Ù‡Ø°Ù‡ Ø§Ù„Ù…ÙˆØ§ØµÙØ§Øª:
1. Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ù…ÙØ¶Ù„ Ù„Ù„Ù…Ø°Ø§ÙƒØ±Ø©: ${timePref}
2. Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø³Ø§Ø¹Ø§Øª Ø§Ù„Ù…Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©: ${hours} Ø³Ø§Ø¹Ø§Øª
3. Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ù…Ø±Ø§Ø¯ Ù…Ø°Ø§ÙƒØ±ØªÙ‡Ø§: ${subjectsInput}

Ø§Ù„Ù…Ø·Ù„ÙˆØ¨:
Ø§ÙƒØªØ¨ Ù„Ù‡ Ø¬Ø¯ÙˆÙ„ Ù…Ù‚Ø³Ù… Ø¨Ø§Ù„Ø³Ø§Ø¹Ø§Øª (Time-blocking) Ø¨Ø·Ø±ÙŠÙ‚Ø© ÙˆØ§Ù‚Ø¹ÙŠØ© Ø¬Ø¯Ø§Ù‹ØŒ ÙŠØªØ®Ù„Ù„Ù‡ ÙØªØ±Ø§Øª Ø±Ø§Ø­Ø© (Pomodoro)ØŒ ÙˆÙˆÙ‚Øª Ù„Ù„ØµÙ„Ø§Ø© ÙˆØ§Ù„Ø£ÙƒÙ„.
Ø§Ø¬Ø¹Ù„ Ø§Ù„Ø¬Ø¯ÙˆÙ„ ÙŠØ¨Ø¯Ùˆ Ø¬Ù…ÙŠÙ„Ø§Ù‹ ÙˆÙ…Ù†Ø¸Ù…Ø§Ù‹ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Markdown (Ø¬Ø¯Ø§ÙˆÙ„ Ø£Ùˆ Ù‚ÙˆØ§Ø¦Ù… Ù…Ù†Ø³Ù‚Ø©).
Ø§ÙƒØªØ¨ Ø±Ø³Ø§Ù„Ø© ØªØ´Ø¬ÙŠØ¹ÙŠØ© ÙÙŠ Ø§Ù„Ù†Ù‡Ø§ÙŠØ© Ø¨Ø§Ù„Ø¹Ø§Ù…ÙŠØ© Ø§Ù„Ù…ØµØ±ÙŠØ©.`;

    try {
        const res = await callGeminiAPI([{ text: prompt }]);
        document.getElementById('ai-schedule-loading').style.display = 'none';
        closeModal('ai-schedule-modal');
        
        if (res) {
            // Navigate to AI page to show output
            document.querySelectorAll('.nav-links li').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
            document.querySelector('[data-page="ai-assistant"]').classList.add('active');
            document.getElementById('ai-assistant').classList.add('active-page');
            processAIOutput(res);
        }
    } catch(e) {
        document.getElementById('ai-schedule-loading').style.display = 'none';
        alert('Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¬Ø¯ÙˆÙ„. Ø­Ø§ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰!');
    }
};

mermaid.initialize({ startOnLoad: false, theme: 'default', fontFamily: 'Tajawal' });
renderAll();

// --- Islamic Features (Prayer Times & Dhikr) ---
let userCity = localStorage.getItem('study_city') || 'Cairo';
let userCountry = localStorage.getItem('study_country') || 'Egypt';
window.dailyPrayers = null;

async function fetchPrayerTimes() {
    let t;
    try {
        const targetUrl = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(userCity)}&country=${encodeURIComponent(userCountry)}&method=5`;
        let res;
        try {
            res = await fetch(targetUrl);
        } catch (e) {
            res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
        }
        
        const data = await res.json();
        if (data.code === 200) {
            t = data.data.timings;
        } else {
            throw new Error("API returned non-200");
        }
    } catch (err) {
        console.error("Prayer API failed, using fallback:", err);
        // Fallback approximate times
        t = {
            Fajr: "05:21",
            Sunrise: "06:46",
            Dhuhr: "12:47",
            Asr: "16:11",
            Maghrib: "18:46",
            Isha: "20:02",
            Lastthird: "01:20"
        };
    }
    
    if (t) {
        // Store for alerts
        window.dailyPrayers = {
            'Ø§Ù„ÙØ¬Ø±': t.Fajr.split(' ')[0],
            'Ø§Ù„Ø¸Ù‡Ø±': t.Dhuhr.split(' ')[0],
            'Ø§Ù„Ø¹ØµØ±': t.Asr.split(' ')[0],
            'Ø§Ù„Ù…ØºØ±Ø¨': t.Maghrib.split(' ')[0],
            'Ø§Ù„Ø¹Ø´Ø§Ø¡': t.Isha.split(' ')[0]
        };
        
        const container = document.getElementById('prayer-times-container');
        const formatTime = (timeStr) => {
            let [h, m] = timeStr.split(':');
            h = parseInt(h);
            const ampm = h >= 12 ? 'Ù…' : 'Øµ';
            return `${h % 12 || 12}:${m} ${ampm}`;
        };
        
        container.innerHTML = `
            <div class="prayer-time-box"><strong>Ø§Ù„ÙØ¬Ø±</strong><span>${formatTime(t.Fajr.split(' ')[0])}</span></div>
            <div class="prayer-time-box"><strong>Ø§Ù„Ø¸Ù‡Ø±</strong><span>${formatTime(t.Dhuhr.split(' ')[0])}</span></div>
            <div class="prayer-time-box"><strong>Ø§Ù„Ø¹ØµØ±</strong><span>${formatTime(t.Asr.split(' ')[0])}</span></div>
            <div class="prayer-time-box"><strong>Ø§Ù„Ù…ØºØ±Ø¨</strong><span>${formatTime(t.Maghrib.split(' ')[0])}</span></div>
            <div class="prayer-time-box"><strong>Ø§Ù„Ø¹Ø´Ø§Ø¡</strong><span>${formatTime(t.Isha.split(' ')[0])}</span></div>
            <div class="prayer-time-box qiyam"><strong>Ù‚ÙŠØ§Ù… Ø§Ù„Ù„ÙŠÙ„</strong><span>${formatTime(t.Lastthird ? t.Lastthird.split(' ')[0] : "01:00")}</span></div>
        `;
        document.getElementById('current-city-label').innerText = userCity === 'Cairo' ? 'Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©' : userCity;
    }
}

// Prayer Alerts Logic
let lastPrayerAlert = '';
const prayerMessages = [
    "Ø§Ù„Ù†Ø¬Ø§Ø­ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ ÙŠØ¨Ø¯Ø£ Ù…Ù† Ø³Ø¬Ø§Ø¯Ø© Ø§Ù„ØµÙ„Ø§Ø©.. Ø§ØªØ±ÙƒÙŠ Ø§Ù„Ù…Ø°Ø§ÙƒØ±Ø© Ù„Ø¯Ù‚Ø§Ø¦Ù‚ØŒ ÙØ§Ù„ØµÙ„Ø§Ø© ØªØ¨Ø§Ø±Ùƒ ÙÙŠ ÙˆÙ‚ØªÙƒ ÙˆÙÙ‡Ù…Ùƒ.",
    "Ø£Ø±Ø­Ù†Ø§ Ø¨Ù‡Ø§ ÙŠØ§ Ø¨Ù„Ø§Ù„.. Ù‚ÙˆÙ…ÙŠ Ù„Ù„ØµÙ„Ø§Ø© Ù„ØªØªØ¬Ø¯Ø¯ Ø·Ø§Ù‚ØªÙƒ ÙˆØªØ¹ÙˆØ¯ÙŠ Ù„Ù„Ù…Ø°Ø§ÙƒØ±Ø© Ø¨ØªØ±ÙƒÙŠØ² Ù…Ø¶Ø§Ø¹Ù.",
    "ÙˆÙ…Ø§ ØªÙˆÙÙŠÙ‚ÙŠ Ø¥Ù„Ø§ Ø¨Ø§Ù„Ù„Ù‡.. Ø§Ù„ØµÙ„Ø§Ø© Ù‡ÙŠ Ù…ÙØªØ§Ø­ ÙƒÙ„ Ø§Ù„Ø£Ø¨ÙˆØ§Ø¨ Ø§Ù„Ù…ØºÙ„Ù‚Ø©ØŒ Ù„Ø§ ØªØ¤Ø¬Ù„ÙŠÙ‡Ø§!",
    "Ù…Ù† Ø¬Ø¹Ù„ Ø§Ù„Ù„Ù‡ Ø£ÙˆÙ„ÙˆÙŠØªÙ‡ØŒ Ø¬Ø¹Ù„ Ø§Ù„Ù„Ù‡ Ø§Ù„ØªÙˆÙÙŠÙ‚ Ø­Ù„ÙŠÙÙ‡.. Ø­ÙŠ Ø¹Ù„Ù‰ Ø§Ù„ØµÙ„Ø§Ø© ðŸ¤."
];

setInterval(() => {
    if (!window.dailyPrayers) return;
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    for (let [name, time] of Object.entries(window.dailyPrayers)) {
        if (currentTimeStr === time && lastPrayerAlert !== time) {
            lastPrayerAlert = time; 
            triggerPrayerAlert(name);
        }
    }
}, 30000); // Check every 30s

function triggerPrayerAlert(prayerName) {
    document.getElementById('prayer-alert-title').innerText = `Ø­Ø§Ù† Ø§Ù„Ø¢Ù† Ø£Ø°Ø§Ù† ${prayerName} ðŸ•Œ`;
    document.getElementById('prayer-alert-msg').innerText = prayerMessages[Math.floor(Math.random() * prayerMessages.length)];
    openModal('prayer-alert-modal');
    
    // Play gentle sound
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if(ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 1);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 1);
    } catch(e){}
}

window.changeCity = () => {
    const newCity = prompt('Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ù…Ø¯ÙŠÙ†ØªÙƒ Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ© (Ù…Ø«Ø§Ù„: Riyadh, Dubai):', userCity);
    const newCountry = prompt('Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø¯ÙˆÙ„ØªÙƒ Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ© (Ù…Ø«Ø§Ù„: Saudi Arabia, UAE):', userCountry);
    if(newCity && newCountry) {
        userCity = newCity; userCountry = newCountry;
        localStorage.setItem('study_city', userCity); localStorage.setItem('study_country', userCountry);
        document.getElementById('prayer-times-container').innerHTML = '<p style="text-align:center;">Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</p>';
        fetchPrayerTimes();
    }
}

const athkar = [
    "ØµÙ„ÙŠ Ø¹Ù„Ù‰ Ø§Ù„Ù†Ø¨ÙŠ ï·º ðŸŒ¸", "Ø³Ø¨Ø­Ø§Ù† Ø§Ù„Ù„Ù‡ ÙˆØ¨Ø­Ù…Ø¯Ù‡ØŒ Ø³Ø¨Ø­Ø§Ù† Ø§Ù„Ù„Ù‡ Ø§Ù„Ø¹Ø¸ÙŠÙ… ðŸƒ", "Ù„Ø§ Ø­ÙˆÙ„ ÙˆÙ„Ø§ Ù‚ÙˆØ© Ø¥Ù„Ø§ Ø¨Ø§Ù„Ù„Ù‡ ðŸ’Ž", 
    "Ø§Ø³ØªØºÙØ± Ø§Ù„Ù„Ù‡ Ø§Ù„Ø¹Ø¸ÙŠÙ… ÙˆØ£ØªÙˆØ¨ Ø¥Ù„ÙŠÙ‡ ðŸ¤²", "Ø§Ù„Ù„Ù‡Ù… Ø§Ø±Ø²Ù‚Ù†ÙŠ Ù‚ÙˆØ© Ø§Ù„Ø­ÙØ¸ ÙˆØ³Ø±Ø¹Ø© Ø§Ù„ÙÙ‡Ù… ðŸ’¡", 
    "Ù„Ø§ Ø¥Ù„Ù‡ Ø¥Ù„Ø§ Ø£Ù†Øª Ø³Ø¨Ø­Ø§Ù†Ùƒ Ø¥Ù†ÙŠ ÙƒÙ†Øª Ù…Ù† Ø§Ù„Ø¸Ø§Ù„Ù…ÙŠÙ† ðŸŒŸ", "Ø§Ù„Ù„Ù‡Ù… ÙŠØ³Ø± Ù„ÙŠ Ø£Ù…Ø±ÙŠ ÙˆØ§Ø´Ø±Ø­ Ù„ÙŠ ØµØ¯Ø±ÙŠ âœ¨",
    "Ø§Ù„Ù„Ù‡Ù… Ø¹Ù„Ù…Ù†Ø§ Ù…Ø§ ÙŠÙ†ÙØ¹Ù†Ø§ ÙˆØ§Ù†ÙØ¹Ù†Ø§ Ø¨Ù…Ø§ Ø¹Ù„Ù…ØªÙ†Ø§ ðŸ“š"
];

function showDhikrToast() {
    const toast = document.getElementById('dhikr-toast');
    if(!toast) return;
    document.getElementById('dhikr-text').innerText = athkar[Math.floor(Math.random() * athkar.length)];
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 5000);
}

setInterval(showDhikrToast, 10 * 60 * 1000); // Every 10 mins
setTimeout(showDhikrToast, 10000); // 10 seconds after load
fetchPrayerTimes();

window.toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// --- Admin Panel Logic ---
let adminClickCount = 0;
const secretBtn = document.getElementById('secret-admin-btn');
if(secretBtn) {
    secretBtn.addEventListener('click', () => {
        adminClickCount++;
        if(adminClickCount === 3) {
            adminClickCount = 0;
            window.openAdminAuth();
        }
        setTimeout(() => adminClickCount = 0, 3000); // Reset if not clicked 3 times fast
    });
}

window.openAdminAuth = () => {
    const pwd = prompt('Ø£Ø¯Ø®Ù„ÙŠ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø³Ø±ÙŠØ© Ù„ØºØ±ÙØ© Ø§Ù„Ù…Ø±Ø§Ù‚Ø¨Ø© (Ø®Ø§Øµ Ø¨Ø§Ù„Ù…Ø¯ÙŠØ±):');
    if (pwd === 'Malak2026') {
        // Switch to admin tab
        document.querySelectorAll('.nav-links li').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
        document.getElementById('nav-admin').classList.add('active');
        document.getElementById('admin').classList.add('active-page');
        window.loadAdminData();
    } else if (pwd !== null) {
        alert('Ø¹Ø°Ø±Ø§Ù‹ØŒ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø®Ø§Ø·Ø¦Ø©!');
    }
}

window.adminFetchedUsers = [];

window.loadAdminData = async () => {
    const content = document.getElementById('admin-content');
    content.innerHTML = '<div style="grid-column:1/-1; text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x text-blue"></i><p>Ø¬Ø§Ø±ÙŠ Ø¬Ù„Ø¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£ØµØ¯Ù‚Ø§Ø¡...</p></div>';
    
    if (!db) {
        content.innerHTML = '<p class="text-danger">Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…ØªØµÙ„Ø©.</p>';
        return;
    }
    
    try {
        const snapshot = await db.collection('users_data').get();
        let html = '';
        window.adminFetchedUsers = [];
        
        if (snapshot.empty) {
            content.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted);">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ø£ÙŠ Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ø¢Ø®Ø±ÙŠÙ† Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†.</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            window.adminFetchedUsers.push(data);
            const index = window.adminFetchedUsers.length - 1;
            const dateStr = new Date(data.lastUpdated).toLocaleString('ar-EG');
            
            const stageText = data.stage ? data.stage : 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯';
            const specText = data.specialty ? data.specialty : 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯';
            
            html += `
                <div class="card" style="border-top: 4px solid var(--primary-color); cursor: pointer; transition: 0.2s;" onclick="viewAdminUser(${index})" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h3 style="margin:0;"><i class="fa-solid fa-user"></i> ${data.name}</h3>
                        <span style="font-size:0.8rem; background:var(--primary-color); color:white; padding:3px 8px; border-radius:12px;">${stageText} | ${specText}</span>
                    </div>
                    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px;"><i class="fa-regular fa-clock"></i> Ø¢Ø®Ø± Ø¸Ù‡ÙˆØ±: ${dateStr}</p>
                    <button class="btn btn-outline" style="width: 100%; border-color: var(--primary-color); color: var(--primary-color);"><i class="fa-solid fa-eye"></i> Ø¹Ø±Ø¶ Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ø§Ù„ÙƒØ§Ù…Ù„Ø©</button>
                </div>
            `;
        });
        content.innerHTML = html;
    } catch(e) {
        content.innerHTML = `<p class="text-danger" style="grid-column:1/-1; text-align:center;">Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª: ${e.message}</p>`;
    }
}

window.viewAdminUser = (index) => {
    const data = window.adminFetchedUsers[index];
    document.getElementById('admin-modal-name').innerText = data.name;
    document.getElementById('admin-modal-stage').innerText = `${data.stage || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'} | ${data.specialty || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}`;
    document.getElementById('admin-modal-lastseen').innerHTML = `<i class="fa-regular fa-clock"></i> Ø¢Ø®Ø± Ø¸Ù‡ÙˆØ±: ${new Date(data.lastUpdated).toLocaleString('ar-EG')}`;
    
    // Render Tasks
    let tasksHtml = '<ul style="list-style:none; padding:0; margin:0;">';
    if(data.tasks && data.tasks.length > 0) {
        data.tasks.forEach(t => {
            let subjectName = "";
            if (t.subjectId && data.subjects) {
                let subj = data.subjects.find(s => s.id === t.subjectId);
                if (subj) subjectName = ' | Ù…Ø§Ø¯Ø©: ' + subj.name;
            }
            tasksHtml += `<li style="margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                <span style="font-size: 1.1rem; margin-left: 10px;">${t.completed ? 'âœ…' : 'âŒ'}</span>
                <strong>${t.desc}</strong> <span style="color:var(--primary-color); font-size:0.9rem;">${subjectName}</span>
                <br><small style="color:var(--text-muted); margin-right: 35px;">ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…Ù‡Ù…Ø©: ${t.date}</small>
            </li>`;
        });
    } else {
        tasksHtml += '<li style="color:var(--text-muted);">Ù‡Ø°Ø§ Ø§Ù„Ø·Ø§Ù„Ø¨ Ù„Ù… ÙŠØ¶Ù Ø£ÙŠ Ù…Ù‡Ø§Ù… Ø¨Ø¹Ø¯.</li>';
    }
    tasksHtml += '</ul>';
    document.getElementById('admin-modal-tasks').innerHTML = tasksHtml;

    // Render Classes
    let classesHtml = '<ul style="list-style:none; padding:0; margin:0;">';
    if(data.classes && data.classes.length > 0) {
        const daysArray = ['Ø§Ù„Ø£Ø­Ø¯', 'Ø§Ù„Ø¥Ø«Ù†ÙŠÙ†', 'Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡', 'Ø§Ù„Ø£Ø±Ø¨Ø¹Ø§Ø¡', 'Ø§Ù„Ø®Ù…ÙŠØ³', 'Ø§Ù„Ø¬Ù…Ø¹Ø©', 'Ø§Ù„Ø³Ø¨Øª'];
        // Sort classes by day
        let sortedClasses = [...data.classes].sort((a,b) => parseInt(a.day) - parseInt(b.day));
        
        sortedClasses.forEach(c => {
            let t = c.time.split(':');
            let h = parseInt(t[0]) % 12 || 12;
            let ampm = parseInt(t[0]) >= 12 ? 'Ù…' : 'Øµ';
            let subjectName = "Ù…Ø§Ø¯Ø© ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙØ©";
            if (c.subjectId && data.subjects) {
                let subj = data.subjects.find(s => s.id === c.subjectId);
                if (subj) subjectName = subj.name;
            }
            classesHtml += `<li style="margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                <i class="fa-solid fa-book-open" style="color:var(--primary-color); margin-left: 10px;"></i>
                <strong>ÙŠÙˆÙ… ${daysArray[c.day]}</strong> - Ø§Ù„Ø³Ø§Ø¹Ø© ${h}:${t[1]} ${ampm}
                <br><span style="color:var(--primary-color); margin-right: 35px; font-weight: bold;">( ${subjectName} )</span>
            </li>`;
        });
    } else {
        classesHtml += '<li style="color:var(--text-muted);">Ù‡Ø°Ø§ Ø§Ù„Ø·Ø§Ù„Ø¨ Ù„Ù… ÙŠÙ‚Ù… Ø¨Ø¥Ø¶Ø§ÙØ© Ø£ÙŠ Ø­ØµØµ/Ù…Ø­Ø§Ø¶Ø±Ø§Øª ÙÙŠ Ø¬Ø¯ÙˆÙ„Ù‡.</li>';
    }
    classesHtml += '</ul>';
    document.getElementById('admin-modal-classes').innerHTML = classesHtml;

    openModal('admin-user-modal');
}

// --- Welcome Quotes Logic ---
const welcomeQuotes = [
    "ï´¿ ÙˆÙŽØ£ÙŽÙ† Ù„ÙŽÙ‘ÙŠÙ’Ø³ÙŽ Ù„ÙÙ„Ù’Ø¥ÙÙ†Ø³ÙŽØ§Ù†Ù Ø¥ÙÙ„ÙŽÙ‘Ø§ Ù…ÙŽØ§ Ø³ÙŽØ¹ÙŽÙ‰Ù° ï´¾",
    "Ù‚Ø§Ù„ Ø±Ø³ÙˆÙ„ Ø§Ù„Ù„Ù‡ ï·º: Â«Ù…ÙŽÙ† Ø³ÙŽÙ„ÙŽÙƒÙŽ Ø·ÙŽØ±ÙÙŠÙ‚Ù‹Ø§ ÙŠÙŽÙ„Ù’ØªÙŽÙ…ÙØ³Ù ÙÙÙŠÙ‡Ù Ø¹ÙÙ„Ù’Ù…Ù‹Ø§ØŒ Ø³ÙŽÙ‡ÙŽÙ‘Ù„ÙŽ Ø§Ù„Ù„ÙŽÙ‘Ù‡Ù Ù„Ù‡ Ø¨Ù‡ Ø·ÙŽØ±ÙÙŠÙ‚Ù‹Ø§ Ø¥Ù„Ù‰ Ø§Ù„Ø¬ÙŽÙ†ÙŽÙ‘Ø©ÙÂ»",
    "Ø§Ù„Ù…Ø°Ø§ÙƒØ±Ø© Ø²ÙŠ Ø§Ù„Ø¯ÙˆØ§Ø¡ØŒ Ø·Ø¹Ù…Ù‡Ø§ Ù…Ø± Ø¨Ø³ Ø¨ØªØ¹Ø§Ù„Ø¬ Ø§Ù„Ø¬Ù‡Ù„! Ù‚ÙˆÙ… Ø°Ø§ÙƒØ± ÙŠØ§ Ø¨Ø·Ù„ ðŸ˜‚",
    "ÙƒÙ„ Ù‚Ø·Ø±Ø© ØªØ¹Ø¨ Ø¯Ù„ÙˆÙ‚ØªÙŠØŒ Ù‡ØªÙˆÙØ± Ø¹Ù„ÙŠÙƒ Ø¯Ù…ÙˆØ¹ Ù†Ø¯Ù… ÙŠÙˆÙ… Ø§Ù„Ù†ØªÙŠØ¬Ø©.. Ù‡Ø§Ù†Øª!",
    "Ø§Ù„Ù†Ø¬Ø§Ø­ Ù…Ø´ Ø¨ÙŠÙŠØ¬ÙŠ Ù„Ù„Ù†Ø§Ø³ Ø§Ù„Ù„ÙŠ Ø¨ØªØ³ØªÙ†Ù‰ØŒ Ø¨ÙŠÙŠØ¬ÙŠ Ù„Ù„Ù†Ø§Ø³ Ø§Ù„Ù„ÙŠ Ø¨ØªØ¹Ø§ÙØ± ðŸš€",
    "Ø§Ù„ØªØ¹Ø¨ Ø¨ÙŠØ²ÙˆÙ„ ÙˆÙŠÙØ¶Ù„ Ø§Ù„Ø£Ø«Ø± ÙˆØ§Ù„Ù†Ø¬Ø§Ø­.. Ù…ØªØ³ØªØ³Ù„Ù…Ø´ Ø£Ø¨Ø¯Ø§Ù‹!",
    "Â«Ø§Ù„Ø¹Ù„Ù… ÙŠØ¨Ù†ÙŠ Ø¨ÙŠÙˆØªØ§Ù‹ Ù„Ø§ Ø¹Ù…Ø§Ø¯ Ù„Ù‡Ø§.. ÙˆØ§Ù„Ø¬Ù‡Ù„ ÙŠÙ‡Ø¯Ù… Ø¨ÙŠØª Ø§Ù„Ø¹Ø² ÙˆØ§Ù„ÙƒØ±Ù…Â»",
    "Ù‚ÙˆÙ… Ø°Ø§ÙƒØ± Ø¹Ø´Ø§Ù† ØªÙØ±Ø­ Ø£Ù‡Ù„ÙƒØŒ Ù‡Ù…Ø§ Ù…Ø³ØªÙ†ÙŠÙŠÙ† ÙŠØ´ÙˆÙÙˆÙƒ ÙÙŠ Ø£Ø­Ø³Ù† Ù…ÙƒØ§Ù† â¤ï¸",
    "Ø§Ù„ÙØ±Ù‚ Ø¨ÙŠÙ† Ø§Ù„Ø­Ù„Ù… ÙˆØ§Ù„ÙˆØ§Ù‚Ø¹ Ù‡Ùˆ (Ø§Ù„Ø¹Ù…Ù„).. Ø§Ù‚ÙÙ„ Ø§Ù„Ø³ÙˆØ´ÙŠØ§Ù„ Ù…ÙŠØ¯ÙŠØ§ ÙˆØ§Ø¨Ø¯Ø£!",
    "Ù…Ø´ Ù…Ù‡Ù… Ø¨Ø¯Ø£Øª Ù…ØªØ£Ø®Ø±ØŒ Ø§Ù„Ù…Ù‡Ù… Ø¥Ù†Ùƒ ØªØ¨Ø¯Ø£ ÙˆÙ…Ø§ØªÙ‚ÙØ´ ðŸ¢ðŸ’ª"
];

window.addEventListener('load', () => {
    // === Teacher Portal Logic ===
    if (localStorage.getItem('study_role') === 'teacher' || localStorage.getItem('study_is_admin') === 'true') {
        let navTeacher = document.getElementById('nav-teacher');
        if (navTeacher) navTeacher.style.display = 'flex';
        
        let displayCode = document.getElementById('display-teacher-code');
        if (displayCode) displayCode.innerText = localStorage.getItem('study_teacher_code') || 'غير متوفر';
        
        filterTeacherLibrary(); // Load initial library data
    }

    // Show only if onboarding modal is not active
    const onboard = document.getElementById('onboarding-modal');
    if (!onboard || onboard.style.display === 'none') {
        const randomQuote = welcomeQuotes[Math.floor(Math.random() * welcomeQuotes.length)];
        const quoteEl = document.getElementById('quote-text');
        const overlayEl = document.getElementById('welcome-quote-overlay');
        
        if (quoteEl && overlayEl) {
            quoteEl.innerText = randomQuote;
            overlayEl.style.display = 'flex';
        }
    }
});

// ====== ??? ???? ????? ??????? ======
let deferredPrompt;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const closeInstallBtn = document.getElementById('close-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    // ??? ??????? ?? ????? ?????? ??????? ??????????
    e.preventDefault();
    // ??? ????? ???? ??????? ??? ???????? ???? ??? ?????? ??????
    deferredPrompt = e;
    // ????? ??????? ??????? ???????
    if (installBanner) installBanner.style.display = 'block';
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        // ????? ??????? ???????
        installBanner.style.display = 'none';
        if (deferredPrompt) {
            // ????? ???? ??????? ??????? ????? ????????
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('User response to the install prompt: ', outcome);
            deferredPrompt = null;
        }
    });
}

if (closeInstallBtn) {
    closeInstallBtn.addEventListener('click', () => {
        installBanner.style.display = 'none';
    });
}



// ==========================================
// ====== Teacher Library Data & Logic ======
// ==========================================

const dummyLibraryData = [
    { title: "ملزمة المراجعة النهائية - رياضيات", stage: "إعدادي", subject: "رياضيات", type: "pdf", downloads: 124 },
    { title: "بنك أسئلة الوزارة - علوم", stage: "ابتدائي", subject: "علوم", type: "exam", downloads: 89 },
    { title: "امتحان شامل لغة عربية - نصف العام", stage: "ثانوي", subject: "عربي", type: "exam", downloads: 210 },
    { title: "أطلس الخرائط التفاعلي", stage: "ابتدائي", subject: "أخرى", type: "pdf", downloads: 56 },
    { title: "ملخص القوانين والمسائل - فيزياء", stage: "ثانوي", subject: "علوم", type: "pdf", downloads: 340 },
    { title: "امتحانات المحافظات السابقة - رياضيات", stage: "إعدادي", subject: "رياضيات", type: "exam", downloads: 175 },
    { title: "مذكرة التأسيس في النحو", stage: "ابتدائي", subject: "عربي", type: "pdf", downloads: 420 },
    { title: "قاموس المصطلحات الإنجليزية", stage: "إعدادي", subject: "لغات", type: "pdf", downloads: 112 }
];

window.filterTeacherLibrary = () => {
    const stageFilter = document.getElementById('teacher-stage-filter');
    const subjectFilter = document.getElementById('teacher-subject-filter');
    const grid = document.getElementById('teacher-library-grid');
    
    if(!stageFilter || !grid) return;
    
    const sVal = stageFilter.value;
    const subVal = subjectFilter.value;
    
    grid.innerHTML = '';
    
    const filtered = dummyLibraryData.filter(item => {
        return (sVal === 'all' || item.stage === sVal) && (subVal === 'all' || item.subject === subVal);
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px;">لا توجد ملفات متطابقة مع بحثك حالياً.</p>';
        return;
    }
    
    filtered.forEach(item => {
        const icon = item.type === 'pdf' ? '<i class="fa-solid fa-file-pdf" style="color: #ef4444; font-size: 2rem;"></i>' : '<i class="fa-solid fa-file-circle-check" style="color: var(--primary); font-size: 2rem;"></i>';
        const typeText = item.type === 'pdf' ? 'ملزمة / كتاب' : 'امتحان / أسئلة';
        
        grid.innerHTML += 
            <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid var(--primary); padding: 20px;">
                <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                    +icon+
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: var(--text-main); font-size: 1.1rem;">+item.title+</h4>
                        <span style="font-size: 0.8rem; background: var(--bg-color); padding: 3px 8px; border-radius: 8px; color: var(--text-muted);">+item.stage+ | +typeText+</span>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 15px;">
                    <span style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-download"></i> +item.downloads+ تحميل</span>
                    <button class="btn btn-outline" style="padding: 8px 15px; font-size: 0.9rem; border: 1px solid var(--primary); color: var(--primary); background: transparent; border-radius: 8px; cursor: pointer;" onclick="alert('سيتم إضافة خاصية التحميل قريباً!')"><i class="fa-solid fa-cloud-arrow-down"></i> تنزيل</button>
                </div>
            </div>
        ;
    });
};


