
window._hx = (s) => {
    let sum = 0;
    for (let i = 0; i < s.length; i++) {
        sum += s.charCodeAt(i) * (i + 1);
    }
    return sum;
};
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

window.logUsage = (action, duration = '') => {
    let logs = JSON.parse(localStorage.getItem('study_usage_logs') || '[]');
    logs.push({ action, duration, time: new Date().toLocaleString('ar-EG') });
    if(logs.length > 20) logs = logs.slice(logs.length - 20); // keep last 20
    localStorage.setItem('study_usage_logs', JSON.stringify(logs));
    setTimeout(syncToCloud, 1000);
};

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
    initChallengeDashboard();
    initBadges();

    // Interactive Background Glow
    document.addEventListener('mousemove', (e) => {
        if(document.body.getAttribute('data-theme') === 'dark') {
            document.body.style.setProperty('--mouse-x', e.clientX + 'px');
            document.body.style.setProperty('--mouse-y', e.clientY + 'px');
        }
    });
    document.addEventListener('touchmove', (e) => {
        if(document.body.getAttribute('data-theme') === 'dark' && e.touches.length > 0) {
            document.body.style.setProperty('--mouse-x', e.touches[0].clientX + 'px');
            document.body.style.setProperty('--mouse-y', e.touches[0].clientY + 'px');
        }
    }, {passive: true});


    
    document.addEventListener('touchmove', (e) => {
        if(document.body.getAttribute('data-theme') === 'dark' && e.touches.length > 0) {
            document.body.style.setProperty('--mouse-x', e.touches[0].clientX + 'px');
            document.body.style.setProperty('--mouse-y', e.touches[0].clientY + 'px');
        }
    }, {passive: true});

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
            dream: localStorage.getItem('study_dream') || '',
            usageLogs: JSON.parse(localStorage.getItem('study_usage_logs') || '[]'),
            lastUpdated: new Date().toISOString()
        }, { merge: true }).catch(e => console.log("Cloud sync error: ", e));
    } catch(e) {}
}
// --- Navigation ---

// --- SPA History Navigation ---
window.switchPage = function(pageId, pushToHistory = true) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.querySelectorAll('.nav-links li, .mobile-bottom-nav .nav-item').forEach(n => n.classList.remove('active'));
    
    const pageObj = document.getElementById(pageId);
    if(pageObj) pageObj.classList.add('active-page');
    
    const topNav = document.querySelector(`.nav-links li[data-page="${pageId}"]`);
    const botNav = document.querySelector(`.mobile-bottom-nav .nav-item[data-page="${pageId}"]`);
    if(topNav) topNav.classList.add('active');
    if(botNav) botNav.classList.add('active');
    
    if (pushToHistory) {
        history.pushState({ page: pageId }, '', '#' + pageId);
    }
};

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        window.switchPage(e.state.page, false);
    } else {
        const hash = window.location.hash.replace('#', '');
        if(hash) {
            window.switchPage(hash, false);
        } else {
            window.switchPage('dashboard', false);
        }
    }
});

// Update initial load
window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    if(hash && document.getElementById(hash)) {
        window.switchPage(hash, false);
    }
});

const navItems = document.querySelectorAll('.nav-links li[data-page]');
const pages = document.querySelectorAll('.page');
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active-page'));
        item.classList.add('active');
        const targetP = document.getElementById(item.getAttribute('data-page')); if (targetP) targetP.classList.add('active-page');
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
        if(timeLeft == (currentMode==='work'?25*60:5*60)) window.logUsage('جلسة بومودورو (' + currentMode + ')', Math.floor(timeLeft/60) + ' دقيقة');
        let pomoEndTime = Date.now() + timeLeft * 1000;
        pomodoroTimer = setInterval(() => {
            timeLeft = Math.round((pomoEndTime - Date.now()) / 1000);
            if(timeLeft < 0) timeLeft = 0; updateTimerDisplay();
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

async function callGeminiAPI(parts, options = {}) {
    const hasMedia = parts.some(p => p.inlineData);

    if (aiProvider === 'gemini' || !groqApiKey) {
        if (!geminiApiKey) {
            alert("يرجى إدخال مفتاح Google Gemini في إعدادات الذكاء الاصطناعي!");
            document.getElementById('ai-loading').style.display = 'none';
            return null;
        }
        return await callGeminiAPICore(parts, 0, options);
    } else {
        if (!groqApiKey) {
            alert("يرجى إدخال مفتاح Groq في إعدادات الذكاء الاصطناعي!");
            document.getElementById('ai-loading').style.display = 'none';
            return null;
        }
        return await callGroqAPI(parts, 0, options);
    }
}

async function callGroqAPI(parts, modelIndex = 0, options = {}) {
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

    if (modelIndex === 0 && !options.silent) {
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

                        if(!options.silent && contentBox) {
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
async function callGeminiAPICore(parts, modelIndex = 0, options = {}) {
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-flash-latest", "gemini-1.0-pro"];
    if (modelIndex >= models.length) {
        alert("للأسف، لم نتمكن من الوصول لأي نموذج ذكاء اصطناعي متاح حالياً. يرجى التأكد من صلاحية مفتاح API الخاص بك.");
        document.getElementById('ai-loading').style.display = 'none';
        const contentBox = document.getElementById('ai-result-content');
        if(contentBox) contentBox.innerHTML = '<div style="color:var(--danger); text-align:center; padding:20px;">فشل الاتصال بـ Gemini. مفتاحك غير صالح أو محظور.</div>';
        return null;
    }

    const currentModel = models[modelIndex];

    if (modelIndex === 0 && !options.silent) {
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
                            if (!options.silent && contentBox) {
                                contentBox.innerHTML = marked.parse(fullText + ' ✍️');
                            }
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
    const outBox = document.getElementById('ai-result-content');
    if (outBox) {
        outBox.className = "ai-formatted-report";
        outBox.innerHTML = marked.parse(text);
    }
    
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
        
        if (navigator.serviceWorker) {
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
            try {
                new Notification(title, { body: body, icon: icon || "icons/icon-192.png", dir: "rtl" });
            } catch(e) { console.log(e); }
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
                    alert("تم تفعيل إشعارات التحفيز! ستصلك رسالة تحفيزية كل 90 دقيقة.");
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
                    alert("تم تفعيل إشعارات الصلاة! سيصلك تنبيه وقت كل صلاة.");
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
        
        if (navigator.serviceWorker) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification('تطبيق المذاكرة المتكامل 📚', {
            body: msg,
            icon: 'https://cdn-icons-png.flaticon.com/512/3429/3429930.png'
        });
            });
        } else {
            try {
                new Notification('تطبيق المذاكرة المتكامل 📚', {
            body: msg,
            icon: 'https://cdn-icons-png.flaticon.com/512/3429/3429930.png'
        });
            } catch(e) { console.log(e); }
        }
    
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
        
        if (navigator.serviceWorker) {
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
            try {
                new Notification(title, { body: body, icon: icon || "icons/icon-192.png", dir: "rtl" });
            } catch(e) { console.log(e); }
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
                    alert("تم تفعيل إشعارات التحفيز! ستصلك رسالة تحفيزية كل 90 دقيقة.");
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
                    alert("تم تفعيل إشعارات الصلاة! سيصلك تنبيه وقت كل صلاة.");
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
const EGYPT_CITIES = {
    'Cairo': { name: 'القاهرة', lat: 30.0444, lng: 31.2357 },
    'Giza': { name: 'الجيزة', lat: 30.0131, lng: 31.2089 },
    'Alexandria': { name: 'الإسكندرية', lat: 31.2001, lng: 29.9187 },
    'Mansoura': { name: 'المنصورة (الدقهلية)', lat: 31.0409, lng: 31.3785 },
    'Tanta': { name: 'طنطا (الغربية)', lat: 30.7865, lng: 31.0004 },
    'Zagazig': { name: 'الزقازيق (الشرقية)', lat: 30.5877, lng: 31.5020 },
    'Banha': { name: 'بنها (القليوبية)', lat: 30.4660, lng: 31.1853 },
    'Shebin': { name: 'شبين الكوم (المنوفية)', lat: 30.5526, lng: 31.0090 },
    'Damanhour': { name: 'دمنهور (البحيرة)', lat: 31.0409, lng: 30.4700 },
    'Damietta': { name: 'دمياط', lat: 31.4175, lng: 31.8144 },
    'KafrElSheikh': { name: 'كفر الشيخ', lat: 31.1107, lng: 30.9388 },
    'PortSaid': { name: 'بورسعيد', lat: 31.2653, lng: 32.3019 },
    'Ismailia': { name: 'الإسماعيلية', lat: 30.5965, lng: 32.2715 },
    'Suez': { name: 'السويس', lat: 29.9668, lng: 32.5498 },
    'Fayoum': { name: 'الفيوم', lat: 29.3084, lng: 30.8428 },
    'BeniSuef': { name: 'بني سويف', lat: 29.0661, lng: 31.0994 },
    'Minya': { name: 'المنيا', lat: 28.0871, lng: 30.7618 },
    'Asyut': { name: 'أسيوط', lat: 27.1783, lng: 31.1859 },
    'Sohag': { name: 'سوهاج', lat: 26.5569, lng: 31.6948 },
    'Qena': { name: 'قنا', lat: 26.1551, lng: 32.7160 },
    'Luxor': { name: 'الأقصر', lat: 25.6872, lng: 32.6396 },
    'Aswan': { name: 'أسوان', lat: 24.0889, lng: 32.8998 },
    'RedSea': { name: 'الغردقة (البحر الأحمر)', lat: 27.2579, lng: 33.8116 },
    'SouthSinai': { name: 'شرم الشيخ (جنوب سيناء)', lat: 27.9158, lng: 34.3299 },
    'NorthSinai': { name: 'العريش (شمال سيناء)', lat: 31.1316, lng: 33.7984 },
    'Matrouh': { name: 'مرسى مطروح', lat: 31.3543, lng: 27.2373 },
    'NewValley': { name: 'الخارجة (الوادي الجديد)', lat: 25.4514, lng: 30.5464 }
};

let currentCityKey = localStorage.getItem('study_city_key') || 'Cairo';
let currentCityName = localStorage.getItem('study_city_name') || (EGYPT_CITIES[currentCityKey] ? EGYPT_CITIES[currentCityKey].name : 'القاهرة');
let currentLat = parseFloat(localStorage.getItem('study_lat')) || (EGYPT_CITIES[currentCityKey] ? EGYPT_CITIES[currentCityKey].lat : 30.0444);
let currentLng = parseFloat(localStorage.getItem('study_lng')) || (EGYPT_CITIES[currentCityKey] ? EGYPT_CITIES[currentCityKey].lng : 31.2357);
let userCity = currentCityName;
let userCountry = 'Egypt';
window.dailyPrayers = null;

async function fetchPrayerTimes() {
    let t = null;
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `study_prayer_cache_${currentLat.toFixed(4)}_${currentLng.toFixed(4)}_${todayStr}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        try { t = JSON.parse(cached); } catch(e){}
    }

    if (!t) {
        try {
            // Using exact coordinates and method 5 (Egyptian General Authority of Survey)
            // This prevents Aladhan city-name geocoding bug and gives 100% accurate Egyptian timings
            const targetUrl = `https://api.aladhan.com/v1/timings?latitude=${currentLat}&longitude=${currentLng}&method=5`;
            let res;
            try {
                res = await fetch(targetUrl);
            } catch (e) {
                res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
            }
            
            const data = await res.json();
            if (data.code === 200 && data.data && data.data.timings) {
                t = data.data.timings;
                localStorage.setItem(cacheKey, JSON.stringify(t));
                localStorage.setItem("study_prayer_times", JSON.stringify(t));
                localStorage.setItem("study_prayer_date", new Date().toDateString());
            } else {
                throw new Error("API returned non-200");
            }
        } catch (err) {
            console.error("Prayer API failed, trying cached or fallback:", err);
            const saved = localStorage.getItem("study_prayer_times");
            if (saved) {
                try { t = JSON.parse(saved); } catch(e){}
            }
            if (!t) {
                t = {
                    Fajr: "05:28",
                    Sunrise: "06:55",
                    Dhuhr: "12:42",
                    Asr: "16:00",
                    Maghrib: "18:28",
                    Isha: "19:45",
                    Lastthird: "02:46"
                };
            }
        }
    }
    
    if (t) {
        window.dailyPrayers = {
            'الفجر': t.Fajr.split(' ')[0],
            'الظهر': t.Dhuhr.split(' ')[0],
            'العصر': t.Asr.split(' ')[0],
            'المغرب': t.Maghrib.split(' ')[0],
            'العشاء': t.Isha.split(' ')[0]
        };
        
                const container = document.getElementById('prayer-times-container');
        if (container) {
            const formatTime = (timeStr) => {
                let [h, m] = timeStr.split(':');
                h = parseInt(h);
                const ampm = h >= 12 ? 'م' : 'ص';
                return `${h % 12 || 12}:${m} ${ampm}`;
            };

            const now = new Date();
            const nowMins = now.getHours() * 60 + now.getMinutes();

            const toMins = (timeStr) => {
                if (!timeStr) return 0;
                const [h, m] = timeStr.split(' ')[0].split(':').map(Number);
                return h * 60 + m;
            };

            const prayerList = [
                { key: 'qiyam', name: 'قيام الليل', time: t.Lastthird ? t.Lastthird.split(' ')[0] : "02:45", mins: toMins(t.Lastthird || "02:45") },
                { key: 'fajr', name: 'الفجر', time: t.Fajr.split(' ')[0], mins: toMins(t.Fajr) },
                { key: 'dhuhr', name: 'الظهر', time: t.Dhuhr.split(' ')[0], mins: toMins(t.Dhuhr) },
                { key: 'asr', name: 'العصر', time: t.Asr.split(' ')[0], mins: toMins(t.Asr) },
                { key: 'maghrib', name: 'المغرب', time: t.Maghrib.split(' ')[0], mins: toMins(t.Maghrib) },
                { key: 'isha', name: 'العشاء', time: t.Isha.split(' ')[0], mins: toMins(t.Isha) }
            ];

            // Find upcoming prayer dynamically
            let nextPrayer = prayerList.find(p => p.mins > nowMins);
            if (!nextPrayer) {
                // After Isha, next prayer is Qiyam (early morning)
                nextPrayer = prayerList[0];
            }

            container.innerHTML = prayerList.map(p => {
                const isNext = (p.key === nextPrayer.key);
                const extraClass = isNext ? 'active' : '';
                return `
                    <div class="prayer-time-box ${extraClass}" id="prayer-box-${p.key}">
                        <strong>${p.name}</strong>
                        <span>${formatTime(p.time)}</span>
                        ${isNext ? '<span class="prayer-badge">القادمة ⏳</span>' : ''}
                    </div>
                `;
            }).join('');
        }
        const cityLabel = document.getElementById('current-city-label');
        if (cityLabel) cityLabel.innerText = currentCityName;
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
    const titleEl = document.getElementById('prayer-alert-title');
    const msgEl = document.getElementById('prayer-alert-msg');
    if (titleEl) titleEl.innerText = `حان الآن أذان ${prayerName} 🕌`;
    if (msgEl) msgEl.innerText = prayerMessages[Math.floor(Math.random() * prayerMessages.length)];
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
    openModal('city-modal');
    const select = document.getElementById('city-select-input');
    if (select && currentCityKey && select.querySelector(`option[value="${currentCityKey}"]`)) {
        select.value = currentCityKey;
    }
};

window.selectCityFromDropdown = (cityKey) => {
    if (EGYPT_CITIES[cityKey]) {
        currentCityKey = cityKey;
        currentCityName = EGYPT_CITIES[cityKey].name;
        currentLat = EGYPT_CITIES[cityKey].lat;
        currentLng = EGYPT_CITIES[cityKey].lng;
        
        localStorage.setItem('study_city_key', currentCityKey);
        localStorage.setItem('study_city_name', currentCityName);
        localStorage.setItem('study_lat', currentLat);
        localStorage.setItem('study_lng', currentLng);
        
        const cityLabel = document.getElementById('current-city-label');
        if (cityLabel) cityLabel.innerText = currentCityName;
        const container = document.getElementById('prayer-times-container');
        if (container) container.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding: 10px;">جاري تحديث المواقيت بدقة...</p>';
        closeModal('city-modal');
        fetchPrayerTimes();
    }
};

window.detectGPSLocation = () => {
    if (!navigator.geolocation) {
        alert("متصفحك لا يدعم تحديد الموقع الجغرافي.");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            currentLat = pos.coords.latitude;
            currentLng = pos.coords.longitude;
            currentCityKey = 'custom';
            currentCityName = 'موقعي الحالي 📍';
            
            localStorage.setItem('study_city_key', currentCityKey);
            localStorage.setItem('study_city_name', currentCityName);
            localStorage.setItem('study_lat', currentLat);
            localStorage.setItem('study_lng', currentLng);
            
            const cityLabel = document.getElementById('current-city-label');
            if (cityLabel) cityLabel.innerText = currentCityName;
            const container = document.getElementById('prayer-times-container');
            if (container) container.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding: 10px;">جاري تحديث المواقيت حسب إحداثياتك...</p>';
            closeModal('city-modal');
            fetchPrayerTimes();
        },
        (err) => {
            alert("تعذر الوصول لموقعك تلقائياً. يرجى اختيار محافظتك من القائمة.");
        },
        { timeout: 8000, enableHighAccuracy: true }
    );
};

window.applyCustomCity = async () => {
    const input = document.getElementById('custom-city-input');
    const cityName = input ? input.value.trim() : '';
    if (!cityName) return;
    
    try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`);
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
            currentLat = parseFloat(geoData[0].lat);
            currentLng = parseFloat(geoData[0].lon);
            currentCityKey = 'custom';
            currentCityName = cityName;
            
            localStorage.setItem('study_city_key', currentCityKey);
            localStorage.setItem('study_city_name', currentCityName);
            localStorage.setItem('study_lat', currentLat);
            localStorage.setItem('study_lng', currentLng);
            
            const cityLabel = document.getElementById('current-city-label');
            if (cityLabel) cityLabel.innerText = currentCityName;
            closeModal('city-modal');
            fetchPrayerTimes();
        } else {
            alert("لم نتمكن من العثور على هذه المدينة. يرجى التأكد من كتابة الاسم بدقة أو اختيار محافظتك من القائمة.");
        }
    } catch (e) {
        alert("حدث خطأ أثناء البحث. يرجى اختيار محافظتك من القائمة.");
    }
};

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
    if (pwd && window._hx(pwd.trim()) === 3040) {
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
                <div style="background: rgba(0, 229, 255, 0.1); border-right: 4px solid var(--primary-color); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
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

        
        detailsHtml += `<h3 style="margin-bottom:15px; margin-top:20px; border-bottom:1px solid var(--border-color); padding-bottom:5px;"><i class="fa-solid fa-cloud-moon text-primary"></i> الحلم</h3>`;
        if (data.dream && data.dream.trim() !== '') {
            detailsHtml += `<p style="background: rgba(0, 229, 255, 0.1); padding: 15px; border-radius: 8px; font-weight: bold; color: var(--primary-color); text-align: center;">🌟 ${data.dream} 🌟</p>`;
        } else {
            detailsHtml += `<p style="color:var(--text-muted); margin-bottom: 20px;">لم يكتب حلمه بعد.</p>`;
        }

        detailsHtml += `<h3 style="margin-bottom:15px; margin-top:20px; border-bottom:1px solid var(--border-color); padding-bottom:5px;"><i class="fa-solid fa-chart-line text-primary"></i> آخر النشاطات والتحديات</h3>`;
        if(data.usageLogs && data.usageLogs.length > 0) {
            detailsHtml += '<ul style="list-style:none; padding:0; margin:0; margin-bottom: 20px;">';
            data.usageLogs.slice().reverse().forEach(log => {
                detailsHtml += `<li style="margin-bottom:10px; padding:10px; background:var(--bg-color); border-radius:8px; border-right: 4px solid var(--primary-color);">
                    <strong>${log.action}</strong> ${log.duration ? `<span style="background: var(--primary-color); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; margin-right: 5px;">${log.duration}</span>` : ''}
                    <br><small style="color:var(--text-muted);">${log.time}</small>
                </li>`;
            });
            detailsHtml += '</ul>';
        } else {
            detailsHtml += '<p style="color:var(--text-muted); margin-bottom: 20px;">لم يقم بأي نشاط مؤخراً.</p>';
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
    } else {
        overlay.style.display = 'none';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setupVoiceRecognition();
    // Sync username to mobile header and sidebar
    if (studyUsername) {
        const mName = document.getElementById('mobile-welcome-name');
        if (mName) mName.innerText = studyUsername;
        const sName = document.getElementById('sidebar-user-name');
        if (sName) sName.innerText = studyUsername;
    }
    const sStage = document.getElementById('sidebar-user-stage');
    if (sStage) {
        const stage = localStorage.getItem('study_stage') || '';
        const specialty = localStorage.getItem('study_specialty') || '';
        sStage.innerText = [stage, specialty].filter(Boolean).join(' - ') || 'طالب';
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
        micBtn.style.display = 'none';
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG'; 
    recognition.interimResults = true; 
    recognition.maxAlternatives = 1;
    recognition.continuous = true; 

    let isRecording = false;
    let isIntentionallyStopped = true;
    let finalTranscript = '';

    micBtn.addEventListener('click', () => {
        if (isRecording) {
            isIntentionallyStopped = true;
            recognition.stop();
            return;
        }
        
        isIntentionallyStopped = false;
        finalTranscript = aiInput.value;
        if(finalTranscript && !finalTranscript.endsWith(' ')) finalTranscript += ' ';
        try { recognition.start(); } catch(e) {}
    });

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
        micBtn.innerHTML = '<i class="fa-solid fa-microphone-lines fa-fade"></i>';
        micBtn.style.backgroundColor = 'var(--danger)';
        micBtn.style.boxShadow = '0 0 15px rgba(239, 35, 60, 0.8)';
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
        
        // Auto scroll to bottom
        aiInput.scrollTop = aiInput.scrollHeight;
    };

    recognition.onerror = (event) => {
        if(event.error === 'not-allowed') {
            isIntentionallyStopped = true;
            alert('الرجاء إعطاء صلاحية استخدام الميكروفون.');
        }
    };

    recognition.onend = () => {
        if (!isIntentionallyStopped) {
            // Keep listening seamlessly
            setTimeout(() => {
                try { recognition.start(); } catch(e) {}
            }, 50);
            return;
        }
        isRecording = false;
        micBtn.classList.remove('recording');
        micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        micBtn.style.backgroundColor = '';
        micBtn.style.boxShadow = '';
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
        setTimeout(syncToCloud, 1000);
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
            text.style.color = 'var(--primary-color)';
        } else {
            text.innerHTML = 'لم تكتب حلمك بعد..';
            text.style.color = 'var(--text-muted)';
        }
    }
}

document.addEventListener('DOMContentLoaded', loadDream);


// ====== Test Notification (Mobile Safe) ======
function testNotification() {
    if (!('Notification' in window)) {
        alert('المتصفح ده مش بيدعم الإشعارات');
        return;
    }
    
    if (Notification.permission === 'granted') {
        sendSafeNotification('تجربة! 🔔', 'الإشعارات شغالة تمام! 🎉');
    } else if (Notification.permission === 'denied') {
        alert('يرجى السماح بالإشعارات من إعدادات المتصفح');
    } else {
        Notification.requestPermission().then(p => {
            if (p === 'granted') {
                sendSafeNotification('تجربة! 🔔', 'الإشعارات شغالة تمام! 🎉');
            } else {
                alert('يرجى السماح بالإشعارات من إعدادات المتصفح');
            }
        });
    }
}

function sendSafeNotification(title, body) {
    if (navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
                body: body,
                icon: 'https://cdn-icons-png.flaticon.com/512/3429/3429930.png',
                dir: 'rtl'
            });
        });
    } else {
        try {
            new Notification(title, { body: body, dir: 'rtl' });
        } catch(e) {
            alert(body);
        }
    }
}

// ====== Challenges Logic ======
let flightInterval;

function startIceChallenge() {
    const btn = document.getElementById('ice-btn');
    const timerDisplay = document.getElementById('ice-timer-display');
    const meltFill = document.getElementById('ice-melt-fill');
    const statusText = document.getElementById('ice-status-text');
    const iconStage = document.getElementById('ice-icon-stage');

    if (btn && btn.innerText.includes('ابدأ')) {
        const ICE_TOTAL_SECONDS = 20 * 60;
        let iceEndTime = Date.now() + ICE_TOTAL_SECONDS * 1000;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> رمي التلج (إلغاء التحدي)';
        btn.style.background = '#7f8c8d';
        if (iconStage) iconStage.innerText = '🧊';

        clearInterval(window.iceInterval);
        window.iceInterval = setInterval(() => {
            let remaining = Math.round((iceEndTime - Date.now()) / 1000);
            if (remaining < 0) remaining = 0;

            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            if (timerDisplay) timerDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            const remainingPct = (remaining / ICE_TOTAL_SECONDS) * 100;
            if (meltFill) meltFill.style.width = `${remainingPct}%`;

            if (statusText && iconStage) {
                if (remainingPct > 65) {
                    iconStage.innerText = '🧊';
                    statusText.innerText = 'مكعب التلج صلب ومتماسك.. واصل التركيز!';
                } else if (remainingPct > 30) {
                    iconStage.innerText = '💧';
                    statusText.innerText = 'التلج بدأ يدوب ويتحول لمياه.. رائع!';
                } else {
                    iconStage.innerText = '🌊';
                    statusText.innerText = 'التلج بيخلص خلاص.. قربت تنهي التحدي!';
                }
            }

            if (remaining <= 0) {
                clearInterval(window.iceInterval);
                window.iceInterval = null;
                btn.innerHTML = '<i class="fa-solid fa-play"></i> ابدأ التحدي دلوقتي';
                btn.style.background = 'linear-gradient(135deg, #00cec9, #0984e3)';
                if (meltFill) meltFill.style.width = '0%';
                if (timerDisplay) timerDisplay.innerText = '20:00';
                if (iconStage) iconStage.innerText = '🌊✨';
                if (statusText) statusText.innerText = 'داب التلج بالكامل وأنت منتصر بتركيزك! 🏆';
                launchChallengeVictory('تحدي كوباية التلج 🧊', 60);
            }
        }, 1000);
    } else if (btn) {
        clearInterval(window.iceInterval);
        window.iceInterval = null;
        btn.innerHTML = '<i class="fa-solid fa-play"></i> ابدأ التحدي دلوقتي';
        btn.style.background = 'linear-gradient(135deg, #00cec9, #0984e3)';
        if (timerDisplay) timerDisplay.innerText = '20:00';
        if (meltFill) meltFill.style.width = '100%';
        if (iconStage) iconStage.innerText = '🧊';
        if (statusText) statusText.innerText = 'مكعب التلج صلب ومتماسك.. ابدأ عشان يدوب!';
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
        let flightIntervalEndTime = Date.now() + remainingSeconds * 1000;
        

        dest.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> هبوط اضطراري (إلغاء)';
        btn.style.background = '#e17055';
        container.style.display = 'block';

        clearInterval(flightInterval);
        flightInterval = setInterval(() => {
            remainingSeconds = Math.round((flightIntervalEndTime - Date.now()) / 1000);
            if(remainingSeconds < 0) remainingSeconds = 0;
            if (remainingSeconds <= 0) {
                clearInterval(flightInterval);
                dest.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-plane"></i> إقلاع!';
                btn.style.background = 'linear-gradient(135deg, #00b894, #00cec9)';
                timeLeftDisplay.innerText = "وصلنا بالسلامة! 🎉";
                fill.style.width = '100%';
                icon.style.left = '100%';
                launchChallengeVictory('تحدي رحلة الطيران ✈️', 80);
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


// ====== What's New & APK Update Announcement ======
function isNativeAndroidApp() {
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
}

function openWhatsNew() {
    const modal = document.getElementById('whats-new-modal');
    if (!modal) return;
    
    const nativeBox = document.getElementById('whats-new-native-badge');
    const pwaBox = document.getElementById('whats-new-pwa-warning');
    const apkDownloadBtn = document.getElementById('whats-new-download-btn');
    
    if (isNativeAndroidApp()) {
        if (nativeBox) nativeBox.style.display = 'block';
        if (pwaBox) pwaBox.style.display = 'none';
        if (apkDownloadBtn) apkDownloadBtn.style.display = 'none';
    } else {
        if (nativeBox) nativeBox.style.display = 'none';
        if (pwaBox) pwaBox.style.display = 'block';
        if (apkDownloadBtn) apkDownloadBtn.style.display = 'flex';
    }
    
    modal.style.display = 'flex';
}

function dismissApkBanner() {
    const banner = document.getElementById('apk-promo-banner');
    if (banner) {
        banner.style.display = 'none';
        sessionStorage.setItem('study_apk_banner_dismissed', 'true');
    }
}

function shareUpdateOnWhatsApp() {
    const appUrl = window.location.origin + window.location.pathname.replace(/\/$/, '') + '/study-app.apk';
    const text = encodeURIComponent(
        "🚀 تحديث جديد وتاريخي لتطبيق المذاكرة!\n\n" +
        "تم إطلاق تطبيق الأندرويد الرسمي (APK) بمميزات خرافية:\n" +
        "1️⃣ استوديو ذكي للكتب والمذكرات (Notebook AI) بيلخص الـ PDF ويطلع أهم أسئلة الامتحانات المتوقعة!\n" +
        "2️⃣ بودكاست صوتي لشرح الدروس كحوار إذاعي بين شخصين (أحمد وسارة)!\n" +
        "3️⃣ منبهات الصلاة وتنبيهات المذاكرة كل 90 دقيقة بترن والموبايل مقفول تماماً!\n\n" +
        "حمل التطبيق الرسمي الآن من هنا:\n" + appUrl
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}
function closeWhatsNew() {
    const modal = document.getElementById('whats-new-modal');
    if (modal) {
        modal.style.display = 'none';
        localStorage.setItem('study_seen_update_v107', 'true');
    }
}

function showInstallGuide() {
    const el = document.getElementById('install-guide-steps');
    if (el) {
        el.style.display = 'block';
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

window.openWhatsNew = openWhatsNew;
window.closeWhatsNew = closeWhatsNew;
window.dismissApkBanner = dismissApkBanner;
window.shareUpdateOnWhatsApp = shareUpdateOnWhatsApp;
window.showInstallGuide = showInstallGuide;

document.addEventListener('DOMContentLoaded', () => {
    if (!isNativeAndroidApp()) {
        const banner = document.getElementById('apk-promo-banner');
        if (banner && !sessionStorage.getItem('study_apk_banner_dismissed')) {
            banner.style.display = 'flex';
        }
    }
    if (!localStorage.getItem('study_seen_update_v107')) {
        setTimeout(() => {
            const modal = document.getElementById('whats-new-modal');
            openWhatsNew();
        }, 1500);
    }
});


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
    const select = document.getElementById('candle-duration-select');
    const timerDisplay = document.getElementById('candle-timer-display');
    const burnFill = document.getElementById('candle-burn-fill');
    const statusText = document.getElementById('candle-status-text');
    const iconStage = document.getElementById('candle-icon-stage');

    if (btn && btn.innerText.includes('ابدأ')) {
        const mins = select ? (parseInt(select.value, 10) || 30) : 30;
        let candleTotalSeconds = mins * 60;
        let candleEndTime = Date.now() + candleTotalSeconds * 1000;
        if (select) select.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-fire-extinguisher"></i> إطفاء الشمعة (استسلام)';
        btn.style.background = '#7f8c8d';
        if (iconStage) iconStage.innerText = '🔥';

        clearInterval(window.candleInterval);
        window.candleInterval = setInterval(() => {
            let remaining = Math.round((candleEndTime - Date.now()) / 1000);
            if (remaining < 0) remaining = 0;

            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            if (timerDisplay) timerDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            const remainingPct = (remaining / candleTotalSeconds) * 100;
            if (burnFill) burnFill.style.width = `${remainingPct}%`;

            if (statusText && iconStage) {
                if (remainingPct > 65) {
                    iconStage.innerText = '🕯️';
                    statusText.innerText = 'الشمعة مولعة.. هدوء تام وتركيز مطلق!';
                } else if (remainingPct > 25) {
                    iconStage.innerText = '🔥';
                    statusText.innerText = 'نصف الشمعة احترق.. استيعابك في أعلى مستوى!';
                } else {
                    iconStage.innerText = '✨';
                    statusText.innerText = 'الشمعة على وشك الانطفاء.. ثبات أسطوري!';
                }
            }

            if (remaining <= 0) {
                clearInterval(window.candleInterval);
                window.candleInterval = null;
                if (select) select.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-play"></i> ابدأ التحدي دلوقتي';
                btn.style.background = 'linear-gradient(135deg, #e17055, #d63031)';
                if (burnFill) burnFill.style.width = '0%';
                if (timerDisplay) timerDisplay.innerText = select ? `${select.value}:00` : '30:00';
                if (iconStage) iconStage.innerText = '💨';
                if (statusText) statusText.innerText = 'انطفأت الشمعة بنجاح وأنت ثابت في مكانك! 🎉';
                launchChallengeVictory('تحدي الشمعة 🕯️', 70);
            }
        }, 1000);
    } else if (btn) {
        clearInterval(window.candleInterval);
        window.candleInterval = null;
        if (select) select.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-play"></i> ابدأ التحدي دلوقتي';
        btn.style.background = 'linear-gradient(135deg, #e17055, #d63031)';
        if (timerDisplay && select) timerDisplay.innerText = `${select.value}:00`;
        if (burnFill) burnFill.style.width = '100%';
        if (iconStage) iconStage.innerText = '🕯️';
        if (statusText) statusText.innerText = 'الشمعة جاهزة للإشعال 🔥';
    }
}

function startMarathonChallenge() {
    const dest = document.getElementById('marathon-duration');
    const btn = document.getElementById('marathon-btn');
    const container = document.getElementById('marathon-progress-container');
    const timeLeftDisplay = document.getElementById('marathon-time-left');

    if (btn.innerText.includes('انطلاق')) {
        window.logUsage('تحدي الماراثون', dest.value + ' دقيقة');
        window.logUsage('تحدي رحلة الطيران', dest.value + ' دقيقة');
        let remainingSeconds = parseInt(dest.value) * 60;
        let marathonIntervalEndTime = Date.now() + remainingSeconds * 1000;
        
        dest.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> استسلام (إلغاء)';
        btn.style.background = '#7f8c8d';
        container.style.display = 'block';

        clearInterval(marathonInterval);
        marathonInterval = setInterval(() => {
            remainingSeconds = Math.round((marathonIntervalEndTime - Date.now()) / 1000);
            if(remainingSeconds < 0) remainingSeconds = 0;
            if (remainingSeconds <= 0) {
                clearInterval(marathonInterval);
                dest.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-play"></i> انطلاق الماراثون!';
                btn.style.background = 'linear-gradient(135deg, #d63031, #c0392b)';
                timeLeftDisplay.innerText = "وصلت لخط النهاية! 🏆";
                launchChallengeVictory('تحدي الماراثون 🏃‍♂️', 120);
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
        let isolationIntervalEndTime = Date.now() + remainingSeconds * 1000;
        dest.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> كسر العزل (إلغاء)';
        btn.style.background = '#e74c3c';
        container.style.display = 'block';

        clearInterval(isolationInterval);
        isolationInterval = setInterval(() => {
            remainingSeconds = Math.round((isolationIntervalEndTime - Date.now()) / 1000);
            if(remainingSeconds < 0) remainingSeconds = 0;
            if (remainingSeconds <= 0) {
                clearInterval(isolationInterval);
                dest.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-power-off"></i> ابدأ العزل!';
                btn.style.background = 'linear-gradient(135deg, #2d3436, #636e72)';
                timeLeftDisplay.innerText = "تمت المهمة بنجاح! 🌍";
                launchChallengeVictory('تحدي العزل التام 📵', 90);
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
        btn.style.background = 'linear-gradient(135deg, #00e5ff, #00e5ff)';
    }
}

function startMarsChallenge() {
    const dest = document.getElementById('mars-duration');
    const btn = document.getElementById('mars-btn');
    const container = document.getElementById('mars-progress-container');
    const timeLeftDisplay = document.getElementById('mars-time-left');

    if (btn.innerText.includes('إطلاق')) {
        let remainingSeconds = parseInt(dest.value) * 60;
        let marsIntervalEndTime = Date.now() + remainingSeconds * 1000;
        dest.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> إلغاء المهمة';
        btn.style.background = '#c0392b';
        container.style.display = 'block';

        clearInterval(marsInterval);
        marsInterval = setInterval(() => {
            remainingSeconds = Math.round((marsIntervalEndTime - Date.now()) / 1000);
            if(remainingSeconds < 0) remainingSeconds = 0;
            if (remainingSeconds <= 0) {
                clearInterval(marsInterval);
                dest.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-rocket"></i> إطلاق الصاروخ!';
                btn.style.background = 'linear-gradient(135deg, #d35400, #e67e22)';
                timeLeftDisplay.innerText = "هبطنا على المريخ! 🔴";
                launchChallengeVictory('تحدي المريخ 🚀', 200);
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
        let trainIntervalEndTime = Date.now() + remainingSeconds * 1000;
        dest.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> النزول في محطة خاطئة';
        btn.style.background = '#e74c3c';
        container.style.display = 'block';

        clearInterval(trainInterval);
        trainInterval = setInterval(() => {
            remainingSeconds = Math.round((trainIntervalEndTime - Date.now()) / 1000);
            if(remainingSeconds < 0) remainingSeconds = 0;
            if (remainingSeconds <= 0) {
                clearInterval(trainInterval);
                dest.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-ticket"></i> قطع التذكرة!';
                btn.style.background = 'linear-gradient(135deg, #34495e, #2c3e50)';
                timeLeftDisplay.innerText = "وصلنا بالسلامة! 🚉";
                launchChallengeVictory('تحدي قطار منتصف الليل 🚆', 100);
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


// --- Mouse Trail Particles ---
function initMouseParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'mouse-particles-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width, height;
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    let particles = [];
    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 2.5 + 0.5;
            this.speedX = Math.random() * 3 - 1.5;
            this.speedY = Math.random() * 3 - 1.5;
            this.life = 1;
            this.decay = Math.random() * 0.03 + 0.015;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.life -= this.decay;
        }
        draw() {
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.fillStyle = '#00e5ff';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00e5ff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    document.addEventListener('mousemove', (e) => {
        if(document.body.getAttribute('data-theme') === 'dark') {
            for(let i=0; i<3; i++) {
                particles.push(new Particle(e.clientX, e.clientY));
            }
        }
    });
    
    document.addEventListener('touchmove', (e) => {
        if(document.body.getAttribute('data-theme') === 'dark' && e.touches.length > 0) {
            for(let i=0; i<3; i++) {
                particles.push(new Particle(e.touches[0].clientX, e.touches[0].clientY));
            }
        }
    }, {passive: true});

    function animate() {
        ctx.clearRect(0, 0, width, height);
        if(document.body.getAttribute('data-theme') === 'dark') {
            for(let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
                if(particles[i].life <= 0) {
                    particles.splice(i, 1);
                    i--;
                }
            }
        } else {
            particles = [];
        }
        requestAnimationFrame(animate);
    }
    animate();
}

window.addEventListener('DOMContentLoaded', initMouseParticles);


// --- Audio Focus Sounds Logic ---
let rainAudioContext = null;
let rainNoiseNode = null;
let rainGainNode = null;

function startSynthesizedRain() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        if (!rainAudioContext) rainAudioContext = new AudioCtx();
        if (rainAudioContext.state === 'suspended') rainAudioContext.resume();

        const bufferSize = rainAudioContext.sampleRate * 2;
        const noiseBuffer = rainAudioContext.createBuffer(1, bufferSize, rainAudioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
            b6 = white * 0.115926;
        }

        const whiteNoise = rainAudioContext.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = rainAudioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 850;

        rainGainNode = rainAudioContext.createGain();
        rainGainNode.gain.value = 0.7;

        whiteNoise.connect(filter);
        filter.connect(rainGainNode);
        rainGainNode.connect(rainAudioContext.destination);

        whiteNoise.start(0);
        rainNoiseNode = whiteNoise;
        return true;
    } catch (e) {
        console.error('Synthesized rain error:', e);
        return false;
    }
}

function stopSynthesizedRain() {
    if (rainNoiseNode) {
        try { rainNoiseNode.stop(); rainNoiseNode.disconnect(); } catch (e) {}
        rainNoiseNode = null;
    }
}

window.toggleSound = (soundType) => {
    const audio = document.getElementById('audio-' + soundType);
    const btn = document.getElementById('btn-sound-' + soundType);
    if (!audio) return;

    if (soundType === 'rain') {
        if (!window.isRainPlaying) {
            window.isRainPlaying = true;
            try {
                const p = audio.play();
                if (p !== undefined) {
                    p.catch(() => {
                        startSynthesizedRain();
                    });
                }
            } catch (e) {
                startSynthesizedRain();
            }
            if (btn) {
                btn.style.background = 'var(--primary-color)';
                btn.style.color = 'white';
            }
        } else {
            window.isRainPlaying = false;
            audio.pause();
            stopSynthesizedRain();
            if (btn) {
                btn.style.background = 'var(--bg-color)';
                btn.style.color = 'var(--text-main)';
            }
        }
        return;
    }

    if (audio.paused) {
        audio.play().catch(e => console.log('Audio play error:', e));
        if (btn) {
            btn.style.background = 'var(--primary-color)';
            btn.style.color = 'white';
        }
    } else {
        audio.pause();
        if (btn) {
            btn.style.background = 'var(--bg-color)';
            btn.style.color = 'var(--text-main)';
        }
    }
};

window.stopAllSounds = () => {
    window.isRainPlaying = false;
    stopSynthesizedRain();
    ['rain', 'cafe', 'lofi'].forEach(type => {
        const audio = document.getElementById('audio-' + type);
        const btn = document.getElementById('btn-sound-' + type);
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
        if (btn) {
            btn.style.background = 'var(--bg-color)';
            btn.style.color = 'var(--text-main)';
        }
    });
};

// Warn before reload if timer is running
window.addEventListener('beforeunload', (e) => {
    const btn = document.getElementById('start-timer-btn');
    const isPomoRunning = btn && (btn.innerText.includes('إيقاف') || btn.innerText.includes('Pause'));
    
    // Check if any challenge button says 'توقف' or 'إيقاف'
    const challengeBtns = document.querySelectorAll('.challenge-card .btn');
    let isChallengeRunning = false;
    challengeBtns.forEach(b => {
        if(b.innerText.includes('توقف') || b.innerText.includes('إيقاف') || b.innerText.includes('تراجع') || b.style.background === 'rgb(127, 140, 141)' || b.style.background === '#7f8c8d') {
            isChallengeRunning = true;
        }
    });

    if (isPomoRunning || isChallengeRunning) {
        e.preventDefault();
        e.returnValue = 'يوجد تحدي أو مؤقت يعمل الآن، هل أنت متأكد من رغبتك في تحديث الصفحة وخسارة الوقت؟';
        return e.returnValue;
    }
});


// Mobile Nav sliding bubble logic
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.mobile-bottom-nav .nav-item');
    const bottomNav = document.querySelector('.mobile-bottom-nav');
    if (navItems.length && bottomNav) {
        navItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                if (item.getAttribute('data-page')) {
                    bottomNav.style.setProperty('--active-index', index);
                }
            });
        });
    }
});





// --- GPA Calculator Logic ---
let courseCount = 0;
window.addGPACourse = () => {
    courseCount++;
    const list = document.getElementById('gpa-courses-list');
    const scale = document.getElementById('gpa-scale');
    if (!list || !scale) return;
    const scaleValue = scale.value;
    const row = document.createElement('div');
    row.id = `course-row-${courseCount}`;
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '2fr 1fr 1fr auto';
    row.style.gap = '10px';
    row.style.marginBottom = '15px';
    row.style.alignItems = 'center';
    let gradeOptions = '';
    if(scaleValue === '4') {
        gradeOptions = `<option value="4.0">A (4.0)</option><option value="3.7">A- (3.7)</option><option value="3.3">B+ (3.3)</option><option value="3.0">B (3.0)</option><option value="2.7">B- (2.7)</option><option value="2.3">C+ (2.3)</option><option value="2.0">C (2.0)</option><option value="1.7">C- (1.7)</option><option value="1.3">D+ (1.3)</option><option value="1.0">D (1.0)</option><option value="0">F (0)</option>`;
    } else {
        gradeOptions = `<option value="5.0">A (5.0)</option><option value="4.5">B+ (4.5)</option><option value="4.0">B (4.0)</option><option value="3.5">C+ (3.5)</option><option value="3.0">C (3.0)</option><option value="2.5">D+ (2.5)</option><option value="2.0">D (2.0)</option><option value="1.0">F (1.0)</option>`;
    }
    row.innerHTML = `
<input type="text" class="search-input" placeholder="اسم المادة (اختياري)">
<input type="number" class="search-input course-credit" min="1" value="3" onchange="calculateGPA()">
<select class="search-input course-grade" onchange="calculateGPA()">${gradeOptions}</select>
<button class="btn" style="background: var(--danger); color: white; padding: 10px;" onclick="removeGPACourse(${courseCount})"><i class="fa-solid fa-trash"></i></button>`;
    list.appendChild(row);
    calculateGPA();
};
window.removeGPACourse = (id) => {
    const row = document.getElementById(`course-row-${id}`);
    if (row) row.remove();
    calculateGPA();
};
window.calculateGPA = () => {
    const rows = document.querySelectorAll('#gpa-courses-list > div');
    let totalCredits = 0; let totalPoints = 0;
    rows.forEach(row => {
        const creditInput = row.querySelector('.course-credit');
        const gradeSelect = row.querySelector('.course-grade');
        if (creditInput && gradeSelect) {
            const credits = parseFloat(creditInput.value) || 0;
            const grade = parseFloat(gradeSelect.value) || 0;
            totalCredits += credits;
            totalPoints += (credits * grade);
        }
    });
    const gpaResult = document.getElementById('gpa-result');
    if (gpaResult) {
        if (totalCredits === 0) { gpaResult.innerText = '0.00'; } 
        else { gpaResult.innerText = (totalPoints / totalCredits).toFixed(2); }
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const scaleSelect = document.getElementById('gpa-scale');
    if (scaleSelect) {
        scaleSelect.addEventListener('change', () => {
            const list = document.getElementById('gpa-courses-list');
            if(list) list.innerHTML = '';
            window.addGPACourse();
        });
    }

    // --- APK Promo Banner & Notification for Web Users ---
    initApkPromoBanner();
    notifyUsersAboutNewApk();
});

// --- APK Promo Banner Logic ---
function initApkPromoBanner() {
    const isNativeApp = window.Capacitor && (typeof window.Capacitor.isNativePlatform === 'function' ? window.Capacitor.isNativePlatform() : true);
    const banner = document.getElementById('apk-promo-banner');
    if (!banner) return;
    
    if (isNativeApp) {
        banner.style.display = 'none';
        return;
    }

    const dismissed = localStorage.getItem('study_apk_banner_dismissed');
    if (!dismissed || (Date.now() - Number(dismissed) > 3 * 24 * 60 * 60 * 1000)) {
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

window.dismissApkBanner = function() {
    const banner = document.getElementById('apk-promo-banner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('study_apk_banner_dismissed', Date.now().toString());
};

// --- Send New APK Web Notification to Existing Users ---
function notifyUsersAboutNewApk() {
    const isNativeApp = window.Capacitor && (typeof window.Capacitor.isNativePlatform === 'function' ? window.Capacitor.isNativePlatform() : true);
    if (isNativeApp) return;

    const alreadyNotified = localStorage.getItem('study_apk_v1_notified');
    if (alreadyNotified === 'true') return;

    setTimeout(() => {
        const notifTitle = "🚀 نزل تطبيق الأندرويد الجديد للمذاكرة الآن!";
        const notifBody = "تطبيق الأندرويد الرسمي متوفر الآن مع إشعارات الصلاة والتحفيز حتى لو التطبيق مقفول تماماً! اضغط هنا لتحميله فوراً.";
        const notifIcon = "icons/app-icon.png";

        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                sendIt();
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(perm => {
                    if (perm === "granted") sendIt();
                });
            }
        }

        function sendIt() {
            try {
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(reg => {
                        reg.showNotification(notifTitle, {
                            body: notifBody,
                            icon: notifIcon,
                            badge: notifIcon,
                            vibrate: [200, 100, 200],
                            dir: "rtl",
                            lang: "ar",
                            tag: "new-apk-release",
                            renotify: true,
                            data: { url: "./output/study-app-debug.apk" }
                        });
                    });
                } else {
                    const n = new Notification(notifTitle, {
                        body: notifBody,
                        icon: notifIcon,
                        dir: "rtl"
                    });
                    n.onclick = () => {
                        window.focus();
                        window.location.href = "./output/study-app-debug.apk";
                    };
                }
                localStorage.setItem('study_apk_v1_notified', 'true');
            } catch(e) {
                console.log("Notification send error:", e);
            }
        }
    }, 2500);
}

// =========================================================
// --- NOTEBOOK AI CONTROLLER (NotebookLM by Google) ---
// =========================================================
window.notebookDoc = null;
window.notebookPodcast = {
    dialogue: [],
    currentIndex: 0,
    isPlaying: false,
    speed: 1.0,
    currentUtterance: null
};

// 1. File Upload (PDF, Images, or Text)
function compressImageForOCR(file, maxDimension = 1600, quality = 0.85) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                const base64 = dataUrl.split(',')[1];
                resolve({ base64, mimeType: 'image/jpeg' });
            };
            img.onerror = () => {
                const raw = e.target.result;
                resolve({ base64: raw.split(',')[1], mimeType: file.type || 'image/jpeg' });
            };
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

window.handleNotebookImageUpload = async function(files) {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files).filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|bmp)$/i.test(f.name));
    if (fileList.length === 0) {
        return alert("يرجى اختيار صور صالحة لصفحات الكتاب (JPG, PNG, WebP).");
    }

    const loader = document.getElementById('nb-ocr-loading');
    const loadingText = document.getElementById('nb-ocr-loading-text');
    const dropzone = document.getElementById('nb-dropzone');

    if (loader) loader.style.display = 'block';
    if (dropzone) dropzone.style.display = 'none';

    try {
        let fullExtractedText = "";
        let pageCount = 0;

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            pageCount++;

            if (loadingText) {
                loadingText.innerText = `الذكاء الاصطناعي يقرأ صفحة الكتاب (${pageCount} من ${fileList.length}) بدقة... 📖✨`;
            }

            const imgData = await compressImageForOCR(file);
            if (!imgData || !imgData.base64) continue;

            const promptText = `أنت نظام ماسح ضوئي ذكي فائق الدقة (OCR) متخصص في قراءة واستخراج نصوص الكتب والمذكرات الدراسية.
اقرأ واستخرج النص الكامل المكتوب في هذه الصفحة من الكتاب بدقة 100% باللغة العربية أو الإنجليزية كما هي مكتوبة تماماً.
- حافظ على العناوين والفقرات والقوانين والمعادلات والنقاط بالترتيب السليم.
- اكتب النص فقط بدون أي تعليق أو مقدمة أو خاتمة.`;

            const parts = [
                { text: promptText },
                { inlineData: { mimeType: imgData.mimeType, data: imgData.base64 } }
            ];

            const pageText = await callGeminiAPI(parts, { silent: true });
            if (pageText && pageText.trim()) {
                fullExtractedText += (fullExtractedText ? `\n\n--- [صفحة ${pageCount}] ---\n\n` : `--- [صفحة 1] ---\n\n`) + pageText.trim();
            }
        }

        fullExtractedText = fullExtractedText.trim();
        if (!fullExtractedText) {
            alert("لم نتمكن من قراءة النص في الصورة. يرجى التأكد من وضوح إضاءة الصفحة وإعادة المحاولة.");
            return;
        }

        const wordCount = fullExtractedText.split(/\s+/).length;
        window.notebookDoc = {
            title: pageCount === 1 ? `كتاب ورقي: صفحة مصورة` : `كتاب ورقي (${pageCount} صفحات مصورة)`,
            text: fullExtractedText,
            pages: pageCount,
            words: wordCount,
            isPaperBook: true
        };

        renderNotebookDocInfo();
        switchNotebookTab('nb-summary-tab');
        generateNotebookSummary();
    } catch(err) {
        console.error("Camera OCR error:", err);
        alert("حدث خطأ أثناء قراءة صورة الكتاب: " + (err.message || err));
    } finally {
        if (loader) loader.style.display = 'none';
        if (dropzone) dropzone.style.display = 'block';
        const camInput = document.getElementById('nb-camera-input');
        const galInput = document.getElementById('nb-gallery-input');
        if (camInput) camInput.value = '';
        if (galInput) galInput.value = '';
    }
};

window.handleNotebookFileUpload = async function(file) {
    if (!file) return;

    if (file.type && file.type.startsWith('image/')) {
        return window.handleNotebookImageUpload([file]);
    }

    const dropzone = document.getElementById('nb-dropzone');
    if (dropzone) dropzone.style.opacity = '0.5';

    try {
        let fullText = "";
        let pageCount = 1;

        if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
            if (typeof pdfjsLib === 'undefined') {
                throw new Error("مكتبة قراءة الـ PDF غير محملة");
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            pageCount = pdf.numPages;

            for (let i = 1; i <= Math.min(pageCount, 50); i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                fullText += `\n\n--- [صفحة ${i}] ---\n` + pageText;
            }
        } else {
            // Text file
            fullText = await file.text();
        }

        fullText = fullText.trim();
        if (!fullText) {
            alert("لم نتمكن من استخراج نص واضح من الملف (تأكد أن الملف يحتوي على نصوص وليس صور مسحوبة بالسكانر فقط).");
            return;
        }

        const wordCount = fullText.split(/\s+/).length;
        window.notebookDoc = {
            title: file.name,
            text: fullText,
            pages: pageCount,
            words: wordCount
        };

        renderNotebookDocInfo();
        // Automatically switch to summary tab and generate summary!
        switchNotebookTab('nb-summary-tab');
        generateNotebookSummary();
    } catch(err) {
        console.error("PDF upload error:", err);
        alert("حدث خطأ أثناء قراءة ملف الـ PDF: " + err.message);
    } finally {
        if (dropzone) dropzone.style.opacity = '1';
    }
};

window.renderNotebookDocInfo = function() {
    if (!window.notebookDoc) return;
    const infoBox = document.getElementById('nb-doc-info');
    const titleElem = document.getElementById('nb-doc-title');
    const metaElem = document.getElementById('nb-doc-meta');
    if (infoBox) infoBox.style.display = 'flex';
    if (titleElem) titleElem.innerText = window.notebookDoc.title;
    if (metaElem) metaElem.innerText = `${window.notebookDoc.pages} صفحة | حوالي ${window.notebookDoc.words} كلمة`;
};

window.clearNotebookDocument = function() {
    window.notebookDoc = null;
    const infoBox = document.getElementById('nb-doc-info');
    if (infoBox) infoBox.style.display = 'none';
    const fileInput = document.getElementById('nb-file-input');
    if (fileInput) fileInput.value = '';
    const camInput = document.getElementById('nb-camera-input');
    if (camInput) camInput.value = '';
    const galInput = document.getElementById('nb-gallery-input');
    if (galInput) galInput.value = '';
    const summaryBox = document.getElementById('nb-summary-content');
    if (summaryBox) {
        summaryBox.innerHTML = `
            <div style="text-align:center; color:var(--text-muted); padding:30px 10px;">
                <i class="fa-solid fa-file-lines" style="font-size:3rem; opacity:0.3; margin-bottom:12px;"></i>
                <p>ارفع ملف PDF أو اختر درساً جاهزاً، ثم اضغط <strong>"توليد الملخص الآن"</strong> لتظهر لك خلاصة الكتاب هنا.</p>
            </div>
        `;
    }
    stopPodcastPlayback();
    const playerSec = document.getElementById('nb-podcast-player-section');
    if (playerSec) playerSec.style.display = 'none';
};

window.toggleNotebookTextInput = function() {
    const box = document.getElementById('nb-text-input-box');
    if (box) box.style.display = (box.style.display === 'none' ? 'block' : 'none');
};

window.handleNotebookRawText = function() {
    const txt = document.getElementById('nb-raw-text').value.trim();
    if (!txt) return alert("يرجى كتابة أو لصق النص أولاً!");
    const wordCount = txt.split(/\s+/).length;
    window.notebookDoc = {
        title: "مذكرة نصية يدوية",
        text: txt,
        pages: 1,
        words: wordCount
    };
    renderNotebookDocInfo();
    document.getElementById('nb-text-input-box').style.display = 'none';
    generateNotebookSummary();
};

window.loadNotebookDemo = function(demoKey) {
    let demoTitle = "";
    let demoText = "";
    if (demoKey === 'atomic_habits') {
        demoTitle = "كتاب العادات الذرية (Atomic Habits) - جيمس كلير";
        demoText = `
العادات الذرية: تغييرات صغيرة تؤدي لنتائج مذهلة
المؤلف: جيمس كلير

الفكرة الجوهرية:
إذا تحسنت بنسبة 1% يومياً لمدة سنة، ستكون أفضل بـ 37 مرة في نهاية العام. بينما إذا تراجعت بنسبة 1% يومياً، ستهبط إلى الصفر تقريباً. العادات هي الفائدة المركبة للتحسين الذاتي.

القوانين الأربعة لتغيير السلوك:
1. القانون الأول (الإشارة): اجعلها واضحة (Make it Obvious). حدد وقتاً ومكاناً ثابتاً للعادة، واستخدم استراتيجية تكديس العادات (Habit Stacking).
2. القانون الثاني (الجاذبية): اجعلها جذابة (Make it Attractive). اربط العادة التي تحتاج لفعلها بعادة تحب فعلها.
3. القانون الثالث (السهولة): اجعلها سهلة (Make it Easy). قلل الاحتكاك، واعتمد قاعدة الدقيقتين (ابدأ العادة في أقل من دقيقتين).
4. القانون الرابع (المكافأة): اجعلها مشبعة (Make it Satisfying). ما يُكافأ يُكرر، وما يُعاقب يُتجنب.

مفهوم الهوية (Identity-based Habits):
التغيير الحقيقي يبدأ بتغيير هويتك وليس أهدافك. لا تقل "أريد قراءة كتاب"، بل قل "أنا قارئ". كل فعل تفعله هو بمثابة صوت ترشيح لصالح الشخص الذي ترغب في أن تكونه.
        `.trim();
    } else {
        demoTitle = "ملزمة الأحياء: تركيب الخلية ووظائف العضيات";
        demoText = `
الوحدة الأولى: الخلية ووظائف الحياة
الخلية هي وحدة البناء والوظيفة في جميع الكائنات الحية.

أهم عضيات الخلية:
1. الغشاء البلازمي (Plasma Membrane): غشاء شبه منفذ ينظم مرور المواد من وإلى الخلية بخاصية النفاذية الاختيارية.
2. النواة (Nucleus): مركز التحكم والعمليات الحيوية، تحتوي على المادة الوراثية (DNA) والنوية المسؤولة عن تكوين الريبوسومات.
3. الميتوكوندريا (Mitochondria): مصنع الطاقة في الخلية ومقر التنفس الخلوي لإنتاج جزيئات ATP.
4. الشبكة الإندوبلازمية: خشنة (بها ريبوسومات لبناء البروتين) وملساء (لبناء الدهون والتخلص من السموم).
5. جهاز جولجي (Golgi Apparatus): يعمل على تعديل وتغليف وتوزيع البروتينات.
6. البلاستيدات الخضراء (في الخلية النباتية فقط): مقر عملية البناء الضوئي لاحتوائها على صبغة الكلوروفيل.

الفروق الجوهرية بين الخلية النباتية والحيوانية:
- الخلية النباتية تمتلك جداراً خلوياً من السيليلوز وبلاستيدات خضراء وفجوة عصارية كبيرة.
- الخلية الحيوانية لا تحتوي على جدار خلوي وتحتوي على جسم مركزي (سنتروسوم) لانقسام الخلية.
        `.trim();
    }

    window.notebookDoc = {
        title: demoTitle,
        text: demoText,
        pages: 3,
        words: demoText.split(/\s+/).length
    };
    renderNotebookDocInfo();
    switchNotebookTab('nb-summary-tab');
    generateNotebookSummary();
};

window.switchNotebookTab = function(tabId) {
    document.querySelectorAll('.nb-nav-tabs .nb-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.nb-tab-pane').forEach(pane => pane.classList.remove('active'));
    
    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add('active');

    const btns = document.querySelectorAll('.nb-nav-tabs .nb-tab-btn');
    if (tabId === 'nb-summary-tab' && btns[0]) btns[0].classList.add('active');
    if (tabId === 'nb-chat-tab' && btns[1]) btns[1].classList.add('active');
    if (tabId === 'nb-podcast-tab' && btns[2]) btns[2].classList.add('active');
};

// 2. Summary Generation
window.generateNotebookSummary = async function() {
    if (!window.notebookDoc || !window.notebookDoc.text) {
        return alert("يرجى رفع ملف PDF أو اختيار درس تجريبي أولاً!");
    }

    const loader = document.getElementById('nb-summary-loading');
    const contentBox = document.getElementById('nb-summary-content');
    const btn = document.getElementById('nb-generate-summary-btn');

    if (loader) loader.style.display = 'block';
    if (btn) btn.disabled = true;

    const sampleText = window.notebookDoc.text.slice(0, 12000);
    const prompt = `أنت أفضل معلم ومساعد دراسي للطلاب على غرار نظام Google NotebookLM.
مهمتك: قراءة وتحليل هذا المحتوى الدراسي وإعداد تقرير مذاكرة احترافي، مريح جداً للعين، ومنظم بأعلى دقة.

الملف: "${window.notebookDoc.title}"
المحتوى:
"""
${sampleText}
"""

⚠️ تعليمات التنسيق الإلزامية لمظهر رائع ومريح للعين:
1. ❌ ممنوع منعاً باتاً استخدام جداول الماركداون (| جدول |) نهائياً، لأنها تظهر مشوهة ومكسرة على الموبايل!
2. ❌ ممنوع كتابة أي كلمات إنجليزية وسط العناوين أو الجمل العربية لمنع تشوه النصوص وعكس اتجاه الكلمات.
3. ✅ استخدم القوائم النقطية المنظمة، والأسطر المتباعدة، والعناوين الواضحة، والرموز التعبيرية المناسبة.

المطلوب إخراجه بالتحديد بهذا الهيكل:

## 📌 الفكرة العامة والملخص الشامل
(اكتب فقرة تمهيدية تشرح لب الموضوع ببساطة، ثم 3 إلى 5 نقاط جوهرية توضح أركان الدرس).

## 🧠 المفاهيم والمصطلحات الأساسية
(قائمة بكل مصطلح هام تم تعريفه في الدرس، مع شرح مبسط له في سطر واضح ومريح للقراءة).
* 🔹 **المصطلح الأول**: الشرح والتعريف بأسلوب سهل.
* 🔹 **المصطلح الثاني**: الشرح والتعريف بأسلوب سهل.

## 🎯 أهم 5 أسئلة متوقعة في الامتحان مع الإجابة النموذجية
(صيغة أسئلة امتحانات ذكية تقيس الفهم، وتحت كل سؤال إجابته النموذجية الوافية).
1. ❓ **السؤال الأول**: نص السؤال؟
   - ✍️ **الإجابة النموذجية**: تفاصيل الإجابة بوضوح وتنسيق مرتب.
2. ❓ **السؤال الثاني**: نص السؤال؟
   - ✍️ **الإجابة النموذجية**: تفاصيل الإجابة بوضوح وتنسيق مرتب.

## 💡 نصيحة ذهبية للحفظ والتفوق
(استراتيجية عملية وسريعة لتثبيت هذا الدرس في الذاكرة وعدم نسيانه).
`;

    try {
        const result = await callGeminiAPI([{ text: prompt }], { silent: true });
        if (result && contentBox) {
            contentBox.className = "card ai-formatted-report";
            if (typeof marked !== 'undefined') {
                contentBox.innerHTML = marked.parse(result);
            } else {
                contentBox.innerHTML = `<pre style="white-space:pre-wrap; font-family:inherit;">${result}</pre>`;
            }
        }
    } catch(e) {
        console.error("Summary error:", e);
        if (contentBox) contentBox.innerHTML = `<div style="color:var(--danger); text-align:center;">حدث خطأ أثناء توليد الملخص: ${e.message}</div>`;
    } finally {
        if (loader) loader.style.display = 'none';
        if (btn) btn.disabled = false;
    }
};

// 3. Chat with Document
window.handleNotebookChatSubmit = async function(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('nb-chat-input');
    const q = input.value.trim();
    if (!q) return;

    if (!window.notebookDoc || !window.notebookDoc.text) {
        return alert("يرجى رفع ملف PDF أو اختيار درس تجريبي أولاً!");
    }

    input.value = '';
    appendNotebookChatMessage('user', q);

    const chatBox = document.getElementById('nb-chat-messages');
    const typingId = 'nb-typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'nb-msg nb-msg-ai';
    typingDiv.id = typingId;
    typingDiv.innerHTML = `
        <div class="nb-msg-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="nb-msg-bubble" style="opacity:0.7;">جارِ البحث في صفحات الكتاب... ✍️</div>
    `;
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    const sampleText = window.notebookDoc.text.slice(0, 10000);
    const prompt = `أنت مساعد ومدرس دراسي ذكي للطلاب على غرار Google NotebookLM.
مهمتك هي الإجابة عن سؤال الطالب بناءً على محتوى الكتاب المرفق فقط:
الكتاب: "${window.notebookDoc.title}"
المحتوى:
"""
${sampleText}
"""

سؤال الطالب: "${q}"

التعليمات:
- أجب بدقة واستشهد بالنص أو الصفحات إن كانت واضحة.
- بسّط الشرح واجعله مفيداً جداً للطالب وممتعاً.
- إذا لم تكن الإجابة في النص، وضح ذلك وأجب بمعلوماتك التعليمية المساعدة.`;

    try {
        const res = await callGeminiAPI([{ text: prompt }]);
        const typingElem = document.getElementById(typingId);
        if (typingElem) typingElem.remove();

        appendNotebookChatMessage('ai', res || 'عذراً، لم أتمكن من الحصول على إجابة.');
    } catch(err) {
        const typingElem = document.getElementById(typingId);
        if (typingElem) typingElem.remove();
        appendNotebookChatMessage('ai', 'حدث خطأ أثناء التواصل مع الذكاء الاصطناعي: ' + err.message);
    }
};

window.askNotebookQuick = function(promptText) {
    const input = document.getElementById('nb-chat-input');
    if (input) {
        input.value = promptText;
        handleNotebookChatSubmit();
    }
};

window.appendNotebookChatMessage = function(role, text) {
    const chatBox = document.getElementById('nb-chat-messages');
    if (!chatBox) return;

    const div = document.createElement('div');
    div.className = `nb-msg nb-msg-${role}`;
    const avatar = role === 'user' ? '<i class="fa-solid fa-user-graduate"></i>' : '<i class="fa-solid fa-robot"></i>';
    const parsedText = (typeof marked !== 'undefined' && role === 'ai') ? marked.parse(text) : text.replace(/\n/g, '<br>');

    div.innerHTML = `
        <div class="nb-msg-avatar">${avatar}</div>
        <div class="nb-msg-bubble">${parsedText}</div>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
};

window.clearNotebookChat = function() {
    const chatBox = document.getElementById('nb-chat-messages');
    if (chatBox) {
        chatBox.innerHTML = `
            <div class="nb-msg nb-msg-ai">
                <div class="nb-msg-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="nb-msg-bubble">
                    تم مسح المحادثة. أنا جاهز لأي سؤال جديد عن محتوى الكتاب! 📚
                </div>
            </div>
        `;
    }
};

// ====== Notebook AI Podcast Engine (Audio & Speech Synthesis) ======
let currentPodcastAudio = null;
let currentPodcastUtterance = null;
let cachedArabicVoices = [];

function updateArabicVoices() {
    if (!('speechSynthesis' in window)) return [];
    try {
        const all = window.speechSynthesis.getVoices() || [];
        cachedArabicVoices = all.filter(v => {
            if (!v || !v.lang) return false;
            const l = v.lang.toLowerCase();
            return l.startsWith('ar') || l.includes('ar-') || l.includes('ara') || l.includes('arb') || (v.name && /arabic|عربي/i.test(v.name));
        });
    } catch(e) {
        cachedArabicVoices = [];
    }
    return cachedArabicVoices;
}

if ('speechSynthesis' in window) {
    updateArabicVoices();
    window.speechSynthesis.onvoiceschanged = updateArabicVoices;
}

function cleanTextForSpeech(text) {
    if (!text) return "";
    let clean = String(text);

    // 1. Remove speaker prefix if accidentally embedded
    clean = clean.replace(/^[\*\_\s]*\[?(?:أحمد|سارة|Ahmed|Sara)\]?[\*\_\s]*[:\-]\s*/i, '');

    // 2. Remove emojis and variation selectors
    clean = clean.replace(/[\u{1F000}-\u{1FAFF}\u{200D}\u{FE0F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');

    // 3. Remove stage directions like (يبتسم) or [ضحك] or *متحمسة*
    clean = clean.replace(/[\(\[\*](?:يبتسم|تبتسم|يضحك|تضحك|ضحك|ابتسامة|متحمس|متحمسة|بهدوء|بفضول|بانبهار|pause|laughs)[\)\]\*]/gi, ' ');

    // 4. Remove English in parentheses e.g. (Shapley Supercluster)
    clean = clean.replace(/\s*\([A-Za-z0-9\s_\-\.,\/]+\)\s*/g, ' ');

    // 5. Expand scientific & common acronyms to standard Arabic words
    clean = clean.replace(/\bالـ\s*AI\b/gi, 'الذكاء الاصطناعي');
    clean = clean.replace(/\bالـ\s*DNA\b/gi, 'الحمض النووي');
    clean = clean.replace(/\bالـ\s*RNA\b/gi, 'حمض الرنا');
    const acronymMap = {
        'DNA': 'حمض نووي',
        'RNA': 'رنا',
        'NASA': 'ناسا',
        'AI': 'الذكاء الاصطناعي',
        'PDF': 'بي دي إف',
        'VIP': 'في آي بي',
        'NGC': 'إن جي سي',
        'COVID': 'كوفيد'
    };
    for (const [k, v] of Object.entries(acronymMap)) {
        clean = clean.replace(new RegExp('\\b' + k + '\\b', 'gi'), v);
    }

    // 6. Remove any remaining Latin letters to prevent TTS glitches
    clean = clean.replace(/[A-Za-z]+/g, ' ');

    // 7. Remove markdown stars, quotes, brackets, slashes
    clean = clean.replace(/[\*\_\[\]\"\'\`\#\<\>\~\\\/]/g, ' ');
    clean = clean.replace(/[«»“”]/g, ' ');

    // 8. Normalize pauses and dots
    clean = clean.replace(/\.{2,}/g, '، ');
    clean = clean.replace(/[–—\-]/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
}

function splitTextIntoTTSChunks(text, maxLength = 120) {
    if (!text) return [];
    if (text.length <= maxLength) return [text];

    const chunks = [];
    const sentences = text.split(/([،,؛;.\n!?؟]+)/);
    let current = '';

    for (let i = 0; i < sentences.length; i++) {
        const part = sentences[i];
        if (!part) continue;
        if ((current + part).length <= maxLength) {
            current += part;
        } else {
            if (current.trim()) chunks.push(current.trim());
            if (part.length <= maxLength) {
                current = part;
            } else {
                const words = part.split(' ');
                current = '';
                for (const word of words) {
                    if ((current + ' ' + word).length <= maxLength) {
                        current = current ? (current + ' ' + word) : word;
                    } else {
                        if (current.trim()) chunks.push(current.trim());
                        current = word;
                    }
                }
            }
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
}

function getBestArabicVoice(isFemale = false) {
    if (!cachedArabicVoices || cachedArabicVoices.length === 0) {
        updateArabicVoices();
    }
    if (!cachedArabicVoices || cachedArabicVoices.length === 0) return null;

    if (isFemale) {
        const female = cachedArabicVoices.find(v => {
            const str = ((v.name || '') + ' ' + (v.voiceURI || '')).toLowerCase();
            return /female|hoda|salma|zeina|laila|maryam|zari|mona|nada|sara|fatima|nour|yasmin|wafa|leila|wavenet-a|wavenet-b|standard-a|standard-b/i.test(str);
        });
        if (female) return female;
        if (cachedArabicVoices.length > 1) return cachedArabicVoices[1];
    } else {
        const male = cachedArabicVoices.find(v => {
            const str = ((v.name || '') + ' ' + (v.voiceURI || '')).toLowerCase();
            return /male|naayf|tarik|maged|shakir|omar|hamed|ali|ahmed|youssef|kareem|wavenet-c|wavenet-d|standard-c|standard-d/i.test(str);
        });
        if (male) return male;
        return cachedArabicVoices[0];
    }
    return cachedArabicVoices[0];
}

function stopPodcastCurrentAudio() {
    if (currentPodcastAudio) {
        try {
            currentPodcastAudio.onended = null;
            currentPodcastAudio.onerror = null;
            currentPodcastAudio.pause();
            currentPodcastAudio.currentTime = 0;
            currentPodcastAudio.src = '';
        } catch(e) {}
        currentPodcastAudio = null;
    }
    if ('speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
        } catch(e) {}
    }
    currentPodcastUtterance = null;
}

function playViaSpeechSynthesis(text, speaker, speed, onDone) {
    if (!('speechSynthesis' in window)) {
        if (onDone) setTimeout(onDone, 500);
        return;
    }

    const isSara = (speaker === 'سارة');
    const bestVoice = getBestArabicVoice(isSara);

    const utterance = new SpeechSynthesisUtterance(text);
    if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
    } else {
        utterance.lang = 'ar-SA';
    }

    const baseSpeed = speed || 1.0;
    if (isSara) {
        utterance.pitch = bestVoice ? 1.08 : 1.12;
        utterance.rate = baseSpeed * 0.98;
    } else {
        utterance.pitch = bestVoice ? 0.94 : 0.90;
        utterance.rate = baseSpeed * 0.92;
    }

    utterance.onend = () => {
        // Natural studio conversation pause between speakers (450ms)
        setTimeout(() => {
            if (window.notebookPodcast.isPlaying && onDone) onDone();
        }, 450);
    };

    utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') {
            return; // Normal cancel/stop, DO NOT auto-advance
        }
        console.warn("SpeechSynthesis error:", e.error);
        if (window.notebookPodcast.isPlaying) {
            setTimeout(() => {
                if (window.notebookPodcast.isPlaying && onDone) onDone();
            }, 600);
        }
    };

    currentPodcastUtterance = utterance;

    // In Chromium, small delay after cancel ensures utterance is not immediately killed
    setTimeout(() => {
        if (!window.notebookPodcast.isPlaying) return;
        try {
            window.speechSynthesis.speak(utterance);
        } catch(err) {
            console.error("Speak error:", err);
        }
    }, 50);
}

function playGoogleTTS(text, speaker, speed, onDone, onError) {
    const chunks = splitTextIntoTTSChunks(text, 120);
    if (chunks.length === 0) {
        if (onDone) setTimeout(onDone, 500);
        return;
    }

    let chunkIdx = 0;
    let fallbackTriggered = false;

    function triggerFallback() {
        if (fallbackTriggered) return;
        fallbackTriggered = true;
        if (onError) onError();
    }

    function playNextChunk() {
        if (!window.notebookPodcast.isPlaying) return;
        if (chunkIdx >= chunks.length) {
            // Natural pause between sentences (500ms)
            setTimeout(() => {
                if (window.notebookPodcast.isPlaying && onDone) onDone();
            }, 500);
            return;
        }

        const chunk = chunks[chunkIdx];
        chunkIdx++;

        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encodeURIComponent(chunk)}`;
        const audio = new Audio();
        audio.referrerPolicy = 'no-referrer';
        audio.src = url;
        currentPodcastAudio = audio;

        const isSara = (speaker === 'سارة');
        const baseRate = speed || 1.0;
        audio.playbackRate = isSara ? (baseRate * 1.04) : (baseRate * 0.94);
        try {
            audio.preservesPitch = false;
        } catch(e) {}

        audio.onended = () => {
            // Short pause between chunks of the same sentence
            setTimeout(playNextChunk, 200);
        };

        audio.onerror = (err) => {
            console.warn("Google TTS audio error, switching to SpeechSynthesis fallback:", err);
            triggerFallback();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.warn("Audio play() blocked or failed:", e);
                triggerFallback();
            });
        }
    }

    playNextChunk();
}

function parsePodcastDialogue(raw) {
    if (!raw) return [];
    let dialogue = [];

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        try {
            jsonStr = jsonStr.replace(/"speaker"\s*:\s*([^"\s,}\]]+)/gi, (m, val) => {
                const clean = val.replace(/["']/g, '').trim();
                return `"speaker": "${clean}"`;
            });
            jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map(d => {
                    const spk = (d.speaker && (d.speaker.includes('سارة') || d.speaker.toLowerCase().includes('sara'))) ? 'سارة' : 'أحمد';
                    let txt = String(d.text || d.line || d.message || '').replace(/[\r\n]+/g, ' ').trim();
                    txt = txt.replace(/^[\*\_\s]*\[?(?:أحمد|سارة|Ahmed|Sara)\]?[\*\_\s]*[:\-]\s*/i, '');
                    txt = txt.replace(/[\*\_`#]/g, '');
                    return { speaker: spk, text: txt };
                }).filter(d => d.text.length > 0);
            }
        } catch (e) {
            console.warn("JSON.parse error in podcast parser, falling back to regex:", e);
        }
    }

    const objRegex = /\{\s*["']?speaker["']?\s*:\s*["']?([^"',}]+)["']?\s*,\s*["']?text["']?\s*:\s*["']([\s\S]*?)["']\s*\}/gi;
    let match;
    while ((match = objRegex.exec(raw)) !== null) {
        const spk = match[1].includes('سارة') ? 'سارة' : 'أحمد';
        let txt = match[2].replace(/[\r\n]+/g, ' ').trim();
        txt = txt.replace(/^[\*\_\s]*\[?(?:أحمد|سارة|Ahmed|Sara)\]?[\*\_\s]*[:\-]\s*/i, '');
        txt = txt.replace(/[\*\_`#]/g, '');
        if (txt) dialogue.push({ speaker: spk, text: txt });
    }
    if (dialogue.length > 0) return dialogue;

    const lines = raw.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        if (line.includes('أحمد') && (line.includes(':') || line.includes('-') || line.includes(']'))) {
            let cleanText = line.replace(/.*أحمد.*?[:\-\]]\s*/, '').replace(/["'}\]]/g, '').trim();
            cleanText = cleanText.replace(/[\*\_`#]/g, '');
            if (cleanText) dialogue.push({ speaker: 'أحمد', text: cleanText });
        } else if (line.includes('سارة') && (line.includes(':') || line.includes('-') || line.includes(']'))) {
            let cleanText = line.replace(/.*سارة.*?[:\-\]]\s*/, '').replace(/["'}\]]/g, '').trim();
            cleanText = cleanText.replace(/[\*\_`#]/g, '');
            if (cleanText) dialogue.push({ speaker: 'سارة', text: cleanText });
        }
    }
    return dialogue;
}

function generateFallbackPodcastDialogue() {
    const title = (window.notebookDoc && window.notebookDoc.title) ? window.notebookDoc.title : "هذا الدرس";
    const raw = (window.notebookDoc && window.notebookDoc.text) ? window.notebookDoc.text : "";
    const cleanSentences = raw.replace(/[\[\]{}#*]/g, '').split(/[.!?؟\n]+/).map(s => s.trim()).filter(s => s.length > 15 && s.length < 140);
    const s1 = cleanSentences[0] || "موضوع اليوم مهم جداً لكل الطلاب في الامتحانات.";
    const s2 = cleanSentences[1] || "الفكرة الجوهرية تعتمد على الفهم والتطبيق السليم.";
    const s3 = cleanSentences[2] || "أهم ما يميز هذا الدرس هو الربط بين المفاهيم وحل التدريبات العملية.";

    return [
        { speaker: "أحمد", text: `أهلاً بكم يا أصدقائي في حلقة جديدة من بودكاست المذاكرة الذكية! اليوم معنا مراجعة مركزة لدرس ${title}.` },
        { speaker: "سارة", text: `أهلاً يا أحمد وأهلاً بكل الطلاب المتميزين! هذا الدرس من الدروس الممتعة جداً، والسر فيه فهم الصورة الكلية أولاً.` },
        { speaker: "أحمد", text: `رائع جداً يا سارة، ما هي أول نقطة جوهرية يجب أن نركز عليها لضمان الدرجة الكاملة؟` },
        { speaker: "سارة", text: `النقطة الأساسية هي استيعاب الأساسيات وتطبيقها خطوة بخطوة، خصوصاً أن ${s1}` },
        { speaker: "أحمد", text: `كلام سليم تماماً! وهل هناك أي فخ أو خطأ شائع يقع فيه الطلاب أثناء المذاكرة هنا؟` },
        { speaker: "سارة", text: `سؤال ذكي يا أحمد! الخطأ الشائع هو حفظ القواعد دون فهم التطبيق، ولذلك نؤكد دائماً أن ${s2}` },
        { speaker: "أحمد", text: `وهل توجد أي نصيحة ذهبية أخيرة تلخص طريقة مراجعة هذا الجزء قبل الاختبار؟` },
        { speaker: "سارة", text: `نعم بالتأكيد! تذكروا دائماً أن ${s3} وبالتوفيق والنجاح لجميع الطلاب!` },
        { speaker: "أحمد", text: `شكراً جزيلاً لك يا سارة على هذا التبسيط الرائع، ونلقاكم في حلقة جديدة من بودكاست المذاكرة الذكية!` }
    ];
}

window.generateNotebookPodcast = async function() {
    if (!window.notebookDoc || !window.notebookDoc.text) {
        return alert("يرجى تصوير كتابك الورقي أو رفع ملف PDF أو اختيار درس تجريبي أولاً!");
    }

    const loader = document.getElementById('nb-podcast-loading');
    const playerSec = document.getElementById('nb-podcast-player-section');
    const btn = document.getElementById('nb-generate-podcast-btn');

    if (loader) loader.style.display = 'block';
    if (playerSec) playerSec.style.display = 'none';
    if (btn) btn.disabled = true;

    stopPodcastPlayback();

    const sampleText = window.notebookDoc.text.slice(0, 10000);
    const prompt = `أنت مخرج ومؤلف حلقات بودكاست إذاعية حوارية ذكية جداً للطلاب مستوحاة من خاصية Audio Overview في Google NotebookLM.
حوّل محتوى هذا الملف الدراسي إلى حلقة بودكاست إذاعية تفاعلية ممتعة وشيقة جداً بين شخصين، بترتيب حواري إذاعي متقن ومحكم:
- [أحمد]: طالب ذكي متسائل، يبدأ الحلقة بترحيب حماسي بالمستمعين، يسأل بفضول، ويبحث عن التبسيط والأمثلة العملية وأهم ما يأتي في الامتحانات.
- [سارة]: معلمة وباحثة خبيرة ذكية، تشرح بأسلوب واقعي مشوق، تعطي أمثلة حية، وتبين الفخاخ والأخطاء الشائعة في الدرس.

الملف: "${window.notebookDoc.title}"
المحتوى:
"""
${sampleText}
"""

ترتيب وتوزيع الحوار الإذاعي (صارم جداً):
1. يبدأ الحوار دائماً بـ [أحمد] يرحب بالطلاب ويعلن اسم الدرس بحماس.
2. ترد [سارة] بتلخيص الفكرة العامة للدرس في جملة مشوقة.
3. التبادل بالتناوب الصارم: أحمد -> سارة -> أحمد -> سارة (ممنوع أن يتحدث نفس الشخص مرتين متتاليتين).
4. يناقش الحوار أهم 3 نقاط في الدرس مع التركيز على المفاهيم المتوقعة في الامتحانات.
5. تنتهي الحلقة بختام تحفيزي قصير ومشجع من الطرفين.

قواعد صارمة للنطق وجودة الصوت:
1. اكتب الحوار باللغة العربية الفصحى الواضحة والسهلة فقط.
2. ممنوع تماماً كتابة أي حروف أو كلمات أو اختصارات باللغة الإنجليزية أو اللاتينية داخل الحوار (مثل: NGC أو DNA أو أسماء بين قوسين). أي مصطلح اكتبه معرباً بالكامل بحروف عربية فقط.
3. اجعل الجمل مركزة وقصيرة (من 12 إلى 22 كلمة في الجملة)، حتى يكون الإلقاء الإذاعي طبيعياً ومريحاً للأذن.
4. لا تضع أي رموز تعبيرية (إيموجي) أو رموز مثل النجوم والشرطات أو وصف للحركات مثل (يضحك) أو (مبتسمة) داخل نص الجملة.

المطلوب الإرجاع كـ JSON ARRAY حصراً بالصيغة التالية (بدون أي نصوص خارج الـ JSON):
[
  {"speaker": "أحمد", "text": "أهلاً بكم يا أصدقائي في حلقة جديدة من بودكاست المذاكرة الذكية، اليوم معنا درس رائع ومهم جداً..."},
  {"speaker": "سارة", "text": "أهلاً يا أحمد وأهلاً بكل الطلاب، والسر في هذا الدرس هو فهم الفكرة الأساسية أولاً..."},
  {"speaker": "أحمد", "text": "جميل جداً يا سارة، ما هي أهم نقطة يحتاج الطالب التركيز عليها هنا؟"},
  {"speaker": "سارة", "text": "النقطة الأولى والجوهرية هي..."}
]

اكتب حواراً من 8 إلى 10 جمل ممتعة ومفيدة جداً بالعربية فقط. أرجع الـ JSON حصراً.`;

    try {
        let raw = await callGeminiAPI([{ text: prompt }], { silent: true });
        if (!raw) throw new Error("لم يصل رد من الذكاء الاصطناعي");

        let dialogueArray = parsePodcastDialogue(raw);
        if (!dialogueArray || dialogueArray.length === 0) {
            dialogueArray = generateFallbackPodcastDialogue();
        }

        window.notebookPodcast.dialogue = dialogueArray;
        window.notebookPodcast.currentIndex = 0;

        renderPodcastTranscript();
        if (playerSec) playerSec.style.display = 'block';

        // Provide a clear ready banner and let the user click to start (preserves browser audio gesture)
        updatePodcastUIPlaying(false);
    } catch(err) {
        console.error("Podcast generation error:", err);
        const fallback = generateFallbackPodcastDialogue();
        window.notebookPodcast.dialogue = fallback;
        window.notebookPodcast.currentIndex = 0;
        renderPodcastTranscript();
        if (playerSec) playerSec.style.display = 'block';
        updatePodcastUIPlaying(false);
    } finally {
        if (loader) loader.style.display = 'none';
        if (btn) btn.disabled = false;
    }
};

window.renderPodcastTranscript = function() {
    const list = document.getElementById('nb-transcript-lines');
    if (!list) return;
    list.innerHTML = '';

    window.notebookPodcast.dialogue.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `nb-transcript-line`;
        div.id = `nb-line-${index}`;
        const icon = item.speaker === 'أحمد' ? '👨‍🎓' : '👩‍🏫';
        const color = item.speaker === 'أحمد' ? '#00e5ff' : '#ff007f';
        div.innerHTML = `<strong style="color:${color}; font-size:0.95rem;">${icon} ${item.speaker}:</strong> <span style="line-height:1.6;">${item.text}</span>`;
        div.onclick = () => {
            window.notebookPodcast.isPlaying = true;
            playPodcastSentence(index);
        };
        list.appendChild(div);
    });
};

window.togglePodcastPlayback = function() {
    if (window.notebookPodcast.isPlaying) {
        pausePodcastPlayback();
    } else {
        startPodcastPlayback();
    }
};

window.startPodcastPlayback = function() {
    window.notebookPodcast.isPlaying = true;
    updatePodcastUIPlaying(true);
    playPodcastSentence(window.notebookPodcast.currentIndex);
};

window.pausePodcastPlayback = function() {
    window.notebookPodcast.isPlaying = false;
    stopPodcastCurrentAudio();
    updatePodcastUIPlaying(false);
};

window.stopPodcastPlayback = function() {
    window.notebookPodcast.isPlaying = false;
    window.notebookPodcast.currentIndex = 0;
    stopPodcastCurrentAudio();
    updatePodcastUIPlaying(false);
    clearSpeakerHighlight();
    document.querySelectorAll('.nb-transcript-line').forEach(l => l.classList.remove('active'));
};

window.skipPodcastSentence = function(dir) {
    let next = window.notebookPodcast.currentIndex + dir;
    if (next < 0) next = 0;
    if (next >= window.notebookPodcast.dialogue.length) {
        stopPodcastPlayback();
        return;
    }
    playPodcastSentence(next);
};

window.changePodcastSpeed = function(speed) {
    window.notebookPodcast.speed = parseFloat(speed) || 1.0;
    if (window.notebookPodcast.isPlaying) {
        playPodcastSentence(window.notebookPodcast.currentIndex);
    }
};

window.playPodcastSentence = function(index) {
    if (!window.notebookPodcast.dialogue || index >= window.notebookPodcast.dialogue.length) {
        stopPodcastPlayback();
        return;
    }

    stopPodcastCurrentAudio();
    window.notebookPodcast.currentIndex = index;
    const item = window.notebookPodcast.dialogue[index];

    document.querySelectorAll('.nb-transcript-line').forEach(l => l.classList.remove('active'));
    const lineElem = document.getElementById(`nb-line-${index}`);
    if (lineElem) {
        lineElem.classList.add('active');
        lineElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    highlightSpeaker(item.speaker);
    updatePodcastUIPlaying(true);

    const cleanText = cleanTextForSpeech(item.text);
    if (!cleanText) {
        if (window.notebookPodcast.isPlaying) window.skipPodcastSentence(1);
        return;
    }

    const onDone = () => {
        if (window.notebookPodcast.isPlaying) {
            window.skipPodcastSentence(1);
        }
    };

    // Primary: Google Natural Arabic Audio (with no-referrer)
    // Fallback: Safe SpeechSynthesis
    playGoogleTTS(
        cleanText,
        item.speaker,
        window.notebookPodcast.speed,
        onDone,
        () => {
            playViaSpeechSynthesis(cleanText, item.speaker, window.notebookPodcast.speed, onDone);
        }
    );
};

window.highlightSpeaker = function(speaker) {
    const ahmed = document.getElementById('speaker-ahmed');
    const sara = document.getElementById('speaker-sara');
    if (ahmed) ahmed.classList.remove('speaking');
    if (sara) sara.classList.remove('speaking');

    if (speaker === 'أحمد' && ahmed) {
        ahmed.classList.add('speaking');
        ahmed.style.opacity = '1';
        if (sara) sara.style.opacity = '0.55';
    }
    if (speaker === 'سارة' && sara) {
        sara.classList.add('speaking');
        sara.style.opacity = '1';
        if (ahmed) ahmed.style.opacity = '0.55';
    }
};

window.clearSpeakerHighlight = function() {
    const ahmed = document.getElementById('speaker-ahmed');
    const sara = document.getElementById('speaker-sara');
    if (ahmed) {
        ahmed.classList.remove('speaking');
        ahmed.style.opacity = '1';
    }
    if (sara) {
        sara.classList.remove('speaking');
        sara.style.opacity = '1';
    }
};

window.updatePodcastUIPlaying = function(isPlaying) {
    const playIcon = document.getElementById('nb-play-icon');
    const waveBox = document.getElementById('nb-wave-box');
    if (playIcon) {
        playIcon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    }
    if (waveBox) {
        if (isPlaying) waveBox.classList.add('playing');
        else waveBox.classList.remove('playing');
    }
};


// ====== Data Transfer (Export & Import) ======
function getStudyAppDataPayload() {
    const payload = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('study_')) {
            payload[k] = localStorage.getItem(k);
        }
    }
    return payload;
}

window.openDataTransferModal = (mode = 'export') => {
    const modal = document.getElementById('data-transfer-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    window.switchDataTab(mode);
};

window.closeDataTransferModal = () => {
    const modal = document.getElementById('data-transfer-modal');
    if (modal) modal.style.display = 'none';
};

window.switchDataTab = (tab) => {
    const exportSec = document.getElementById('data-export-section');
    const importSec = document.getElementById('data-import-section');
    const exportBtn = document.getElementById('tab-export-btn');
    const importBtn = document.getElementById('tab-import-btn');

    if (tab === 'export') {
        if (exportSec) exportSec.style.display = 'block';
        if (importSec) importSec.style.display = 'none';
        if (exportBtn) {
            exportBtn.style.background = '#2ed573';
            exportBtn.style.color = '#031024';
        }
        if (importBtn) {
            importBtn.style.background = 'var(--bg-color)';
            importBtn.style.color = 'var(--text-main)';
        }
    } else {
        if (exportSec) exportSec.style.display = 'none';
        if (importSec) importSec.style.display = 'block';
        if (importBtn) {
            importBtn.style.background = '#00e5ff';
            importBtn.style.color = '#031024';
        }
        if (exportBtn) {
            exportBtn.style.background = 'var(--bg-color)';
            exportBtn.style.color = 'var(--text-main)';
        }
    }
};

window.copyDataBackupCode = () => {
    const payload = getStudyAppDataPayload();
    const str = JSON.stringify(payload);
    const code = 'STUDYAPP:' + btoa(unescape(encodeURIComponent(str)));
    navigator.clipboard.writeText(code).then(() => {
        const msg = document.getElementById('export-success-msg');
        if (msg) {
            msg.style.display = 'block';
            setTimeout(() => { msg.style.display = 'none'; }, 4000);
        }
        alert('تم نسخ كود بياناتك بنجاح! 📋\nالآن افتح تطبيق الأندرويد واختر "استيراد واستعادة" ثم الصق الكود.');
    }).catch(() => {
        prompt('انسخ كود بياناتك من هنا:', code);
    });
};

window.downloadDataBackupFile = () => {
    const payload = getStudyAppDataPayload();
    const str = JSON.stringify(payload, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `study-app-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

window.handleBackupFileSelect = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const textarea = document.getElementById('import-data-code');
        if (textarea) textarea.value = e.target.result;
    };
    reader.readAsText(file);
};

window.applyDataImport = () => {
    const textarea = document.getElementById('import-data-code');
    if (!textarea || !textarea.value.trim()) {
        alert('من فضلك الصق كود البيانات أولاً!');
        return;
    }
    let raw = textarea.value.trim();
    let payload = null;

    try {
        if (raw.startsWith('STUDYAPP:')) {
            const b64 = raw.replace('STUDYAPP:', '').trim();
            const decoded = decodeURIComponent(escape(atob(b64)));
            payload = JSON.parse(decoded);
        } else {
            payload = JSON.parse(raw);
        }
    } catch (e) {
        console.error('Data import parse error:', e);
        alert('عفواً، كود البيانات غير صحيح أو تالف! يرجى التأكد من نسخه بالكامل.');
        return;
    }

    if (!payload || typeof payload !== 'object') {
        alert('عفواً، لا توجد بيانات صالحة داخل هذا الكود!');
        return;
    }

    let count = 0;
    for (const key in payload) {
        if (key.startsWith('study_')) {
            localStorage.setItem(key, payload[key]);
            count++;
        }
    }

    if (count === 0) {
        alert('لم يتم العثور على بيانات مذاكرة صالحة في هذا الكود!');
        return;
    }

    alert(`تمت استعادة بياناتك بنجاح! (${count} عنصر تم تحديثه) 🎉\nسيتم تحديث التطبيق الآن لعرض بياناتك.`);
    window.location.reload();
};

// ====== Quran Wird Logic ======
function initQuranWird() {
    const goalDisplay = document.getElementById('quran-goal-display');
    const doneDisplay = document.getElementById('quran-done-display');
    const completeBtn = document.getElementById('btn-complete-quran');
    if (!goalDisplay || !doneDisplay) return;

    const todayDate = new Date().toISOString().slice(0, 10);
    const savedDate = localStorage.getItem('study_quran_date');
    let done = parseInt(localStorage.getItem('study_quran_done') || '0', 10);
    const goal = localStorage.getItem('study_quran_goal') || 'صفحة واحدة';
    const isCompleted = localStorage.getItem('study_quran_completed') === 'true';

    if (savedDate !== todayDate) {
        done = 0;
        localStorage.setItem('study_quran_date', todayDate);
        localStorage.setItem('study_quran_done', '0');
        localStorage.setItem('study_quran_completed', 'false');
    }

    goalDisplay.innerText = goal;
    doneDisplay.innerText = done.toString();

    if (completeBtn) {
        if (isCompleted && savedDate === todayDate) {
            completeBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> تم إتمام الورد 🎉';
            completeBtn.style.background = '#2ed573';
            completeBtn.disabled = true;
        } else {
            completeBtn.innerHTML = '<i class="fa-solid fa-check"></i> أتممت الورد';
            completeBtn.style.background = 'var(--success)';
            completeBtn.disabled = false;
        }
    }
}

window.updateQuranWird = function(delta) {
    const doneDisplay = document.getElementById('quran-done-display');
    const todayDate = new Date().toISOString().slice(0, 10);
    localStorage.setItem('study_quran_date', todayDate);

    let current = parseInt(localStorage.getItem('study_quran_done') || '0', 10);
    current = Math.max(0, current + delta);
    localStorage.setItem('study_quran_done', current.toString());

    if (doneDisplay) {
        doneDisplay.innerText = current.toString();
    }
};

window.completeQuranWird = function() {
    const todayDate = new Date().toISOString().slice(0, 10);
    localStorage.setItem('study_quran_date', todayDate);
    localStorage.setItem('study_quran_completed', 'true');

    const completeBtn = document.getElementById('btn-complete-quran');
    if (completeBtn) {
        completeBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> تقبل الله، تم إتمام الورد! 🤲';
        completeBtn.style.background = '#2ed573';
    }

    alert('تقبل الله منك وجعله في ميزان حسناتك! 📖✨ تم تسجيل إتمام وردك القرآني اليوم بنجاح.');
};

window.initQuranWird = initQuranWird;

document.addEventListener('DOMContentLoaded', () => {
    initQuranWird();

    const quranForm = document.getElementById('quran-form');
    if (quranForm) {
        quranForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const select = document.getElementById('quran-goal-select');
            const custom = document.getElementById('custom-quran-goal');
            let goal = select ? select.value : 'صفحة واحدة';
            if (goal === 'custom' && custom && custom.value.trim()) {
                goal = custom.value.trim();
            }
            localStorage.setItem('study_quran_goal', goal);
            const goalDisplay = document.getElementById('quran-goal-display');
            if (goalDisplay) goalDisplay.innerText = goal;
            window.closeModal('quran-modal');
            alert('تم حفظ هدف وردك القرآني بنجاح! 📖');
        });
    }
});
// =====================================================================
// === CHALLENGER GAMER DASHBOARD & INTERACTIVE CHALLENGES SYSTEM ===
// =====================================================================
const CHALLENGE_RANKS = [
    { minXP: 0, maxXP: 149, name: "مقاتل تركيز مبتدئ 🥉", nextRank: "صائد الدقائق والمذاكرة 🥈", targetXP: 150 },
    { minXP: 150, maxXP: 349, name: "صائد الدقائق والمذاكرة 🥈", nextRank: "فارس التركيز الخارق 🥇", targetXP: 350 },
    { minXP: 350, maxXP: 649, name: "فارس التركيز الخارق 🥇", nextRank: "قاهر زعيم المماطلة ⚔️", targetXP: 650 },
    { minXP: 650, maxXP: 999, name: "قاهر زعيم المماطلة ⚔️", nextRank: "أسطورة المذاكرة التي لا تُقهر 👑✨", targetXP: 1000 },
    { minXP: 1000, maxXP: Infinity, name: "أسطورة المذاكرة التي لا تُقهر 👑✨", nextRank: "القمة المطلقة 🌟", targetXP: 1000 }
];

function getChallengeXP() {
    return parseInt(localStorage.getItem('study_challenges_xp') || '0', 10);
}

function getCompletedChallengesCount() {
    return parseInt(localStorage.getItem('study_challenges_completed') || '0', 10);
}

function getCurrentRankInfo(xp) {
    for (let i = 0; i < CHALLENGE_RANKS.length; i++) {
        if (xp >= CHALLENGE_RANKS[i].minXP && xp <= CHALLENGE_RANKS[i].maxXP) {
            return CHALLENGE_RANKS[i];
        }
    }
    return CHALLENGE_RANKS[CHALLENGE_RANKS.length - 1];
}

function initChallengeDashboard() {
    const xp = getChallengeXP();
    const completed = getCompletedChallengesCount();
    const rankInfo = getCurrentRankInfo(xp);

    const xpDisplay = document.getElementById('challenger-xp-display');
    const compDisplay = document.getElementById('challenger-completed-count');
    const rankNameDisplay = document.getElementById('challenger-current-rank-name');
    const nextRankBadge = document.getElementById('challenger-next-rank-badge-text');
    const progressDesc = document.getElementById('challenger-progress-desc');
    const progressPct = document.getElementById('challenger-progress-pct');
    const progressFill = document.getElementById('challenger-progress-fill');

    if (xpDisplay) xpDisplay.innerText = `${xp} XP`;
    if (compDisplay) compDisplay.innerText = completed;
    if (rankNameDisplay) rankNameDisplay.innerText = rankInfo.name;
    if (nextRankBadge) nextRankBadge.innerText = rankInfo.nextRank;

    if (progressDesc && progressPct && progressFill) {
        if (xp >= 1000) {
            progressDesc.innerText = "وصلت لأعلى رتبة! أسطورة المذاكرة 👑";
            progressPct.innerText = "100%";
            progressFill.style.width = "100%";
        } else {
            const rangeSpan = rankInfo.targetXP - rankInfo.minXP;
            const currentInSpan = xp - rankInfo.minXP;
            const pct = Math.min(100, Math.max(0, Math.round((currentInSpan / rangeSpan) * 100)));
            progressDesc.innerText = `التقدم نحو (${rankInfo.nextRank}) - باقي ${rankInfo.targetXP - xp} XP`;
            progressPct.innerText = `${pct}%`;
            progressFill.style.width = `${pct}%`;
        }
    }

    const isMuted = localStorage.getItem('study_challenges_sound_muted') === 'true';
    const soundIcon = document.getElementById('challenger-sound-icon');
    const soundLabel = document.getElementById('challenger-sound-label');
    if (soundIcon && soundLabel) {
        if (isMuted) {
            soundIcon.className = 'fa-solid fa-volume-xmark';
            soundIcon.style.color = '#ff4757';
            soundLabel.innerText = 'المؤثرات: مكتومة';
        } else {
            soundIcon.className = 'fa-solid fa-volume-high';
            soundIcon.style.color = '#00e5ff';
            soundLabel.innerText = 'المؤثرات: مفعلة';
        }
    }
}

function toggleChallengeSound() {
    const isMuted = localStorage.getItem('study_challenges_sound_muted') === 'true';
    localStorage.setItem('study_challenges_sound_muted', isMuted ? 'false' : 'true');
    initChallengeDashboard();
    if (isMuted) {
        playWebAudioChime('levelup');
    }
}

function playWebAudioChime(type = 'victory') {
    if (localStorage.getItem('study_challenges_sound_muted') === 'true') return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        if (type === 'victory') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = index === 3 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.15);
                gain.gain.setValueAtTime(0.001, ctx.currentTime + index * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + index * 0.15 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.15 + (index === 3 ? 0.9 : 0.4));
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + index * 0.15);
                osc.stop(ctx.currentTime + index * 0.15 + (index === 3 ? 0.95 : 0.45));
            });
        } else if (type === 'strike') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.36);
        } else if (type === 'levelup') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.46);
        }
    } catch (e) {
        console.warn('Audio chime error:', e);
    }
}

let confettiAnimId = null;
function launchChallengeConfetti(durationMs = 3800) {
    const canvas = document.getElementById('challenge-confetti-canvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00e5ff', '#ff4757', '#fbbf24', '#2ed573', '#a55eea', '#ff6b81', '#ffffff'];
    const particles = [];
    for (let i = 0; i < 110; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height * 0.5,
            w: Math.random() * 10 + 6,
            h: Math.random() * 6 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 4 + 3,
            speedX: Math.random() * 4 - 2,
            angle: Math.random() * 360,
            spin: Math.random() * 10 - 5,
            opacity: 1
        });
    }

    const startTime = Date.now();
    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);

    function frame() {
        const elapsed = Date.now() - startTime;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.angle += p.spin;
            if (elapsed > durationMs - 1000) {
                p.opacity = Math.max(0, (durationMs - elapsed) / 1000);
            }

            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.translate(p.x, p.y);
            ctx.rotate((p.angle * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });

        if (elapsed < durationMs) {
            confettiAnimId = requestAnimationFrame(frame);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
            confettiAnimId = null;
        }
    }
    frame();
}

let lastWonChallengeName = '';
let lastWonXp = 0;
function launchChallengeVictory(challengeName, xpReward) {
    if (typeof luckyChallengeBooster !== 'undefined' && luckyChallengeBooster && challengeName.includes(luckyChallengeBooster.name.split(' ')[1])) {
        xpReward += luckyChallengeBooster.bonusXP;
        luckyChallengeBooster = null;
    }

    if (challengeName.includes('قنبلة')) unlockBadge('bomb');
    else if (challengeName.includes('زعيم')) unlockBadge('boss');
    else if (challengeName.includes('شجرة')) unlockBadge('tree');
    else if (challengeName.includes('النينجا')) unlockBadge('ninja');
    else if (challengeName.includes('التلج')) unlockBadge('ice');
    else if (challengeName.includes('الشمعة')) unlockBadge('candle');

    lastWonChallengeName = challengeName;
    lastWonXp = xpReward;

    const oldXP = getChallengeXP();
    const newXP = oldXP + xpReward;
    localStorage.setItem('study_challenges_xp', newXP);
    const completedCount = getCompletedChallengesCount() + 1;
    localStorage.setItem('study_challenges_completed', completedCount);

    initChallengeDashboard();
    playWebAudioChime('victory');
    launchChallengeConfetti(4000);

    const modal = document.getElementById('challenge-victory-modal');
    const nameEl = document.getElementById('victory-challenge-name');
    const xpEl = document.getElementById('victory-xp-gained');
    const rankEl = document.getElementById('victory-rank-status');
    const currentRank = getCurrentRankInfo(newXP);

    if (nameEl) nameEl.innerText = challengeName;
    if (xpEl) xpEl.innerText = `+${xpReward} XP 🎖️`;
    if (rankEl) rankEl.innerText = `رتبتك الحالية: ${currentRank.name} (${newXP} XP)`;
    if (modal) modal.style.display = 'flex';
}

function closeVictoryModal() {
    const modal = document.getElementById('challenge-victory-modal');
    if (modal) modal.style.display = 'none';
}

function shareVictoryWhatsApp() {
    const text = encodeURIComponent(
        `🏆 انتصار جديد في تحديات المذاكرة!\n` +
        `أنهيت بنجاح: ${lastWonChallengeName}\n` +
        `وحصلت على +${lastWonXp} XP في تطبيق المذاكرة المتكامل! ⚡\n` +
        `يلا جرب تكسر الملل وتتحدى نفسك معايا!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

// 💣 Focus Bomb Challenge
let bombInterval = null;
let bombEndTime = 0;
let bombTotalSeconds = 25 * 60;

function toggleBombChallenge() {
    const btn = document.getElementById('bomb-action-btn');
    const timerDisplay = document.getElementById('bomb-timer-display');
    const fuseFill = document.getElementById('bomb-fuse-fill');
    const quoteDisplay = document.getElementById('bomb-quote-display');
    const sparkle = document.getElementById('bomb-sparkle-icon');
    const card = document.getElementById('card-challenge-bomb');

    if (btn && (btn.innerText.includes('إشعال') || btn.innerText.includes('ابدأ'))) {
        bombTotalSeconds = 25 * 60;
        bombEndTime = Date.now() + bombTotalSeconds * 1000;
        btn.innerHTML = '<i class="fa-solid fa-hand"></i> إبطال القنبلة (استسلام)';
        speakCheer('اشتعل فتيل القنبلة! ركز بتمام قوتك ومتقومش من مكانك!');
        btn.style.background = '#7f8c8d';
        if (sparkle) sparkle.style.display = 'inline-block';
        if (card) card.classList.add('boss-glow');

        clearInterval(bombInterval);
        bombInterval = setInterval(() => {
            let remaining = Math.round((bombEndTime - Date.now()) / 1000);
            if (remaining < 0) remaining = 0;

            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            if (timerDisplay) timerDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            const pct = (remaining / bombTotalSeconds) * 100;
            if (fuseFill) fuseFill.style.width = `${pct}%`;

            if (quoteDisplay) {
                if (remaining > 15 * 60) {
                    quoteDisplay.innerText = "🔥 الفتيل مشتعل.. احذر تشتيت انتباهك أو لمس الهاتف!";
                } else if (remaining > 8 * 60) {
                    quoteDisplay.innerText = "⚡ عديت نص الوقت بتركيز عالي! كمل للاخر!";
                } else if (remaining > 2 * 60) {
                    quoteDisplay.innerText = "⏳ باقي دقائق معدودة على الانفجار المعرفي العظيم!";
                } else {
                    quoteDisplay.innerText = "💥 اللحظات الأخيرة! مبروك مقدماً يا وحش!";
                }
            }

            if (remaining <= 0) {
                clearInterval(bombInterval);
                bombInterval = null;
                btn.innerHTML = '<i class="fa-solid fa-fire"></i> إشعال فتيل القنبلة (25 دقيقة)';
                btn.style.background = 'linear-gradient(135deg, #ff4757, #ee5253)';
                if (sparkle) sparkle.style.display = 'none';
                if (card) card.classList.remove('boss-glow');
                if (fuseFill) fuseFill.style.width = '100%';
                if (timerDisplay) timerDisplay.innerText = '25:00';
                if (quoteDisplay) quoteDisplay.innerText = 'جاهز للتحدي؟ اضغط ابدأ واوعى تسيب مكانك!';
                launchChallengeVictory('تحدي قنبلة التركيز 💣', 100);
            }
        }, 1000);
    } else if (btn) {
        clearInterval(bombInterval);
        bombInterval = null;
        btn.innerHTML = '<i class="fa-solid fa-fire"></i> إشعال فتيل القنبلة (25 دقيقة)';
        btn.style.background = 'linear-gradient(135deg, #ff4757, #ee5253)';
        if (sparkle) sparkle.style.display = 'none';
        if (card) card.classList.remove('boss-glow');
        if (fuseFill) fuseFill.style.width = '100%';
        if (timerDisplay) timerDisplay.innerText = '25:00';
        if (quoteDisplay) quoteDisplay.innerText = 'أبطلت مفعول القنبلة.. خسرنا الجولة بس هتعوضها في الجولة الجاية! 🛡️';
    }
}

// 🐉⚔️ Boss Fight Battle
let bossHP = 100;
let bossRound = 1;
let bossRoundInterval = null;
let bossRoundEndTime = 0;
const BOSS_ROUND_SECONDS = 15 * 60;

function toggleBossRound() {
    const roundBtn = document.getElementById('boss-round-btn');
    const timerDisplay = document.getElementById('boss-round-timer');
    const dialogue = document.getElementById('boss-battle-dialogue');
    const statusText = document.getElementById('boss-round-status');
    const strikeBtn = document.getElementById('boss-strike-btn');

    if (roundBtn && roundBtn.innerText.includes('ابدأ')) {
        bossRoundEndTime = Date.now() + BOSS_ROUND_SECONDS * 1000;
        roundBtn.innerHTML = '<i class="fa-solid fa-flag"></i> إنهاء الجولة مبكراً (انسحاب)';
        roundBtn.style.background = '#7f8c8d';
        if (strikeBtn) strikeBtn.style.display = 'none';

        clearInterval(bossRoundInterval);
        bossRoundInterval = setInterval(() => {
            let remaining = Math.round((bossRoundEndTime - Date.now()) / 1000);
            if (remaining < 0) remaining = 0;

            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            if (timerDisplay) timerDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            if (dialogue) {
                if (remaining > 10 * 60) {
                    dialogue.innerText = `🗡️ الجولة ${bossRound}: الزعيم يهاجمك بالنعاس والمشتتات.. ارفع درع تركيزك!`;
                } else if (remaining > 5 * 60) {
                    dialogue.innerText = `🔥 ضرباتك المتتالية بالتركيز تضعف دفاعات الزعيم!`;
                } else {
                    dialogue.innerText = `⚡ سيف التركيز يشحن طاقته القصوى.. استعد للضربة القاضية!`;
                }
            }

            if (remaining <= 0) {
                clearInterval(bossRoundInterval);
                bossRoundInterval = null;
                roundBtn.style.display = 'none';
                if (strikeBtn) strikeBtn.style.display = 'block';
                if (dialogue) dialogue.innerText = `✨ جهز سيفك الآن! الزعيم منهك وساقط على الأرض.. اضغط زر الضربة القاضية!`;
                playWebAudioChime('levelup');
            }
        }, 1000);
    } else if (roundBtn) {
        clearInterval(bossRoundInterval);
        bossRoundInterval = null;
        roundBtn.innerHTML = '<i class="fa-solid fa-khanda"></i> ابدأ جولة القتال (15 دقيقة)';
        roundBtn.style.background = 'linear-gradient(135deg, #8e44ad, #9b59b6)';
        if (timerDisplay) timerDisplay.innerText = '15:00';
        if (dialogue) dialogue.innerText = 'تراجعت عن القتال.. الزعيم يسخر منك! ارجع وحاربه لما تكون جاهز! 🐉';
    }
}

function strikeBoss() {
    const card = document.getElementById('card-challenge-boss');
    const avatar = document.getElementById('boss-avatar-box');
    const hpText = document.getElementById('boss-hp-text');
    const hpFill = document.getElementById('boss-hp-fill');
    const strikeBtn = document.getElementById('boss-strike-btn');
    const roundBtn = document.getElementById('boss-round-btn');
    const statusText = document.getElementById('boss-round-status');
    const dialogue = document.getElementById('boss-battle-dialogue');
    const timerDisplay = document.getElementById('boss-round-timer');

    playWebAudioChime('strike');
    if (card) {
        card.classList.remove('shake-anim');
        void card.offsetWidth;
        card.classList.add('shake-anim');
    }

    bossHP = Math.max(0, bossHP - 25);
    if (card) {
        const popup = document.createElement('div');
        popup.className = 'damage-text-popup';
        popup.innerText = '💥 -25% HP! ضربة قاضية! ⚡';
        card.appendChild(popup);
        setTimeout(() => popup.remove(), 1200);
    }
    const cheerQuotes = [
        'الله عليك يا فنان! ضربة في مقتل!',
        'عاش يا وحش! دفاعات الزعيم بتنهار!',
        'تركيز أسطوري! قربت تقضي على الكسل تماماً!',
        'ضربة سيف حاسمة! مكملين للنصر!'
    ];
    speakCheer(cheerQuotes[Math.floor(Math.random() * cheerQuotes.length)]);
    if (hpText) hpText.innerText = `${bossHP}%`;
    if (hpFill) hpFill.style.width = `${bossHP}%`;

    if (bossHP <= 0) {
        if (avatar) avatar.innerText = '💀';
        if (dialogue) dialogue.innerText = '🏆 سقط زعيم الكسل والمماطلة صريعاً! أنت بطل حقيقي!';
        if (strikeBtn) strikeBtn.style.display = 'none';
        if (roundBtn) {
            roundBtn.style.display = 'block';
            roundBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> إعادة خوض المعركة من جديد!';
            roundBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
            roundBtn.onclick = () => {
                bossHP = 100;
                bossRound = 1;
                if (hpText) hpText.innerText = '100%';
                if (hpFill) hpFill.style.width = '100%';
                if (avatar) avatar.innerText = '🐉';
                if (statusText) statusText.innerText = 'الجولة 1 من 4 (15 دقيقة)';
                if (timerDisplay) timerDisplay.innerText = '15:00';
                if (dialogue) dialogue.innerText = 'الزعيم يتحدى: "مش هتقدر تركز ربع ساعة على بعضها!"';
                roundBtn.innerHTML = '<i class="fa-solid fa-khanda"></i> ابدأ جولة القتال (15 دقيقة)';
                roundBtn.style.background = 'linear-gradient(135deg, #8e44ad, #9b59b6)';
                roundBtn.onclick = toggleBossRound;
            };
        }
        launchChallengeVictory('معركة زعيم الكسل والمماطلة 🐉⚔️', 150);
    } else {
        bossRound++;
        const avatars = { 75: '🐲', 50: '💥', 25: '🤕' };
        if (avatar && avatars[bossHP]) avatar.innerText = avatars[bossHP];
        if (strikeBtn) strikeBtn.style.display = 'none';
        if (roundBtn) {
            roundBtn.style.display = 'block';
            roundBtn.innerHTML = `<i class="fa-solid fa-khanda"></i> ابدأ الجولة ${bossRound} من 4 (15 دقيقة)`;
            roundBtn.style.background = 'linear-gradient(135deg, #8e44ad, #9b59b6)';
        }
        if (statusText) statusText.innerText = `الجولة ${bossRound} من 4 (15 دقيقة)`;
        if (timerDisplay) timerDisplay.innerText = '15:00';
        if (dialogue) dialogue.innerText = `⚔️ ضربة قاضية ناجحة (-25% HP)! الزعيم يتألم.. استعد للجولة التالية!`;
    }
}

// 🌱🌳 Virtual Tree Grow Challenge
let treeInterval = null;
let treeEndTime = 0;
let treeTotalSeconds = 25 * 60;

function toggleTreeChallenge() {
    const btn = document.getElementById('tree-action-btn');
    const select = document.getElementById('tree-duration-select');
    const timerDisplay = document.getElementById('tree-timer-display');
    const growthFill = document.getElementById('tree-growth-fill');
    const statusText = document.getElementById('tree-status-text');
    const iconStage = document.getElementById('tree-icon-stage');

    if (btn && (btn.innerText.includes('ازرع') || btn.innerText.includes('ابدأ'))) {
        const mins = select ? (parseInt(select.value, 10) || 25) : 25;
        treeTotalSeconds = mins * 60;
        treeEndTime = Date.now() + treeTotalSeconds * 1000;
        if (select) select.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-ban"></i> استسلام (ستذبل الشجرة 🥀)';
        btn.style.background = '#7f8c8d';
        if (iconStage) iconStage.innerText = '🌱';

        clearInterval(treeInterval);
        treeInterval = setInterval(() => {
            let remaining = Math.round((treeEndTime - Date.now()) / 1000);
            if (remaining < 0) remaining = 0;

            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            if (timerDisplay) timerDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            const progress = 1 - (remaining / treeTotalSeconds);
            const pct = Math.round(progress * 100);
            if (growthFill) growthFill.style.width = `${pct}%`;

            if (iconStage && statusText) {
                if (progress < 0.3) {
                    iconStage.innerText = '🌱';
                    statusText.innerText = 'بذرة في التربة.. حافظ على تركيزك لتنمو!';
                } else if (progress < 0.6) {
                    iconStage.innerText = '🌿';
                    statusText.innerText = 'بدأت الأوراق الخضراء بالظهور.. ممتاز كمل!';
                } else if (progress < 0.9) {
                    iconStage.innerText = '🪴';
                    statusText.innerText = 'شجيرة وارفة تقترب من الإثمار الكامل!';
                } else {
                    iconStage.innerText = '🌳';
                    statusText.innerText = 'الشجرة تكاد تكتمل.. روعة!';
                }
            }

            if (remaining <= 0) {
                clearInterval(treeInterval);
                treeInterval = null;
                if (select) select.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-seedling"></i> ازرع الشجرة الآن';
                btn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
                if (iconStage) {
                    iconStage.innerText = '🌳✨';
                    iconStage.classList.add('tree-grow-anim');
                }
                if (statusText) statusText.innerText = 'أزهرت شجرة عملاقة في بستان إنجازاتك! 🌳✨';
                launchChallengeVictory('شجرة التركيز والنمو الحية 🌱🌳', 75);
            }
        }, 1000);
    } else if (btn) {
        clearInterval(treeInterval);
        treeInterval = null;
        if (select) select.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-seedling"></i> ازرع الشجرة الآن';
        btn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
        if (iconStage) iconStage.innerText = '🥀';
        if (growthFill) growthFill.style.width = '0%';
        if (timerDisplay && select) timerDisplay.innerText = `${select.value}:00`;
        if (statusText) statusText.innerText = 'ذبلت الشجرة بسبب المقاطعة.. متقلقش ازرع بذرة جديدة دلوقتي! 🥀';
    }
}

// 🥷⚡ Ninja Sprint Challenge
let ninjaInterval = null;
let ninjaEndTime = 0;
const NINJA_TOTAL_SECONDS = 15 * 60;

function toggleNinjaChallenge() {
    const btn = document.getElementById('ninja-action-btn');
    const timerDisplay = document.getElementById('ninja-timer-display');
    const progressFill = document.getElementById('ninja-progress-fill');
    const statusText = document.getElementById('ninja-status-text');
    const card = document.getElementById('card-challenge-ninja');

    if (btn && (btn.innerText.includes('انطلاق') || btn.innerText.includes('ابدأ'))) {
        ninjaEndTime = Date.now() + NINJA_TOTAL_SECONDS * 1000;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> كسر وتيرة النينجا (إلغاء)';
        btn.style.background = '#7f8c8d';
        if (card) card.classList.add('ninja-card-active');

        clearInterval(ninjaInterval);
        ninjaInterval = setInterval(() => {
            let remaining = Math.round((ninjaEndTime - Date.now()) / 1000);
            if (remaining < 0) remaining = 0;

            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            if (timerDisplay) timerDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            const progress = 1 - (remaining / NINJA_TOTAL_SECONDS);
            const pct = Math.round(progress * 100);
            if (progressFill) progressFill.style.width = `${pct}%`;

            if (statusText) {
                if (remaining > 10 * 60) {
                    statusText.innerText = '⚡ سرعة قصوى! لا ترفع عينك عن مهمتك!';
                } else if (remaining > 5 * 60) {
                    statusText.innerText = '🥷 حركة سريعة وإنجاز لا يصدق.. واصل الركض!';
                } else {
                    statusText.innerText = '🔥 اللحظات الأخيرة للسباق.. أنهِ المهمة فوراً!';
                }
            }

            if (remaining <= 0) {
                clearInterval(ninjaInterval);
                ninjaInterval = null;
                btn.innerHTML = '<i class="fa-solid fa-bolt"></i> انطلاق بسرعة النينجا (15 دقيقة)';
                btn.style.background = 'linear-gradient(135deg, #00e5ff, #0984e3)';
                if (card) card.classList.remove('ninja-card-active');
                if (timerDisplay) timerDisplay.innerText = '15:00';
                if (progressFill) progressFill.style.width = '100%';
                if (statusText) statusText.innerText = 'أنهيت جولة النينجا الخاطفة بنجاح ساحق! ⚡';
                launchChallengeVictory('سباق النينجا الخاطف 🥷⚡', 50);
            }
        }, 1000);
    } else if (btn) {
        clearInterval(ninjaInterval);
        ninjaInterval = null;
        btn.innerHTML = '<i class="fa-solid fa-bolt"></i> انطلاق بسرعة النينجا (15 دقيقة)';
        btn.style.background = 'linear-gradient(135deg, #00e5ff, #0984e3)';
        if (card) card.classList.remove('ninja-card-active');
        if (timerDisplay) timerDisplay.innerText = '15:00';
        if (progressFill) progressFill.style.width = '0%';
        if (statusText) statusText.innerText = 'توقف سباق النينجا.. استعد وانطلق مجدداً!';
    }
}

// Window global bindings
window.initChallengeDashboard = initChallengeDashboard;
window.toggleChallengeSound = toggleChallengeSound;
window.playWebAudioChime = playWebAudioChime;
window.launchChallengeConfetti = launchChallengeConfetti;
window.launchChallengeVictory = launchChallengeVictory;
window.closeVictoryModal = closeVictoryModal;
window.shareVictoryWhatsApp = shareVictoryWhatsApp;
window.toggleBombChallenge = toggleBombChallenge;
window.toggleBossRound = toggleBossRound;
window.strikeBoss = strikeBoss;
window.toggleTreeChallenge = toggleTreeChallenge;
window.toggleNinjaChallenge = toggleNinjaChallenge;
window.startIceChallenge = startIceChallenge;
window.startCandleChallenge = startCandleChallenge;

// =====================================================================
// === ADVANCED INTERACTIVE GAMIFICATION: CHEER, AMBIENT, WHEEL, BADGES ===
// =====================================================================

// --- 🗣️ Arabic Motivational Speech Cheerleader ---
function speakCheer(phrase) {
    if (localStorage.getItem('study_challenges_sound_muted') === 'true') return;
    if (!('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(phrase);
        utter.lang = 'ar-EG';
        utter.rate = 1.05;
        utter.pitch = 1.15;
        const voices = window.speechSynthesis.getVoices();
        const arVoice = voices.find(v => v.lang.startsWith('ar'));
        if (arVoice) utter.voice = arVoice;
        window.speechSynthesis.speak(utter);
    } catch (e) {
        console.warn('Speech cheer error:', e);
    }
}

// --- 💓 Synthesized Heartbeat for Last-Minute Adrenaline ---
let heartbeatAudioCtx = null;
function playHeartbeatThump() {
    if (localStorage.getItem('study_challenges_sound_muted') === 'true') return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!heartbeatAudioCtx) heartbeatAudioCtx = new AudioCtx();
        if (heartbeatAudioCtx.state === 'suspended') heartbeatAudioCtx.resume();

        // Lub-dub: two quick low-frequency thumps
        [0, 0.14].forEach(delay => {
            const osc = heartbeatAudioCtx.createOscillator();
            const gain = heartbeatAudioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(65, heartbeatAudioCtx.currentTime + delay);
            osc.frequency.exponentialRampToValueAtTime(35, heartbeatAudioCtx.currentTime + delay + 0.1);
            gain.gain.setValueAtTime(0.35, heartbeatAudioCtx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, heartbeatAudioCtx.currentTime + delay + 0.1);
            osc.connect(gain);
            gain.connect(heartbeatAudioCtx.destination);
            osc.start(heartbeatAudioCtx.currentTime + delay);
            osc.stop(heartbeatAudioCtx.currentTime + delay + 0.11);
        });
    } catch(e){}
}

// --- 🌧️ Native Web Audio API Focus Ambient Sound Synthesizer ---
let ambientAudioCtx = null;
let ambientNoiseNode = null;
let ambientGainNode = null;
let currentAmbientType = null;

function toggleAmbientSound(type) {
    if (currentAmbientType === type) {
        stopAmbientSound();
        return;
    }
    stopAmbientSound();
    playAmbientSound(type);
}

function stopAmbientSound() {
    if (ambientNoiseNode) {
        try { ambientNoiseNode.stop(); } catch(e){}
        ambientNoiseNode = null;
    }
    if (ambientGainNode) {
        try { ambientGainNode.disconnect(); } catch(e){}
        ambientGainNode = null;
    }
    currentAmbientType = null;
    updateAmbientUI();
}

function playAmbientSound(type) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!ambientAudioCtx) ambientAudioCtx = new AudioCtx();
        if (ambientAudioCtx.state === 'suspended') ambientAudioCtx.resume();

        const bufferSize = ambientAudioCtx.sampleRate * 2;
        const noiseBuffer = ambientAudioCtx.createBuffer(1, bufferSize, ambientAudioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        if (type === 'rain') {
            // Natural brown noise rain simulation
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5;
            }
        } else if (type === 'waves') {
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * 0.4;
            }
        } else {
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * 0.15;
            }
        }

        const whiteNoise = ambientAudioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ambientAudioCtx.createBiquadFilter();
        if (type === 'rain') {
            filter.type = 'lowpass';
            filter.frequency.value = 750;
        } else if (type === 'waves') {
            filter.type = 'bandpass';
            filter.frequency.value = 350;
        } else {
            filter.type = 'lowpass';
            filter.frequency.value = 1100;
        }

        ambientGainNode = ambientAudioCtx.createGain();
        ambientGainNode.gain.setValueAtTime(0.25, ambientAudioCtx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(ambientGainNode);
        ambientGainNode.connect(ambientAudioCtx.destination);
        whiteNoise.start();
        ambientNoiseNode = whiteNoise;
        currentAmbientType = type;
        updateAmbientUI();
    } catch(e) {
        console.warn('Ambient play error:', e);
    }
}

function updateAmbientUI() {
    const types = ['rain', 'waves', 'white'];
    types.forEach(t => {
        const btn = document.getElementById('ambient-btn-' + t);
        if (btn) {
            if (currentAmbientType === t) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
}

// --- 🎡 Lucky Challenge Wheel Spinner ---
const LUCKY_CHALLENGES = [
    { id: 'card-challenge-bomb', name: 'تحدي قنبلة التركيز 💣', xpMultiplier: '2x', bonusXP: 100 },
    { id: 'card-challenge-boss', name: 'معركة زعيم الكسل 🐉⚔️', xpMultiplier: '1.5x', bonusXP: 75 },
    { id: 'card-challenge-tree', name: 'شجرة التركيز والنمو 🌱🌳', xpMultiplier: '2x', bonusXP: 75 },
    { id: 'card-challenge-ninja', name: 'سباق النينجا الخاطف 🥷⚡', xpMultiplier: '2.5x', bonusXP: 100 },
    { id: 'card-challenge-ice', name: 'تحدي كوباية التلج 🧊', xpMultiplier: '2x', bonusXP: 60 },
    { id: 'card-challenge-candle', name: 'تحدي الشمعة 🕯️', xpMultiplier: '2x', bonusXP: 70 }
];

let isWheelSpinning = false;
let luckyChallengeBooster = null;

function spinLuckyChallengeWheel() {
    if (isWheelSpinning) return;
    isWheelSpinning = true;

    const btn = document.getElementById('spin-wheel-btn');
    const resultBanner = document.getElementById('lucky-wheel-result-banner');
    const resultText = document.getElementById('lucky-wheel-result-text');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري دوران العجلة... 🎲';
    }

    let ticks = 0;
    const maxTicks = 22;
    const tickInterval = setInterval(() => {
        ticks++;
        playWebAudioChime('strike');
        const randomItem = LUCKY_CHALLENGES[Math.floor(Math.random() * LUCKY_CHALLENGES.length)];
        if (resultBanner && resultText) {
            resultBanner.style.display = 'block';
            resultText.innerText = '🎲 ' + randomItem.name + ' (' + randomItem.xpMultiplier + ' XP Booster!)';
        }

        if (ticks >= maxTicks) {
            clearInterval(tickInterval);
            const winner = LUCKY_CHALLENGES[Math.floor(Math.random() * LUCKY_CHALLENGES.length)];
            luckyChallengeBooster = winner;
            isWheelSpinning = false;

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-dice"></i> دور عجلة التحديات مرة تانية! 🎲';
            }

            if (resultText) {
                resultText.innerHTML = '🎉 حظك اليومي: <strong>' + winner.name + '</strong> مع مضاعف <strong>' + winner.xpMultiplier + ' XP</strong>! يلا اضغط عليه وابدأ!';
            }

            playWebAudioChime('victory');
            launchChallengeConfetti(2500);
            speakCheer('مبروك يا بطل! كسبت ' + winner.name + '! يلا وريني تركيزك!');

            const cardEl = document.getElementById(winner.id);
            if (cardEl) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                cardEl.style.boxShadow = '0 0 35px rgba(245, 158, 11, 0.9)';
                cardEl.style.borderColor = '#fbbf24';
                setTimeout(() => {
                    cardEl.style.boxShadow = '';
                    cardEl.style.borderColor = '';
                }, 5000);
            }
        }
    }, 110);
}

// --- 🛡️ Badges & Trophy Engine ---
const BADGE_DEFINITIONS = {
    bomb: {
        title: 'خبير المتفجرات 💣',
        icon: '💣',
        desc: 'أنهى تحدي قنبلة التركيز 25 دقيقة كاملة بتركيز حديدي دون إبطال الفتيل!',
        challengeKey: 'bomb'
    },
    boss: {
        title: 'قاهر زعيم الكسل 🐉⚔️',
        icon: '⚔️',
        desc: 'أسقط زعيم الكسل والمماطلة صريعاً في معركة بطولية من 4 جولات!',
        challengeKey: 'boss'
    },
    tree: {
        title: 'البستاني الأسطوري 🌳',
        icon: '🌳',
        desc: 'زرع شجرة تركيز وارفة الظلال حتى أزهرت بنجاح في بستان إنجازاته!',
        challengeKey: 'tree'
    },
    ninja: {
        title: 'شبح النينجا الخاطف 🥷',
        icon: '🥷',
        desc: 'أنهى سباق النينجا الخاطف 15 دقيقة بسرعة فائقة ودون تردد!',
        challengeKey: 'ninja'
    },
    ice: {
        title: 'القلب الجليدي المقاوم 🧊',
        icon: '🧊',
        desc: 'صمد في وجه التشتت طوال 20 دقيقة حتى ذاب قالب الثلج بالكامل!',
        challengeKey: 'ice'
    },
    legend: {
        title: 'أسطورة المذاكرة الخارقة 👑',
        icon: '👑',
        desc: 'جمع أكثر من 500 نقطة خبرة XP وأثبت جدارته في قمة المتحدين!',
        challengeKey: 'legend'
    }
};

function getUnlockedBadges() {
    try {
        return JSON.parse(localStorage.getItem('study_unlocked_badges') || '[]');
    } catch(e) {
        return [];
    }
}

function unlockBadge(badgeKey) {
    const list = getUnlockedBadges();
    if (!list.includes(badgeKey)) {
        list.push(badgeKey);
        localStorage.setItem('study_unlocked_badges', JSON.stringify(list));
        initBadges();
        playWebAudioChime('levelup');
        const def = BADGE_DEFINITIONS[badgeKey];
        if (def) {
            speakCheer('عاش يا بطل! فتحت وسام جديد: ' + def.title);
        }
    }
}

function initBadges() {
    const unlocked = getUnlockedBadges();
    const xp = getChallengeXP();

    if (xp >= 500 && !unlocked.includes('legend')) {
        unlocked.push('legend');
        localStorage.setItem('study_unlocked_badges', JSON.stringify(unlocked));
    }

    const counter = document.getElementById('badges-unlocked-counter');
    if (counter) counter.innerText = unlocked.length + ' من 6 أوسمة مفتوحة';

    Object.keys(BADGE_DEFINITIONS).forEach(key => {
        const el = document.getElementById('badge-' + key);
        const tag = document.getElementById('badge-tag-' + key);
        if (el) {
            if (unlocked.includes(key)) {
                el.classList.remove('locked');
                el.classList.add('unlocked');
                if (tag) tag.innerHTML = '✨ مفتوح';
            } else {
                el.classList.remove('unlocked');
                el.classList.add('locked');
                if (tag) tag.innerHTML = '🔒 مغلق';
            }
        }
    });
}

let activeModalBadgeKey = null;
function showBadgeDetails(badgeKey) {
    activeModalBadgeKey = badgeKey;
    const def = BADGE_DEFINITIONS[badgeKey];
    if (!def) return;

    const unlocked = getUnlockedBadges().includes(badgeKey);
    const modal = document.getElementById('badge-details-modal');
    const iconEl = document.getElementById('badge-modal-icon');
    const titleEl = document.getElementById('badge-modal-title');
    const statusEl = document.getElementById('badge-modal-status-badge');
    const descEl = document.getElementById('badge-modal-desc');
    const shareBtn = document.getElementById('badge-modal-share-btn');

    if (iconEl) iconEl.innerText = def.icon;
    if (titleEl) titleEl.innerText = def.title;
    if (descEl) descEl.innerText = def.desc;

    if (statusEl) {
        if (unlocked) {
            statusEl.innerText = '✨ وسام مفتوح ومكتسب!';
            statusEl.style.background = '#fbbf24';
            statusEl.style.color = '#031024';
            if (shareBtn) shareBtn.style.display = 'inline-flex';
        } else {
            statusEl.innerText = '🔒 وسام مقفل - أكمل التحدي لفتحه!';
            statusEl.style.background = 'rgba(255,255,255,0.15)';
            statusEl.style.color = '#fff';
            if (shareBtn) shareBtn.style.display = 'none';
        }
    }

    if (modal) modal.style.display = 'flex';
}

function closeBadgeModal() {
    const modal = document.getElementById('badge-details-modal');
    if (modal) modal.style.display = 'none';
}

function shareBadgeWhatsApp() {
    const def = BADGE_DEFINITIONS[activeModalBadgeKey];
    if (!def) return;
    const text = encodeURIComponent(
        '🛡️ إنجاز أسطوري جديد في تطبيق المذاكرة المتكامل!\n' +
        'فتحت وسام: ' + def.title + ' ' + def.icon + '\n' +
        def.desc + '\n' +
        'يلا اتحدى نفسك وافتح أوسمتك معايا! 🚀'
    );
    window.open('https://api.whatsapp.com/send?text=' + text, '_blank');
}

// Global binds
window.speakCheer = speakCheer;
window.playHeartbeatThump = playHeartbeatThump;
window.toggleAmbientSound = toggleAmbientSound;
window.stopAmbientSound = stopAmbientSound;
window.spinLuckyChallengeWheel = spinLuckyChallengeWheel;
window.initBadges = initBadges;
window.unlockBadge = unlockBadge;
window.showBadgeDetails = showBadgeDetails;
window.closeBadgeModal = closeBadgeModal;
window.shareBadgeWhatsApp = shareBadgeWhatsApp;
