const jadwalData = [
    { hari: "Senin", waktu: "09:50 - 11:30", matkul: "Kimia Industri Pertanian", ruang: "Ruang Culan", dosen: ["TANWIRUL MILLATI *", "RINI HUSTIANY", "SUSI"] },
    { hari: "Senin", waktu: "14:50 - 16:30", matkul: "Pengantar Teknologi Pertanian", ruang: "Ruang Culan", dosen: ["AGUNG NUGROHO *", "TANWIRUL MILLATI", "HISYAM MUSTAFA AL HAKIM"] },
    { hari: "Selasa", waktu: "08:00 - 09:40", matkul: "Matematika", ruang: "Ruang Culan", dosen: ["FADHILAH DHANI SANTIKA FALAH", "NISA MUFIDAH"] },
    { hari: "Selasa", waktu: "09:50 - 11:30", matkul: "Praktikum Kimia Industri Pertanian", ruang: "Lab. TIP", dosen: ["TANWIRUL MILLATI *", "RINI HUSTIANY", "SUSI"] },
    { hari: "Selasa", waktu: "14:50 - 16:30", matkul: "Pengantar Ilmu Ekonomi", ruang: "Ruang Kenanga", dosen: ["NINA BUDIWATI *", "SORAYA NOORMALASARI"] },
    { hari: "Selasa", waktu: "16:40 - 18:20", matkul: "Pendidikan Agama Kristen Protestan", ruang: "Ruang Kapul 1", dosen: ["Pdt. Dr. Keloso S Ugak, S.Th. *"] },
    { hari: "Selasa", waktu: "16:40 - 18:20", matkul: "Pendidikan Agama Kristen Katolik", ruang: "Ruang Kapul 2", dosen: ["Drs. Petrus B. Kolin *"] },
    { hari: "Selasa", waktu: "16:40 - 18:20", matkul: "Pendidikan Agama Hindu", ruang: "Ruang Kalalayu", dosen: ["Nyoman Sukadane *"] },
    { hari: "Selasa", waktu: "16:40 - 18:20", matkul: "Pendidikan Agama Budha", ruang: "Ruang Kasturi 2", dosen: ["Narmin, S.Ag. *"] },
    { hari: "Rabu", waktu: "09:50 - 11:30", matkul: "Dasar Rekayasa Bioproses", ruang: "Ruang Sarigading", dosen: ["ALIA RAHMI *", "LYA AGUSTINA", "NOVIANTI ADI ROHMANNA"] },
    { hari: "Rabu", waktu: "13:00 - 14:40", matkul: "Pancasila", ruang: "Ruang Pampaken", dosen: ["HABIBAH PIDI ROHMATU *", "SUROTO"] },
    { hari: "Kamis", waktu: "08:00 - 09:40", matkul: "Pendidikan Agama Islam", ruang: "Ruang Pampaken", dosen: ["MUHAMMAD ROSDAL TAWAKKAL *"] },
    { hari: "Kamis", waktu: "13:00 - 14:40", matkul: "Praktikum Matematika", ruang: "Ruang Sarigading", dosen: ["FADHILAH DHANI SANTIKA FALAH", "NISA MUFIDAH"], clash: true },
    { hari: "Kamis", waktu: "16:40 - 18:20", matkul: "Bahasa Indonesia", ruang: "Ruang Pampaken", dosen: ["ISNU WAHYONO *"] }
];

// Logika Navigasi View
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
}

function goHome() {
    showView('dashboardView');
    updateUpcomingClass();
}

function openSemester(semNumber) {
    if(semNumber === 1) {
        showView('scheduleView');
        renderSchedule(); // render ulang tabel jika perlu
    } else {
        showView('comingSoonView');
    }
}

// Logika Widget Jadwal Mendatang
function updateUpcomingClass() {
    const now = new Date();
    const daysArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const currentDayStr = daysArr[now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Waktu dalam menit
    const container = document.getElementById('upcomingClassContainer');
    
    // Cari jadwal khusus hari ini
    const todayClasses = jadwalData.filter(item => item.hari === currentDayStr);
    
    if (todayClasses.length === 0) {
        container.innerHTML = `<p class="widget-empty">Tidak ada jadwal perkuliahan untuk hari ini. Waktunya istirahat atau nugas!</p>`;
        return;
    }

    // Urutkan jadwal hari ini berdasarkan jam mulai
    todayClasses.sort((a, b) => a.waktu.localeCompare(b.waktu));
    
    // Cari kelas yang jam mulainya masih lebih besar dari waktu sekarang
    let nextClass = null;
    for (let i = 0; i < todayClasses.length; i++) {
        let startTimeStr = todayClasses[i].waktu.split(" - ")[0]; // Ambil jam awal misal "09:50"
        let [hours, mins] = startTimeStr.split(":");
        let startMinutes = parseInt(hours) * 60 + parseInt(mins);
        
        if (startMinutes > currentTime) {
            nextClass = todayClasses[i];
            break;
        }
    }

    if (nextClass) {
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h4 style="font-size: 1.2rem; color: var(--primary); margin-bottom: 5px;">${nextClass.matkul}</h4>
                    <p style="color: var(--text-muted); font-weight: 600;">🕒 ${nextClass.waktu} &nbsp;|&nbsp; 📍 ${nextClass.ruang}</p>
                </div>
                <button onclick="openSemester(1)" style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-main); font-weight: bold;">Lihat Detail</button>
            </div>
        `;
    } else {
        container.innerHTML = `<p class="widget-empty">Seluruh kelas hari ini sudah selesai atau sedang berlangsung. Hebat!</p>`;
    }
}

// Logika Render Tabel Semester 1
const scheduleContainer = document.getElementById('scheduleContainer');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
let currentFilter = 'Semua';
let searchQuery = '';

function renderSchedule() {
    scheduleContainer.innerHTML = '';
    const filteredData = jadwalData.filter(item => {
        const matchHari = currentFilter === 'Semua' || item.hari === currentFilter;
        const queryLower = searchQuery.toLowerCase();
        const matchSearch = item.matkul.toLowerCase().includes(queryLower) || 
                            item.dosen.some(d => d.toLowerCase().includes(queryLower));
        return matchHari && matchSearch;
    });

    if (filteredData.length === 0) {
        scheduleContainer.innerHTML = '<div class="empty-state">Mata kuliah atau dosen tidak ditemukan.</div>';
        return;
    }

    filteredData.sort((a, b) => {
        if (a.hari === b.hari) return a.waktu.localeCompare(b.waktu);
        return 0;
    });

    filteredData.forEach(item => {
        const dosenList = item.dosen.map(d => `<p>${d}</p>`).join('');
        const clashBadge = item.clash ? `<div class="clash-warning">⚠️ Waktu bentrok di portal</div>` : '';
        const cardHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="time">🕒 ${item.waktu}</div>
                    <div class="room-badge">${item.ruang}</div>
                </div>
                <div class="subject-info">
                    <div class="day-text">${item.hari}</div>
                    <h3>${item.matkul}</h3>
                </div>
                <div class="lecturers">
                    <strong>Dosen Pengampu:</strong>
                    ${dosenList}
                </div>
                ${clashBadge}
            </div>
        `;
        scheduleContainer.innerHTML += cardHTML;
    });
}

// Event Listeners
filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-hari');
        renderSchedule();
    });
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderSchedule();
});

// Fitur Dark Mode
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
});

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
}

// Inisialisasi awal saat halaman dibuka
updateUpcomingClass();
