 // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCDOejXR-_38GBS2jTg6GHMy-AkOP1A2dM",
    authDomain: "karang-taruna-dalam-data.firebaseapp.com",
    projectId: "karang-taruna-dalam-data",
    storageBucket: "karang-taruna-dalam-data.firebasestorage.app",
    messagingSenderId: "922028160917",
    appId: "1:922028160917:web:8397305a92af28c0ca689c",
    measurementId: "G-8JNPDJPRM1"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

// Global Variables
let currentUser = null;
let currentEditId = null;
let currentEditType = null;

// Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Load page specific data
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '/index.html') {
        loadHomePage();
    } else if (window.location.pathname.includes('data.html')) {
        loadDataPage();
    } else if (window.location.pathname.includes('sekretariat.html')) {
        loadSecretariatPage();
    } else if (window.location.pathname.includes('login.html')) {
        setupLogin();
    } else if (window.location.pathname.includes('dashboard.html')) {
        checkAuth();
        loadDashboard();
    }
});

// Home Page Functions
function loadHomePage() {
    loadStats();
    loadStructure();
    loadSecretariatPreview();
}

function loadStats() {
    // Load kecamatan count
    database.ref('kecamatan').once('value', (snapshot) => {
        const count = snapshot.numChildren();
        document.getElementById('kecamatanCount').textContent = count;
    });
    
    // Load desa count
    database.ref('desa').once('value', (snapshot) => {
        const count = snapshot.numChildren();
        document.getElementById('desaCount').textContent = count;
    });
}

function loadStructure() {
    const structureContainer = document.getElementById('structureContainer');
    database.ref('struktur').orderByChild('urutan').once('value', (snapshot) => {
        structureContainer.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const card = `
                <div class="structure-card">
                    <h3>${data.jabatan}</h3>
                    <p><strong>Nama:</strong> ${data.nama}</p>
                    <p><strong>Alamat:</strong> ${data.alamat || '-'}</p>
                </div>
            `;
            structureContainer.innerHTML += card;
        });
    });
}

function loadSecretariatPreview() {
    database.ref('sekretariat').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            if (document.getElementById('secretariatPhoto')) {
                document.getElementById('secretariatPhoto').src = data.foto || 'https://via.placeholder.com/400x300';
            }
            if (data.latitude && data.longitude && typeof google !== 'undefined') {
                const map = new google.maps.Map(document.getElementById('previewMap'), {
                    center: {lat: data.latitude, lng: data.longitude},
                    zoom: 15
                });
                new google.maps.Marker({
                    position: {lat: data.latitude, lng: data.longitude},
                    map: map
                });
            }
        }
    });
}

// Data Page Functions
function loadDataPage() {
    loadAllData();
    setupFilters();
}

function loadAllData() {
    Promise.all([
        database.ref('kecamatan').once('value'),
        database.ref('desa').once('value')
    ]).then(([kecamatanSnapshot, desaSnapshot]) => {
        const totalKecamatan = kecamatanSnapshot.numChildren();
        const totalDesa = desaSnapshot.numChildren();
        
        document.getElementById('totalKecamatan').textContent = totalKecamatan;
        document.getElementById('totalDesa').textContent = totalDesa;
        
        displayData(kecamatanSnapshot, desaSnapshot);
    });
}

function displayData(kecamatanSnapshot, desaSnapshot, filter = 'all', search = '') {
    const container = document.getElementById('dataContainer');
    container.innerHTML = '';
    
    if (filter === 'all' || filter === 'kecamatan') {
        kecamatanSnapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (search && !data.nama.toLowerCase().includes(search.toLowerCase())) return;
            
            const card = `
                <div class="data-item">
                    <h3><i class="fas fa-building"></i> ${data.nama}</h3>
                    <p><strong>Ketua:</strong> ${data.ketua || '-'}</p>
                    <p><strong>Status:</strong> <span class="status ${data.status}">${data.status || 'Aktif'}</span></p>
                </div>
            `;
            container.innerHTML += card;
        });
    }
    
    if (filter === 'all' || filter === 'desa') {
        desaSnapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (search && !data.nama.toLowerCase().includes(search.toLowerCase())) return;
            
            const card = `
                <div class="data-item">
                    <h3><i class="fas fa-home"></i> ${data.nama}</h3>
                    <p><strong>Kecamatan:</strong> ${data.kecamatan}</p>
                    <p><strong>Ketua:</strong> ${data.ketua || '-'}</p>
                    <p><strong>Status:</strong> <span class="status ${data.status}">${data.status || 'Aktif'}</span></p>
                </div>
            `;
            container.innerHTML += card;
        });
    }
    
    if (container.innerHTML === '') {
        container.innerHTML = '<div class="loading">Tidak ada data ditemukan</div>';
    }
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn');
    let currentFilter = 'all';
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const search = e.target.value;
            Promise.all([
                database.ref('kecamatan').once('value'),
                database.ref('desa').once('value')
            ]).then(([kecamatanSnapshot, desaSnapshot]) => {
                displayData(kecamatanSnapshot, desaSnapshot, currentFilter, search);
            });
        });
    }
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            const search = searchInput ? searchInput.value : '';
            Promise.all([
                database.ref('kecamatan').once('value'),
                database.ref('desa').once('value')
            ]).then(([kecamatanSnapshot, desaSnapshot]) => {
                displayData(kecamatanSnapshot, desaSnapshot, currentFilter, search);
            });
        });
    });
}

// Secretariat Page Functions
function loadSecretariatPage() {
    database.ref('sekretariat').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('mainPhoto').src = data.foto || 'https://via.placeholder.com/800x400';
            document.getElementById('address').textContent = data.alamat || 'Jl. Contoh Alamat No. 123, Kabupaten Cirebon';
            document.getElementById('phone').textContent = data.telepon || '(0231) 123456';
            document.getElementById('email').textContent = data.email || 'karangtaruna@cirebonkab.go.id';
            
            if (data.latitude && data.longitude && typeof google !== 'undefined') {
                const map = new google.maps.Map(document.getElementById('fullMap'), {
                    center: {lat: data.latitude, lng: data.longitude},
                    zoom: 15
                });
                new google.maps.Marker({
                    position: {lat: data.latitude, lng: data.longitude},
                    map: map
                });
            }
            
            // Load activity photos
            if (data.foto_kegiatan) {
                const photoGrid = document.getElementById('activityPhotos');
                photoGrid.innerHTML = '';
                data.foto_kegiatan.forEach(photo => {
                    const img = document.createElement('img');
                    img.src = photo;
                    img.style.width = '200px';
                    img.style.height = '150px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '10px';
                    photoGrid.appendChild(img);
                });
            }
        }
    });
}

// Login Functions
function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    document.getElementById('loginMessage').textContent = 'Login gagal: ' + error.message;
                });
        });
    }
}

function checkAuth() {
    auth.onAuthStateChanged((user) => {
        if (!user && window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'login.html';
        } else if (user) {
            currentUser = user;
        }
    });
}

// Dashboard Functions
function loadDashboard() {
    loadKecamatanData();
    loadDesaData();
    loadStrukturData();
    loadSekretariatData();
    setupTabs();
    setupLogout();
}

function loadKecamatanData() {
    const container = document.getElementById('kecamatanList');
    database.ref('kecamatan').once('value', (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const item = `
                <div class="admin-item">
                    <div>
                        <strong>${data.nama}</strong>
                        <p>Ketua: ${data.ketua || '-'}</p>
                        <p>Status: ${data.status || 'Aktif'}</p>
                    </div>
                    <div class="admin-item-actions">
                        <button class="btn-edit-item" onclick="editItem('kecamatan', '${childSnapshot.key}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete-item" onclick="deleteItem('kecamatan', '${childSnapshot.key}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            container.innerHTML += item;
        });
    });
}

function loadDesaData() {
    const container = document.getElementById('desaList');
    database.ref('desa').once('value', (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const item = `
                <div class="admin-item">
                    <div>
                        <strong>${data.nama}</strong>
                        <p>Kecamatan: ${data.kecamatan}</p>
                        <p>Ketua: ${data.ketua || '-'}</p>
                        <p>Status: ${data.status || 'Aktif'}</p>
                    </div>
                    <div class="admin-item-actions">
                        <button class="btn-edit-item" onclick="editItem('desa', '${childSnapshot.key}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete-item" onclick="deleteItem('desa', '${childSnapshot.key}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            container.innerHTML += item;
        });
    });
}

function loadStrukturData() {
    const container = document.getElementById('strukturList');
    database.ref('struktur').orderByChild('urutan').once('value', (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const item = `
                <div class="admin-item">
                    <div>
                        <strong>${data.jabatan}</strong>
                        <p>Nama: ${data.nama}</p>
                        <p>Alamat: ${data.alamat || '-'}</p>
                    </div>
                    <div class="admin-item-actions">
                        <button class="btn-edit-item" onclick="editItem('struktur', '${childSnapshot.key}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete-item" onclick="deleteItem('struktur', '${childSnapshot.key}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            container.innerHTML += item;
        });
    });
}

function loadSekretariatData() {
    const container = document.getElementById('sekretariatInfo');
    database.ref('sekretariat').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            container.innerHTML = `
                <div class="admin-item">
                    <div>
                        <p><strong>Alamat:</strong> ${data.alamat}</p>
                        <p><strong>Telepon:</strong> ${data.telepon}</p>
                        <p><strong>Email:</strong> ${data.email}</p>
                        <p><strong>Latitude:</strong> ${data.latitude}</p>
                        <p><strong>Longitude:</strong> ${data.longitude}</p>
                    </div>
                </div>
            `;
        }
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(`${tab.dataset.tab}Tab`).classList.add('active');
        });
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    }
}

// CRUD Functions
function showAddForm(type) {
    currentEditType = type;
    currentEditId = null;
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const formFields = document.getElementById('formFields');
    
    modalTitle.textContent = `Tambah ${getTypeName(type)}`;
    
    let fields = '';
    if (type === 'kecamatan') {
        fields = `
            <div class="input-group">
                <input type="text" id="nama" placeholder="Nama Kecamatan" required>
            </div>
            <div class="input-group">
                <input type="text" id="ketua" placeholder="Nama Ketua">
            </div>
            <div class="input-group">
                <select id="status">
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
            </div>
        `;
    } else if (type === 'desa') {
        fields = `
            <div class="input-group">
                <input type="text" id="nama" placeholder="Nama Desa" required>
            </div>
            <div class="input-group">
                <input type="text" id="kecamatan" placeholder="Nama Kecamatan" required>
            </div>
            <div class="input-group">
                <input type="text" id="ketua" placeholder="Nama Ketua">
            </div>
            <div class="input-group">
                <select id="status">
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
            </div>
        `;
    } else if (type === 'struktur') {
        fields = `
            <div class="input-group">
                <input type="text" id="jabatan" placeholder="Jabatan" required>
            </div>
            <div class="input-group">
                <input type="text" id="nama" placeholder="Nama Lengkap" required>
            </div>
            <div class="input-group">
                <input type="text" id="alamat" placeholder="Alamat">
            </div>
            <div class="input-group">
                <input type="number" id="urutan" placeholder="Urutan Tampil">
            </div>
        `;
    }
    
    formFields.innerHTML = fields;
    modal.style.display = 'block';
    
    const form = document.getElementById('dataForm');
    form.onsubmit = (e) => {
        e.preventDefault();
        saveData(type);
    };
}

function editItem(type, id) {
    currentEditType = type;
    currentEditId = id;
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const formFields = document.getElementById('formFields');
    
    modalTitle.textContent = `Edit ${getTypeName(type)}`;
    
    database.ref(`${type}/${id}`).once('value', (snapshot) => {
        const data = snapshot.val();
        
        let fields = '';
        if (type === 'kecamatan') {
            fields = `
                <div class="input-group">
                    <input type="text" id="nama" placeholder="Nama Kecamatan" value="${data.nama || ''}" required>
                </div>
                <div class="input-group">
                    <input type="text" id="ketua" placeholder="Nama Ketua" value="${data.ketua || ''}">
                </div>
                <div class="input-group">
                    <select id="status">
                        <option value="Aktif" ${data.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
                        <option value="Tidak Aktif" ${data.status === 'Tidak Aktif' ? 'selected' : ''}>Tidak Aktif</option>
                    </select>
                </div>
            `;
        } else if (type === 'desa') {
            fields = `
                <div class="input-group">
                    <input type="text" id="nama" placeholder="Nama Desa" value="${data.nama || ''}" required>
                </div>
                <div class="input-group">
                    <input type="text" id="kecamatan" placeholder="Nama Kecamatan" value="${data.kecamatan || ''}" required>
                </div>
                <div class="input-group">
                    <input type="text" id="ketua" placeholder="Nama Ketua" value="${data.ketua || ''}">
                </div>
                <div class="input-group">
                    <select id="status">
                        <option value="Aktif" ${data.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
                        <option value="Tidak Aktif" ${data.status === 'Tidak Aktif' ? 'selected' : ''}>Tidak Aktif</option>
                    </select>
                </div>
            `;
        } else if (type === 'struktur') {
            fields = `
                <div class="input-group">
                    <input type="text" id="jabatan" placeholder="Jabatan" value="${data.jabatan || ''}" required>
                </div>
                <div class="input-group">
                    <input type="text" id="nama" placeholder="Nama Lengkap" value="${data.nama || ''}" required>
                </div>
                <div class="input-group">
                    <input type="text" id="alamat" placeholder="Alamat" value="${data.alamat || ''}">
                </div>
                <div class="input-group">
                    <input type="number" id="urutan" placeholder="Urutan Tampil" value="${data.urutan || 0}">
                </div>
            `;
        }
        
        formFields.innerHTML = fields;
        modal.style.display = 'block';
        
        const form = document.getElementById('dataForm');
        form.onsubmit = (e) => {
            e.preventDefault();
            saveData(type);
        };
    });
}

function saveData(type) {
    let data = {};
    
    if (type === 'kecamatan') {
        data = {
            nama: document.getElementById('nama').value,
            ketua: document.getElementById('ketua').value,
            status: document.getElementById('status').value,
            updatedAt: new Date().toISOString()
        };
    } else if (type === 'desa') {
        data = {
            nama: document.getElementById('nama').value,
            kecamatan: document.getElementById('kecamatan').value,
            ketua: document.getElementById('ketua').value,
            status: document.getElementById('status').value,
            updatedAt: new Date().toISOString()
        };
    } else if (type === 'struktur') {
        data = {
            jabatan: document.getElementById('jabatan').value,
            nama: document.getElementById('nama').value,
            alamat: document.getElementById('alamat').value,
            urutan: parseInt(document.getElementById('urutan').value) || 0,
            updatedAt: new Date().toISOString()
        };
    }
    
    const savePromise = currentEditId ? 
        database.ref(`${type}/${currentEditId}`).update(data) :
        database.ref(`${type}`).push(data);
    
    savePromise.then(() => {
        closeModal();
        // Reload the appropriate data
        if (type === 'kecamatan') loadKecamatanData();
        else if (type === 'desa') loadDesaData();
        else if (type === 'struktur') loadStrukturData();
    });
}

function deleteItem(type, id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        database.ref(`${type}/${id}`).remove().then(() => {
            if (type === 'kecamatan') loadKecamatanData();
            else if (type === 'desa') loadDesaData();
            else if (type === 'struktur') loadStrukturData();
        });
    }
}

function editSekretariat() {
    currentEditType = 'sekretariat';
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const formFields = document.getElementById('formFields');
    
    modalTitle.textContent = 'Edit Informasi Sekretariat';
    
    database.ref('sekretariat').once('value', (snapshot) => {
        const data = snapshot.val() || {};
        
        formFields.innerHTML = `
            <div class="input-group">
                <input type="text" id="alamat" placeholder="Alamat Lengkap" value="${data.alamat || ''}" required>
            </div>
            <div class="input-group">
                <input type="text" id="telepon" placeholder="Nomor Telepon" value="${data.telepon || ''}">
            </div>
            <div class="input-group">
                <input type="email" id="email" placeholder="Email" value="${data.email || ''}">
            </div>
            <div class="input-group">
                <input type="text" id="foto" placeholder="URL Foto Sekretariat" value="${data.foto || ''}">
            </div>
            <div class="input-group">
                <input type="number" id="latitude" placeholder="Latitude" step="any" value="${data.latitude || ''}" required>
            </div>
            <div class="input-group">
                <input type="number" id="longitude" placeholder="Longitude" step="any" value="${data.longitude || ''}" required>
            </div>
        `;
        
        modal.style.display = 'block';
        
        const form = document.getElementById('dataForm');
        form.onsubmit = (e) => {
            e.preventDefault();
            const sekretariatData = {
                alamat: document.getElementById('alamat').value,
                telepon: document.getElementById('telepon').value,
                email: document.getElementById('email').value,
                foto: document.getElementById('foto').value,
                latitude: parseFloat(document.getElementById('latitude').value),
                longitude: parseFloat(document.getElementById('longitude').value),
                updatedAt: new Date().toISOString()
            };
            
            database.ref('sekretariat').set(sekretariatData).then(() => {
                closeModal();
                loadSekretariatData();
            });
        };
    });
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
}

function getTypeName(type) {
    const names = {
        'kecamatan': 'Kecamatan',
        'desa': 'Desa',
        'struktur': 'Pengurus'
    };
    return names[type] || type;
}

// Close modal when clicking on X
document.querySelector('.close')?.addEventListener('click', closeModal);

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        closeModal();
    }
}
