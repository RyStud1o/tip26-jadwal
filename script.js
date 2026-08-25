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

// ==========================================
// 2. SISTEM UI (PRELOADER, MODAL, NAVIGASI)
// ==========================================
window.onload = () => {
    setTimeout(() => {
        document.getElementById('preloader').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('preloader').style.display = 'none';
            
            // Tampilkan welcome popup jika belum pernah ditutup
            if(!sessionStorage.getItem('welcomeShown')) {
                document.getElementById('welcomeModal').classList.add('active');
            }
        }, 500);
    }, 1000);
};

document.getElementById('closeWelcomeBtn').addEventListener('click', () => {
    document.getElementById('welcomeModal').classList.remove('active');
    sessionStorage.setItem('welcomeShown', 'true');
});

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// Navigasi Dashboard vs Jadwal
function showView(id) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function goHome() { showView('dashboardView'); }

function openSemester(sem) {
    if(sem !== 1) {
        alert("Penyusunan jadwal untuk Semester " + sem + " belum diatur oleh admin website. Silakan hubungi admin untuk informasi lebih lanjut.");
        return;
    }
    currentSemester = sem;
    document.getElementById('semesterTitle').innerText = "Jadwal Semester " + sem;
    showView('scheduleView');
    fetchJadwal();
}

// ==========================================
// 3. AUTENTIKASI ADMIN
// ==========================================
document.getElementById('adminLoginBtn').addEventListener('click', () => {
    openModal('loginModal');
    document.getElementById('loginErrorMsg').innerText = '';
});

document.getElementById('submitLoginBtn').addEventListener('click', () => {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    auth.signInWithEmailAndPassword(email, pass).then(() => {
        closeModal('loginModal');
        document.getElementById('adminEmail').value = ''; document.getElementById('adminPass').value = '';
    }).catch(err => document.getElementById('loginErrorMsg').innerText = "Gagal: " + err.message);
});

document.getElementById('adminLogoutBtn').addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
    isAdmin = !!user;
    document.getElementById('adminPanel').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('adminLoginBtn').style.display = isAdmin ? 'none' : 'inline-block';
    document.getElementById('adminLogoutBtn').style.display = isAdmin ? 'inline-block' : 'none';
    renderSchedule(); // Render ulang untuk memunculkan tombol Edit/Delete
});

// ==========================================
// 4. LOGIKA CLASH & RENDER DATA
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
                        // LOGIKA PENGECUALIAN: Jika keduanya mengandung kata 'Agama', abaikan bentrok
                        const isA_Agama = data[i].matkul.toLowerCase().includes('agama');
                        const isB_Agama = data[j].matkul.toLowerCase().includes('agama');
                        
                        if (!(isA_Agama && isB_Agama)) {
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
    // Kita filter data di database yang field semesternya sesuai
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
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:40px;">Tidak ada jadwal.</p>`;
        return;
    }

    const hariOrder = { "Senin":1, "Selasa":2, "Rabu":3, "Kamis":4, "Jumat":5, "Sabtu":6 };
    filtered.sort((a,b) => {
        if(hariOrder[a.hari] !== hariOrder[b.hari]) return hariOrder[a.hari] - hariOrder[b.hari];
        return a.waktu.localeCompare(b.waktu);
    });

    const clashes = checkClashes(filtered);

    filtered.forEach(item => {
        let warnHTML = clashes.has(item.id) ? `<div class="clash-warning">⚠️ Bertabrakan dengan jadwal lain</div>` : '';
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

// Fitur Pencarian & Filter
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
// 5. FITUR CRUD ADMIN (TAMBAH, EDIT, HAPUS)
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
    if(confirm("Yakin ingin menghapus jadwal ini?")) {
        db.collection("jadwal").doc(id).delete();
    }
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

    if(id) { db.collection("jadwal").doc(id).update(data); } 
    else { db.collection("jadwal").add(data); }
    
    closeModal('crudModal');
});

// Fitur Upload JSON
document.getElementById('btnUpload').addEventListener('click', () => {
    const file = document.getElementById('uploadJson').files[0];
    if (!file) return alert("Pilih file JSON!");
    const reader = new FileReader();
    reader.onload = async (e) => {
        const newData = JSON.parse(e.target.result);
        const batch = db.batch();
        const oldDocs = await db.collection("jadwal").where("semester", "==", currentSemester).get();
        oldDocs.forEach(doc => batch.delete(doc.ref));
        
        newData.forEach(item => {
            const newRef = db.collection("jadwal").doc();
            item.semester = currentSemester; // Paksa masuk ke semester aktif
            batch.set(newRef, item);
        });
        await batch.commit();
        alert("Upload selesai!");
        document.getElementById('uploadJson').value = '';
    };
    reader.readAsText(file);
});