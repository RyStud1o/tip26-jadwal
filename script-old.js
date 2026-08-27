document.addEventListener('contextmenu', event => event.preventDefault());

document.onkeydown = function(e) {
  if(e.keyCode == 123) return false; // F12
  if(e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) return false; // Ctrl+Shift+I/J/C
  if(e.ctrlKey && e.keyCode === 85) return false; // Ctrl+U
};
  
// ==========================================
// 1. INISIALISASI FIREBASE
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

// ==========================================
// 2. SISTEM MODAL KUSTOM (ALERT & CONFIRM)
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
    
    // Bersihkan event listener sebelumnya agar tidak menumpuk
    const newYesBtn = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    
    newYesBtn.addEventListener('click', () => {
        closeModal('customConfirmModal');
        onYesCallback();
    });
    openModal('customConfirmModal');
}

// ==========================================
// 3. SISTEM UI & NAVIGASI
// ==========================================
window.onload = () => {
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
};

document.getElementById('closeWelcomeBtn').addEventListener('click', () => {
    document.getElementById('welcomeModal').classList.remove('active');
    sessionStorage.setItem('welcomeShown', 'true');
});

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function showView(id) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function goHome() { showView('dashboardView'); }

// ==========================================
// 4. REALTIME STATUS SEMESTER
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
                        ${isOpen ? '🔓 Terbuka' : '🔒 Terkunci'}
                    </span>
                </div>
            </button>
        `;
    }
}

function openSemester(sem) {
    const isOpen = semestersStatus[sem] === true;
    if(!isOpen && !isAdmin) {
        showCustomAlert("Akses Terkunci", `Penyusunan jadwal untuk Semester ${sem} belum diatur oleh admin website.`);
        return;
    }
    
    currentSemester = sem;
    document.getElementById('semesterTitle').innerText = "Jadwal Semester " + sem;
    
    const baseYear = 2026;
    const yearOffset = Math.floor((sem - 1) / 2);
    const startYear = baseYear + yearOffset;
    document.getElementById('tahunAjaranText').innerText = `Tahun Ajaran ${startYear}/${startYear + 1}`;

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
        showCustomAlert("Berhasil", `Status Semester ${currentSemester} berhasil diubah!`);
    });
});

// ==========================================
// 5. AUTENTIKASI ADMIN (DENGAN PEMANIS POP-UP)
// ==========================================
document.getElementById('adminLoginBtn').addEventListener('click', () => {
    openModal('loginModal');
    document.getElementById('loginErrorMsg').innerText = '';
});

document.getElementById('submitLoginBtn').addEventListener('click', () => {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    
    // Validasi sederhana sebelum kirim ke firebase
    if(!email || !pass) {
        document.getElementById('loginErrorMsg').innerText = "Email dan password tidak boleh kosong.";
        return;
    }

    auth.signInWithEmailAndPassword(email, pass).then(() => {
        closeModal('loginModal');
        document.getElementById('adminEmail').value = ''; 
        document.getElementById('adminPass').value = '';
        showCustomAlert("Login Berhasil 🎉", "Selamat datang kembali, Administrator! Anda kini memiliki hak akses penuh.");
    }).catch(err => {
        // Menerjemahkan kode error Firebase menjadi bahasa yang profesional & ramah pengguna
        let pesanError = "Gagal masuk. Periksa kembali email dan password Anda.";
        
        if (err.code === 'auth/invalid-credential' || err.message.includes('INVALID_LOGIN_CREDENTIALS') || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
            pesanError = "Email atau password yang Anda masukkan salah.";
        } else if (err.code === 'auth/invalid-email') {
            pesanError = "Format penulisan email tidak valid.";
        } else if (err.code === 'auth/too-many-requests') {
            pesanError = "Terlalu banyak percobaan gagal. Akun sementara dikunci demi keamanan.";
        }

        document.getElementById('loginErrorMsg').innerText = pesanError;
    });
});

// Konfirmasi Logout Kustom
document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    showCustomConfirm("Konfirmasi Keluar", "Apakah Anda yakin ingin mengakhiri sesi Administrator ini?", () => {
        auth.signOut().then(() => {
            showCustomAlert("Berhasil Keluar", "Anda telah keluar dari mode Administrator.");
        });
    });
});

auth.onAuthStateChanged(user => {
    isAdmin = !!user;
    document.getElementById('adminPanel').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('adminSemesterControl').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('adminLoginBtn').style.display = isAdmin ? 'none' : 'inline-block';
    document.getElementById('adminLogoutBtn').style.display = isAdmin ? 'inline-block' : 'none';
    renderDashboardSemesters();
    renderSchedule();
});

// ==========================================
// 6. RENDER JADWAL & DETEKSI BENTROK
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
                        const isA_Agama = data[i].matkul.toLowerCase().includes('agama');
                        const isB_Agama = data[j].matkul.toLowerCase().includes('agama');
                        const isSameRoom = data[i].ruang.trim().toLowerCase() === data[j].ruang.trim().toLowerCase();
                        
                        if (!(isA_Agama && isB_Agama) && isSameRoom) {
                            clashIds.add(data[i].id);
                            clashIds.add(data[j].id);
                        }
                    }
                } catch (e) {}
            }
        }
    }
    return clashIds;
}

const container = document.getElementById('scheduleContainer');
const searchInput = document.getElementById('searchInput');
let currentFilter = 'Semua';

function fetchJadwal() {
    db.collection("jadwal").where("semester", "==", currentSemester).onSnapshot(snap => {
        jadwals = [];
        snap.forEach(doc => jadwals.push({ id: doc.id, ...doc.data() }));
        renderSchedule();
    });
}

function renderSchedule() {
    container.innerHTML = '';
    let filtered = jadwals.filter(item => {
        const matchHari = currentFilter === 'Semua' || item.hari === currentFilter;
        const q = searchInput.value.toLowerCase();
        const strDosen = Array.isArray(item.dosen) ? item.dosen.join(' ') : item.dosen;
        const matchSearch = item.matkul.toLowerCase().includes(q) || strDosen.toLowerCase().includes(q);
        return matchHari && matchSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">Belum ada jadwal di semester ini.</p>`;
        return;
    }

    const hariOrder = { "Senin":1, "Selasa":2, "Rabu":3, "Kamis":4, "Jumat":5, "Sabtu":6 };
    filtered.sort((a,b) => {
        if(hariOrder[a.hari] !== hariOrder[b.hari]) return hariOrder[a.hari] - hariOrder[b.hari];
        return a.waktu.localeCompare(b.waktu);
    });

    const clashes = checkClashes(filtered);

    filtered.forEach(item => {
        let warnHTML = clashes.has(item.id) ? `<div class="clash-warning">⚠️ Bertabrakan dengan jadwal di ruangan yang sama</div>` : '';
        let dosenStr = Array.isArray(item.dosen) ? item.dosen.join('<br>') : item.dosen;
        
        let adminBtns = isAdmin ? `
            <div class="admin-actions-card">
                <button class="btn-edit" onclick="editJadwal('${item.id}')">Edit</button>
                <button class="btn-danger" onclick="deleteJadwal('${item.id}')">Hapus</button>
            </div>
        ` : '';

        container.innerHTML += `
            <div class="card">
                <div class="card-header">
                    <span class="time">🕒 ${item.waktu}</span>
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

// ==========================================
// 7. CRUD ADMIN DENGAN KONFIRMASI KUSTOM
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

// Mengganti confirm() bawaan dengan modal kustom
function deleteJadwal(id) {
    showCustomConfirm("Hapus Mata Kuliah", "Apakah Anda yakin ingin menghapus mata kuliah ini dari database secara permanen?", () => {
        db.collection("jadwal").doc(id).delete().then(() => {
            showCustomAlert("Berhasil Terhapus", "Data mata kuliah telah dihapus dari sistem.");
        });
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
        db.collection("jadwal").doc(id).update(data).then(() => {
            showCustomAlert("Berhasil", "Perubahan jadwal berhasil disimpan.");
        }); 
    } else { 
        db.collection("jadwal").add(data).then(() => {
            showCustomAlert("Berhasil", "Mata kuliah baru berhasil ditambahkan.");
        }); 
    }
    
    closeModal('crudModal');
});

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
            showCustomAlert("Sukses Besar 🚀", "Seluruh jadwal semester ini berhasil diperbarui secara massal!");
            document.getElementById('uploadJson').value = '';
        } catch(err) {
            showCustomAlert("Error", "Gagal memproses file JSON: " + err.message);
        }
    };
    reader.readAsText(file);
});
