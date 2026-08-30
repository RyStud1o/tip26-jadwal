// ==========================================
// 0. SISTEM KEAMANAN (ANTI INSPECT & COPY)
// ==========================================
document.addEventListener('contextmenu', event => event.preventDefault());

document.onkeydown = function(e) {
  if(e.keyCode == 123) return false; // F12
  if(e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) return false; // Ctrl+Shift+I/J/C
  if(e.ctrlKey && e.keyCode === 85) return false; // Ctrl+U
};

// ==========================================
// 1. INISIALISASI FIREBASE & VARIABEL GLOBAL
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCg4clVORAI-whSKgUg6R4K-VW5v-_gwHo",
    authDomain: "tip26-jadwal.firebaseapp.com",
    databaseURL: "https://tip26-jadwal-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tip26-jadwal",
    storageBucket: "tip26-jadwal.firebasestorage.app",
    messagingSenderId: "673513274494",
    appId: "1:673513274494:web:f6173553726b40eb282c2f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let jadwals = [];
let currentSemester = 1;
let isAdmin = false;
let semestersStatus = {};
let countdownInterval;

// ==========================================
// 2. SISTEM MODAL KUSTOM
// ==========================================
function showCustomAlert(title, message) {
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMessage').innerText = message;
    openModal('customAlertModal');
}

function showCustomConfirm(title, message, onYesCallback) {
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = message;
    const yesBtn = document.getElementById('confirmYesBtn');
    
    const newYesBtn = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    
    newYesBtn.addEventListener('click', () => { 
        closeModal('customConfirmModal'); 
        onYesCallback(); 
    });
    openModal('customConfirmModal');
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ==========================================
// 3. FITUR: JAM DIGITAL & DARK MODE
// ==========================================
function startLiveClock() {
    setInterval(() => {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const clockEl = document.getElementById('liveClock');
        if(clockEl) clockEl.innerText = now.toLocaleDateString('id-ID', options);
    }, 1000);
}

const themeToggle = document.getElementById('themeToggle');
if(localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.innerText = '☀️';
}
themeToggle.addEventListener('click', () => {
    if(document.documentElement.getAttribute('data-theme') === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light'); 
        themeToggle.innerText = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark'); 
        themeToggle.innerText = '☀️';
    }
});

// ==========================================
// 4. WIDGET: COUNTDOWN & NOTIFIKASI
// ==========================================
const notifToggle = document.getElementById('notifToggle');
const notifStatusText = document.getElementById('notifStatusText');

if(localStorage.getItem('notifEnabled') === 'true' && Notification.permission === 'granted') {
    notifToggle.checked = true; 
    notifStatusText.innerText = "Aktif"; 
    notifStatusText.style.color = "var(--ulm-green)";
}

notifToggle.addEventListener('change', (e) => {
    if(e.target.checked) {
        Notification.requestPermission().then(perm => {
            if(perm === 'granted') {
                localStorage.setItem('notifEnabled', 'true');
                notifStatusText.innerText = "Aktif"; 
                notifStatusText.style.color = "var(--ulm-green)";
                new Notification("TIP'26", { body: "Notifikasi pengingat jadwal berhasil diaktifkan!" });
            } else {
                e.target.checked = false;
                notifStatusText.innerText = "Ditolak Browser"; 
                notifStatusText.style.color = "#ef4444";
                showCustomAlert("Akses Ditolak", "Anda memblokir izin notifikasi. Silakan ubah melalui pengaturan situs di browser Anda.");
            }
        });
    } else {
        localStorage.setItem('notifEnabled', 'false');
        notifStatusText.innerText = "Nonaktif"; 
        notifStatusText.style.color = "var(--text-muted)";
    }
});

function loadUpcomingClass(activeSem) {
    if(countdownInterval) clearInterval(countdownInterval);
    
    db.collection("jadwal").where("semester", "==", activeSem).get().then(snap => {
        let todayClasses = [];
        const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const todayStr = days[new Date().getDay()];
        
        snap.forEach(doc => {
            let data = doc.data();
            if(data.hari === todayStr) {
                try {
                    const [startH, startM] = data.waktu.split(' - ')[0].split(':').map(Number);
                    const [endH, endM] = data.waktu.split(' - ')[1].split(':').map(Number);
                    
                    let startT = new Date(); startT.setHours(startH, startM, 0, 0);
                    let endT = new Date(); endT.setHours(endH, endM, 0, 0);
                    
                    todayClasses.push({ ...data, startMs: startT.getTime(), endMs: endT.getTime() });
                } catch(e) {}
            }
        });
        
        todayClasses.sort((a,b) => a.startMs - b.startMs);
        
        countdownInterval = setInterval(() => {
            const now = Date.now();
            let content = document.getElementById('upcomingClassContent');
            if(!content) return;
            
            // Cek kelas LIVE
            let ongoing = todayClasses.find(c => now >= c.startMs && now < c.endMs);
            if(ongoing) {
                content.innerHTML = `
                    <div style="display:flex; align-items:center; margin-bottom:8px;">
                        <h4 style="color:var(--text-main); font-size:1.15rem; font-weight:800;">${ongoing.matkul}</h4>
                        <span class="live-badge">🔴 LIVE NOW</span>
                    </div>
                    <p style="font-weight:700; color:var(--ulm-green); margin-bottom: 5px;">🕒 ${ongoing.waktu} &nbsp;|&nbsp; 📍 ${ongoing.ruang}</p>
                    <p style="font-size: 0.85rem; color:var(--text-muted);">Kelas sedang berlangsung saat ini. Segera masuk!</p>
                `;
                return;
            }

            // Cek Countdown Terdekat
            let upcoming = todayClasses.find(c => c.startMs > now);
            if(upcoming) {
                const diff = upcoming.startMs - now;
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                
                content.innerHTML = `
                    <h4 style="color:var(--text-main); font-size:1.15rem; margin-bottom:5px; font-weight:800;">${upcoming.matkul}</h4>
                    <p style="font-weight:700; color:var(--ulm-green); margin-bottom: 5px;">🕒 ${upcoming.waktu} &nbsp;|&nbsp; 📍 ${upcoming.ruang}</p>
                    <div class="countdown-timer">${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}</div>
                    <p style="font-size: 0.85rem; color:var(--text-muted); margin-top:8px;">Menuju jadwal perkuliahan dimulai</p>
                `;

                // Trigger Notif Pas 15 Menit
                if(notifToggle.checked && h === 0 && m === 15 && s === 0) {
                    new Notification("Pengingat Kuliah TIP'26", { body: `Mata Kuliah ${upcoming.matkul} akan dimulai dalam 15 menit di ${upcoming.ruang}!` });
                }
            } else {
                content.innerHTML = `<p style="color:var(--text-muted); font-weight:600; font-size:1rem;">🎉 Tidak ada jadwal tersisa hari ini. Selamat beristirahat!</p>`;
                clearInterval(countdownInterval);
            }
        }, 1000);
    });
}

// ==========================================
// 5. SISTEM NAVIGASI & INIT UTAMA
// ==========================================
window.onload = () => {
    startLiveClock();
    setTimeout(() => {
        document.getElementById('preloader').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('preloader').style.display = 'none';
            if(!sessionStorage.getItem('welcomeShown')) { 
                document.getElementById('welcomeModal').classList.add('active'); 
            }
        }, 500);
    }, 1000);
    listenSemestersStatus();

    // Auto Refresh halaman jadwal (30 detik) jika ada kelas selesai agar badge LIVE hilang
    setInterval(() => {
        if(document.getElementById('scheduleView').classList.contains('active')) {
            if (document.activeElement !== document.getElementById('searchInput')) {
                renderSchedule();
            }
        }
    }, 30000);
};

document.getElementById('closeWelcomeBtn').addEventListener('click', () => { 
    closeModal('welcomeModal'); 
    sessionStorage.setItem('welcomeShown', 'true'); 
});

function showView(id) { 
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); 
}
function goHome() { showView('dashboardView'); }

// ==========================================
// 6. REALTIME STATUS SEMESTER
// ==========================================
function listenSemestersStatus() {
    db.collection("pengaturan").doc("semesterStatus").onSnapshot(doc => {
        if (doc.exists) { 
            semestersStatus = doc.data(); 
        } else {
            semestersStatus = { 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false };
            db.collection("pengaturan").doc("semesterStatus").set(semestersStatus);
        }
        renderDashboardSemesters();
        updateAdminSemesterControl();
        
        let activeSem = 1;
        for(let i=1; i<=8; i++){ if(semestersStatus[i]){ activeSem = i; break; } }
        loadUpcomingClass(activeSem);
    });
}

function renderDashboardSemesters() {
    const grid = document.getElementById('semesterGridContainer');
    grid.innerHTML = '';
    for(let i=1; i<=8; i++) {
        const isOpen = semestersStatus[i] === true;
        grid.innerHTML += `
            <button class="semester-btn ${isOpen ? 'active' : 'locked'}" onclick="openSemester(${i})">
                <span class="sem-num">${i}</span>
                <div style="display:flex; flex-direction:column;">
                    <span class="sem-text">Semester ${i}</span>
                    <span style="font-size: 0.75rem; color: ${isOpen ? 'var(--ulm-green)' : '#ef4444'}; font-weight: 700;">
                        ${isOpen ? '● Terbuka' : '🔒 Belum Diatur'}
                    </span>
                </div>
            </button>
        `;
    }
}

function openSemester(sem) {
    const isOpen = semestersStatus[sem] === true;
    if(!isOpen && !isAdmin) { 
        return showCustomAlert("Akses Ditutup", `Penyusunan jadwal untuk Semester ${sem} belum diatur atau ditutup oleh Admin Prodi.`); 
    }
    
    currentSemester = sem;
    document.getElementById('semesterTitle').innerText = "Jadwal Semester " + sem;
    
    const baseYear = 2026;
    const yearOffset = Math.floor((sem - 1) / 2);
    document.getElementById('tahunAjaranText').innerText = `Tahun Ajaran ${baseYear + yearOffset}/${baseYear + yearOffset + 1}`;

    showView('scheduleView');
    fetchJadwal();
    updateAdminSemesterControl();
}

function updateAdminSemesterControl() {
    if (!isAdmin) return;
    const isOpen = semestersStatus[currentSemester] === true;
    document.getElementById('statusSemesterInfo').innerText = `Status Sem ${currentSemester}: ${isOpen ? 'Dibuka' : 'Ditutup'}`;
    const btn = document.getElementById('toggleSemesterBtn');
    btn.innerText = isOpen ? 'Tutup Semester Ini' : 'Buka Semester Ini';
    btn.style.background = isOpen ? '#ef4444' : 'var(--ulm-green)';
}

document.getElementById('toggleSemesterBtn').addEventListener('click', () => {
    semestersStatus[currentSemester] = !semestersStatus[currentSemester];
    db.collection("pengaturan").doc("semesterStatus").set(semestersStatus).then(() => { 
        showCustomAlert("Berhasil", `Status Semester ${currentSemester} berhasil diubah secara publik!`); 
    });
});

// ==========================================
// 7. AUTENTIKASI ADMIN
// ==========================================
document.getElementById('adminLoginBtn').addEventListener('click', () => { 
    openModal('loginModal'); 
    document.getElementById('loginErrorMsg').innerText = ''; 
});

document.getElementById('submitLoginBtn').addEventListener('click', () => {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    
    if(!email || !pass) return document.getElementById('loginErrorMsg').innerText = "Mohon isi email dan password.";

    auth.signInWithEmailAndPassword(email, pass).then(() => {
        closeModal('loginModal'); 
        document.getElementById('adminEmail').value = ''; 
        document.getElementById('adminPass').value = '';
        showCustomAlert("Login Berhasil 🎉", "Selamat datang kembali, Administrator! Anda memiliki akses penuh.");
    }).catch(err => {
        let pesanError = "Gagal masuk. Periksa data Anda.";
        if (err.code === 'auth/invalid-credential' || err.message.includes('INVALID') || err.code === 'auth/wrong-password') { pesanError = "Email atau password yang Anda masukkan salah."; } 
        else if (err.code === 'auth/too-many-requests') { pesanError = "Terlalu banyak percobaan. Akun sementara dikunci demi keamanan."; }
        document.getElementById('loginErrorMsg').innerText = pesanError;
    });
});

document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    showCustomConfirm("Keluar Mode Admin", "Apakah Anda yakin ingin mengakhiri sesi Administrator ini?", () => { 
        auth.signOut().then(() => { showCustomAlert("Keluar", "Sesi Administrator telah diakhiri."); }); 
    });
});

auth.onAuthStateChanged(user => {
    isAdmin = !!user;
    document.getElementById('adminPanel').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('adminSemesterControl').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('adminLoginBtn').style.display = isAdmin ? 'none' : 'inline-block';
    document.getElementById('adminLogoutBtn').style.display = isAdmin ? 'inline-block' : 'none';
    renderDashboardSemesters(); 
    if(document.getElementById('scheduleView').classList.contains('active')) fetchJadwal();
});

// ==========================================
// 8. RENDER JADWAL, BENTROK, & FILTER
// ==========================================
function timeToMinutes(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

function checkClashes(data) {
    let clashIds = new Set();
    for (let i = 0; i < data.length; i++) {
        for (let j = i + 1; j < data.length; j++) {
            if (data[i].hari === data[j].hari) {
                try {
                    const [startA, endA] = data[i].waktu.split(' - ').map(timeToMinutes);
                    const [startB, endB] = data[j].waktu.split(' - ').map(timeToMinutes);
                    if (startA < endB && endA > startB) {
                        const isSameRoom = data[i].ruang.trim().toLowerCase() === data[j].ruang.trim().toLowerCase();
                        if (!data[i].matkul.toLowerCase().includes('agama') && isSameRoom) {
                            clashIds.add(data[i].id); clashIds.add(data[j].id);
                        }
                    }
                } catch (e) {}
            }
        }
    }
    return clashIds;
}

const scheduleContainer = document.getElementById('scheduleContainer');
const searchInput = document.getElementById('searchInput');
const dosenFilter = document.getElementById('dosenFilter');
let currentFilter = 'Semua';

function populateDosenDropdown() {
    let allDosen = new Set();
    jadwals.forEach(j => {
        if(Array.isArray(j.dosen)) j.dosen.forEach(d => allDosen.add(d));
        else allDosen.add(j.dosen);
    });
    
    const currentVal = dosenFilter.value;
    dosenFilter.innerHTML = '<option value="">Semua Dosen</option>';
    Array.from(allDosen).sort().forEach(dosen => {
        dosenFilter.innerHTML += `<option value="${dosen}">${dosen}</option>`;
    });
    dosenFilter.value = currentVal;
}

function fetchJadwal() {
    db.collection("jadwal").where("semester", "==", currentSemester).onSnapshot(snap => {
        jadwals = []; 
        snap.forEach(doc => jadwals.push({ id: doc.id, ...doc.data() })); 
        populateDosenDropdown(); 
        renderSchedule();
    });
}

function renderSchedule() {
    scheduleContainer.innerHTML = '';
    const now = new Date();
    const todayStr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][now.getDay()];
    const nowMins = now.getHours() * 60 + now.getMinutes();

    let filtered = jadwals.filter(item => {
        const matchHari = currentFilter === 'Semua' || item.hari === currentFilter;
        const q = searchInput.value.toLowerCase();
        const strDosen = Array.isArray(item.dosen) ? item.dosen.join(' ').toLowerCase() : item.dosen.toLowerCase();
        const matchSearch = item.matkul.toLowerCase().includes(q) || strDosen.includes(q);
        const matchDosenFilter = dosenFilter.value === "" || strDosen.includes(dosenFilter.value.toLowerCase());
        return matchHari && matchSearch && matchDosenFilter;
    });

    if (filtered.length === 0) {
        return scheduleContainer.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); font-size:1.1rem; border: 2px dashed var(--border-color); border-radius: 12px;">Tidak ada jadwal ditemukan.</p>`;
    }

    const hariOrder = { "Senin":1, "Selasa":2, "Rabu":3, "Kamis":4, "Jumat":5, "Sabtu":6 };
    filtered.sort((a,b) => { 
        if(hariOrder[a.hari] !== hariOrder[b.hari]) return hariOrder[a.hari] - hariOrder[b.hari]; 
        return a.waktu.localeCompare(b.waktu); 
    });

    const clashes = checkClashes(filtered);

    filtered.forEach(item => {
        let isLive = false;
        if(item.hari === todayStr) {
            try {
                const [startH, startM] = item.waktu.split(' - ')[0].split(':').map(Number);
                const [endH, endM] = item.waktu.split(' - ')[1].split(':').map(Number);
                // Perbaikan deteksi live menggunakan tanda kurang dari (<) agar hilang pas waktu selesai
                if(nowMins >= (startH*60 + startM) && nowMins < (endH*60 + endM)) isLive = true;
            } catch(e){}
        }

        let liveHTML = isLive ? `<span class="live-badge">🔴 LIVE</span>` : '';
        let warnHTML = clashes.has(item.id) ? `<div class="clash-warning">⚠️ Terdeteksi Bentrok Ruangan</div>` : '';
        let dosenStr = Array.isArray(item.dosen) ? item.dosen.join('<br>') : item.dosen;
        
        let adminBtns = isAdmin ? `
            <div class="admin-actions-card">
                <button class="btn-edit" onclick="editJadwal('${item.id}')">Edit</button>
                <button class="btn-danger" onclick="deleteJadwal('${item.id}')">Hapus</button>
            </div>
        ` : '';

        scheduleContainer.innerHTML += `
            <div class="card ${isLive ? 'live-card' : ''}">
                <div class="card-header">
                    <span class="time">🕒 ${item.waktu} ${liveHTML}</span>
                    <span class="room-badge">${item.ruang}</span>
                </div>
                <div class="subject-info">
                    <div class="day-text">${item.hari}</div>
                    <h3>${item.matkul}</h3>
                </div>
                <div class="lecturers">${dosenStr}</div>
                ${warnHTML}
                ${adminBtns}
            </div>
        `;
    });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', e => { 
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); 
        e.target.classList.add('active'); 
        currentFilter = e.target.getAttribute('data-hari'); 
        renderSchedule(); 
    });
});
searchInput.addEventListener('input', renderSchedule);
dosenFilter.addEventListener('change', renderSchedule);

// ==========================================
// 9. CRUD ADMIN & EXPORT JSON
// ==========================================
function openAddModal() { 
    document.getElementById('crudTitle').innerText = "Tambah Jadwal Baru"; 
    document.getElementById('jadwalId').value = ""; 
    document.getElementById('inputMatkul').value = ""; 
    document.getElementById('inputRuang').value = ""; 
    document.getElementById('inputWaktu').value = ""; 
    document.getElementById('inputDosen').value = ""; 
    openModal('crudModal'); 
}

function editJadwal(id) { 
    const item = jadwals.find(j => j.id === id); 
    if(!item) return; 
    document.getElementById('crudTitle').innerText = "Edit Jadwal"; 
    document.getElementById('jadwalId').value = item.id; 
    document.getElementById('inputHari').value = item.hari; 
    document.getElementById('inputWaktu').value = item.waktu; 
    document.getElementById('inputMatkul').value = item.matkul; 
    document.getElementById('inputRuang').value = item.ruang; 
    document.getElementById('inputDosen').value = Array.isArray(item.dosen) ? item.dosen.join(", ") : item.dosen; 
    openModal('crudModal'); 
}

function deleteJadwal(id) { 
    showCustomConfirm("Hapus Permanen", "Apakah Anda yakin ingin menghapus data mata kuliah ini?", () => { 
        db.collection("jadwal").doc(id).delete().then(() => showCustomAlert("Berhasil", "Mata kuliah dihapus.")); 
    }); 
}

document.getElementById('saveJadwalBtn').addEventListener('click', () => { 
    const id = document.getElementById('jadwalId').value; 
    const data = { 
        semester: currentSemester, 
        hari: document.getElementById('inputHari').value, 
        waktu: document.getElementById('inputWaktu').value, 
        matkul: document.getElementById('inputMatkul').value, 
        ruang: document.getElementById('inputRuang').value, 
        dosen: document.getElementById('inputDosen').value.split(',').map(s => s.trim()) 
    }; 
    if(id) { 
        db.collection("jadwal").doc(id).update(data).then(() => showCustomAlert("Berhasil", "Perubahan disimpan.")); 
    } else { 
        db.collection("jadwal").add(data).then(() => showCustomAlert("Berhasil", "Data baru ditambahkan.")); 
    } 
    closeModal('crudModal'); 
});

// Fungsi Download Backup JSON
function downloadJSON() {
    if(jadwals.length === 0) return showCustomAlert("Kosong", "Tidak ada jadwal untuk di-backup pada semester ini.");
    
    // Hapus id dari objek sebelum diexport agar json lebih bersih
    const exportData = jadwals.map(({id, ...rest}) => rest);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Backup_Jadwal_Semester_${currentSemester}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
}

document.getElementById('btnUpload').addEventListener('click', () => { 
    const file = document.getElementById('uploadJson').files[0]; 
    if (!file) return showCustomAlert("Perhatian", "Pilih file JSON terlebih dahulu!"); 
    const reader = new FileReader(); 
    reader.onload = async (e) => { 
        try { 
            const newData = JSON.parse(e.target.result); 
            const batch = db.batch(); 
            const oldDocs = await db.collection("jadwal").where("semester", "==", currentSemester).get(); 
            oldDocs.forEach(doc => batch.delete(doc.ref)); 
            
            newData.forEach(item => { 
                const newRef = db.collection("jadwal").doc(); 
                item.semester = currentSemester; 
                batch.set(newRef, item); 
            }); 
            await batch.commit(); 
            showCustomAlert("Upload Selesai", "Jadwal semester ini berhasil diperbarui secara massal."); 
            document.getElementById('uploadJson').value = ''; 
        } catch(err) { 
            showCustomAlert("Error Format", "Gagal memproses JSON: Pastikan format file sudah benar."); 
        } 
    }; 
    reader.readAsText(file); 
});
