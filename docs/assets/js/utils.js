import CONFIG from './config.js';

// Inicializar Supabase (usando la librería cargada vía CDN en el HTML)
const { createClient } = window.supabase;
export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/**
 * Helper para subir a Cloudinary
 */
export async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Error al subir imagen a Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;
}

/**
 * Muestra un popup estilizado
 */
export function showPopup(title, message, type = 'success') {
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    const bgClass = type === 'success' ? 'bg-emerald-50' : 'bg-red-50';
    const textClass = type === 'success' ? 'text-emerald-500' : 'text-red-500';
    const btnClass = type === 'success' ? 'hover:bg-emerald-600' : 'hover:bg-red-600';

    const popup = document.createElement('div');
    popup.className = `fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in`;
    popup.innerHTML = `
        <div class="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl border border-white/20">
            <div class="w-20 h-20 ${bgClass} ${textClass} rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                <i class="fas ${icon}"></i>
            </div>
            <h3 class="text-2xl font-black text-slate-900 mb-2">${title}</h3>
            <p class="text-slate-500 font-medium mb-8">${message}</p>
            <button id="popup-close" class="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs ${btnClass} transition-colors">
                Entendido
            </button>
        </div>
    `;
    document.body.appendChild(popup);
    document.body.style.overflow = 'hidden';

    return new Promise((resolve) => {
        document.getElementById('popup-close').onclick = () => {
            popup.remove();
            document.body.style.overflow = 'auto';
            resolve();
        };
    });
}

/**
 * Muestra un popup de confirmación
 */
export function showConfirm(title, message) {
    const popup = document.createElement('div');
    popup.className = `fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in`;
    popup.innerHTML = `
        <div class="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl border border-white/20">
            <div class="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                <i class="fas fa-question-circle"></i>
            </div>
            <h3 class="text-2xl font-black text-slate-900 mb-2">${title}</h3>
            <p class="text-slate-500 font-medium mb-8">${message}</p>
            <div class="flex space-x-3">
                <button id="confirm-cancel" class="flex-grow py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors">
                    Cancelar
                </button>
                <button id="confirm-ok" class="flex-grow py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-colors">
                    Confirmar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    document.body.style.overflow = 'hidden';

    return new Promise((resolve) => {
        document.getElementById('confirm-cancel').onclick = () => {
            popup.remove();
            document.body.style.overflow = 'auto';
            resolve(false);
        };
        document.getElementById('confirm-ok').onclick = () => {
            popup.remove();
            document.body.style.overflow = 'auto';
            resolve(true);
        };
    });
}

export function setupDragAndDrop(dropZone, fileInput, callback) {
    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('border-blue-500', 'bg-blue-50', 'scale-[1.02]');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'scale-[1.02]');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) {
            // Restore DataTransfer for robust file setting
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            callback(file);
        }
    }, false);

    dropZone.addEventListener('click', (e) => {
        // Prevent event from bubbling if it's the input itself
        if (e.target === fileInput) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) callback(file);
    });
}

/**
 * SISTEMA DE AUTENTICACIÓN REAL (Supabase Auth)
 */
export const Auth = {
    async register(email, password, metadata) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });
        if (error) throw error;
        return data;
    },

    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Check if session is confirmed
        if (!data.session) {
             throw new Error('DEBES CONFIRMAR TU EMAIL. Revisa tu bandeja de entrada.');
        }

        // Fetch user profile from wisbe_users
        let { data: profile, error: profileError } = await supabase
            .from('wisbe_users')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

        // SELF-HEALING: If profile is missing (trigger/RLS issue), use RPC Bridge
        if (!profile || profileError) {
            console.warn('Profile missing or blocked by RLS, using Security Bridge RPC...');
            const metadata = data.user.user_metadata || {};

            const { data: rpcProfile, error: rpcError } = await supabase
                .rpc('create_profile_if_missing', {
                    p_id: data.user.id,
                    p_email: data.user.email,
                    p_full_name: metadata.full_name || '',
                    p_domain: metadata.domain || null,
                    p_role: metadata.role || 'gym-owner',
                    p_owner_id: metadata.owner_id || null,
                    p_business_unit: metadata.business_unit || 'gym'
                });

            if (rpcError) {
                console.warn('RPC Security Bridge failed (Silent Fallback):', rpcError);
                // No lanzamos error aquí, dejaremos que el fallback de abajo actúe
            }
            profile = rpcProfile;
        }

        if (!profile) {
            // Last resort: manual profile creation if everything failed
            profile = {
                id: data.user.id,
                email: data.user.email,
                username: data.user.email.split('@')[0],
                full_name: data.user.user_metadata?.full_name || '',
                domain: data.user.user_metadata?.domain || '',
                role: data.user.user_metadata?.role || 'gym-owner',
                owner_id: data.user.user_metadata?.owner_id || null
            };
        }

        localStorage.setItem('gym_user', JSON.stringify(profile));
        return profile;
    },

    async logout() {
        await supabase.auth.signOut();
        localStorage.removeItem('gym_user');
        window.location.href = 'index.html';
    },

    getUser() {
        const user = localStorage.getItem('gym_user');
        return user ? JSON.parse(user) : null;
    },

    getSelectedOwnerId() {
        return localStorage.getItem('admin_selected_owner_id') || null;
    },

    setSelectedOwnerId(id) {
        if (!id) localStorage.removeItem('admin_selected_owner_id');
        else localStorage.setItem('admin_selected_owner_id', id);
    },

    async checkAccess(rolesPermitidos = []) {
        // First check session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }

        // Always fetch fresh profile to ensure role updates are reflected immediately
        const { data: freshProfile, error: profileError } = await supabase
            .from('wisbe_users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

        if (profileError || !freshProfile) {
            console.warn('Could not fetch fresh profile in checkAccess, falling back to local storage');
        } else {
            localStorage.setItem('gym_user', JSON.stringify(freshProfile));
        }

        const user = this.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return null;
        }

        if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(user.role)) {
            await showPopup('Acceso no autorizado', 'No tienes permisos para ver esta sección', 'error');
            window.location.href = 'index.html';
            return null;
        }
        return user;
    }
};

/**
 * Helper para navegación (Navbar común)
 */
export function renderNavbar() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('embedded')) return; // Hide navbar if embedded

    const nav = document.getElementById('main-nav');
    if (!nav) return;

    const user = Auth.getUser();
    const isAdminOrOwner = user && ['gym-admin', 'gym-owner'].includes(user.role);

    nav.className = "nav-container mb-8";
    nav.innerHTML = `
        <div class="container mx-auto flex justify-between items-center">
            <a href="index.html" class="text-xl font-bold tracking-tight text-slate-900 uppercase">Dashboard</a>
            <ul class="hidden md:flex space-x-6 items-center font-semibold text-sm text-slate-600">
                <li><a href="index.html" class="hover:text-blue-600 transition-colors">Inicio</a></li>
                <li><a href="nutricion.html" class="hover:text-blue-600 transition-colors">Nutrición</a></li>
                <li><a href="rutinas.html" class="hover:text-blue-600 transition-colors">Rutinas</a></li>
                <li><a href="entrenadores.html" class="hover:text-blue-600 transition-colors">Equipo</a></li>
                <li><a href="test.html" class="btn btn-primary text-xs uppercase tracking-wider">Hacer Test</a></li>

                ${isAdminOrOwner ? `
                    <li><a href="gym.html" class="text-slate-400 hover:text-blue-500 transition-colors" title="Administración"><i class="fas fa-cog text-lg"></i></a></li>
                ` : ''}

                ${user ? `
                    <li class="flex items-center space-x-3 border-l border-white/10 pl-8 ml-4">
                        <span class="text-[10px] text-slate-500 font-black">${user.full_name || user.username} ${user.role.replace('gym-', '')}</span>
                        <button id="logout-btn" class="text-red-400 hover:text-red-300 transition-colors" title="Cerrar Sesión">
                            <i class="fas fa-power-off text-lg"></i>
                        </button>
                    </li>
                ` : `
                    <li class="pl-8 ml-4">
                        <a href="login.html" class="text-blue-500 hover:text-blue-400 transition-colors flex items-center">
                            <i class="fas fa-user-circle mr-2 text-lg"></i> Login
                        </a>
                    </li>
                `}
            </ul>
            <button class="md:hidden text-white text-2xl"><i class="fas fa-bars"></i></button>
        </div>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => Auth.logout();
    }
}

/**
 * Renderiza el panel lateral para administradores (Wisbe)
 */
export async function renderAdminSidebar(onOwnerChange) {
    const user = Auth.getUser();
    if (!user || user.role !== 'gym-admin') return;

    // Crear el contenedor del panel
    const sidebar = document.createElement('div');
    sidebar.id = 'admin-sidebar';
    sidebar.className = 'admin-sidebar-closed';
    sidebar.innerHTML = `
        <div class="admin-sidebar-tab">
            <span>FIND PROJECT</span>
        </div>
        <div class="admin-sidebar-content">
            <h3 class="text-blue-600 font-black text-[10px] uppercase tracking-widest mb-6">Find Project</h3>
            <input type="text" id="owner-search" class="input mb-6 text-sm" placeholder="Domain or Name...">
            <div id="owners-list-sidebar" class="space-y-3 overflow-y-auto flex-grow mb-6 pr-2 custom-scrollbar">
                <!-- Owners here -->
            </div>
            <div class="pt-6 border-t border-slate-100 mt-auto">
                <h3 class="text-blue-600 font-black text-[10px] uppercase tracking-widest mb-4">Active Project</h3>
                <div id="active-project-name" class="p-4 bg-white rounded-2xl border border-slate-100 font-bold text-slate-800 text-sm shadow-sm">
                    Mi Biblioteca
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(sidebar);

    const tab = sidebar.querySelector('.admin-sidebar-tab');
    const searchInput = sidebar.querySelector('#owner-search');
    const listContainer = sidebar.querySelector('#owners-list-sidebar');
    const activeProjectDisplay = sidebar.querySelector('#active-project-name');

    tab.onclick = () => {
        sidebar.classList.toggle('admin-sidebar-open');
        sidebar.classList.toggle('admin-sidebar-closed');
    };

    // Cargar dueños
    const { data: owners, error } = await supabase
        .from('wisbe_users')
        .select('id, full_name, email, domain')
        .eq('role', 'gym-owner')
        .order('full_name');

    if (!error && owners) {
        const renderList = (filter = '') => {
            const currentId = Auth.getSelectedOwnerId() || '';
            const filtered = owners.filter(o =>
                (o.full_name || '').toLowerCase().includes(filter.toLowerCase()) ||
                (o.email || '').toLowerCase().includes(filter.toLowerCase()) ||
                (o.domain || '').toLowerCase().includes(filter.toLowerCase())
            );

            // Update active display
            const currentOwner = owners.find(o => o.id === currentId);
            activeProjectDisplay.innerText = currentOwner ? (currentOwner.full_name || currentOwner.email) : 'Mi Biblioteca';

            listContainer.innerHTML = `
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:border-blue-500 transition-all owner-item ${currentId === '' ? 'active-owner' : ''}" data-id="">
                    <span class="block font-bold text-slate-800 text-sm">Mi Biblioteca</span>
                </div>
            ` + filtered.map(o => `
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:border-blue-500 transition-all owner-item ${o.id === currentId ? 'active-owner' : ''}" data-id="${o.id}">
                    <span class="block font-bold text-slate-800 text-sm">${o.full_name || o.email}</span>
                    ${o.domain ? `<span class="block text-[10px] text-slate-400 font-medium">${o.domain}</span>` : ''}
                </div>
            `).join('');

            listContainer.querySelectorAll('.owner-item').forEach(item => {
                item.onclick = () => {
                    const id = item.dataset.id;
                    Auth.setSelectedOwnerId(id);
                    renderList(searchInput.value);
                    if (onOwnerChange) onOwnerChange(id);
                };
            });
        };

        searchInput.oninput = (e) => renderList(e.target.value);
        renderList();
    }
}
