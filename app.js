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
    if(studyUsername && studyUsername !== 'طالب') {
        document.getElementById('onboard-name').value = studyUsername;
    }
    document.getElementById('onboarding-modal').style.display = 'flex';
}

window.saveOnboarding = () => {
    let name = document.getElementById('onboard-name').value.trim();
    let roleElem = document.getElementById('onboard-role');
    let role = roleElem ? roleElem.value : 'student';
    
    if (!name) {
        alert('عفواً، يجب كتابة اسمك أولاً لإنشاء حسابك!');
        return;
    }
    
    let stage = "";
    let spec = "";
    let tCode = "";
    let generatedTeacherCode = "";

    if (role === 'student') {
        stage = document.getElementById('onboard-stage').value;
        if (!stage) { alert('من فضلك اختر المرحلة الدراسية'); return; }
        
        if (stage === 'جامعة') {
            spec = document.getElementById('onboard-uni').value.trim();
        } else if (stage === 'ابتدائي' || stage === 'إعدادي' || stage === 'ثانوي') {
            spec = document.getElementById('onboard-year').value;
        }
        
        let codeInput = document.getElementById('onboard-teacher-code');
        if (codeInput) tCode = codeInput.value.trim();
        
    } else if (role === 'teacher') {
        let subjInput = document.getElementById('onboard-teacher-subject');
        if (!subjInput || !subjInput.value.trim()) { alert('من فضلك أدخل المواد التي تدرسها'); return; }
        
        let checkboxes = document.querySelectorAll('.t-stage-cb:checked');
        if (checkboxes.length === 0) { alert('من فضلك اختر مرحلة دراسية واحدة على الأقل'); return; }
        
        let selectedStages = Array.from(checkboxes).map(cb => cb.value).join('، ');
        
        stage = selectedStages;
        spec = subjInput.value.trim();
        generatedTeacherCode = 'T-' + Math.floor(1000 + Math.random() * 9000);
    }
    
    studyUsername = name;
    studyStage = stage || 'غير محدد';
    studySpecialty = spec || 'غير محدد';
    
    if (!studyUserId) {
        studyUserId = 'user_' + Date.now().toString();
    }
    
    localStorage.setItem('study_username', studyUsername);
    localStorage.setItem('study_userid', studyUserId);
    localStorage.setItem('study_stage', studyStage);
    localStorage.setItem('study_specialty', studySpecialty);
    localStorage.setItem('study_role', role);
    localStorage.setItem('study_app_version', '2.0');
    
    if (role === 'student' && tCode) localStorage.setItem('study_my_teacher_code', tCode);
    if (role === 'teacher') localStorage.setItem('study_teacher_code', generatedTeacherCode);
    
    let modal = document.getElementById('onboarding-modal');
    if (modal) modal.style.display = 'none';
    
    if (typeof syncToCloud === 'function') syncToCloud();
    
    if (role === 'teacher') {
        alert('أهلاً بك يا أستاذ ' + name + '\nكود المدرس الخاص بك هو:\n[ ' + generatedTeacherCode + ' ]');
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
let groqApiKey = localStorage.getItem('study_groq_api') || '';
let aiProvider = localStorage.getItem('study_ai_provider') || 'gemini';
// Set User Name in Dashboard
document.addEventListener('DOMContentLoaded', () => {
    setupVoiceRecognition();
    
    // Setup AI Settings inputs
    const providerSelect = document.getElementById('ai-provider-select');
    if (providerSelect) providerSelect.value = aiProvider;
    
    const geminiInput = document.getElementById('gemini-api-key-input');
    if (geminiInput) geminiInput.value = geminiApiKey;
    
    const groqInput = document.getElementById('groq-api-key-input');
    if (groqInput) groqInput.value = groqApiKey;
    
    if(window.toggleApiInputs) toggleApiInputs();
    if (studyUsername && document.getElementById('welcome-user')) {
        document.getElementById('welcome-user').innerText = studyUsername;
    }
});

const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

document.body.setAttribute('data-theme', 'dark');

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
            name: studyUsername || '',
            stage: studyStage || 'غير محدد',
            specialty: studySpecialty || 'غير محدد',
            role: localStorage.getItem('study_role') || 'student',
            teacherCode: localStorage.getItem('study_teacher_code') || '',
            linkedTeacher: localStorage.getItem('study_my_teacher_code') || '',
            tasks: tasks || [],
            classes: classes || [],
            subjects: subjects || [],
            lastUpdated: new Date().toISOString()
        }, { merge: true }).catch(e => console.log("Cloud sync error: ", e));
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
    selects[0].innerHTML = '<option value="" disabled selected>اختر المادة</option>';
    selects[1].innerHTML = '<option value="">بدون مادة محددة</option>';
    selects[2].innerHTML = '<option value="" disabled selected>اختر المادة</option>';
    selects[3].innerHTML = '<option value="">بدون مادة محددة</option>';

    if(subjects.length === 0) grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">لا توجد مواد مضافة بعد.</p>';

    subjects.forEach(sub => {
        const div = document.createElement('div');
        div.className = 'subject-card';
        div.style.borderRight = `5px solid ${sub.color}`;
        div.innerHTML = `${sub.name}<button onclick="deleteSubject('${sub.id}')" style="display:block; margin: 10px auto 0; background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fa-solid fa-trash"></i> حذف</button>`;
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
            ul.innerHTML = '<li class="list-item" style="justify-content:center; color:var(--text-muted); font-size:0.9rem;">لا توجد دروس</li>';
        } else {
            dayClasses.forEach(cls => {
                const sub = getSubject(cls.subjectId);
                if(!sub) return;
                let t = cls.time.split(':');
                let h = parseInt(t[0]) % 12 || 12;
                ul.innerHTML += `<li class="list-item" style="border-right-color:${sub.color}">
                    <div><strong>${sub.name}</strong><br><small style="color:var(--text-muted)"><i class="fa-regular fa-clock"></i> ${h}:${t[1]} ${parseInt(t[0])>=12?'م':'ص'}</small></div>
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
    if(fTasks.length === 0) return list.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد مهام.</p>';

    fTasks.forEach(task => {
        const sub = task.subjectId ? getSubject(task.subjectId) : null;
        list.innerHTML += `<li class="list-item ${task.completed ? 'completed' : ''}" style="border-right-color:${sub?sub.color:'var(--border-color)'}">
            <div class="task-text"><strong>${task.desc}</strong>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
                    <span style="background:var(--bg-color); border: 1px solid var(--border-color); padding:2px 6px; border-radius:4px; margin-left:10px;">${sub?sub.name:'عام'}</span>
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
        mainList.innerHTML = '<p style="text-align:center; color:var(--text-muted);">لا توجد امتحانات قادمة 🥳</p>';
        dashGrid.innerHTML = '<p style="color:var(--text-muted);">لا توجد امتحانات قادمة</p>';
        return;
    }

    upcoming.forEach((exam, index) => {
        const sub = getSubject(exam.subjectId);
        if(!sub) return;
        const diffDays = Math.ceil(Math.abs(new Date(exam.date) - new Date(getTodayInfo().dateString)) / (1000 * 60 * 60 * 24));
        const daysText = diffDays === 0 ? 'اليوم!' : (diffDays === 1 ? 'غداً' : `باقي ${diffDays} أيام`);
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
    if(flashcards.length === 0) return grid.innerHTML = '<p style="text-align:center; color:var(--text-muted); grid-column:1/-1;">لا توجد بطاقات. أضف بطاقتك الأولى!</p>';
    
    flashcards.forEach(card => {
        const sub = card.subjectId ? getSubject(card.subjectId) : null;
        const cColor = sub ? sub.color : 'var(--border-color)';
        grid.innerHTML += `
            <div class="flashcard" onclick="this.classList.toggle('flipped')">
                <div class="flashcard-inner">
                    <div class="flashcard-front" style="border-right-color: ${cColor}">
                        <button class="fc-delete" onclick="event.stopPropagation(); deleteFlashcard('${card.id}')"><i class="fa-solid fa-trash"></i></button>
                        <span style="position:absolute; top:10px; right:10px; font-size:0.8rem; color:var(--text-muted)">${sub?sub.name:'عام'}</span>
                        <h3 style="font-size:1.3rem;">${card.q.replace(/\n/g, '<br>')}</h3>
                        <p style="position:absolute; bottom:10px; font-size:0.8rem; color:var(--text-muted)">انقر للقلب <i class="fa-solid fa-rotate"></i></p>
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
    document.getElementById('progress-text').innerText = `${p}% (${compT.length} من ${allT.length} مهام)`;

    const tdClasses = classes.filter(c => c.day === today.dayIndex.toString()).sort((a,b) => a.time.localeCompare(b.time));
    const clsList = document.getElementById('today-classes-list');
    clsList.innerHTML = tdClasses.length===0 ? '<li class="list-item" style="justify-content:center; color:var(--text-muted);">لا توجد دروس اليوم! 🎉</li>' : '';
    tdClasses.forEach(c => {
        const s = getSubject(c.subjectId);
        if(!s) return;
        let t = c.time.split(':');
        clsList.innerHTML += `<li class="list-item" style="border-right-color:${s.color}"><strong>${s.name}</strong> <span>${parseInt(t[0])%12||12}:${t[1]} ${parseInt(t[0])>=12?'م':'ص'}</span></li>`;
    });

    const tskList = document.getElementById('today-tasks-list');
    const pendT = allT.filter(t => !t.completed);
    tskList.innerHTML = pendT.length===0 ? '<li class="list-item" style="justify-content:center; color:var(--text-muted);">أنجزت جميع مهامك، عمل رائع! 🌟</li>' : '';
    pendT.forEach(task => {
        const s = task.subjectId ? getSubject(task.subjectId) : null;
        tskList.innerHTML += `<li class="list-item" style="border-right-color:${s?s.color:'var(--border-color)'}">
            <div class="task-text"><strong>${task.desc}</strong><div style="font-size:0.8rem; color:${task.date<today.dateString?'var(--danger)':'var(--text-muted)'}; margin-top:3px;">${task.date<today.dateString?'متأخر ⚠️':'اليوم'}</div></div>
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
        btn.innerHTML = '<i class="fa-solid fa-clock"></i> ضبط المنبه';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-primary');
        status.style.display = 'none';
        document.getElementById('alarm-time-input').disabled = false;
    } else {
        // Set alarm
        if (!input) return alert('يرجى تحديد وقت الاستيقاظ أولاً!');
        alarmTime = input;
        
        // Initialize AudioContext on user interaction to bypass autoplay restrictions
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        btn.innerHTML = '<i class="fa-solid fa-ban"></i> إلغاء المنبه';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-danger');
        status.innerText = `تم ضبط المنبه ليرن الساعة ${input}، اترك هذه الصفحة مفتوحة!`;
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
    const currentTimeStr = `$:${minutes}`;
    
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
    btn.innerHTML = '<i class="fa-solid fa-clock"></i> ضبط المنبه';
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
    document.getElementById('start-timer-btn').innerText = 'ابدأ المذاكرة';
    document.querySelectorAll('.pomo-mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}
window.toggleTimer = () => {
    const btn = document.getElementById('start-timer-btn');
    if (isRunning) { 
        clearInterval(pomodoroTimer); 
        btn.innerText = 'استئناف'; 
        isRunning = false; 
        if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    } else {
        btn.innerText = 'إيقاف مؤقت'; 
        isRunning = true;
        
        // Save initial duration to track how much was completed
        const initialDuration = currentMode === 'work' ? 25 : (currentMode === 'longBreak' ? 15 : 5);
        
        try { if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); } catch(e){}
        pomodoroTimer = setInterval(() => {
            timeLeft--; updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(pomodoroTimer); isRunning = false; btn.innerText = 'انتهى الوقت!';
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
    updateTimerDisplay(); document.getElementById('start-timer-btn').innerText = 'ابدأ';
}

// --- Forms ---
document.getElementById('subject-form').onsubmit = e => { e.preventDefault(); subjects.push({ id: Date.now().toString(), name: e.target[0].value, color: e.target[1].value }); saveData(); closeModal('subject-modal'); e.target.reset(); };
document.getElementById('class-form').onsubmit = e => { e.preventDefault(); if(!e.target[0].value) return alert('اختر مادة'); classes.push({ id: Date.now().toString(), subjectId: e.target[0].value, day: e.target[1].value, time: e.target[2].value }); saveData(); closeModal('class-modal'); e.target.reset(); };
document.getElementById('task-form').onsubmit = e => { e.preventDefault(); tasks.push({ id: Date.now().toString(), desc: e.target[0].value, subjectId: e.target[1].value, date: e.target[2].value, completed: false }); saveData(); closeModal('task-modal'); e.target.reset(); };
document.getElementById('exam-form').onsubmit = e => { e.preventDefault(); if(!e.target[1].value) return alert('اختر مادة'); exams.push({ id: Date.now().toString(), title: e.target[0].value, subjectId: e.target[1].value, date: e.target[2].value }); saveData(); closeModal('exam-modal'); e.target.reset(); };
document.getElementById('flashcard-form').onsubmit = e => { e.preventDefault(); flashcards.push({ id: Date.now().toString(), subjectId: e.target[0].value, q: e.target[1].value, a: e.target[2].value }); saveData(); closeModal('flashcard-modal'); e.target.reset(); };

document.getElementById('task-date').value = getTodayInfo().dateString;

// --- Deletions ---
window.deleteSubject = id => { if(confirm('متأكد؟ سيتم حذف الدروس والامتحانات المتعلقة.')){ subjects=subjects.filter(s=>s.id!==id); classes=classes.filter(c=>c.subjectId!==id); exams=exams.filter(e=>e.subjectId!==id); saveData(); } }
window.deleteClass = id => { if(confirm('حذف الدرس؟')) { classes = classes.filter(c=>c.id!==id); saveData(); } }
window.deleteTask = id => { if(confirm('حذف المهمة؟')) { tasks = tasks.filter(t=>t.id!==id); saveData(); } }
window.deleteExam = id => { if(confirm('حذف الامتحان؟')) { exams = exams.filter(e=>e.id!==id); saveData(); } }
window.deleteFlashcard = id => { if(confirm('حذف البطاقة؟')) { flashcards = flashcards.filter(f=>f.id!==id); saveData(); } }
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
    const alertBox = document.getElementById("api-key-alert");
    if(alertBox) alertBox.style.display = "block";
}
window.saveApiKey = () => {
    const k = document.getElementById('api-key-input').value.trim();
    if(k) { geminiApiKey = k; localStorage.setItem('study_gemini_api', k); checkApiKey(); alert('تم الحفظ بنجاح!'); }
}
window.switchAITab = tabId => {
    document.querySelectorAll('.ai-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.ai-tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

async function callGeminiAPI(parts) {
    const hasMedia = parts.some(p => p.inlineData);

    if (aiProvider === 'gemini' || !groqApiKey) {
        if (!geminiApiKey) {
            alert("يرجى إدخال مفتاح Google Gemini في إعدادات الذكاء الاصطناعي!");
            document.getElementById('ai-loading').style.display = 'none';
            return null;
        }
        return await callGeminiAPICore(parts);
    } else {
        if (!groqApiKey) {
            alert("يرجى إدخال مفتاح Groq في إعدادات الذكاء الاصطناعي!");
            document.getElementById('ai-loading').style.display = 'none';
            return null;
        }
        return await callGroqAPI(parts);
    }
}

async function callGroqAPI(parts, modelIndex = 0) {
    const hasMedia = parts.some(p => p.inlineData);
    let messageContent = [];

    // Fallback Models List (The Final Solution)
    const textModels = ["openai/gpt-oss-120b", "deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    const visionModels = ["llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"];
    
    const modelsList = hasMedia ? visionModels : textModels;

    if (modelIndex >= modelsList.length) {
        alert("عذراً، فشلت جميع نماذج Groq. آخر خطأ كان: " + (window.lastGroqError || "غير معروف") + "\n\nتأكدي إنك مش مشغلة VPN بيتعارض مع Groq.");
        document.getElementById('ai-loading').style.display = 'none';
        const contentBox = document.getElementById('ai-result-content');
        if(contentBox) contentBox.innerHTML = '<div style="color:var(--danger); text-align:center; padding:20px;">فشل الاتصال بالذكاء الاصطناعي. مفتاحك غير صالح.</div>';
        return null;
    }

    const groqModel = modelsList[modelIndex];

    if (hasMedia) {
        parts.forEach(p => {
            if (p.text) {
                messageContent.push({ type: "text", text: p.text });
            } else if (p.inlineData) {
                messageContent.push({ 
                    type: "image_url", 
                    image_url: { url: "data:" + p.inlineData.mimeType + ";base64," + p.inlineData.data } 
                });
            }
        });
    } else {
        const textPrompt = parts.map(p => p.text).join('\n');
        messageContent = textPrompt;
    }

    if (modelIndex === 0) {
        document.getElementById('ai-loading').style.display = 'block';
        const outputContainer = document.getElementById('ai-output-container');
        if (outputContainer) outputContainer.style.display = 'block';

        const contentBox = document.getElementById('ai-result-content');
        if(contentBox) contentBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التفكير باستعمال Groq...';

        const mermaidContainer = document.getElementById('mermaid-container');
        if(mermaidContainer) mermaidContainer.style.display = 'none';
    }

    try {
        const payload = {
            model: groqModel,
            messages: [{ role: "user", content: messageContent }],
            temperature: 0.7,
            stream: true
        };

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': "Bearer " + groqApiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            const errMsg = err.error?.message || response.statusText;
            
            // AUTOMATIC FALLBACK LOGIC
            window.lastGroqError = groqModel + ": " + errMsg;
            if (response.status === 404 || response.status === 400 || response.status === 403 || errMsg.toLowerCase().includes("does not exist") || errMsg.toLowerCase().includes("not found")) {
                console.warn(groqModel + " failed. Trying next Groq model...");
                return await callGroqAPI(parts, modelIndex + 1);
            }

            alert("حدث خطأ في Groq: " + errMsg);
            document.getElementById('ai-loading').style.display = 'none';
            return null;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let isFirstChunk = true;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.substring(6));
                        const textChunk = data.choices[0]?.delta?.content || '';
                        fullText += textChunk;

                        if (isFirstChunk) {
                            if(contentBox) contentBox.innerHTML = '';
                            isFirstChunk = false;
                        }

                        if(contentBox) {
                            contentBox.innerHTML = marked.parse(fullText);
                        }
                    } catch (e) { }
                }
            }
        }
        
        return fullText;
    } catch (e) {
        alert("حدث خطأ أثناء الاتصال بـ Groq: " + e.message);
        document.getElementById('ai-loading').style.display = 'none';
        return null;
    }
}

// --- AI Streaming Fetch Logic ---
async function callGeminiAPICore(parts, modelIndex = 0) {
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-flash-latest", "gemini-1.0-pro"];
    if (modelIndex >= models.length) {
        alert("للأسف، لم نتمكن من الوصول لأي نموذج ذكاء اصطناعي متاح حالياً. يرجى التأكد من صلاحية مفتاح API الخاص بك.");
        document.getElementById('ai-loading').style.display = 'none';
        const contentBox = document.getElementById('ai-result-content');
        if(contentBox) contentBox.innerHTML = '<div style="color:var(--danger); text-align:center; padding:20px;">فشل الاتصال بـ Gemini. مفتاحك غير صالح أو محظور.</div>';
        return null;
    }

    const currentModel = models[modelIndex];

    if (modelIndex === 0) {
        document.getElementById("ai-loading").style.display = "block";
        const outputContainer = document.getElementById("ai-output-container");
        if (outputContainer) outputContainer.style.display = "block";
        
        const contentBox = document.getElementById("ai-result-content");
        if(contentBox) contentBox.innerHTML = "<i class=\"fa-solid fa-spinner fa-spin\"></i> جاري التفكير واستخراج الإجابة...";
        
        const mermaidContainer = document.getElementById("mermaid-container");
        if(mermaidContainer) mermaidContainer.style.display = "none";
    }

    if (!geminiApiKey) {
        alert("برجاء إدخال مفتاح API الخاص بك من إعدادات الذكاء الاصطناعي أولاً!");
        document.getElementById("ai-loading").style.display = "none";
        return null;
    }

    try {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" + currentModel + ":streamGenerateContent?alt=sse&key=" + geminiApiKey;
        const payload = {
            contents: [{ parts: parts }],
            generationConfig: { temperature: 0.7 }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            const errMsg = err.error?.message || response.statusText;
            
            // If the model is not found or unsupported, fallback to the next model automatically
            if (response.status === 404 || response.status === 400 || errMsg.toLowerCase().includes("not found") || errMsg.toLowerCase().includes("not supported")) {
                console.warn(currentModel + " failed. Trying next model...");
                return await callGeminiAPICore(parts, modelIndex + 1);
            }
            
            if(response.status === 503 || response.status === 429) {
                alert("السيرفرات عليها ضغط دلوقتي أو تم الوصول للحد الأقصى! جرب تاني كمان دقيقة.");
            } else {
                alert("حدث خطأ: " + errMsg);
            }
            document.getElementById("ai-loading").style.display = "none";
            return null;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let isFirstChunk = true;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for(let line of lines) {
                if(line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if(dataStr) {
                        try {
                            const dataObj = JSON.parse(dataStr);
                            const textPart = dataObj.candidates[0].content.parts[0].text;
                            fullText += textPart;
                            if(isFirstChunk) {
                                document.getElementById('ai-loading').style.display = 'none';
                                isFirstChunk = false;
                            }
                            // Real-time render
                            contentBox.innerHTML = marked.parse(fullText + ' ✍️');
                        } catch(e) {}
                    }
                }
            }
        }
        
        // Done streaming! Now process final output to extract mermaid
        return fullText;

    } catch (e) {
        console.error("AI Error:", e);
        alert('حدث خطأ في الاتصال: ' + e.message);
        document.getElementById('ai-loading').style.display = 'none';
        return null;
    }
}

async function processAIOutput(text) {
    const strictMermaidRegex = /```(?:mermaid)?[^\n]*\n([\s\S]*?)```/i;
    const matchStrict = text.match(strictMermaidRegex);
    let mermaidCode = '';
    
    if(matchStrict && (text.includes('mermaid') || matchStrict[1].includes('graph') || matchStrict[1].includes('flowchart') || matchStrict[1].includes('mindmap'))) {
        mermaidCode = matchStrict[1];
        text = text.replace(strictMermaidRegex, ''); 
    }
    
    document.getElementById('ai-output-container').style.display = 'block';
    document.getElementById('ai-result-content').innerHTML = marked.parse(text);
    
    const mermaidContainer = document.getElementById('mermaid-container');
    if(mermaidCode) {
        mermaidContainer.style.display = 'block';
        mermaidContainer.innerHTML = '<div style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> جاري رسم الخريطة...</div>';
        try {
            


// ====== Notifications System (Motivational + Prayer Times) ======
(function() {
    // Motivational messages
    const motivationalMsgs = [
        { title: "قوم ذاكر! 📚", body: "كل دقيقة بتضيعها مش هترجع.. قوم ابدأ دلوقتي!" },
        { title: "فاكر حلمك؟ 🌟", body: "النجاح مش بييجي لوحده.. قوم اعمل اللي عليك!" },
        { title: "وقت المذاكرة! ⏰", body: "ربع ساعة بس ابدأ بيها وهتلاقي نفسك كملت!" },
        { title: "أنت قدها! 💪", body: "ثق في نفسك وابدأ.. مفيش حاجة صعبة على اللي بيحاول!" },
        { title: "ذاكر شوية 📖", body: "المذاكرة اليومية ولو بسيطة أحسن من التراكم!" },
        { title: "تحفيز! 🔥", body: "اللي بيذاكر كل يوم شوية بيلاقي نفسه متفوق آخر السنة!" },
        { title: "قوم يا بطل! 🏆", body: "كل ما تذاكر دلوقتي هتشكر نفسك بعدين!" },
        { title: "ورد يومك! 📝", body: "خلصت مذاكرة النهاردة؟ لسه فاضل وقت ابدأ!" },
        { title: "فكرة حلوة 💡", body: "راجع اللي ذاكرته امبارح 10 دقائق بس.. هيفرق معاك!" },
        { title: "ما تنساش! 🎯", body: "هدفك قريب.. بس محتاج منك شوية مجهود كمان!" }
    ];

    // Prayer names
    const prayerNames = {
        Fajr: "الفجر 🌅",
        Sunrise: "الشروق ☀️",
        Dhuhr: "الظهر 🕐",
        Asr: "العصر 🌤️",
        Maghrib: "المغرب 🌅",
        Isha: "العشاء 🌙"
    };

    // Request notification permission
    async function requestNotifPermission() {
        if (!("Notification" in window)) return false;
        if (Notification.permission === "granted") return true;
        if (Notification.permission === "denied") return false;
        const perm = await Notification.requestPermission();
        return perm === "granted";
    }

    // Show notification
    function showNotification(title, body, icon) {
        if (Notification.permission !== "granted") return;
        
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(title, {
                    body: body,
                    icon: icon || "icons/icon-192.png",
                    badge: "icons/icon-192.png",
                    vibrate: [200, 100, 200],
                    dir: "rtl",
                    lang: "ar",
                    tag: title,
                    renotify: true
                });
            });
        } else {
            new Notification(title, { body: body, icon: icon || "icons/icon-192.png", dir: "rtl" });
        }
    }

    // Fetch prayer times
    async function fetchPrayerTimes() {
        try {
            const saved = localStorage.getItem("study_prayer_times");
            const savedDate = localStorage.getItem("study_prayer_date");
            const today = new Date().toDateString();
            
            if (saved && savedDate === today) {
                return JSON.parse(saved);
            }

            // Try geolocation first
            let lat = 30.0444, lng = 31.2357; // Default: Cairo
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            } catch(e) {}

            const res = await fetch("https://api.aladhan.com/v1/timings/" + Math.floor(Date.now()/1000) + "?latitude=" + lat + "&longitude=" + lng + "&method=5");
            const data = await res.json();
            
            if (data.code === 200) {
                const timings = data.data.timings;
                localStorage.setItem("study_prayer_times", JSON.stringify(timings));
                localStorage.setItem("study_prayer_date", today);
                return timings;
            }
        } catch(e) {
            console.log("Prayer times fetch error:", e);
        }
        return null;
    }

    // Check prayer times
    let notifiedPrayers = JSON.parse(localStorage.getItem("study_notified_prayers") || "{}");
    
    async function checkPrayerTimes() {
        if (localStorage.getItem("study_prayer_notif") !== "true") return;
        
        const timings = await fetchPrayerTimes();
        if (!timings) return;

        const now = new Date();
        const today = now.toDateString();
        
        // Reset notified prayers for new day
        if (notifiedPrayers._date !== today) {
            notifiedPrayers = { _date: today };
        }

        const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
        
        for (const prayer of prayers) {
            if (notifiedPrayers[prayer]) continue;
            
            const pTime = timings[prayer];
            if (!pTime) continue;
            
            const [h, m] = pTime.split(":").map(Number);
            const prayerMinutes = h * 60 + m;
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            
            // Notify 2 minutes before prayer
            if (nowMinutes >= prayerMinutes - 2 && nowMinutes <= prayerMinutes + 5) {
                showNotification(
                    "حان وقت صلاة " + prayerNames[prayer],
                    "قم للصلاة.. الصلاة خير من كل شيء 🤲",
                    "icons/icon-192.png"
                );
                notifiedPrayers[prayer] = true;
                localStorage.setItem("study_notified_prayers", JSON.stringify(notifiedPrayers));
            }
        }
    }

    // Send motivational notification
    let lastMotivTime = parseInt(localStorage.getItem("study_last_motiv") || "0");
    
    function checkMotivational() {
        if (localStorage.getItem("study_motiv_notif") !== "true") return;
        
        const interval = 90 * 60 * 1000; // Every 90 minutes
        if (Date.now() - lastMotivTime < interval) return;
        
        const msg = motivationalMsgs[Math.floor(Math.random() * motivationalMsgs.length)];
        showNotification(msg.title, msg.body);
        lastMotivTime = Date.now();
        localStorage.setItem("study_last_motiv", String(lastMotivTime));
    }

    // Initialize
    async function initNotifications() {
        const hasPermission = await requestNotifPermission();
        if (!hasPermission) return;
        
        // Enable both by default on first visit
        if (localStorage.getItem("study_motiv_notif") === null) {
            localStorage.setItem("study_motiv_notif", "true");
        }
        if (localStorage.getItem("study_prayer_notif") === null) {
            localStorage.setItem("study_prayer_notif", "true");
        }

        // Check every minute
        setInterval(() => {
            checkPrayerTimes();
            checkMotivational();
        }, 60000);

        // Initial check after 10 seconds
        setTimeout(() => {
            checkPrayerTimes();
            checkMotivational();
        }, 10000);
    }

    // Setup notification toggles
    window.addEventListener("DOMContentLoaded", () => {
        const motivToggle = document.getElementById("motiv-notif-toggle");
        const prayerToggle = document.getElementById("prayer-notif-toggle");

        if (motivToggle) {
            motivToggle.checked = localStorage.getItem("study_motiv_notif") === "true";
            motivToggle.addEventListener("change", async () => {
                if (motivToggle.checked) {
                    const ok = await requestNotifPermission();
                    if (!ok) { motivToggle.checked = false; alert("يرجى السماح بالإشعارات من إعدادات المتصفح"); return; }
                }
                localStorage.setItem("study_motiv_notif", motivToggle.checked ? "true" : "false");
            });
        }
        if (prayerToggle) {
            prayerToggle.checked = localStorage.getItem("study_prayer_notif") === "true";
            prayerToggle.addEventListener("change", async () => {
                if (prayerToggle.checked) {
                    const ok = await requestNotifPermission();
                    if (!ok) { prayerToggle.checked = false; alert("يرجى السماح بالإشعارات من إعدادات المتصفح"); return; }
                }
                localStorage.setItem("study_prayer_notif", prayerToggle.checked ? "true" : "false");
            });
        }

        initNotifications();
    });
})();

mermaid.initialize({ startOnLoad: false, theme: 'default' });
            const { svg } = await mermaid.render('mermaid-graph-' + Date.now(), mermaidCode.trim());
            mermaidContainer.innerHTML = '<h3 style="color:var(--primary-color); margin-bottom:15px;"><i class="fa-solid fa-project-diagram"></i> الخريطة الذهنية</h3><div style="overflow-x:auto; background:white; padding:10px; border-radius:10px;">' + svg + '</div>';
        } catch (err) {
            console.error('Mermaid render error:', err);
            mermaidContainer.innerHTML = '<h3 style="color:var(--primary-color);"><i class="fa-solid fa-project-diagram"></i> الخريطة الذهنية</h3><div style="background:var(--bg-color); padding:10px; border-radius:8px; overflow-x:auto;"><pre style="color:var(--text-main); text-align:left;" dir="ltr"><code>' + mermaidCode.trim() + '</code></pre><p style="color:red; font-size:0.8rem;">حدث خطأ في رسم الخريطة، يرجى نسخ الكود أعلاه.</p></div>';
        }
    } else {
        mermaidContainer.style.display = 'none';
    }
}

window.generateMindmap = async () => {
    const text = document.getElementById('ai-lesson-text').value.trim();
    if(!text) return alert('يرجى لصق نص الدرس أولاً');
    
    const prompt = `أنت مساعد مذاكرة ذكي للطلاب العرب. اقرأ النص التالي ولخصه في نقاط واستخرج شفرات لتسهيل حفظه. ثم انشئ كود خريطة ذهنية بـ Mermaid.js داخل بلوك \`\`\`mermaid \`\`\`. النص: \n${text}`;
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
    if (!url) return alert('ألصق رابط فيديو يوتيوب أولاً!');

    const videoId = extractYouTubeId(url);
    if (!videoId) return alert('الرابط غير صحيح! تأكد من أنه رابط يوتيوب.');

    const status = document.getElementById('yt-fetch-status');
    status.style.display = 'block';
    status.style.background = 'var(--bg-color)';
    status.style.color = 'var(--text-muted)';
    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري جلب نص الفيديو...';

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
        status.innerHTML = '✅ تم جلب نص الفيديو بنجاح! اضغط "استخراج الزبدة والملخص" الآن.';
    } else {
        status.style.background = 'rgba(255,0,0,0.1)';
        status.style.color = 'var(--danger)';
        status.innerHTML = '⚠️ لم نتمكن من جلب النص تلقائياً (الفيديو قد لا يحتوي على ترجمة). يمكنك لصق النص يدوياً في المربع أدناه.';
    }
}

window.summarizeYouTube = async () => {
    const text = document.getElementById('ai-youtube-text').value.trim();
    if(!text) return alert('يرجى لصق نص فيديو اليوتيوب أولاً');
    
    const prompt = `أنت مساعد مذاكرة. هذا نص (Transcript) لفيديو تعليمي. قم بتلخيصه، استخراج الزبدة وأهم النقاط للحفظ، ورتبها بشكل جميل بـ Markdown. النص: \n${text}`;
    const res = await callGeminiAPI([{ text: prompt }]);
    if(res) processAIOutput(res);
}

window.summarizeImage = async () => {
    const fileInput = document.getElementById('ai-image-upload');
    if(fileInput.files.length === 0) return alert('يرجى اختيار صورة (سكرين شوت) أولاً!');
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1];
        const mimeType = file.type;
                const promptText = `أنت مساعد مذاكرة ذكي للطلاب. هذا تسجيل صوتي لدرس أو محاضرة.
استمع إلى التسجيل بتركيز، ثم قم بتلخيص أهم النقاط التي قالها المدرس بشكل منظم ومرتب في نقاط.
وإذا أمكن، استخرج شفرات حفظ أو طرق سهلة لتذكر المعلومات التي ذكرها.
ملاحظة: إذا كان التسجيل غير واضح، اشرح ما تمكنت من فهمه فقط.`;
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
        if(e.error === 'not-allowed') { alert('اسمح للميكروفون!'); isDictating = false; }
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
    if (!recognition) return alert('متصفحك لا يدعم هذه الخاصية. استخدم جوجل كروم.');
    const btn = document.getElementById('btn-dictation');
    if (isDictating) {
        recognition.stop(); isDictating = false;
        btn.innerHTML = '<i class="fa-solid fa-microphone"></i> ابدأ الاستماع والتسجيل'; btn.style.backgroundColor = 'var(--danger)';
    } else {
        recognition.start(); isDictating = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> إيقاف الاستماع'; btn.style.backgroundColor = 'var(--text-muted)';
    }
}

window.summarizeDictation = async () => {
    const text = document.getElementById('dictation-text').value.trim();
    if(!text) return alert('لا يوجد نص. قم بالتشغيل أولاً.');
    const prompt = `هذا تفريغ صوتي لشرح مدرس. صحح الأخطاء ولخصه بـ "الزبدة" مرتبة في نقاط.\n${text}`;
    const res = await callGeminiAPI([{ text: prompt }]);
    if(res) processAIOutput(res);
}

// --- PDF Summarization ---
window.summarizePDF = async () => {
    const fileInput = document.getElementById('ai-pdf-upload');
    if(fileInput.files.length === 0) return alert('يرجى اختيار ملف PDF أولاً!');

    const file = fileInput.files[0];
    if(file.type !== 'application/pdf') return alert('يرجى اختيار ملف بصيغة PDF فقط!');

    try {
        document.getElementById('ai-loading').style.display = 'block';
        document.getElementById('ai-output-container').style.display = 'none';

        const arrayBuffer = await file.arrayBuffer();
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const totalPages = pdf.numPages;

        document.getElementById('pdf-page-info').style.display = 'block';
        document.getElementById('pdf-page-count').textContent = `📄 تم تحميل الملف: ${totalPages} صفحة`;

        let fullText = '';
        const maxPages = Math.min(totalPages, 30); // Limit to 30 pages for API
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += `\n--- صفحة ${i} ---\n${pageText}`;
        }

        if(!fullText.trim()) {
            alert('هذا الملف يبدو أنه يحتوي على صور فقط (Scanned PDF) ولا يمكن قراءة النص منه. جرب التقاط صورة (Screenshot) واستخدم تلخيص الصور بدلاً من ذلك.');
            document.getElementById('ai-loading').style.display = 'none';
            return;
        }

        // Truncate if text is too long for the API
        if(fullText.length > 25000) fullText = fullText.substring(0, 25000) + '\n...(تم اقتطاع الباقي لتجنب تجاوز الحد)';

        const prompt = `أنت مساعد مذاكرة ذكي ومتخصص للطلاب العرب. تم إعطاؤك نص مستخرج من ملف PDF دراسي.
المطلوب منك:
1. **ملخص شامل ومنظم** للمحتوى في نقاط واضحة مع عناوين فرعية
2. **شفرات وأساليب للتذكر** (Mnemonics) لأهم المعلومات والمصطلحات
3. **خريطة ذهنية** بصيغة Mermaid.js داخل بلوك \`\`\`mermaid \`\`\` توضح العلاقات بين المفاهيم الرئيسية
4. **أسئلة مراجعة سريعة** (3-5 أسئلة) لاختبار الفهم

النص المستخرج من الملف:
${fullText}`;

        const res = await callGeminiAPI([{ text: prompt }]);
        if(res) processAIOutput(res);
    } catch(e) {
        alert('حدث خطأ في قراءة الملف: ' + e.message);
        document.getElementById('ai-loading').style.display = 'none';
    }
}

// --- Study Motivation Notifications ---
const motivationMessages = [
    "⏰ هل بدأت مذاكرتك اليوم؟ كل دقيقة بتفرق!",
    "📚 مراجعة سريعة أحسن من مراجعة متأخرة!",
    "💪 ذاكرت شوية النهاردة؟ حتى لو 10 دقايق، ابدأ دلوقتي!",
    "🎯 فاكر المهام اللي عليك؟ ادخل التطبيق وخلصها!",
    "🧠 عقلك محتاج تمرين! افتح بطاقات الحفظ وراجع شوية.",
    "🌟 النجاح مش بالحظ، النجاح بالاستمرارية. ذاكر حتى لو شوية!",
    "📖 أقرب امتحان بيقرب.. متضيعش وقت!",
    "🔥 حاول تخلص مهمة واحدة على الأقل النهاردة!"
];

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendStudyNotification() {
    const msg = motivationMessages[Math.floor(Math.random() * motivationMessages.length)];
    
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('تطبيق المذاكرة المتكامل 📚', {
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

// --- Backlog Tracker ("لمّ المتراكم") ---
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
        const deadlineText = b.deadline ? `<br><i class="fa-solid fa-flag"></i> الموعد النهائي: ${b.deadline}` : '';
        const isDone = b.completedLectures >= b.totalLectures;
        
        list.innerHTML += `
            <div class="card" style="border-top:4px solid ${isDone ? 'var(--success)' : 'var(--primary-color)'};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0;">${isDone ? '✅' : '📦'} ${b.subject}</h3>
                    <button onclick="deleteBacklog('${b.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.1rem;"><i class="fa-solid fa-trash"></i></button>
                </div>
                
                <div style="background:var(--bg-color); border-radius:8px; padding:10px; margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>${isDone ? 'تم اللمّ! 🎉' : `باقي ${remaining} محاضرة`}</span>
                        <strong style="color:var(--primary-color);">${progress}%</strong>
                    </div>
                    <div style="height:10px; background:var(--border-color); border-radius:10px; overflow:hidden;">
                        <div style="height:100%; width:${progress}%; background:${isDone ? 'var(--success)' : 'var(--primary-color)'}; border-radius:10px; transition:width 0.3s;"></div>
                    </div>
                </div>
                
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px;">
                    <i class="fa-regular fa-clock"></i> بدأت: ${startDate} | ⏱️ وقت المذاكرة: ${Math.round(b.studyMinutes)} دقيقة
                    ${deadlineText}
                </div>
                
                ${!isDone ? `
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-primary" onclick="completeBacklogLecture('${b.id}')" style="flex:1;"><i class="fa-solid fa-check"></i> خلصت محاضرة!</button>
                    <button class="btn" onclick="generateBacklogPlan('${b.id}')" style="flex:1; background:var(--bg-color); border:1px solid var(--border-color); color:var(--text-main);"><i class="fa-solid fa-wand-magic-sparkles"></i> خطة لمّ</button>
                </div>` : '<p style="text-align:center; color:var(--success); font-weight:bold;">مبروك! لميت كل المتراكم 🎊</p>'}
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
            alert(`🎉 مبروك! لميت كل المتراكم في مادة "${b.subject}"! فخورين بيك!`);
        }
    }
};

window.deleteBacklog = (id) => {
    if (confirm('حذف هذه المادة من المتراكم؟')) {
        backlogs = backlogs.filter(x => x.id !== id);
        localStorage.setItem('study_backlogs', JSON.stringify(backlogs));
        renderBacklogs();
    }
};

window.generateBacklogPlan = async (id) => {
    const b = backlogs.find(x => x.id === id);
    if (!b) return;
    
    const remaining = b.totalLectures - b.completedLectures;
    const deadlineInfo = b.deadline ? `بموعد نهائي: ${b.deadline}` : `من غير موعد نهائي محدد`;
    
    const prompt = `أنت خبير جدولة وقت. يوجد مادة باسم "${b.subject}" متبقي منها ${remaining} محاضرات وكل محاضرة مدتها حوالي ${b.lectureDuration} دقيقة. ${deadlineInfo}.
    
كيف يمكنني تقسيم ومذاكرة هذه المحاضرات في الأيام القادمة (مع خطة يومية)؟ مع إضافة نصائح سريعة لعدم الملل. اجعل الإجابة بالتفصيل ومنظمة بشكل مريح للعين.`;
    
    const resultContainer = document.getElementById("backlog-ai-result");
    const resultContent = document.getElementById("backlog-ai-content");
    
    if (resultContainer && resultContent) {
        resultContainer.style.display = "block";
        resultContent.innerHTML = "<div style=\"text-align:center; padding:30px;\"><i class=\"fa-solid fa-spinner fa-spin\" style=\"font-size:2rem; color:var(--primary-color);\"></i><p style=\"margin-top:10px;\">جاري إعداد الخطة الذكية للمادة...</p></div>";
        resultContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const res = await callGeminiAPI([{ text: prompt }]);
    
    if (res) {
        if (resultContainer && resultContent) {
            resultContent.innerHTML = marked.parse(res);
        } else {
            // Fallback just in case
            document.querySelectorAll(".nav-links li").forEach(n => n.classList.remove("active"));
            document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
            document.querySelector("[data-page=\"ai-assistant\"]").classList.add("active");
            document.getElementById("ai-assistant").classList.add("active-page");
            processAIOutput(res);
        }
    } else {
        if (resultContainer && resultContent) {
            resultContent.innerHTML = "<div style=\"color:var(--danger); text-align:center; padding:20px;\">فشل إنشاء الخطة. الرجاء المحاولة مرة أخرى أو التأكد من المفتاح.</div>";
        }
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
            return alert('حدث خطأ أثناء قراءة الـ PDF: ' + e.message);
        }
    }
    
    if (!text) return alert('الرجاء كتابة نص أو رفع ملف PDF أولاً!');
    if (text.length > 20000) text = text.substring(0, 20000);
    
    const quizType = document.getElementById('quiz-type').value;
    const quizCount = document.getElementById('quiz-count').value;
    
    const typeMap = {
        'mcq': 'اختيار من متعدد (4 خيارات لكل سؤال)',
        'truefalse': 'صح وخطأ',
        'fill': 'إكمال الفراغات',
        'mixed': 'مزيج من الأنواع (بعضها اختيار وبعضها صح وخطأ)'
    };
    
    document.getElementById('quiz-loading').style.display = 'block';
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('quiz-result').style.display = 'none';
    
    const prompt = `بناءً على النص التالي، قم بتوليد عدد ${quizCount} سؤال من نوع: ${typeMap[quizType]}.

قم بإرجاع JSON فقط بدون أي نصوص أخرى. الهيكل:
[
  {
    "type": "mcq",
    "question": "نص السؤال",
    "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
    "correct": 0
  },
  {
    "type": "truefalse",
    "question": "نص السؤال",
    "correct": true
  },
  {
    "type": "fill",
    "question": "السؤال مع _____ كفراغ",
    "correct": "الإجابة الصحيحة"
  }
]

النص:
${text}`;
    
    try {
        const res = await callGeminiAPI([{ text: prompt }]);
        document.getElementById("quiz-loading").style.display = "none";
        if (res) {
            try {
                const cleaned = res.replace(/```json/gi, "").replace(/```/g, "").trim();
                quizData = JSON.parse(cleaned);
                renderQuiz();
            } catch(e) {
                alert("فشل الذكاء الاصطناعي في تنسيق الاختبار. حاول مرة أخرى.");
            }
        }
    } catch(e) {
        document.getElementById("quiz-loading").style.display = "none";
        alert("حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.");
    }
};

document.getElementById('ai-schedule-form').onsubmit = async (e) => {
    e.preventDefault();
    const timePref = document.getElementById('ai-schedule-time').value;
    const hours = document.getElementById('ai-schedule-hours').value;
    const subjectsInput = document.getElementById('ai-schedule-subjects').value;
    
    document.getElementById('ai-schedule-loading').style.display = 'block';
    
    const prompt = `أنت خبير تنظيم وقت ودراسة.
أحتاج إلى جدول مذاكرة يومي ذكي بالمعطيات التالية:
1. الوقت المفضل للمذاكرة: ${timePref}
2. إجمالي ساعات المذاكرة المستهدفة: ${hours} ساعة
3. المواد المراد مذاكرتها: ${subjectsInput}

المطلوب:
قسم لي الوقت بتقنية البومودورو (Time-blocking) وتوزيع فترات الراحة بشكل ذكي. قدم الجدول مفصلاً.
اكتب الجدول بشكل مريح للعين باستخدام تنسيقات Markdown (بدون أي رسومات بيانية).
أضف نصيحة تحفيزية في البداية ونصيحة للمراجعة في النهاية.`;

    try {
        const res = await callGeminiAPI([{ text: prompt }]);
        document.getElementById("ai-schedule-loading").style.display = "none";
        closeModal("ai-schedule-modal");
        
        if (res) {
            const resultContainer = document.getElementById("schedule-ai-result");
            const resultContent = document.getElementById("schedule-ai-content");
            if (resultContainer && resultContent) {
                resultContainer.style.display = "block";
                resultContent.innerHTML = marked.parse(res);
                resultContainer.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
                document.querySelectorAll(".nav-links li").forEach(n => n.classList.remove("active"));
                document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
                document.querySelector('[data-page="ai-assistant"]').classList.add("active");
                document.getElementById("ai-assistant").classList.add("active-page");
                processAIOutput(res);
            }
        }
    } catch(e) {
        document.getElementById("ai-schedule-loading").style.display = "none";
        alert("حدث خطأ أثناء إنشاء الجدول. حاول مرة أخرى!");
    }
};




// ====== Notifications System (Motivational + Prayer Times) ======
(function() {
    // Motivational messages
    const motivationalMsgs = [
        { title: "قوم ذاكر! 📚", body: "كل دقيقة بتضيعها مش هترجع.. قوم ابدأ دلوقتي!" },
        { title: "فاكر حلمك؟ 🌟", body: "النجاح مش بييجي لوحده.. قوم اعمل اللي عليك!" },
        { title: "وقت المذاكرة! ⏰", body: "ربع ساعة بس ابدأ بيها وهتلاقي نفسك كملت!" },
        { title: "أنت قدها! 💪", body: "ثق في نفسك وابدأ.. مفيش حاجة صعبة على اللي بيحاول!" },
        { title: "ذاكر شوية 📖", body: "المذاكرة اليومية ولو بسيطة أحسن من التراكم!" },
        { title: "تحفيز! 🔥", body: "اللي بيذاكر كل يوم شوية بيلاقي نفسه متفوق آخر السنة!" },
        { title: "قوم يا بطل! 🏆", body: "كل ما تذاكر دلوقتي هتشكر نفسك بعدين!" },
        { title: "ورد يومك! 📝", body: "خلصت مذاكرة النهاردة؟ لسه فاضل وقت ابدأ!" },
        { title: "فكرة حلوة 💡", body: "راجع اللي ذاكرته امبارح 10 دقائق بس.. هيفرق معاك!" },
        { title: "ما تنساش! 🎯", body: "هدفك قريب.. بس محتاج منك شوية مجهود كمان!" }
    ];

    // Prayer names
    const prayerNames = {
        Fajr: "الفجر 🌅",
        Sunrise: "الشروق ☀️",
        Dhuhr: "الظهر 🕐",
        Asr: "العصر 🌤️",
        Maghrib: "المغرب 🌅",
        Isha: "العشاء 🌙"
    };

    // Request notification permission
    async function requestNotifPermission() {
        if (!("Notification" in window)) return false;
        if (Notification.permission === "granted") return true;
        if (Notification.permission === "denied") return false;
        const perm = await Notification.requestPermission();
        return perm === "granted";
    }

    // Show notification
    function showNotification(title, body, icon) {
        if (Notification.permission !== "granted") return;
        
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(title, {
                    body: body,
                    icon: icon || "icons/icon-192.png",
                    badge: "icons/icon-192.png",
                    vibrate: [200, 100, 200],
                    dir: "rtl",
                    lang: "ar",
                    tag: title,
                    renotify: true
                });
            });
        } else {
            new Notification(title, { body: body, icon: icon || "icons/icon-192.png", dir: "rtl" });
        }
    }

    // Fetch prayer times
    async function fetchPrayerTimes() {
        try {
            const saved = localStorage.getItem("study_prayer_times");
            const savedDate = localStorage.getItem("study_prayer_date");
            const today = new Date().toDateString();
            
            if (saved && savedDate === today) {
                return JSON.parse(saved);
            }

            // Try geolocation first
            let lat = 30.0444, lng = 31.2357; // Default: Cairo
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            } catch(e) {}

            const res = await fetch("https://api.aladhan.com/v1/timings/" + Math.floor(Date.now()/1000) + "?latitude=" + lat + "&longitude=" + lng + "&method=5");
            const data = await res.json();
            
            if (data.code === 200) {
                const timings = data.data.timings;
                localStorage.setItem("study_prayer_times", JSON.stringify(timings));
                localStorage.setItem("study_prayer_date", today);
                return timings;
            }
        } catch(e) {
            console.log("Prayer times fetch error:", e);
        }
        return null;
    }

    // Check prayer times
    let notifiedPrayers = JSON.parse(localStorage.getItem("study_notified_prayers") || "{}");
    
    async function checkPrayerTimes() {
        if (localStorage.getItem("study_prayer_notif") !== "true") return;
        
        const timings = await fetchPrayerTimes();
        if (!timings) return;

        const now = new Date();
        const today = now.toDateString();
        
        // Reset notified prayers for new day
        if (notifiedPrayers._date !== today) {
            notifiedPrayers = { _date: today };
        }

        const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
        
        for (const prayer of prayers) {
            if (notifiedPrayers[prayer]) continue;
            
            const pTime = timings[prayer];
            if (!pTime) continue;
            
            const [h, m] = pTime.split(":").map(Number);
            const prayerMinutes = h * 60 + m;
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            
            // Notify 2 minutes before prayer
            if (nowMinutes >= prayerMinutes - 2 && nowMinutes <= prayerMinutes + 5) {
                showNotification(
                    "حان وقت صلاة " + prayerNames[prayer],
                    "قم للصلاة.. الصلاة خير من كل شيء 🤲",
                    "icons/icon-192.png"
                );
                notifiedPrayers[prayer] = true;
                localStorage.setItem("study_notified_prayers", JSON.stringify(notifiedPrayers));
            }
        }
    }

    // Send motivational notification
    let lastMotivTime = parseInt(localStorage.getItem("study_last_motiv") || "0");
    
    function checkMotivational() {
        if (localStorage.getItem("study_motiv_notif") !== "true") return;
        
        const interval = 90 * 60 * 1000; // Every 90 minutes
        if (Date.now() - lastMotivTime < interval) return;
        
        const msg = motivationalMsgs[Math.floor(Math.random() * motivationalMsgs.length)];
        showNotification(msg.title, msg.body);
        lastMotivTime = Date.now();
        localStorage.setItem("study_last_motiv", String(lastMotivTime));
    }

    // Initialize
    async function initNotifications() {
        const hasPermission = await requestNotifPermission();
        if (!hasPermission) return;
        
        // Enable both by default on first visit
        if (localStorage.getItem("study_motiv_notif") === null) {
            localStorage.setItem("study_motiv_notif", "true");
        }
        if (localStorage.getItem("study_prayer_notif") === null) {
            localStorage.setItem("study_prayer_notif", "true");
        }

        // Check every minute
        setInterval(() => {
            checkPrayerTimes();
            checkMotivational();
        }, 60000);

        // Initial check after 10 seconds
        setTimeout(() => {
            checkPrayerTimes();
            checkMotivational();
        }, 10000);
    }

    // Setup notification toggles
    window.addEventListener("DOMContentLoaded", () => {
        const motivToggle = document.getElementById("motiv-notif-toggle");
        const prayerToggle = document.getElementById("prayer-notif-toggle");

        if (motivToggle) {
            motivToggle.checked = localStorage.getItem("study_motiv_notif") === "true";
            motivToggle.addEventListener("change", async () => {
                if (motivToggle.checked) {
                    const ok = await requestNotifPermission();
                    if (!ok) { motivToggle.checked = false; alert("يرجى السماح بالإشعارات من إعدادات المتصفح"); return; }
                }
                localStorage.setItem("study_motiv_notif", motivToggle.checked ? "true" : "false");
            });
        }
        if (prayerToggle) {
            prayerToggle.checked = localStorage.getItem("study_prayer_notif") === "true";
            prayerToggle.addEventListener("change", async () => {
                if (prayerToggle.checked) {
                    const ok = await requestNotifPermission();
                    if (!ok) { prayerToggle.checked = false; alert("يرجى السماح بالإشعارات من إعدادات المتصفح"); return; }
                }
                localStorage.setItem("study_prayer_notif", prayerToggle.checked ? "true" : "false");
            });
        }

        initNotifications();
    });
})();

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
            'الفجر': t.Fajr.split(' ')[0],
            'الظهر': t.Dhuhr.split(' ')[0],
            'العصر': t.Asr.split(' ')[0],
            'المغرب': t.Maghrib.split(' ')[0],
            'العشاء': t.Isha.split(' ')[0]
        };
        
        const container = document.getElementById('prayer-times-container');
        const formatTime = (timeStr) => {
            let [h, m] = timeStr.split(':');
            h = parseInt(h);
            const ampm = h >= 12 ? 'م' : 'ص';
            return `${h % 12 || 12}:${m} ${ampm}`;
        };
        
        container.innerHTML = `
            <div class="prayer-time-box"><strong>الفجر</strong><span>${formatTime(t.Fajr.split(' ')[0])}</span></div>
            <div class="prayer-time-box"><strong>الظهر</strong><span>${formatTime(t.Dhuhr.split(' ')[0])}</span></div>
            <div class="prayer-time-box"><strong>العصر</strong><span>${formatTime(t.Asr.split(' ')[0])}</span></div>
            <div class="prayer-time-box"><strong>المغرب</strong><span>${formatTime(t.Maghrib.split(' ')[0])}</span></div>
            <div class="prayer-time-box"><strong>العشاء</strong><span>${formatTime(t.Isha.split(' ')[0])}</span></div>
            <div class="prayer-time-box qiyam"><strong>قيام الليل</strong><span>${formatTime(t.Lastthird ? t.Lastthird.split(' ')[0] : "01:00")}</span></div>
        `;
        document.getElementById('current-city-label').innerText = userCity === 'Cairo' ? 'القاهرة' : userCity;
    }
}

// Prayer Alerts Logic
let lastPrayerAlert = '';
const prayerMessages = [
    "النجاح الحقيقي يبدأ من سجادة الصلاة.. اتركي المذاكرة لدقائق، فالصلاة تبارك في وقتك وفهمك.",
    "أرحنا بها يا بلال.. قومي للصلاة لتتجدد طاقتك وتعودي للمذاكرة بتركيز مضاعف.",
    "وما توفيقي إلا بالله.. الصلاة هي مفتاح كل الأبواب المغلقة، لا تؤجليها!",
    "من جعل الله أولويته، جعل الله التوفيق حليفه.. حي على الصلاة 🤍."
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
    document.getElementById('prayer-alert-title').innerText = `حان الآن أذان ${prayerName} 🕌`;
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
    const newCity = prompt('أدخل اسم مدينتك بالإنجليزية (مثال: Riyadh, Dubai):', userCity);
    const newCountry = prompt('أدخل اسم دولتك بالإنجليزية (مثال: Saudi Arabia, UAE):', userCountry);
    if(newCity && newCountry) {
        userCity = newCity; userCountry = newCountry;
        localStorage.setItem('study_city', userCity); localStorage.setItem('study_country', userCountry);
        document.getElementById('prayer-times-container').innerHTML = '<p style="text-align:center;">جاري التحميل...</p>';
        fetchPrayerTimes();
    }
}

const athkar = [
    "صلي على النبي ﷺ 🌸", "سبحان الله وبحمده، سبحان الله العظيم 🍃", "لا حول ولا قوة إلا بالله 💎", 
    "استغفر الله العظيم وأتوب إليه 🤲", "اللهم ارزقني قوة الحفظ وسرعة الفهم 💡", 
    "لا إله إلا أنت سبحانك إني كنت من الظالمين 🌟", "اللهم يسر لي أمري واشرح لي صدري ✨",
    "اللهم علمنا ما ينفعنا وانفعنا بما علمتنا 📚"
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
    const pwd = prompt('أدخلي كلمة المرور السرية لغرفة المراقبة (خاص بالمدير):');
    if (pwd === 'Malak2026') {
        // Switch to admin tab
        document.querySelectorAll('.nav-links li').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
        document.getElementById('nav-admin').classList.add('active');
        document.getElementById('admin').classList.add('active-page');
        window.loadAdminData();
    } else if (pwd !== null) {
        alert('عذراً، كلمة المرور خاطئة!');
    }
}

window.adminFetchedUsers = [];

window.loadAdminData = async () => {
    const content = document.getElementById('admin-content');
    content.innerHTML = '<div style="grid-column:1/-1; text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x text-blue"></i><p>جاري سحب البيانات الآمنة...</p></div>';
    
    if (!db) {
        content.innerHTML = '<p class="text-danger">تأكدي من إعدادات الفايربيز.</p>';
        return;
    }
    
    try {
        const snapshot = await db.collection('users_data').get();
        window.adminFetchedUsers = [];
        
        let studentsHtml = '';
        let teachersHtml = '';
        let sCount = 0;
        let tCount = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // فلترة وحذف الحسابات اللي بدون اسم أو المتكررة الفاضية
            if (!data.name || data.name === 'بدون اسم' || data.name.trim() === '') {
                // Remove from Firebase directly so it doesn't duplicate
                db.collection('users_data').doc(doc.id).delete();
                return; // Skip rendering
            }
            
            window.adminFetchedUsers.push(data);
            const index = window.adminFetchedUsers.length - 1;
            const dateStr = new Date(data.lastUpdated).toLocaleString('ar-EG');
            
            const isTeacher = data.role === 'teacher';
            const stageText = data.stage ? data.stage : 'غير محدد';
            const specText = data.specialty ? data.specialty : 'غير محدد';
            const badgeColor = isTeacher ? 'var(--orange)' : 'var(--primary-color)';
            
            let cardHtml = `
                <div class="card" style="border-top: 4px solid ${badgeColor}; cursor: pointer; transition: 0.2s;" onclick="viewAdminUser(${index})" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h3 style="margin:0;"><i class="fa-solid ${isTeacher ? 'fa-chalkboard-user' : 'fa-user'}"></i> ${data.name}</h3>
                        <span style="font-size:0.75rem; background:${badgeColor}; color:white; padding:3px 8px; border-radius:12px;">${stageText}</span>
                    </div>
                    ${isTeacher ? `<p style="font-size:0.85rem; color:var(--text-main); margin-bottom:5px;"><strong>المواد:</strong> ${specText}</p><p style="font-size:0.85rem; color:var(--orange); font-weight:bold; margin-bottom:10px;">كود المدرس: ${data.teacherCode || 'لا يوجد'}</p>` : `<p style="font-size:0.85rem; color:var(--text-main); margin-bottom:10px;"><strong>التخصص:</strong> ${specText}</p>`}
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:15px;"><i class="fa-regular fa-clock"></i> آخر ظهور: ${dateStr}</p>
                    <button class="btn btn-outline" style="width: 100%; border-color: ${badgeColor}; color: ${badgeColor};"><i class="fa-solid fa-eye"></i> عرض التفاصيل</button>
                </div>
            `;
            
            if (isTeacher) {
                teachersHtml += cardHtml;
                tCount++;
            } else {
                studentsHtml += cardHtml;
                sCount++;
            }
        });
        
        let finalHtml = '';
        if (tCount > 0) {
            finalHtml += `<div style="grid-column: 1/-1; border-bottom: 2px solid var(--orange); padding-bottom: 10px; margin-bottom: 10px; margin-top: 20px;">
                <h2 style="color: var(--orange);"><i class="fa-solid fa-chalkboard-user"></i> المدرسين المسجلين (${tCount})</h2>
            </div>` + teachersHtml;
        }
        if (sCount > 0) {
            finalHtml += `<div style="grid-column: 1/-1; border-bottom: 2px solid var(--primary-color); padding-bottom: 10px; margin-bottom: 10px; margin-top: 20px;">
                <h2 style="color: var(--primary-color);"><i class="fa-solid fa-user-graduate"></i> الطلاب المسجلين (${sCount})</h2>
            </div>` + studentsHtml;
        }
        
        if (tCount === 0 && sCount === 0) {
            finalHtml = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted);">لا يوجد بيانات مسجلة حالياً.</p>';
        }
        content.innerHTML = finalHtml;
    } catch(e) {
        content.innerHTML = `<p class="text-danger" style="grid-column:1/-1; text-align:center;">حدث خطأ: ${e.message}</p>`;
    }
}

window.viewAdminUser = (index) => {
    const data = window.adminFetchedUsers[index];
    document.getElementById('admin-modal-name').innerText = data.name + (data.role === 'teacher' ? ' (مدرس)' : ' (طالب)');
    document.getElementById('admin-modal-stage').innerText = (data.stage || 'غير محدد') + ' | ' + (data.specialty || 'غير محدد');
    document.getElementById('admin-modal-lastseen').innerHTML = `<i class="fa-regular fa-clock"></i> آخر ظهور: ${new Date(data.lastUpdated).toLocaleString('ar-EG')}`;
    
    let detailsHtml = '';
    
    // Helper to resolve subject ID to Name
    const getSubjectName = (subId) => {
        if (!data.subjects || data.subjects.length === 0) return 'مادة';
        const s = data.subjects.find(x => x.id === subId);
        return s ? s.name : 'مادة';
    };
    
    if (data.role === 'teacher') {
        detailsHtml = `
            <div style="background: rgba(247, 127, 0, 0.1); border-right: 4px solid var(--orange); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: var(--orange); margin-bottom: 10px;"><i class="fa-solid fa-id-badge"></i> بيانات المدرس</h3>
                <p><strong>الكود الخاص به:</strong> <span style="background: var(--card-bg); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border-color);">${data.teacherCode || 'لا يوجد'}</span></p>
                <p><strong>المراحل التي يدرسها:</strong> ${data.stage || 'غير محدد'}</p>
                <p><strong>المواد التي يدرسها:</strong> ${data.specialty || 'غير محدد'}</p>
            </div>
        `;
        
        let linkedStudents = window.adminFetchedUsers.filter(u => u.role !== 'teacher' && u.linkedTeacher === data.teacherCode);
        detailsHtml += `<h3 style="margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:5px;"><i class="fa-solid fa-users"></i> الطلاب المرتبطين به (${linkedStudents.length})</h3>`;
        if (linkedStudents.length > 0) {
            detailsHtml += '<ul style="list-style:none; padding:0; margin:0;">';
            linkedStudents.forEach(stu => {
                detailsHtml += `<li style="margin-bottom:10px; padding:10px; background:var(--bg-color); border-radius:8px;"><i class="fa-solid fa-user-graduate text-primary"></i> <strong>${stu.name}</strong> (${stu.stage} | ${stu.specialty})</li>`;
            });
            detailsHtml += '</ul>';
        } else {
            detailsHtml += '<p style="color:var(--text-muted);">لا يوجد طلاب مسجلين بكود هذا المدرس حتى الآن.</p>';
        }
        
    } else {
        if (data.linkedTeacher) {
            detailsHtml += `
                <div style="background: rgba(67, 97, 238, 0.1); border-right: 4px solid var(--primary-color); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin:0;"><strong>مرتبط بمدرس كود:</strong> <span style="background: var(--card-bg); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border-color);">${data.linkedTeacher}</span></p>
                </div>
            `;
        }
        
        detailsHtml += `<h3 style="margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:5px;"><i class="fa-solid fa-list-check text-primary"></i> المهام المضافة</h3>`;
        if(data.tasks && data.tasks.length > 0) {
            detailsHtml += '<ul style="list-style:none; padding:0; margin:0; margin-bottom: 20px;">';
            data.tasks.forEach(t => {
                let subName = getSubjectName(t.subjectId);
                detailsHtml += `<li style="margin-bottom:10px; padding-bottom:10px; border-bottom:1px dashed var(--border-color);">
                    <span style="font-size: 1.1rem; margin-left: 10px;">${t.completed ? '✅' : '⏳'}</span>
                    <strong>${t.desc}</strong> <span style="font-size: 0.8rem; background: var(--primary-color); color: white; padding: 2px 6px; border-radius: 4px; margin-right: 10px;">${subName}</span>
                    <br><small style="color:var(--text-muted); margin-right: 35px;">ميعاد التسليم: ${t.date}</small>
                </li>`;
            });
            detailsHtml += '</ul>';
        } else {
            detailsHtml += '<p style="color:var(--text-muted); margin-bottom: 20px;">لم يقم بإضافة أي مهام.</p>';
        }

        detailsHtml += `<h3 style="margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:5px;"><i class="fa-solid fa-calendar-week text-primary"></i> جدول الحصص</h3>`;
        if(data.classes && data.classes.length > 0) {
            detailsHtml += '<ul style="list-style:none; padding:0; margin:0;">';
            const daysArray = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            let sortedClasses = [...data.classes].sort((a,b) => parseInt(a.day) - parseInt(b.day));
            sortedClasses.forEach(c => {
                let t = c.time.split(':');
                let h = parseInt(t[0]) % 12 || 12;
                let ampm = parseInt(t[0]) >= 12 ? 'م' : 'ص';
                let subName = getSubjectName(c.subjectId);
                detailsHtml += `<li style="margin-bottom:10px; padding:10px; background:var(--bg-color); border-radius:8px;">
                    <i class="fa-solid fa-book-open text-primary" style="margin-left: 10px;"></i>
                    <strong>يوم ${daysArray[c.day]}</strong> - الساعة ${h}:${t[1]} ${ampm} <span style="font-size: 0.8rem; background: var(--orange); color: white; padding: 2px 6px; border-radius: 4px; margin-right: 10px;">${subName}</span>
                </li>`;
            });
            detailsHtml += '</ul>';
        } else {
            detailsHtml += '<p style="color:var(--text-muted);">لم يقم بإضافة أي حصص.</p>';
        }
    }
    
    const modalTasks = document.getElementById('admin-modal-tasks');
    const modalClasses = document.getElementById('admin-modal-classes');
    
    if (modalTasks) modalTasks.innerHTML = detailsHtml;
    if (modalClasses) modalClasses.innerHTML = '';

    openModal('admin-user-modal');
}

// --- Welcome Quotes Logic ---
const welcomeQuotes = [
    "﴿ وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ ﴾",
    "قال رسول الله ﷺ: «مَن سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا، سَهَّلَ اللَّهُ له به طَرِيقًا إلى الجَنَّةِ»",
    "المذاكرة زي الدواء، طعمها مر بس بتعالج الجهل! قوم ذاكر يا بطل 😂",
    "كل قطرة تعب دلوقتي، هتوفر عليك دموع ندم يوم النتيجة.. هانت!",
    "النجاح مش بييجي للناس اللي بتستنى، بييجي للناس اللي بتعافر 🚀",
    "التعب بيزول ويفضل الأثر والنجاح.. متستسلمش أبداً!",
    "«العلم يبني بيوتاً لا عماد لها.. والجهل يهدم بيت العز والكرم»",
    "قوم ذاكر عشان تفرح أهلك، هما مستنيين يشوفوك في أحسن مكان ❤️",
    "الفرق بين الحلم والواقع هو (العمل).. اقفل السوشيال ميديا وابدأ!",
    "مش مهم بدأت متأخر، المهم إنك تبدأ وماتقفش 🐢💪"
];

window.addEventListener('load', () => {
    if (localStorage.getItem('study_role') === 'teacher' || localStorage.getItem('study_is_admin') === 'true') {
        let navTeacher = document.getElementById('nav-teacher');
        if (navTeacher) navTeacher.style.display = 'flex';
        let displayCode = document.getElementById('display-teacher-code');
        if (displayCode) displayCode.innerText = localStorage.getItem('study_teacher_code') || 'غير متوفر';
        if (typeof filterTeacherLibrary === 'function') filterTeacherLibrary();
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

// ====== Teacher Library ======
const teacherLibraryData = [
    { title: "مكتبة الوزارة الإلكترونية (كتب وتفاعليات)", stage: "all", subject: "all", type: "pdf", url: "https://ellibrary.moe.gov.eg/", category: "المصادر الرسمية وبنك المعرفة" },
    { title: "بوابة المناهج لوزارة التربية والتعليم", stage: "all", subject: "all", type: "exam", url: "https://moe.gov.eg/ar/elearningedubook/", category: "المصادر الرسمية وبنك المعرفة" },
    { title: "بنك المعرفة المصري EKB", stage: "all", subject: "all", type: "pdf", url: "https://www.ekb.eg/", category: "المصادر الرسمية وبنك المعرفة" },
    { title: "منصة البث المباشر (مراجعات وزارة التربية والتعليم)", stage: "ثانوي", subject: "all", type: "exam", url: "https://stream.moe.gov.eg/", category: "المصادر الرسمية وبنك المعرفة" },
    
    { title: "تجميعة كتب خارجية - KG 1", stage: "مرحلة تأسيس", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/zakrolykg/posts/1983734125690864/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - KG 2", stage: "مرحلة تأسيس", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/zakrolykg/posts/1983993745664902/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 1 ابتدائي", stage: "ابتدائي", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/233269024075082/posts/2064035784331721/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 2 ابتدائي", stage: "ابتدائي", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/zakrolypr2/posts/2211072595967702/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 3 ابتدائي", stage: "ابتدائي", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/zakrolypr3/posts/2469526460115469/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 4 ابتدائي", stage: "ابتدائي", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/zakrolypr4/posts/2509786096082454/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 5 ابتدائي", stage: "ابتدائي", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/zakrolypr5/posts/25513434495018506/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 6 ابتدائي", stage: "ابتدائي", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/zakrolypr6/posts/3342995755875917/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 1 إعدادي", stage: "إعدادي", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/zakrolyprep1/posts/1985630462347481/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 2 إعدادي", stage: "إعدادي", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/zakrolyprep2/posts/2124590038309056/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 3 إعدادي", stage: "إعدادي", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/zakrolyprep3/posts/2336296903461456/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 1 ثانوي", stage: "ثانوي", subject: "all", type: "pdf", url: "https://www.facebook.com/groups/zakrolysec1/posts/1175556341070501/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 2 ثانوي (علمي)", stage: "ثانوي", subject: "علمي", type: "pdf", url: "https://www.facebook.com/groups/zakrolysec2/posts/3785950905047036/", category: "المكتبة الشاملة (كتب وتقييمات)" },
    { title: "تجميعة كتب خارجية - 2 ثانوي (أدبي)", stage: "ثانوي", subject: "أدبي", type: "pdf", url: "https://www.facebook.com/groups/zakrolysec2/posts/3785953631713430/", category: "المكتبة الشاملة (كتب وتقييمات)" },

    { title: "البحث عن أحدث الكتب للمرحلة الابتدائية", stage: "ابتدائي", subject: "all", type: "exam", url: "https://www.google.com/search?q=تحميل+الكتب+الخارجية+للمرحلة+الابتدائية+pdf", category: "البحث السريع (لجميع الكتب والمراحل)" },
    { title: "البحث عن أحدث الكتب للمرحلة الإعدادية", stage: "إعدادي", subject: "all", type: "exam", url: "https://www.google.com/search?q=تحميل+الكتب+الخارجية+للمرحلة+الاعدادية+pdf", category: "البحث السريع (لجميع الكتب والمراحل)" },
    { title: "البحث عن أحدث الكتب للمرحلة الثانوية", stage: "ثانوي", subject: "all", type: "exam", url: "https://www.google.com/search?q=تحميل+الكتب+الخارجية+للمرحلة+الثانوية+pdf", category: "البحث السريع (لجميع الكتب والمراحل)" },

    { title: "كورس تعلم من الصفر المستوى الاول", stage: "مرحلة تأسيس", subject: "لغات", type: "pdf", url: "https://www.youtube.com/playlist?list=PLtB1YGL2ZGndh4A68M68K9q8isKk3F0d-", category: "كورسات التأسيس واللغات" },
    { title: "كورس القراءة المستوى الاول", stage: "مرحلة تأسيس", subject: "لغات", type: "pdf", url: "https://www.youtube.com/playlist?list=PLtB1YGL2ZGnca_pAiyWp3X1l3jQG4zJg8", category: "كورسات التأسيس واللغات" },
    { title: "كورس الصوتيات المستوى الاول", stage: "مرحلة تأسيس", subject: "لغات", type: "pdf", url: "https://www.youtube.com/playlist?list=PLtB1YGL2ZGnc3p_p1Yt9_zH7hO-3f8n93", category: "كورسات التأسيس واللغات" },
    { title: "كورس القواعد المستوى الاول", stage: "مرحلة تأسيس", subject: "لغات", type: "pdf", url: "https://www.youtube.com/playlist?list=PLtB1YGL2ZGnfrN3R4T75v_aO2Z5sF6H6C", category: "كورسات التأسيس واللغات" },
    { title: "كورس المحادثة المستوى الاول", stage: "مرحلة تأسيس", subject: "لغات", type: "pdf", url: "https://www.youtube.com/playlist?list=PLtB1YGL2ZGneGkE3A3e4q8y-D5Q5lB44b", category: "كورسات التأسيس واللغات" },
    { title: "كورس الاستماع المستوى الاول", stage: "مرحلة تأسيس", subject: "لغات", type: "pdf", url: "https://www.youtube.com/playlist?list=PLtB1YGL2ZGnfRkS2aAteL7x-X3x9Wb-p8", category: "كورسات التأسيس واللغات" },
    { title: "كورس الكتابة المستوى الاول", stage: "مرحلة تأسيس", subject: "لغات", type: "pdf", url: "https://www.youtube.com/playlist?list=PLtB1YGL2ZGncpwH_QoM5U3x_P6h0pW_2r", category: "كورسات التأسيس واللغات" },

    { title: "قناة مدرستنا للمرحلة الابتدائية", stage: "ابتدائي", subject: "all", type: "exam", url: "https://www.youtube.com/results?search_query=قناة+مدرستنا+المرحلة+الابتدائية", category: "قنوات يوتيوب تعليمية" },
    { title: "قناة مدرستنا للمرحلة الاعدادية", stage: "إعدادي", subject: "all", type: "exam", url: "https://www.youtube.com/results?search_query=قناة+مدرستنا+المرحلة+الاعدادية", category: "قنوات يوتيوب تعليمية" },
    { title: "قناة مدرستنا للمرحلة الثانوية", stage: "ثانوي", subject: "all", type: "exam", url: "https://www.youtube.com/results?search_query=قناة+مدرستنا+المرحلة+الثانوية", category: "قنوات يوتيوب تعليمية" }
];

window.filterTeacherLibrary = () => {
    const sVal = document.getElementById('teacher-stage-filter')?.value;
    const subVal = document.getElementById('teacher-subject-filter')?.value;
    const grid = document.getElementById('teacher-library-grid');
    if(!grid || !sVal || !subVal) return;
    
    grid.innerHTML = '';
    const filtered = teacherLibraryData.filter(i => (sVal === 'all' || i.stage === sVal || i.stage === 'all') && (subVal === 'all' || i.subject === subVal || i.subject === 'all' || i.stage === 'all'));
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">لا يوجد مصادر تطابق بحثك حالياً.</p>'; 
        return;
    }

    // Group items by category
    const grouped = {};
    filtered.forEach(item => {
        const cat = item.category || "مصادر عامة";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    // Render grouped items
    for (const [category, items] of Object.entries(grouped)) {
        grid.innerHTML += `<div style="grid-column: 1/-1; border-bottom: 2px solid var(--primary-color); padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">
            <h3 style="color: var(--primary-color);"><i class="fa-solid fa-layer-group"></i> ${category}</h3>
        </div>`;
        
        items.forEach(item => {
            let icon = item.type === 'pdf' ? 'fa-file-pdf' : 'fa-link';
            grid.innerHTML += `
            <div class="card">
                <h4 style="color:var(--primary-color); margin-bottom:10px;"><i class="fa-solid ${icon}"></i> ${item.title}</h4>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:15px;">${item.stage} | ${item.subject}</p>
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="display:block; text-align:center; text-decoration:none;"><i class="fa-solid fa-download"></i> عرض وتنزيل</a>
            </div>`;
        });
    }
};

// PDF Upload Handler for AI
window.handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const statusEl = document.getElementById('pdf-upload-status');
    const inputEl = document.getElementById('ai-input');
    
    statusEl.innerText = 'جاري قراءة الملف...';
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        if (!window.pdfjsLib) {
            statusEl.innerText = 'مكتبة PDF غير متوفرة. تأكد من اتصال الإنترنت.';
            return;
        }
        
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        const pdf = await window.pdfjsLib.getDocument({data: arrayBuffer}).promise;
        
        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 10); // Limit to 10 pages to avoid token explosion
        for(let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            fullText += strings.join(' ') + '\n';
        }
        
        statusEl.innerText = 'تم رفع الملف بنجاح! اضغط إرسال للتلخيص.';
        inputEl.value = "لخص هذا النص وأخرج منه أهم الأسئلة:\n\n" + fullText;
        
    } catch (err) {
        statusEl.innerText = 'حدث خطأ أثناء قراءة الملف.';
        console.error(err);
    }
};

// --- Logout Logic ---
window.logoutAccount = () => {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟ سيتم مسح بياناتك من هذا الجهاز لتسجيل حساب جديد.')) {
        localStorage.clear();
        location.reload();
    }
};
// --- Premium Mobile UX Navigation ---
window.toggleSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
        overlay.style.display = 'block';
        setTimeout(() => overlay.style.opacity = '1', 10);
    } else {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 300);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setupVoiceRecognition();
    // Sync username to mobile header
    if (studyUsername) {
        const mName = document.getElementById('mobile-welcome-name');
        if (mName) mName.innerText = studyUsername;
    }

    // Mobile Bottom Nav Logic
    const bottomNavItems = document.querySelectorAll('.mobile-bottom-nav .nav-item[data-page]');
    const allPages = document.querySelectorAll('.page');
    
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all nav items
            document.querySelectorAll('.nav-links li, .mobile-bottom-nav .nav-item').forEach(n => n.classList.remove('active'));
            
            // Add active to clicked item and corresponding sidebar item
            item.classList.add('active');
            const pageId = item.getAttribute('data-page');
            const sideItem = document.querySelector(`.nav-links li[data-page="${pageId}"]`);
            if (sideItem) sideItem.classList.add('active');
            
            // Show page
            allPages.forEach(p => p.classList.remove('active-page'));
            const t = document.getElementById(pageId);
            if(t) t.classList.add('active-page');
        });
    });

    // Make sidebar links update bottom nav too
    const sideNavItems = document.querySelectorAll('.nav-links li[data-page]');
    sideNavItems.forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(n => n.classList.remove('active'));
            const pageId = item.getAttribute('data-page');
            const botItem = document.querySelector(`.mobile-bottom-nav .nav-item[data-page="${pageId}"]`);
            if (botItem) botItem.classList.add('active');
            
            // Auto close sidebar on mobile after clicking
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    });
});

// --- Voice Recognition Logic ---
function setupVoiceRecognition() {
    const micBtn = document.getElementById('mic-btn');
    const aiInput = document.getElementById('ai-lesson-text');
    
    if (!micBtn || !aiInput) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        micBtn.style.display = 'none'; // Hide if browser doesn't support it
        console.log('Speech Recognition not supported in this browser.');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG'; // Arabic language
    recognition.interimResults = true; // Show results while talking
    recognition.maxAlternatives = 1;
    recognition.continuous = true; // Keep listening

    let isRecording = false;
    let finalTranscript = '';

    micBtn.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
            return;
        }
        
        finalTranscript = aiInput.value;
        if(finalTranscript && !finalTranscript.endsWith(' ')) finalTranscript += ' ';
        recognition.start();
    });

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
        micBtn.innerHTML = '<i class="fa-solid fa-microphone-lines fa-fade"></i>';
        micBtn.style.backgroundColor = 'var(--danger)';
        micBtn.style.boxShadow = '0 0 15px rgba(239, 35, 60, 0.6)';
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + ' ';
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        aiInput.value = finalTranscript + interimTranscript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error: ' + event.error);
        if(event.error === 'not-allowed') {
            alert('الرجاء إعطاء صلاحية استخدام الميكروفون للمتصفح حتى تتمكن من التسجيل.');
        }
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
        micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        micBtn.style.backgroundColor = 'var(--primary-color)';
        micBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    };
}
// --- Audio Upload Logic ---
window.summarizeAudio = async () => {
    const fileInput = document.getElementById('ai-audio-upload');
    if(fileInput.files.length === 0) return alert('يرجى اختيار ملف صوتي أولاً!');
    
    const file = fileInput.files[0];
    
    // Check size limit to avoid base64 huge payload crashing the browser
    if(file.size > 50 * 1024 * 1024) { // 50MB limit
        return alert('حجم الملف كبير جداً! أقصى حجم مسموح به هو 50 ميجابايت (حوالي ساعة من التسجيل).');
    }
    if(file.size > 15 * 1024 * 1024) {
        // Just a warning
        console.log("الملف كبير، قد يستغرق الرفع وقتاً.");
    }

    document.getElementById('ai-loading').style.display = 'block';
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1];
        let mimeType = file.type || "audio/mp3";
        
        // Some devices don't set mime type correctly or set unsupported ones
        if(!mimeType.startsWith('audio/')) {
            mimeType = 'audio/mp3'; // fallback
        }

                const promptText = `أنت مساعد مذاكرة ذكي للطلاب. هذا تسجيل صوتي لدرس أو محاضرة.
استمع إلى التسجيل بتركيز، ثم قم بتلخيص أهم النقاط التي قالها المدرس بشكل منظم ومرتب في نقاط.
وإذا أمكن، استخرج شفرات حفظ أو طرق سهلة لتذكر المعلومات التي ذكرها.
ملاحظة: إذا كان التسجيل غير واضح، اشرح ما تمكنت من فهمه فقط.`;
        
        const parts = [{ text: promptText }, { inlineData: { mimeType: mimeType, data: base64Data } }];
        const res = await callGeminiAPI(parts);
        if(res) processAIOutput(res);
    };
    
    reader.onerror = () => {
        alert("حدث خطأ أثناء قراءة الملف الصوتي.");
        document.getElementById('ai-loading').style.display = 'none';
    };
    
    reader.readAsDataURL(file);
};
// --- Teacher Dashboard: Load Students from Firebase ---
window.loadTeacherStudents = async () => {
    let tCode = localStorage.getItem('study_teacher_code');
    let role = localStorage.getItem('study_role');
    
    if (role !== 'teacher' || !tCode) return;
    
    const listElement = document.getElementById('teacher-students-list');
    const countElement = document.getElementById('teacher-students-count');
    
    if (!listElement) return;
    
    listElement.innerHTML = '<li class="list-item" style="justify-content:center; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> جاري جلب الطلاب...</li>';
    
    try {
        if (!db) throw new Error("Database not connected");
        const snapshot = await db.collection('teachers').doc(tCode).collection('students').orderBy('joinedAt', 'desc').get();
        
        if (snapshot.empty) {
            listElement.innerHTML = '<li class="list-item" style="justify-content:center; color:var(--text-muted);">لا يوجد طلاب مسجلين بكودك حتى الآن.</li>';
            if(countElement) countElement.textContent = "0";
            return;
        }
        
        listElement.innerHTML = '';
        let count = 0;
        
        snapshot.forEach(doc => {
            count++;
            const student = doc.data();
            const li = document.createElement('li');
            li.className = 'list-item';
            li.style.borderRight = '4px solid var(--primary-color)';
            
                        li.innerHTML = `
                <div class="task-content">
                    <div class="task-text" style="font-weight:bold; font-size:1.1rem;"><i class="fa-solid fa-user-graduate text-primary"></i> ` + student.name + `</div>
                    <div class="task-meta" style="margin-top:5px;">المرحلة: ` + student.stage + ` | التخصص: ` + student.spec + `</div>
                </div>
            `;
            listElement.appendChild(li);
        });
        
        if(countElement) countElement.textContent = count;
        
    } catch (error) {
        console.error("Error fetching students: ", error);
        listElement.innerHTML = '<li class="list-item" style="justify-content:center; color:var(--danger);">حدث خطأ أثناء الاتصال بقاعدة البيانات. تأكد من تفعيل Firestore.</li>';
    }
};
// --- AI Providers Settings ---
window.toggleApiInputs = () => {
    const provider = document.getElementById('ai-provider-select').value;
    if(provider === 'gemini') {
        document.getElementById('gemini-input-group').style.display = 'block';
        document.getElementById('groq-input-group').style.display = 'none';
    } else {
        document.getElementById('gemini-input-group').style.display = 'none';
        document.getElementById('groq-input-group').style.display = 'block';
    }
};

window.saveApiKeys = () => {
    const aiProviderEl = document.getElementById('ai-provider-select');
    if(aiProviderEl) aiProvider = aiProviderEl.value;
    
    const geminiEl = document.getElementById('gemini-api-key-input');
    if(geminiEl) geminiApiKey = geminiEl.value.trim();
    
    const groqEl = document.getElementById('groq-api-key-input');
    if(groqEl) groqApiKey = groqEl.value.trim();

    localStorage.setItem('study_ai_provider', aiProvider);
    localStorage.setItem('study_gemini_api', geminiApiKey);
    localStorage.setItem('study_groq_api', groqApiKey);

    alert('تم حفظ إعدادات الذكاء الاصطناعي بنجاح!');
};

window.openApiInstructions = () => {
    const modal = document.getElementById('api-instructions-modal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        alert('حدث خطأ: لم يتم العثور على نافذة التعليمات.');
    }
};

// ====== My Dream Logic ======
function editDream() {
    document.getElementById('dream-display-container').style.display = 'none';
    document.getElementById('dream-edit-container').style.display = 'flex';
    document.getElementById('dream-input').value = localStorage.getItem('study_dream') || '';
    document.getElementById('dream-input').focus();
}

function saveDream() {
    const val = document.getElementById('dream-input').value.trim();
    if (val) {
        localStorage.setItem('study_dream', val);
    } else {
        localStorage.removeItem('study_dream');
    }
    loadDream();
}

function loadDream() {
    const dream = localStorage.getItem('study_dream');
    const displayContainer = document.getElementById('dream-display-container');
    const editContainer = document.getElementById('dream-edit-container');
    const text = document.getElementById('dream-text');
    
    if (displayContainer && editContainer && text) {
        editContainer.style.display = 'none';
        displayContainer.style.display = 'block';
        if (dream) {
            text.innerHTML = '✨ ' + dream + ' ✨';
            text.style.color = '#ff9ff3';
        } else {
            text.innerHTML = 'لم تكتب حلمك بعد..';
            text.style.color = 'var(--text-muted)';
        }
    }
}

document.addEventListener('DOMContentLoaded', loadDream);


// ====== Challenges Logic ======
let flightInterval;

function startIceChallenge() {
    const btn = document.getElementById('ice-btn');
    if (btn.innerText.includes('ابدأ')) {
        btn.innerHTML = '<i class="fa-solid fa-snowflake"></i> التلج بيدوب... ركز!';
        btn.style.background = '#0984e3';
        alert('كوباية التلج قدامك؟ يلا ابدأ المذاكرة وماتقومش غير لما تدوب خالص! 🧊🔥');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> ابدأ التحدي دلوقتي';
        btn.style.background = 'linear-gradient(135deg, #74b9ff, #0984e3)';
    }
}

function startFlightChallenge() {
    const dest = document.getElementById('flight-destination');
    const btn = document.getElementById('flight-btn');
    const container = document.getElementById('flight-progress-container');
    const fill = document.getElementById('flight-progress-fill');
    const icon = document.getElementById('flight-icon');
    const timeLeftDisplay = document.getElementById('flight-time-left');

    if (btn.innerText.includes('إقلاع')) {
        const totalMinutes = parseInt(dest.value);
        let remainingSeconds = totalMinutes * 60;
        const totalSeconds = remainingSeconds;

        dest.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> هبوط اضطراري (إلغاء)';
        btn.style.background = '#e17055';
        container.style.display = 'block';

        clearInterval(flightInterval);
        flightInterval = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds <= 0) {
                clearInterval(flightInterval);
                dest.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-plane"></i> إقلاع!';
                btn.style.background = 'linear-gradient(135deg, #00b894, #00cec9)';
                timeLeftDisplay.innerText = "وصلنا بالسلامة! 🎉";
                fill.style.width = '100%';
                icon.style.left = '100%';
                alert('عاش يا بطل! الطيارة وصلت وأنت خلصت مذاكرة التحدي ده بنجاح! 🛬🏆');
                return;
            }

            const m = Math.floor(remainingSeconds / 60);
            const s = remainingSeconds % 60;
            timeLeftDisplay.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;

            const percent = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
            fill.style.width = percent + '%';
            // Adjust icon position slightly so it doesn't overflow
            icon.style.left = `calc(${percent}% - 10px)`;
        }, 1000);

    } else {
        clearInterval(flightInterval);
        dest.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plane"></i> إقلاع!';
        btn.style.background = 'linear-gradient(135deg, #00b894, #00cec9)';
        container.style.display = 'none';
        alert('تم إلغاء الرحلة.. الطيارة رجعت المطار 😅');
    }
}


// ====== Nightstand / WakeLock ======
let wakeLock = null;
let nightstandInterval = null;

async function startNightstand() {
    const nightstand = document.getElementById('nightstand-mode');
    if (!nightstand) return;
    
    // Request Wake Lock to keep screen on
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.log("WakeLock error: ", err);
    }
    
    nightstand.style.display = 'flex';
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => {});
    }
    
    updateNightstandTime();
    nightstandInterval = setInterval(updateNightstandTime, 1000);
    
    // Click to exit
    nightstand.onclick = exitNightstand;
}

function exitNightstand() {
    const nightstand = document.getElementById('nightstand-mode');
    if (nightstand) nightstand.style.display = 'none';
    
    if (wakeLock !== null) {
        wakeLock.release().catch(e => {});
        wakeLock = null;
    }
    
    clearInterval(nightstandInterval);
    
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => {});
    }
}

function updateNightstandTime() {
    const timeDisplay = document.getElementById('nightstand-time');
    if (!timeDisplay) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    timeDisplay.innerText = h + ':' + m;
    
    // Move slightly to prevent OLED burn-in
    const x = Math.floor(Math.random() * 20) - 10;
    const y = Math.floor(Math.random() * 20) - 10;
    timeDisplay.style.transform = `translate(${x}px, ${y}px)`;
}


// ====== What's New Modal ======
function closeWhatsNew() {
    const modal = document.getElementById('whats-new-modal');
    if (modal) {
        modal.style.display = 'none';
        localStorage.setItem('study_seen_update_v99', 'true');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('study_seen_update_v99')) {
        setTimeout(() => {
            const modal = document.getElementById('whats-new-modal');
            if (modal) modal.style.display = 'flex';
        }, 1500);
    }
});
\n
// ====== Additional Challenges Logic ======
let marathonInterval, isolationInterval, marsInterval, trainInterval;

function formatTimeHHMMSS(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function startCandleChallenge() {
    const btn = document.getElementById('candle-btn');
    if (btn.innerText.includes('ابدأ')) {
        btn.innerHTML = '<i class="fa-solid fa-fire"></i> الشمعة مولعة... ركز!';
        btn.style.background = '#c0392b';
        alert('ولع الشمعة دلوقتي! ماتقومش غير لما تطفي لوحدها 🔥');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> ابدأ التحدي دلوقتي';
        btn.style.background = 'linear-gradient(135deg, #e17055, #d63031)';
    }
}

function startMarathonChallenge() {
    const dest = document.getElementById('marathon-duration');
    const btn = document.getElementById('marathon-btn');
    const container = document.getElementById('marathon-progress-container');
    const timeLeftDisplay = document.getElementById('marathon-time-left');

    if (btn.innerText.includes('انطلاق')) {
        let remainingSeconds = parseInt(dest.value) * 60;
        dest.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> استسلام (إلغاء)';
        btn.style.background = '#7f8c8d';
        container.style.display = 'block';

        clearInterval(marathonInterval);
        marathonInterval = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds <= 0) {
                clearInterval(marathonInterval);
                dest.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-play"></i> انطلاق الماراثون!';
                btn.style.background = 'linear-gradient(135deg, #d63031, #c0392b)';
                timeLeftDisplay.innerText = "وصلت لخط النهاية! 🏆";
                alert('عاش يا وحش! خلصت الماراثون بنجاح!');
                return;
            }
            timeLeftDisplay.innerText = formatTimeHHMMSS(remainingSeconds);
        }, 1000);
    } else {
        clearInterval(marathonInterval);
        dest.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-play"></i> انطلاق الماراثون!';
        btn.style.background = 'linear-gradient(135deg, #d63031, #c0392b)';
        container.style.display = 'none';
        alert('انسحبت من الماراثون.. حاول تاني بعدين! 🏃‍♂️💨');
    }
}

function startIsolationChallenge() {
    const dest = document.getElementById('isolation-duration');
    const btn = document.getElementById('isolation-btn');
    const container = document.getElementById('isolation-progress-container');
    const timeLeftDisplay = document.getElementById('isolation-time-left');

    if (btn.innerText.includes('ابدأ العزل')) {
        let remainingSeconds = parseInt(dest.value) * 60;
        dest.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> كسر العزل (إلغاء)';
        btn.style.background = '#e74c3c';
        container.style.display = 'block';

        clearInterval(isolationInterval);
        isolationInterval = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds <= 0) {
                clearInterval(isolationInterval);
                dest.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-power-off"></i> ابدأ العزل!';
                btn.style.background = 'linear-gradient(135deg, #2d3436, #636e72)';
                timeLeftDisplay.innerText = "تمت المهمة بنجاح! 🌍";
                alert('أهلاً بيك في العالم الخارجي تاني! عملت إنجاز عظيم!');
                return;
            }
            timeLeftDisplay.innerText = formatTimeHHMMSS(remainingSeconds);
        }, 1000);
    } else {
        clearInterval(isolationInterval);
        dest.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-power-off"></i> ابدأ العزل!';
        btn.style.background = 'linear-gradient(135deg, #2d3436, #636e72)';
        container.style.display = 'none';
    }
}

function startBatteryChallenge() {
    const btn = document.getElementById('battery-btn');
    if (btn.innerText.includes('ابدأ')) {
        btn.innerHTML = '<i class="fa-solid fa-battery-quarter"></i> البطارية بتنقص... استعجل!';
        btn.style.background = '#c0392b';
        alert('افصل الشاحن دلوقتي.. وسابق الزمن! ⚡');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-bolt"></i> ابدأ التحدي';
        btn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
    }
}

function startCavemanChallenge() {
    const btn = document.getElementById('caveman-btn');
    if (btn.innerText.includes('اقفل')) {
        btn.innerHTML = '<i class="fa-solid fa-fire"></i> أنت في الكهف حالياً!';
        btn.style.background = '#7f8c8d';
        alert('أبعد أي جهاز إلكتروني عنك.. ورقة وقلم وبس! 🪨');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-leaf"></i> اقفل كل حاجة وابدأ';
        btn.style.background = 'linear-gradient(135deg, #8e44ad, #9b59b6)';
    }
}

function startMarsChallenge() {
    const dest = document.getElementById('mars-duration');
    const btn = document.getElementById('mars-btn');
    const container = document.getElementById('mars-progress-container');
    const timeLeftDisplay = document.getElementById('mars-time-left');

    if (btn.innerText.includes('إطلاق')) {
        let remainingSeconds = parseInt(dest.value) * 60;
        dest.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> إلغاء المهمة';
        btn.style.background = '#c0392b';
        container.style.display = 'block';

        clearInterval(marsInterval);
        marsInterval = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds <= 0) {
                clearInterval(marsInterval);
                dest.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-rocket"></i> إطلاق الصاروخ!';
                btn.style.background = 'linear-gradient(135deg, #d35400, #e67e22)';
                timeLeftDisplay.innerText = "هبطنا على المريخ! 🔴";
                alert('إنجاز تاريخي! هبطت على المريخ وخلصت أصعب تحدي! 🚀');
                return;
            }
            timeLeftDisplay.innerText = formatTimeHHMMSS(remainingSeconds);
        }, 1000);
    } else {
        clearInterval(marsInterval);
        dest.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rocket"></i> إطلاق الصاروخ!';
        btn.style.background = 'linear-gradient(135deg, #d35400, #e67e22)';
        container.style.display = 'none';
    }
}

function startPagesChallenge() {
    const btn = document.getElementById('pages-btn');
    if (btn.innerText.includes('قبلت')) {
        btn.innerHTML = '<i class="fa-solid fa-book-reader"></i> بتقرأ حالياً... ماتقفش!';
        btn.style.background = '#e67e22';
        alert('ابدأ من دلوقتي.. الهدف 100 صفحة! 📖');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-check-double"></i> قبلت التحدي';
        btn.style.background = 'linear-gradient(135deg, #f39c12, #f1c40f)';
    }
}

function startCoffeeChallenge() {
    const btn = document.getElementById('coffee-btn');
    if (btn.innerText.includes('جاهزة')) {
        btn.innerHTML = '<i class="fa-solid fa-mug-hot"></i> القهوة بتبرد... خلص بسرعة!';
        btn.style.background = '#e74c3c';
        alert('القهوة قدامك.. ممنوع الشرب لحد ما تخلص هدفك! ☕');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-mug-hot"></i> القهوة جاهزة';
        btn.style.background = 'linear-gradient(135deg, #7f8c8d, #95a5a6)';
    }
}

function startTrainChallenge() {
    const dest = document.getElementById('train-duration');
    const btn = document.getElementById('train-btn');
    const container = document.getElementById('train-progress-container');
    const timeLeftDisplay = document.getElementById('train-time-left');

    if (btn.innerText.includes('قطع التذكرة')) {
        let remainingSeconds = parseInt(dest.value) * 60;
        dest.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> النزول في محطة خاطئة';
        btn.style.background = '#e74c3c';
        container.style.display = 'block';

        clearInterval(trainInterval);
        trainInterval = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds <= 0) {
                clearInterval(trainInterval);
                dest.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-ticket"></i> قطع التذكرة!';
                btn.style.background = 'linear-gradient(135deg, #34495e, #2c3e50)';
                timeLeftDisplay.innerText = "وصلنا بالسلامة! 🚉";
                alert('وصلنا المحطة الأخيرة! رحلة ممتازة! 🚂');
                return;
            }
            timeLeftDisplay.innerText = formatTimeHHMMSS(remainingSeconds);
        }, 1000);
    } else {
        clearInterval(trainInterval);
        dest.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-ticket"></i> قطع التذكرة!';
        btn.style.background = 'linear-gradient(135deg, #34495e, #2c3e50)';
        container.style.display = 'none';
    }
}

function startAntChallenge() {
    const btn = document.getElementById('ant-btn');
    if (btn.innerText.includes('ابدأ')) {
        btn.innerHTML = '<i class="fa-solid fa-person-running"></i> نشاط مستمر... كمل!';
        btn.style.background = '#c0392b';
        alert('ابدأ مذاكرة.. وأول ما تخلص جزء قوم أعمل حاجة حركية! 🐜');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> ابدأ التحدي';
        btn.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
    }
}
