// Firebase sudah diinisialisasi dari HTML, kita gunakan firebase yang sudah global
// Pastikan firebase sudah terload sebelum kode ini dijalankan

// Global Variables
let currentUser = null;
let currentEditId = null;
let currentEditType = null;
let previewMap = null;
let fullMap = null;


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
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path === '/index.html' || path === '') {
        loadHomePage();
    } else if (path.includes('data.html')) {
        loadDataPage();
    } else if (path.includes('sekretariat.html')) {
        loadSecretariatPage();
    } else if (path.includes('login.html')) {
        setupLogin();
    } else if (path.includes('dashboard.html')) {
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
        const kecamatanElem = document.getElementById('kecamatanCount');
        if (kecamatanElem) kecamatanElem.textContent = count;
    });
    
    // Load desa count
    database.ref('desa').once('value', (snapshot) => {
        const count = snapshot.numChildren();
        const desaElem = document.getElementById('desaCount');
        if (desaElem) desaElem.textContent = count;
    });
}

function loadStructure() {
    const structureContainer = document.getElementById('structureContainer');
    if (!structureContainer) return;
    
    database.ref('struktur').orderByChild('urutan').once('value', (snapshot) => {
        structureContainer.innerHTML = '';
        if (snapshot.numChildren() === 0) {
            structureContainer.innerHTML = '<div class="loading">Belum ada data struktur</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const card = `
                <div class="structure-card">
                    <h3>${escapeHtml(data.jabatan)}</h3>
                    <p><strong>Nama:</strong> ${escapeHtml(data.nama)}</p>
                    <p><strong>Alamat:</strong> ${escapeHtml(data.alamat || '-')}</p>
                </div>
            `;
            structureContainer.innerHTML += card;
        });
    });
}

// Fungsi untuk inisialisasi Leaflet map
function initLeafletMap(elementId, latitude, longitude, zoom = 15) {
    const mapElement = document.getElementById(elementId);
    if (!mapElement) return null;
    
    // Bersihkan map jika sudah ada
    if (mapElement._leaflet_id) {
        try {
            if (window[`map_${elementId}`]) {
                window[`map_${elementId}`].remove();
            }
        } catch(e) {
            console.log('Error removing existing map:', e);
        }
    }
    
    // Cek apakah Leaflet sudah loaded
    if (typeof L === 'undefined') {
        console.log('Leaflet belum loaded, mencoba lagi dalam 500ms');
        setTimeout(() => initLeafletMap(elementId, latitude, longitude, zoom), 500);
        return null;
    }
    
    try {
        // Clear inner HTML
        mapElement.innerHTML = '';
        
        const map = L.map(elementId).setView([latitude, longitude], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Add custom marker with popup
        const marker = L.marker([latitude, longitude]).addTo(map);
        marker.bindPopup(`
            <b>Sekretariat Karang Taruna</b><br>
            Kabupaten Cirebon<br>
            <small>Klik untuk petunjuk arah</small>
        `).openPopup();
        
        // Simpan reference
        window[`map_${elementId}`] = map;
        
        // Resize map after a short delay to ensure proper rendering
        setTimeout(() => {
            map.invalidateSize();
        }, 200);
        
        return map;
    } catch(e) {
        console.error('Error creating Leaflet map:', e);
        mapElement.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">📍 Peta tidak dapat dimuat</div>';
        return null;
    }
}

function loadSecretariatPreview() {
    database.ref('sekretariat').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const secretariatPhoto = document.getElementById('secretariatPhoto');
            if (secretariatPhoto) {
                secretariatPhoto.src = data.foto || 'https://raw.githubusercontent.com/shasanudin/Karang_Taruna_Kabupaten_Cirebon/main/images/logo/Screenshot_20260419-225720.png';
                secretariatPhoto.alt = 'Foto Sekretariat Karang Taruna Kabupaten Cirebon';
            }
            
            // Load map dengan Leaflet
            const previewMapDiv = document.getElementById('previewMap');
            if (previewMapDiv && data.latitude && data.longitude) {
                setTimeout(() => {
                    initLeafletMap('previewMap', data.latitude, data.longitude, 15);
                }, 100);
            }
        } else {
            // Data default jika belum ada
            const previewMapDiv = document.getElementById('previewMap');
            if (previewMapDiv) {
                setTimeout(() => {
                    initLeafletMap('previewMap', -6.7353, 108.5670, 13);
                }, 100);
            }
        }
    }).catch(error => {
        console.error('Error loading sekretariat preview:', error);
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
        
        const totalKecamatanElem = document.getElementById('totalKecamatan');
        const totalDesaElem = document.getElementById('totalDesa');
        if (totalKecamatanElem) totalKecamatanElem.textContent = totalKecamatan;
        if (totalDesaElem) totalDesaElem.textContent = totalDesa;
        
        displayData(kecamatanSnapshot, desaSnapshot);
    }).catch(error => {
        console.error('Error loading data:', error);
        const container = document.getElementById('dataContainer');
        if (container) container.innerHTML = '<div class="loading">❌ Gagal memuat data. Periksa koneksi database.</div>';
    });
}

function displayData(kecamatanSnapshot, desaSnapshot, filter = 'all', search = '') {
    const container = document.getElementById('dataContainer');
    if (!container) return;
    container.innerHTML = '';
    
    let hasData = false;
    
    if (filter === 'all' || filter === 'kecamatan') {
        kecamatanSnapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (search && !data.nama.toLowerCase().includes(search.toLowerCase())) return;
            hasData = true;
            
            const card = `
                <div class="data-item">
                    <h3><i class="fas fa-building"></i> ${escapeHtml(data.nama)}</h3>
                    <p><strong>Ketua:</strong> ${escapeHtml(data.ketua || '-')}</p>
                    <p><strong>Status:</strong> <span class="${data.status === 'Aktif' ? 'status-active' : 'status-inactive'}">${escapeHtml(data.status || 'Aktif')}</span></p>
                </div>
            `;
            container.innerHTML += card;
        });
    }
    
    if (filter === 'all' || filter === 'desa') {
        desaSnapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (search && !data.nama.toLowerCase().includes(search.toLowerCase())) return;
            hasData = true;
            
            const card = `
                <div class="data-item">
                    <h3><i class="fas fa-home"></i> ${escapeHtml(data.nama)}</h3>
                    <p><strong>Kecamatan:</strong> ${escapeHtml(data.kecamatan)}</p>
                    <p><strong>Ketua:</strong> ${escapeHtml(data.ketua || '-')}</p>
                    <p><strong>Status:</strong> <span class="${data.status === 'Aktif' ? 'status-active' : 'status-inactive'}">${escapeHtml(data.status || 'Aktif')}</span></p>
                </div>
            `;
            container.innerHTML += card;
        });
    }
    
    if (!hasData) {
        container.innerHTML = '<div class="loading">📭 Tidak ada data ditemukan</div>';
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
            }).catch(error => {
                console.error('Error filtering data:', error);
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
            }).catch(error => {
                console.error('Error filtering data:', error);
            });
        });
    });
}

// Secretariat Page Functions
function loadSecretariatPage() {
    database.ref('sekretariat').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const mainPhoto = document.getElementById('mainPhoto');
            if (mainPhoto) {
                mainPhoto.src = data.foto || 'https://raw.githubusercontent.com/shasanudin/Karang_Taruna_Kabupaten_Cirebon/main/images/logo/Screenshot_20260419-225720.png';
                mainPhoto.alt = 'Foto Sekretariat Karang Taruna Kabupaten Cirebon';
            }
            
            const addressElem = document.getElementById('address');
            if (addressElem) addressElem.textContent = data.alamat || 'Jl. Sunan Drajat No. 1, Sumber, Kabupaten Cirebon';
            
            const phoneElem = document.getElementById('phone');
            if (phoneElem) phoneElem.textContent = data.telepon || '(0231) 321456';
            
            const emailElem = document.getElementById('email');
            if (emailElem) emailElem.textContent = data.email || 'karangtaruna@cirebonkab.go.id';
            
            // Load full map dengan Leaflet
            const fullMapDiv = document.getElementById('fullMap');
            if (fullMapDiv && data.latitude && data.longitude) {
                setTimeout(() => {
                    initLeafletMap('fullMap', data.latitude, data.longitude, 15);
                }, 100);
            } else if (fullMapDiv) {
                // Koordinat default Kabupaten Cirebon
                setTimeout(() => {
                    initLeafletMap('fullMap', -6.7353, 108.5670, 13);
                }, 100);
            }
            
            // Load activity photos
            if (data.foto_kegiatan && Array.isArray(data.foto_kegiatan) && data.foto_kegiatan.length > 0) {
                const photoGrid = document.getElementById('activityPhotos');
                if (photoGrid) {
                    photoGrid.innerHTML = '';
                    data.foto_kegiatan.forEach(photo => {
                        if (photo && photo.trim()) {
                            const img = document.createElement('img');
                            img.src = photo;
                            img.alt = 'Foto Kegiatan Karang Taruna';
                            img.style.width = '100%';
                            img.style.height = '150px';
                            img.style.objectFit = 'cover';
                            img.style.borderRadius = '10px';
                            img.style.cursor = 'pointer';
                            img.onclick = () => window.open(photo, '_blank');
                            photoGrid.appendChild(img);
                        }
                    });
                }
            }
        } else {
            // Data default jika belum ada
            const fullMapDiv = document.getElementById('fullMap');
            if (fullMapDiv) {
                setTimeout(() => {
                    initLeafletMap('fullMap', -6.7353, 108.5670, 13);
                }, 100);
            }
        }
    }).catch(error => {
        console.error('Error loading sekretariat page:', error);
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
                .then(() => {
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    const messageElem = document.getElementById('loginMessage');
                    if (messageElem) {
                        let errorMessage = 'Login gagal: ';
                        switch(error.code) {
                            case 'auth/user-not-found':
                                errorMessage += 'Email tidak terdaftar';
                                break;
                            case 'auth/wrong-password':
                                errorMessage += 'Password salah';
                                break;
                            case 'auth/invalid-email':
                                errorMessage += 'Format email tidak valid';
                                break;
                            default:
                                errorMessage += error.message;
                        }
                        messageElem.textContent = errorMessage;
                    }
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
            console.log('User logged in:', user.email);
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
    if (!container) return;
    
    database.ref('kecamatan').once('value', (snapshot) => {
        container.innerHTML = '';
        if (snapshot.numChildren() === 0) {
            container.innerHTML = '<div class="loading">📋 Belum ada data kecamatan. Klik "Tambah Kecamatan" untuk menambahkan.</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const item = `
                <div class="admin-item">
                    <div>
                        <strong>🏢 ${escapeHtml(data.nama)}</strong>
                        <p>👤 Ketua: ${escapeHtml(data.ketua || '-')}</p>
                        <p>📊 Status: <span class="${data.status === 'Aktif' ? 'status-active' : 'status-inactive'}">${escapeHtml(data.status || 'Aktif')}</span></p>
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
    }).catch(error => {
        console.error('Error loading kecamatan:', error);
        container.innerHTML = '<div class="loading">❌ Gagal memuat data kecamatan</div>';
    });
}

function loadDesaData() {
    const container = document.getElementById('desaList');
    if (!container) return;
    
    database.ref('desa').once('value', (snapshot) => {
        container.innerHTML = '';
        if (snapshot.numChildren() === 0) {
            container.innerHTML = '<div class="loading">📋 Belum ada data desa. Klik "Tambah Desa" untuk menambahkan.</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const item = `
                <div class="admin-item">
                    <div>
                        <strong>🏘️ ${escapeHtml(data.nama)}</strong>
                        <p>📍 Kecamatan: ${escapeHtml(data.kecamatan)}</p>
                        <p>👤 Ketua: ${escapeHtml(data.ketua || '-')}</p>
                        <p>📊 Status: <span class="${data.status === 'Aktif' ? 'status-active' : 'status-inactive'}">${escapeHtml(data.status || 'Aktif')}</span></p>
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
    }).catch(error => {
        console.error('Error loading desa:', error);
        container.innerHTML = '<div class="loading">❌ Gagal memuat data desa</div>';
    });
}

function loadStrukturData() {
    const container = document.getElementById('strukturList');
    if (!container) return;
    
    database.ref('struktur').orderByChild('urutan').once('value', (snapshot) => {
        container.innerHTML = '';
        if (snapshot.numChildren() === 0) {
            container.innerHTML = '<div class="loading">📋 Belum ada data struktur. Klik "Tambah Pengurus" untuk menambahkan.</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const item = `
                <div class="admin-item">
                    <div>
                        <strong>📌 ${escapeHtml(data.jabatan)}</strong>
                        <p>👤 Nama: ${escapeHtml(data.nama)}</p>
                        <p>📍 Alamat: ${escapeHtml(data.alamat || '-')}</p>
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
    }).catch(error => {
        console.error('Error loading struktur:', error);
        container.innerHTML = '<div class="loading">❌ Gagal memuat data struktur</div>';
    });
}

function loadSekretariatData() {
    const container = document.getElementById('sekretariatInfo');
    if (!container) return;
    
    database.ref('sekretariat').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            container.innerHTML = `
                <div class="admin-item">
                    <div>
                        <p><strong>📍 Alamat:</strong> ${escapeHtml(data.alamat || '-')}</p>
                        <p><strong>📞 Telepon:</strong> ${escapeHtml(data.telepon || '-')}</p>
                        <p><strong>📧 Email:</strong> ${escapeHtml(data.email || '-')}</p>
                        <p><strong>🌐 Latitude:</strong> ${data.latitude || '-'}</p>
                        <p><strong>🌐 Longitude:</strong> ${data.longitude || '-'}</p>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="loading">📋 Belum ada data sekretariat. Klik "Edit Informasi Sekretariat" untuk menambahkan.</div>';
        }
    }).catch(error => {
        console.error('Error loading sekretariat:', error);
        container.innerHTML = '<div class="loading">❌ Gagal memuat data sekretariat</div>';
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
            
            const targetTab = document.getElementById(`${tab.dataset.tab}Tab`);
            if (targetTab) targetTab.classList.add('active');
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
            }).catch(error => {
                console.error('Error logging out:', error);
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
    
    if (!modal || !modalTitle || !formFields) return;
    
    modalTitle.textContent = `Tambah ${getTypeName(type)}`;
    
    let fields = '';
    if (type === 'kecamatan') {
        fields = `
            <div class="input-group">
                <i class="fas fa-building"></i>
                <input type="text" id="nama" placeholder="Nama Kecamatan" required>
            </div>
            <div class="input-group">
                <i class="fas fa-user"></i>
                <input type="text" id="ketua" placeholder="Nama Ketua">
            </div>
            <div class="input-group">
                <i class="fas fa-flag-checkered"></i>
                <select id="status">
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
            </div>
        `;
    } else if (type === 'desa') {
        fields = `
            <div class="input-group">
                <i class="fas fa-home"></i>
                <input type="text" id="nama" placeholder="Nama Desa" required>
            </div>
            <div class="input-group">
                <i class="fas fa-building"></i>
                <input type="text" id="kecamatan" placeholder="Nama Kecamatan" required>
            </div>
            <div class="input-group">
                <i class="fas fa-user"></i>
                <input type="text" id="ketua" placeholder="Nama Ketua">
            </div>
            <div class="input-group">
                <i class="fas fa-flag-checkered"></i>
                <select id="status">
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
            </div>
        `;
    } else if (type === 'struktur') {
        fields = `
            <div class="input-group">
                <i class="fas fa-tag"></i>
                <input type="text" id="jabatan" placeholder="Jabatan" required>
            </div>
            <div class="input-group">
                <i class="fas fa-user"></i>
                <input type="text" id="nama" placeholder="Nama Lengkap" required>
            </div>
            <div class="input-group">
                <i class="fas fa-map-marker-alt"></i>
                <input type="text" id="alamat" placeholder="Alamat">
            </div>
            <div class="input-group">
                <i class="fas fa-sort-numeric-down"></i>
                <input type="number" id="urutan" placeholder="Urutan Tampil">
            </div>
        `;
    }
    
    formFields.innerHTML = fields;
    modal.style.display = 'block';
    
    const form = document.getElementById('dataForm');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            saveData(type);
        };
    }
}

function editItem(type, id) {
    currentEditType = type;
    currentEditId = id;
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const formFields = document.getElementById('formFields');
    
    if (!modal || !modalTitle || !formFields) return;
    
    modalTitle.textContent = `Edit ${getTypeName(type)}`;
    
    database.ref(`${type}/${id}`).once('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        let fields = '';
        if (type === 'kecamatan') {
            fields = `
                <div class="input-group">
                    <i class="fas fa-building"></i>
                    <input type="text" id="nama" placeholder="Nama Kecamatan" value="${escapeHtml(data.nama || '')}" required>
                </div>
                <div class="input-group">
                    <i class="fas fa-user"></i>
                    <input type="text" id="ketua" placeholder="Nama Ketua" value="${escapeHtml(data.ketua || '')}">
                </div>
                <div class="input-group">
                    <i class="fas fa-flag-checkered"></i>
                    <select id="status">
                        <option value="Aktif" ${data.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
                        <option value="Tidak Aktif" ${data.status === 'Tidak Aktif' ? 'selected' : ''}>Tidak Aktif</option>
                    </select>
                </div>
            `;
        } else if (type === 'desa') {
            fields = `
                <div class="input-group">
                    <i class="fas fa-home"></i>
                    <input type="text" id="nama" placeholder="Nama Desa" value="${escapeHtml(data.nama || '')}" required>
                </div>
                <div class="input-group">
                    <i class="fas fa-building"></i>
                    <input type="text" id="kecamatan" placeholder="Nama Kecamatan" value="${escapeHtml(data.kecamatan || '')}" required>
                </div>
                <div class="input-group">
                    <i class="fas fa-user"></i>
                    <input type="text" id="ketua" placeholder="Nama Ketua" value="${escapeHtml(data.ketua || '')}">
                </div>
                <div class="input-group">
                    <i class="fas fa-flag-checkered"></i>
                    <select id="status">
                        <option value="Aktif" ${data.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
                        <option value="Tidak Aktif" ${data.status === 'Tidak Aktif' ? 'selected' : ''}>Tidak Aktif</option>
                    </select>
                </div>
            `;
        } else if (type === 'struktur') {
            fields = `
                <div class="input-group">
                    <i class="fas fa-tag"></i>
                    <input type="text" id="jabatan" placeholder="Jabatan" value="${escapeHtml(data.jabatan || '')}" required>
                </div>
                <div class="input-group">
                    <i class="fas fa-user"></i>
                    <input type="text" id="nama" placeholder="Nama Lengkap" value="${escapeHtml(data.nama || '')}" required>
                </div>
                <div class="input-group">
                    <i class="fas fa-map-marker-alt"></i>
                    <input type="text" id="alamat" placeholder="Alamat" value="${escapeHtml(data.alamat || '')}">
                </div>
                <div class="input-group">
                    <i class="fas fa-sort-numeric-down"></i>
                    <input type="number" id="urutan" placeholder="Urutan Tampil" value="${data.urutan || 0}">
                </div>
            `;
        }
        
        formFields.innerHTML = fields;
        modal.style.display = 'block';
        
        const form = document.getElementById('dataForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                saveData(type);
            };
        }
    });
}

function saveData(type) {
    let data = {};
    
    if (type === 'kecamatan') {
        data = {
            nama: document.getElementById('nama')?.value || '',
            ketua: document.getElementById('ketua')?.value || '',
            status: document.getElementById('status')?.value || 'Aktif',
            updatedAt: new Date().toISOString()
        };
    } else if (type === 'desa') {
        data = {
            nama: document.getElementById('nama')?.value || '',
            kecamatan: document.getElementById('kecamatan')?.value || '',
            ketua: document.getElementById('ketua')?.value || '',
            status: document.getElementById('status')?.value || 'Aktif',
            updatedAt: new Date().toISOString()
        };
    } else if (type === 'struktur') {
        data = {
            jabatan: document.getElementById('jabatan')?.value || '',
            nama: document.getElementById('nama')?.value || '',
            alamat: document.getElementById('alamat')?.value || '',
            urutan: parseInt(document.getElementById('urutan')?.value) || 0,
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
        
        // Also reload home page stats if on home page
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            loadStats();
        }
        
        // Show success message
        alert('✅ Data berhasil disimpan!');
    }).catch(error => {
        console.error('Error saving data:', error);
        alert('❌ Gagal menyimpan data: ' + error.message);
    });
}

function deleteItem(type, id) {
    if (confirm('⚠️ Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.')) {
        database.ref(`${type}/${id}`).remove().then(() => {
            if (type === 'kecamatan') loadKecamatanData();
            else if (type === 'desa') loadDesaData();
            else if (type === 'struktur') loadStrukturData();
            
            // Also reload home page stats if on home page
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                loadStats();
            }
            
            alert('✅ Data berhasil dihapus!');
        }).catch(error => {
            console.error('Error deleting data:', error);
            alert('❌ Gagal menghapus data: ' + error.message);
        });
    }
}

function editSekretariat() {
    currentEditType = 'sekretariat';
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const formFields = document.getElementById('formFields');
    
    if (!modal || !modalTitle || !formFields) return;
    
    modalTitle.textContent = 'Edit Informasi Sekretariat';
    
    database.ref('sekretariat').once('value', (snapshot) => {
        const data = snapshot.val() || {};
        
        formFields.innerHTML = `
            <div class="input-group">
                <i class="fas fa-map-marker-alt"></i>
                <input type="text" id="alamat" placeholder="Alamat Lengkap" value="${escapeHtml(data.alamat || '')}" required>
            </div>
            <div class="input-group">
                <i class="fas fa-phone"></i>
                <input type="text" id="telepon" placeholder="Nomor Telepon" value="${escapeHtml(data.telepon || '')}">
            </div>
            <div class="input-group">
                <i class="fas fa-envelope"></i>
                <input type="email" id="email" placeholder="Email" value="${escapeHtml(data.email || '')}">
            </div>
            <div class="input-group">
                <i class="fas fa-image"></i>
                <input type="text" id="foto" placeholder="URL Foto Sekretariat" value="${escapeHtml(data.foto || '')}">
            </div>
            <div class="input-group">
                <i class="fas fa-globe"></i>
                <input type="number" id="latitude" placeholder="Latitude" step="any" value="${data.latitude || '-6.7353'}" required>
            </div>
            <div class="input-group">
                <i class="fas fa-globe"></i>
                <input type="number" id="longitude" placeholder="Longitude" step="any" value="${data.longitude || '108.5670'}" required>
            </div>
            <div class="input-group">
                <i class="fas fa-photo-video"></i>
                <textarea id="foto_kegiatan" placeholder="URL Foto Kegiatan (pisahkan dengan koma)">${data.foto_kegiatan ? data.foto_kegiatan.join(', ') : ''}</textarea>
                <small style="display: block; margin-top: 5px; color: #666;">Contoh: https://contoh.com/foto1.jpg, https://contoh.com/foto2.jpg</small>
            </div>
        `;
        
        modal.style.display = 'block';
        
        const form = document.getElementById('dataForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                
                // Parse foto kegiatan
                let fotoKegiatan = [];
                const fotoKegiatanInput = document.getElementById('foto_kegiatan')?.value;
                if (fotoKegiatanInput && fotoKegiatanInput.trim()) {
                    fotoKegiatan = fotoKegiatanInput.split(',').map(url => url.trim()).filter(url => url);
                }
                
                const sekretariatData = {
                    alamat: document.getElementById('alamat')?.value || '',
                    telepon: document.getElementById('telepon')?.value || '',
                    email: document.getElementById('email')?.value || '',
                    foto: document.getElementById('foto')?.value || 'https://raw.githubusercontent.com/shasanudin/Karang_Taruna_Kabupaten_Cirebon/main/images/logo/Screenshot_20260419-225720.png',
                    latitude: parseFloat(document.getElementById('latitude')?.value) || -6.7353,
                    longitude: parseFloat(document.getElementById('longitude')?.value) || 108.5670,
                    foto_kegiatan: fotoKegiatan,
                    updatedAt: new Date().toISOString()
                };
                
                database.ref('sekretariat').set(sekretariatData).then(() => {
                    closeModal();
                    loadSekretariatData();
                    // Also reload preview on home page if needed
                    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                        loadSecretariatPreview();
                    }
                    if (window.location.pathname.includes('sekretariat.html')) {
                        loadSecretariatPage();
                    }
                    alert('✅ Data sekretariat berhasil disimpan!');
                }).catch(error => {
                    console.error('Error saving sekretariat:', error);
                    alert('❌ Gagal menyimpan data sekretariat: ' + error.message);
                });
            };
        }
    });
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
}

function getTypeName(type) {
    const names = {
        'kecamatan': 'Kecamatan',
        'desa': 'Desa',
        'struktur': 'Pengurus'
    };
    return names[type] || type;
}

// Helper function to escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Close modal when clicking on X
const closeBtn = document.querySelector('.close');
if (closeBtn) closeBtn.addEventListener('click', closeModal);

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        closeModal();
    }
}

// Inisialisasi default data jika belum ada
function initDefaultData() {
    // Cek apakah data sekretariat ada
    database.ref('sekretariat').once('value', (snapshot) => {
        if (!snapshot.exists()) {
            const defaultData = {
                alamat: "Jl. Sunan Drajat No. 1, Sumber, Kabupaten Cirebon",
                telepon: "(0231) 321456",
                email: "karangtaruna@cirebonkab.go.id",
                foto: "https://raw.githubusercontent.com/shasanudin/Karang_Taruna_Kabupaten_Cirebon/main/images/logo/Screenshot_20260419-225720.png",
                latitude: -6.7353,
                longitude: 108.5670,
                foto_kegiatan: [],
                updatedAt: new Date().toISOString()
            };
            database.ref('sekretariat').set(defaultData);
            console.log('✅ Data default sekretariat ditambahkan');
        }
    });
    
    // Cek apakah ada data contoh untuk kecamatan
    database.ref('kecamatan').once('value', (snapshot) => {
        if (!snapshot.exists()) {
            const sampleKecamatan = {
                nama: "Kecamatan Sumber",
                ketua: "Contoh Nama Ketua",
                status: "Aktif",
                updatedAt: new Date().toISOString()
            };
            database.ref('kecamatan').push(sampleKecamatan);
            console.log('✅ Data contoh kecamatan ditambahkan');
        }
    });
    
    // Cek apakah ada data contoh untuk struktur
    database.ref('struktur').once('value', (snapshot) => {
        if (!snapshot.exists()) {
            const sampleStruktur = [
                {
                    jabatan: "Ketua",
                    nama: "Contoh Nama Ketua",
                    alamat: "Jl. Contoh No. 123",
                    urutan: 1,
                    updatedAt: new Date().toISOString()
                },
                {
                    jabatan: "Sekretaris",
                    nama: "Contoh Nama Sekretaris",
                    alamat: "Jl. Contoh No. 456",
                    urutan: 2,
                    updatedAt: new Date().toISOString()
                },
                {
                    jabatan: "Bendahara",
                    nama: "Contoh Nama Bendahara",
                    alamat: "Jl. Contoh No. 789",
                    urutan: 3,
                    updatedAt: new Date().toISOString()
                }
            ];
            
            sampleStruktur.forEach(item => {
                database.ref('struktur').push(item);
            });
            console.log('✅ Data contoh struktur ditambahkan');
        }
    });
}

// Panggil initDefaultData saat halaman dimuat
setTimeout(initDefaultData, 1500);
