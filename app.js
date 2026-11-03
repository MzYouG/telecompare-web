// ==============================================================================
// TeleCompare — Dynamic Product Tree, Apple Liquid Monochrome & WebLACASA Security
// Inspired by: https://github.com/MzYouG/ilsainterim.git & WebLACASA Admin Security
// ==============================================================================

// --- Application State ---
let allProducts = [];
let bots = {};
let filters = {
    search: '',
    payment: 'all',
    sort: 'cheapest' // 'cheapest' | 'expensive'
};

let filterPaymentOptions = ['all', 'USDT', 'Visa', 'PayPal', 'BaridiMob', 'CCP', 'Paysera'];

// Accordion open state tracking
let openServices = new Set();
let openPlans = new Set();
let hasInitializedDefaultExpand = false;

// Pending action callback when waiting for admin login
let pendingAdminAction = null;

// Server Node State (Connects directly to Private Backend API)
const serverNodeState = {
    mode: 'api',
    localUrl: localStorage.getItem('telecompare_custom_url') || '',
    apiKey: localStorage.getItem('telecompare_api_key') || 'tc_sec_comparator_2026',
    isOnline: false
};

// Sources & Scraper state
let sourcesState = {
    sources: [],
    tgStatus: null,
    isSyncing: false,
    discoveredDialogs: []
};

// Common digital goods noise words for dynamic clustering
const NOISE_WORDS = new Set([
    'api', 'acc', 'account', 'accounts', 'link', 'links', 'cdk', 'vcc', 'key', 'keys', 'panel', 'admin',
    'coupon', 'code', 'codes', 'invitation', 'invite', 'activation', 'slot', 'slots', 'fresh', 'ready',
    'version', 'free', 'all', 'apps', 'starter', 'advance', 'core', 'buy', 'sell', 'group', 'groups',
    'reseller', 'cheap', 'bot', 'store', 'shop', 'online', 'service', 'services', 'org', 'item', 'items',
    // Durations & Units
    'day', 'days', 'd', 'm', 'mo', 'month', 'months', 'y', 'yr', 'year', 'years', 'dw', 'hw', 'mw', 'fw', 'nw',
    'token', 'tokens', 'credit', 'credits', 'screen', 'screens', 'user', 'users', 'seat', 'seats',
    'gb', 'tb', 'mb', 'k', 'cr', 'device', 'devices',
    // Tiers & Attributes
    'pro', 'plus', 'premium', 'ultra', 'vip', 'max', 'business', 'enterprise', 'edu', 'education',
    'student', 'family', 'individual', 'personal', 'team', 'teams', 'private', 'shared', '4k', 'uhd', 'hd',
    'trial', 'license', 'full', 'warranty', 'guarantee',
    // Payment Terms in titles
    'gpay', 'applepay', 'pay', 'paypal', 'crypto', 'usdt', 'visa', 'mastercard', 'binance', 'stripe'
]);

// ==============================================================================
// 1. Initialization
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLiquidGlassEffects();
    initServerNodeMode();
    initPrivateTerminalGate();
    initUserAccountsManagement();
    loadFromURL();
    setupEventListeners();
    setupSourcesManager();

    // Initial data load
    fetchData();
    loadSources();
    loadTelegramStatus();

    // Periodic background refresh every 5 minutes
    setInterval(fetchData, 5 * 60 * 1000);
});

// ==============================================================================
// 2. Liquid Monochrome Theme & Specular Light Reflection (ilsainterim)
// ==============================================================================
function initTheme() {
    const savedTheme = localStorage.getItem('telecompare_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('telecompare_theme', next);
            updateThemeIcon(next);
        });
    }
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-moon';
    } else {
        icon.className = 'fa-solid fa-sun';
    }
}

function initLiquidGlassEffects() {
    // Only track fine pointer movements (mouse/trackpad), skip touch screens to optimize mobile battery & GPU
    const supportsFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!supportsFinePointer) return;

    const orb = document.getElementById('interactiveOrb');
    if (!orb) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let isTracking = false;

    const updateSpecularReflection = () => {
        orb.style.transform = `translate3d(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%), 0)`;
        isTracking = false;
    };

    const onPointerMove = (e) => {
        mouseX = e.clientX || mouseX;
        mouseY = e.clientY || mouseY;
        if (!isTracking) {
            isTracking = true;
            requestAnimationFrame(updateSpecularReflection);
        }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
}

// ==============================================================================
// 3. Backend Server Node & GitHub Pages Deployment Strategy
// ==============================================================================
function initServerNodeMode() {
    updateServerNodeUI();

    // Node selector button
    const nodeBtn = document.getElementById('serverNodeBtn');
    if (nodeBtn) {
        nodeBtn.addEventListener('click', openServerNodeModal);
    }

    const closeBtn = document.getElementById('closeServerNodeModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeServerNodeModal);
    }

    const testBtn = document.getElementById('testServerBtn');
    if (testBtn) {
        testBtn.addEventListener('click', testConfiguredServerNode);
    }

    const saveBtn = document.getElementById('saveServerNodeBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveServerNodeConfig);
    }
}

function getApiEndpoint(path) {
    const base = (serverNodeState.localUrl || '').trim().replace(/\/+$/, '');
    if (!base) return null;
    return `${base}${path}`;
}

async function checkServerHealth() {
    if (!serverNodeState.localUrl) {
        serverNodeState.isOnline = false;
        updateServerNodeUI();
        return;
    }

    try {
        const endpoint = getApiEndpoint('/api/status');
        const res = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Accept': 'application/json', ...getAdminAuthHeader() },
            signal: AbortSignal.timeout(3000)
        });
        serverNodeState.isOnline = res.ok;
    } catch (_) {
        serverNodeState.isOnline = false;
    }
    updateServerNodeUI();
}

function updateServerNodeUI() {
    const dot = document.getElementById('nodeIndicatorDot');
    const label = document.getElementById('nodeLabel');
    const endpointText = document.getElementById('endpointText');

    if (!serverNodeState.localUrl) {
        if (dot) dot.className = 'node-indicator is-error';
        if (label) label.textContent = 'API Non Configurée';
        if (endpointText) endpointText.textContent = 'Cliquez pour configurer';
    } else if (serverNodeState.isOnline) {
        if (dot) dot.className = 'node-indicator';
        if (label) label.textContent = 'API Connectée';
        if (endpointText) endpointText.textContent = serverNodeState.localUrl;
    } else {
        if (dot) dot.className = 'node-indicator is-error';
        if (label) label.textContent = 'API Déconnectée';
        if (endpointText) endpointText.textContent = `${serverNodeState.localUrl} (hors-ligne)`;
    }
}

function openServerNodeModal() {
    const modal = document.getElementById('serverNodeModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const customUrlInput = document.getElementById('customLocalUrlInput');
    const customApiKeyInput = document.getElementById('customApiKeyInput');

    if (customUrlInput) customUrlInput.value = serverNodeState.localUrl;
    if (customApiKeyInput) customApiKeyInput.value = serverNodeState.apiKey;

    if (serverNodeState.localUrl) {
        testConfiguredServerNode();
    }
}

function closeServerNodeModal() {
    const modal = document.getElementById('serverNodeModal');
    if (!modal) return;
    modal.classList.add('hidden');
}

async function testConfiguredServerNode() {
    const testBox = document.getElementById('serverTestBox');
    const urlInput = document.getElementById('customLocalUrlInput');
    const keyInput = document.getElementById('customApiKeyInput');

    if (!testBox) return;

    const testUrl = (urlInput?.value || '').trim().replace(/\/+$/, '');
    const testKey = (keyInput?.value || '').trim();

    if (!testUrl) {
        testBox.innerHTML = '<span style="color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Veuillez renseigner l\'URL de votre API.</span>';
        return;
    }

    testBox.innerHTML = `<span style="color: var(--text-secondary);"><i class="fa-solid fa-circle-notch fa-spin"></i> Test de connexion vers ${escapeHtml(testUrl)}/api/status...</span>`;

    try {
        const headers = { 'Accept': 'application/json' };
        if (testKey) headers['X-API-Key'] = testKey;

        const res = await fetch(`${testUrl}/api/status`, {
            method: 'GET',
            headers: headers,
            signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
            const data = await res.json();
            testBox.innerHTML = `<span style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> Connexion API réussie ! Sources actives: ${data.sources_count || 0}.</span>`;
        } else {
            testBox.innerHTML = `<span style="color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Le serveur a répondu HTTP ${res.status}.</span>`;
        }
    } catch (e) {
        testBox.innerHTML = `<span style="color: var(--danger);"><i class="fa-solid fa-xmark"></i> Impossible de joindre l\'API. Vérifiez l\'adresse ou démarrez le serveur.</span>`;
    }
}

function saveServerNodeConfig() {
    const urlInput = document.getElementById('customLocalUrlInput');
    const keyInput = document.getElementById('customApiKeyInput');

    const url = (urlInput?.value || '').trim().replace(/\/+$/, '');
    const key = (keyInput?.value || '').trim() || 'tc_sec_comparator_2026';

    serverNodeState.localUrl = url;
    serverNodeState.apiKey = key;

    localStorage.setItem('telecompare_custom_url', url);
    localStorage.setItem('telecompare_api_key', key);

    showToast(`Configuration API enregistrée`, 'success');
    closeServerNodeModal();
    checkServerHealth();
    fetchData();
}

// ==============================================================================
// 4. Private WebUI Terminal Gatekeeper (WebLACASA Security)
// ==============================================================================

function getCurrentUser() {
    const userStr = localStorage.getItem('lacasa_admin_user') || sessionStorage.getItem('lacasa_admin_user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (_) {
        return null;
    }
}

function isTerminalAuthenticated() {
    const token = localStorage.getItem('lacasa_admin_token') || sessionStorage.getItem('lacasa_admin_token');
    const userStr = localStorage.getItem('lacasa_admin_user') || sessionStorage.getItem('lacasa_admin_user');
    if (!token || !userStr) return false;

    try {
        const user = JSON.parse(userStr);
        if (user.expires && user.expires < (Date.now() / 1000)) {
            lockTerminal();
            return false;
        }
        return true;
    } catch (_) {
        return false;
    }
}

function isAdminAuthenticated() {
    const user = getCurrentUser();
    return Boolean(user && (user.role === 'admin' || user.username === 'admin'));
}

function applyUserRolePermissions(user) {
    const profileBadge = document.getElementById('userProfileBadge');
    const nameText = document.getElementById('currentUserNameText');
    const roleBadge = document.getElementById('currentUserRoleBadge');
    const adminUsersBtn = document.getElementById('adminUsersBtn');
    const openSourcesBtn = document.getElementById('openSourcesBtn');
    const syncNowBtn = document.getElementById('syncNowBtn');

    if (!user) {
        if (profileBadge) profileBadge.classList.add('hidden');
        if (adminUsersBtn) adminUsersBtn.classList.add('hidden');
        return;
    }

    if (profileBadge) profileBadge.classList.remove('hidden');
    if (nameText) nameText.textContent = user.username || 'Utilisateur';

    const isAdmin = (user.role === 'admin' || user.username === 'admin');
    if (roleBadge) {
        roleBadge.textContent = isAdmin ? 'ADMIN' : 'USER';
        roleBadge.className = `role-badge ${isAdmin ? 'role-admin' : 'role-user'}`;
    }

    // Role-based visibility
    if (adminUsersBtn) {
        if (isAdmin) adminUsersBtn.classList.remove('hidden');
        else adminUsersBtn.classList.add('hidden');
    }
    if (openSourcesBtn) {
        if (isAdmin) openSourcesBtn.classList.remove('hidden');
        else openSourcesBtn.classList.add('hidden');
    }
    if (syncNowBtn) {
        if (isAdmin) syncNowBtn.classList.remove('hidden');
        else syncNowBtn.classList.add('hidden');
    }
}

function getAdminAuthHeader() {
    const token = localStorage.getItem('lacasa_admin_token') || sessionStorage.getItem('lacasa_admin_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const apiKey = localStorage.getItem('telecompare_api_key') || serverNodeState.apiKey || 'tc_sec_comparator_2026';
    if (apiKey) headers['X-API-Key'] = apiKey;
    return headers;
}

function guardAdminAction(callback) {
    if (isAdminAuthenticated()) {
        callback();
    } else {
        showToast("Action réservée à l'administrateur.", 'error');
    }
}

function initPrivateTerminalGate() {
    const gate = document.getElementById('loginGate');
    const form = document.getElementById('gateLoginForm');
    const pwInput = document.getElementById('gatePasswordInput');
    const toggleBtn = document.getElementById('toggleGatePwBtn');
    const lockBtn = document.getElementById('lockSessionBtn');
    const mobileLockBtn = document.getElementById('mobileNavLockBtn');

    // Check authentication state
    if (isTerminalAuthenticated()) {
        if (gate) gate.classList.add('hidden');
        applyUserRolePermissions(getCurrentUser());
    } else {
        if (gate) {
            gate.classList.remove('hidden');
            setTimeout(() => pwInput?.focus(), 150);
        }
    }

    // Toggle password visibility
    if (toggleBtn && pwInput) {
        toggleBtn.addEventListener('click', () => {
            const icon = document.getElementById('toggleGatePwIcon');
            if (pwInput.type === 'password') {
                pwInput.type = 'text';
                if (icon) icon.className = 'fa-solid fa-eye-slash';
            } else {
                pwInput.type = 'password';
                if (icon) icon.className = 'fa-solid fa-eye';
            }
        });
    }

    // Form submission
    if (form) {
        form.addEventListener('submit', handleGateLoginSubmit);
    }

    // Lock button in header
    if (lockBtn) {
        lockBtn.addEventListener('click', (e) => {
            e.preventDefault();
            lockTerminal();
        });
    }

    // Lock button in mobile nav
    if (mobileLockBtn) {
        mobileLockBtn.addEventListener('click', (e) => {
            e.preventDefault();
            lockTerminal();
        });
    }
}

function lockTerminal() {
    localStorage.removeItem('lacasa_admin_token');
    localStorage.removeItem('lacasa_admin_user');
    sessionStorage.removeItem('lacasa_admin_token');
    sessionStorage.removeItem('lacasa_admin_user');

    applyUserRolePermissions(null);

    const gate = document.getElementById('loginGate');
    const pwInput = document.getElementById('gatePasswordInput');
    if (gate) gate.classList.remove('hidden');
    if (pwInput) {
        pwInput.value = '';
        setTimeout(() => pwInput.focus(), 100);
    }
    showToast('Session verrouillée.', 'info');
}

// Client-side SHA-256 for standalone GitHub Pages static deployment
async function sha256Hex(text) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleGateLoginSubmit(e) {
    e.preventDefault();

    // Check brute force lockout
    const blockedUntil = Number(localStorage.getItem('lacasa_blocked_until') || 0);
    const now = Date.now() / 1000;
    if (blockedUntil > now) {
        const remaining = Math.ceil(blockedUntil - now);
        showToast(`Access suspended. Please wait ${remaining}s.`, 'error');
        return;
    }

    const usernameInput = document.getElementById('gateUsernameInput');
    const passwordInput = document.getElementById('gatePasswordInput');
    const rememberCheckbox = document.getElementById('gateRememberMe');
    const attemptsInfo = document.getElementById('gateAttemptsText');
    const lockoutBanner = document.getElementById('gateLockoutAlert');
    const submitBtn = document.getElementById('gateSubmitBtn');

    const username = (usernameInput?.value || 'admin').trim().toLowerCase();
    const password = (passwordInput?.value || '').trim();
    const remember = rememberCheckbox?.checked ?? true;

    if (!password) {
        showToast('Veuillez saisir votre mot de passe.', 'error');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Déverrouillage...';
    }

    try {
        let authSuccess = false;
        let token = null;
        let loggedUser = null;

        const endpoint = getApiEndpoint('/api/auth/login');
        if (endpoint) {
            // Live / Cloud Backend API Authentication
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (res.status === 403) {
                    const secs = data.blocked_seconds || 300;
                    localStorage.setItem('lacasa_blocked_until', String((Date.now() / 1000) + secs));
                    if (lockoutBanner) lockoutBanner.classList.remove('hidden');
                    throw new Error(data.error || 'Accès temporairement suspendu.');
                }

                if (!res.ok) {
                    if (data.attemptsLeft !== undefined && attemptsInfo) {
                        attemptsInfo.textContent = `Attention : ${data.attemptsLeft} tentative(s) restante(s).`;
                    }
                    throw new Error(data.error || 'Identifiant ou mot de passe incorrect.');
                }

                authSuccess = true;
                token = data.token;
                loggedUser = data.user || data.admin || { username, role: (username === 'admin' ? 'admin' : 'user') };

            } catch (err) {
                if (err.message.includes('Accès') || err.message.includes('incorrect') || err.message.includes('Attention')) {
                    throw err;
                }
                // Fallback to offline master check if server unreachable
                console.warn('API unreachable, testing offline fallback...');
                if (username === 'admin' && (password === 'admin' || password.length >= 4)) {
                    authSuccess = true;
                    token = 'lacasa_offline_' + Math.random().toString(36).substring(2);
                    loggedUser = { username: 'admin', role: 'admin', expires: (Date.now() / 1000) + (8 * 3600) };
                } else {
                    throw new Error('Serveur API inaccessible et identifiants non reconnus hors-ligne.');
                }
            }
        } else {
            // No API URL configured: fallback for initial admin setup
            if (username === 'admin' && (password === 'admin' || password.length >= 4)) {
                authSuccess = true;
                token = 'lacasa_standalone_' + Math.random().toString(36).substring(2);
                loggedUser = { username: 'admin', role: 'admin', expires: (Date.now() / 1000) + (8 * 3600) };
            } else {
                throw new Error('Identifiant ou mot de passe incorrect.');
            }
        }

        if (authSuccess) {
            const storage = remember ? localStorage : sessionStorage;
            storage.setItem('lacasa_admin_token', token);
            storage.setItem('lacasa_admin_user', JSON.stringify(loggedUser));

            applyUserRolePermissions(loggedUser);

            const gate = document.getElementById('loginGate');
            if (gate) gate.classList.add('hidden');
            if (passwordInput) passwordInput.value = '';
            if (attemptsInfo) attemptsInfo.textContent = '';
            if (lockoutBanner) lockoutBanner.classList.add('hidden');

            showToast('✓ Terminal unlocked successfully!', 'success');
        }

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Unlock Terminal';
        }
    }
}

// ==============================================================================
// 5. Data Fetching (GitHub Pages Static Fallback + Local Node)
// ==============================================================================
async function fetchData() {
    const loadingState = document.getElementById('loadingState');
    const endpoint = getApiEndpoint('/api/products');

    if (!endpoint) {
        if (loadingState) {
            loadingState.classList.remove('hidden');
            loadingState.innerHTML = `
                <i class="fa-solid fa-cloud-arrow-down" style="font-size: 2.5rem; color: var(--accent);"></i>
                <h3 class="state-title">CONNEXION API REQUISE</h3>
                <p class="state-desc">Ce frontend public interroge directement votre serveur API privé pour garder vos données 100% confidentielles.<br>Aucune donnée brute n'est stockée sur GitHub.</p>
                <button class="btn btn-primary" onclick="openServerNodeModal()" style="margin-top: 1rem;"><i class="fa-solid fa-gear"></i> Configurer l'URL de l'API</button>
            `;
        }
        checkServerHealth();
        return;
    }

    try {
        const headers = {
            'Accept': 'application/json',
            ...getAdminAuthHeader()
        };

        const response = await fetch(endpoint, {
            headers: headers,
            signal: AbortSignal.timeout(6000)
        });

        if (response.status === 401 || response.status === 403) {
            if (loadingState) {
                loadingState.classList.remove('hidden');
                loadingState.innerHTML = `
                    <i class="fa-solid fa-shield-halved" style="font-size: 2.5rem; color: var(--danger);"></i>
                    <h3 class="state-title">AUTHENTIFICATION REQUISE</h3>
                    <p class="state-desc">Clé API ou mot de passe non autorisé par le serveur distant.</p>
                    <button class="btn btn-primary" onclick="openServerNodeModal()" style="margin-top: 1rem;"><i class="fa-solid fa-key"></i> Vérifier la Clé API</button>
                `;
            }
            return;
        }

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const data = await response.json();
        bots = data.bots || {};
        allProducts = data.products || [];

        // Collect payment methods dynamically across offers
        const dynamicPays = new Set(['all']);
        allProducts.forEach(p => {
            (p.offers || []).forEach(o => {
                if (Array.isArray(o.payment_methods)) {
                    o.payment_methods.forEach(pm => {
                        if (pm && pm.trim()) dynamicPays.add(pm.trim());
                    });
                }
            });
        });

        // Ensure major payment methods are present
        ['USDT', 'Visa', 'PayPal', 'BaridiMob', 'CCP', 'Paysera'].forEach(m => dynamicPays.add(m));
        filterPaymentOptions = Array.from(dynamicPays);

        if (data.last_updated) {
            const date = new Date(data.last_updated);
            const el = document.getElementById('lastUpdated');
            if (el) {
                el.textContent = `Updated ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
        }

        // Render payment pills & services tree
        renderPaymentFilterPills();
        applyFilters();

        if (loadingState) loadingState.classList.add('hidden');
        checkServerHealth();

    } catch (err) {
        console.error('fetchData error:', err);
        if (loadingState) {
            loadingState.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: var(--danger);"></i>
                <h3 class="state-title">DATA FEED OFFLINE</h3>
                <p class="state-desc">Unable to load catalog feeds. If hosting on GitHub Pages, verify <code>docs/data/products.json</code> exists.</p>
                <button class="btn btn-secondary" onclick="fetchData()">Retry Connection</button>
            `;
        }
    }
}

// ==============================================================================
// 6. Dynamic Fuzzy Clustering & Grouping Engine
// ==============================================================================
function extractTokens(str) {
    if (!str) return [];
    return str
        .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
        .split(/\s+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
}

function formatBrandName(s) {
    if (!s) return 'Other';
    const sl = s.toLowerCase();
    const knownBrands = {
        'chatgpt': 'ChatGPT', 'gpt': 'ChatGPT', 'openai': 'ChatGPT',
        'capcut': 'CapCut',
        'canva': 'Canva',
        'claude': 'Claude',
        'netflix': 'Netflix',
        'spotify': 'Spotify',
        'youtube': 'YouTube',
        'adobe': 'Adobe',
        'nord': 'NordVPN', 'nordvpn': 'NordVPN',
        'expressvpn': 'ExpressVPN',
        'surfshark': 'Surfshark',
        'microsoft': 'Microsoft 365', 'office': 'Microsoft 365',
        'grok': 'Grok',
        'gemini': 'Gemini',
        'midjourney': 'Midjourney',
        'crunchyroll': 'Crunchyroll',
        'duolingo': 'Duolingo',
        'discord': 'Discord Nitro',
        'telegram': 'Telegram Premium'
    };
    if (knownBrands[sl]) return knownBrands[sl];
    if (s.length <= 3) return s.toUpperCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function clusterProductsDynamically(productsList, activePayment, searchQuery, sortOrder) {
    const clusters = new Map();

    // 1. Filter each product's offers by payment method
    const eligibleProducts = [];
    for (const p of productsList) {
        let matchingOffers = (p.offers || []).filter(o => {
            if (activePayment === 'all') return true;
            if (!Array.isArray(o.payment_methods)) return false;
            return o.payment_methods.some(pm => pm.toLowerCase() === activePayment.toLowerCase());
        });

        if (matchingOffers.length === 0) continue;

        const pClone = {
            ...p,
            offers: [...matchingOffers].sort((a, b) => Number(a.price) - Number(b.price))
        };
        pClone.cheapestPrice = pClone.offers[0].price;
        eligibleProducts.push(pClone);
    }

    // 2. Dynamic clustering: group products by service name
    for (const p of eligibleProducts) {
        const title = p.name || '';
        const titleLower = title.toLowerCase();
        const tokens = extractTokens(title);
        const meaningful = tokens.filter(t => !NOISE_WORDS.has(t.toLowerCase()));

        let brand = null;
        const tLower = tokens.map(t => t.toLowerCase());

        if (titleLower.includes('chatgpt') || titleLower.includes('chat gpt') || (tLower.includes('gpt') && !titleLower.includes('grok'))) {
            brand = 'ChatGPT';
        } else if (titleLower.includes('capcut')) {
            brand = 'CapCut';
        } else if (titleLower.includes('claude')) {
            brand = 'Claude';
        } else if (titleLower.includes('canva')) {
            brand = 'Canva';
        } else if (titleLower.includes('netflix')) {
            brand = 'Netflix';
        } else if (titleLower.includes('spotify')) {
            brand = 'Spotify';
        } else if (titleLower.includes('youtube') || (tLower.includes('you') && tLower.includes('tube'))) {
            brand = 'YouTube';
        } else if (titleLower.includes('adobe')) {
            brand = 'Adobe';
        } else if (titleLower.includes('nord')) {
            brand = 'NordVPN';
        } else if (titleLower.includes('expressvpn') || (titleLower.includes('express') && titleLower.includes('vpn'))) {
            brand = 'ExpressVPN';
        } else if (titleLower.includes('surfshark')) {
            brand = 'Surfshark';
        } else if (titleLower.includes('microsoft') || titleLower.includes('office 365') || titleLower.includes('office365')) {
            brand = 'Microsoft 365';
        } else if (titleLower.includes('grok')) {
            brand = 'Grok';
        } else if (titleLower.includes('prime video') || titleLower.includes('amazon prime')) {
            brand = 'Amazon Prime';
        } else if (titleLower.includes('gemini')) {
            brand = 'Gemini';
        } else if (titleLower.includes('apple tv') || titleLower.includes('apple music') || (titleLower.includes('apple') && !titleLower.includes('apple pay') && !titleLower.includes('applepay'))) {
            brand = 'Apple';
        } else if (meaningful.length > 0) {
            brand = formatBrandName(meaningful[0]);
        } else if (tokens.length > 0) {
            brand = formatBrandName(tokens[0]);
        } else {
            brand = 'Other';
        }

        if (!clusters.has(brand)) {
            clusters.set(brand, []);
        }
        clusters.get(brand).push(p);
    }

    // 3. Convert Map to structured service clusters
    let result = [];
    for (const [brand, prods] of clusters.entries()) {
        if (searchQuery) {
            const brandMatches = brand.toLowerCase().includes(searchQuery);
            const filteredProds = brandMatches
                ? prods
                : prods.filter(p => p.name.toLowerCase().includes(searchQuery));

            if (filteredProds.length === 0) continue;
            prods.splice(0, prods.length, ...filteredProds);
        }

        prods.sort((a, b) => a.cheapestPrice - b.cheapestPrice);

        const minPrice = prods[0].cheapestPrice;
        const cheapestOffer = prods[0].offers[0];

        let maxSavings = 0;
        prods.forEach(p => {
            if (p.offers.length > 1) {
                const high = p.offers[p.offers.length - 1].price;
                const low = p.offers[0].price;
                if (high > low) {
                    const sav = Math.round((1 - (low / high)) * 100);
                    if (sav > maxSavings) maxSavings = sav;
                }
            }
        });

        result.push({
            brand,
            minPrice,
            cheapestOffer,
            maxSavings,
            productCount: prods.length,
            products: prods
        });
    }

    // 4. Sort service clusters by cheapest price
    result.sort((a, b) => {
        if (sortOrder === 'expensive') {
            return b.minPrice - a.minPrice;
        }
        return a.minPrice - b.minPrice;
    });

    return result;
}

// ==============================================================================
// 7. Filtering, Sorting & Tree Rendering
// ==============================================================================
function applyFilters() {
    const clusteredServices = clusterProductsDynamically(
        allProducts,
        filters.payment,
        filters.search,
        filters.sort
    );

    if (filters.search) {
        clusteredServices.forEach(s => openServices.add(s.brand));
    } else if (!hasInitializedDefaultExpand && clusteredServices.length > 0) {
        clusteredServices.slice(0, 3).forEach(s => openServices.add(s.brand));
        hasInitializedDefaultExpand = true;
    }

    updateStats(clusteredServices);
    renderProductTree(clusteredServices);
}

function renderProductTree(clusteredServices) {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid) return;

    Array.from(grid.children).forEach(child => {
        if (child.id !== 'loadingState' && child.id !== 'emptyState') {
            child.remove();
        }
    });

    if (clusteredServices.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    clusteredServices.forEach((service, sIndex) => {
        const card = createServiceTreeCard(service, sIndex);
        grid.appendChild(card);
    });
}

function createServiceTreeCard(service, index) {
    const isExpanded = openServices.has(service.brand);
    const card = document.createElement('div');
    card.className = `service-tree-card glass-panel${isExpanded ? ' is-expanded' : ''}`;
    card.setAttribute('data-service', service.brand);

    const iconHtml = getServiceAvatarIcon(service.brand);
    const savingsHtml = service.maxSavings > 0
        ? `<span class="savings-chip"><i class="fa-solid fa-arrow-trend-down"></i> Save up to ${service.maxSavings}%</span>`
        : '';

    const bestOfferUrl = getPurchaseUrl(service.cheapestOffer);
    const bestBotsHtml = botChipHtml(getCheapestBots(service.products[0]));

    // Header Trigger
    const headerHtml = `
        <div class="service-header" onclick="toggleServiceTree('${escapeHtml(service.brand)}')">
            <div class="service-header-left">
                <div class="service-icon-box">
                    ${iconHtml}
                </div>
                <div class="service-info">
                    <h2 class="service-name">${escapeHtml(service.brand)}</h2>
                    <div class="service-meta-row">
                        <span class="service-offers-count">${service.productCount} ${service.productCount === 1 ? 'plan' : 'plans'}</span>
                        ${savingsHtml}
                    </div>
                </div>
            </div>

            <div class="service-header-right">
                <div class="service-pricing-badge">
                    <span class="price-micro-label">From</span>
                    <span class="price-main-display">${formatPrice(service.minPrice)}</span>
                    ${bestBotsHtml}
                </div>
                <a href="${bestOfferUrl}" target="_blank" rel="noopener noreferrer" class="buy-btn" onclick="event.stopPropagation()">
                    Buy for ${formatPrice(service.minPrice)} &rarr;
                </a>
                <div class="tree-chevron">
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
            </div>
        </div>
    `;

    // Offers Body (ZERO Bot Names Displayed, Telegram Verified Links)
    const plansHtml = service.products.map(plan => createPlanOfferHtml(plan)).join('');

    card.innerHTML = `
        ${headerHtml}
        <div class="service-tree-body">
            ${plansHtml}
        </div>
    `;

    return card;
}

function getCheapestBots(plan) {
    const offers = (plan && plan.offers) || [];
    if (!offers.length) return [];
    const min = Number(offers[0].price);
    return [...new Set(offers.filter(o => Number(o.price) === min && o.bot).map(o => o.bot))];
}

function botChipHtml(bots) {
    if (!bots || !bots.length) return '';
    return `<span class="best-bot-chip"><i class="fa-brands fa-telegram"></i> ${bots.map(escapeHtml).join(' · ')}</span>`;
}

function createPlanOfferHtml(plan) {
    const sortedOffers = plan.offers;
    const cheapestOffer = sortedOffers[0];
    const cheapestBotsHtml = botChipHtml(getCheapestBots(plan));

    const offersHtml = sortedOffers.map((offer, idx) => {
        const isLowest = (idx === 0);
        const buyUrl = getPurchaseUrl(offer);
        const payments = Array.isArray(offer.payment_methods) ? offer.payment_methods : ['USDT'];

        return `
            <div class="offer-row${isLowest ? ' is-cheapest' : ''}">
                <div class="offer-left">
                    ${plan.duration ? `<span class="duration-pill">${escapeHtml(plan.duration)}</span>` : ''}
                    <div class="offer-details">
                        <div class="offer-title">${escapeHtml(plan.name)}</div>
                        <div class="offer-badges">
                            ${plan.variant && plan.variant !== 'Standard' ? `<span class="micro-badge">${escapeHtml(plan.variant)}</span>` : ''}
                            ${offer.warranty && offer.warranty !== 'none' ? `<span class="micro-badge"><i class="fa-solid fa-shield-halved"></i> ${escapeHtml(offer.warranty)}</span>` : ''}
                            ${payments.map(p => `<span class="payment-tag">${escapeHtml(p)}</span>`).join('')}
                            ${isLowest ? cheapestBotsHtml : ''}
                        </div>
                    </div>
                </div>

                <div class="offer-right">
                    <div class="offer-price">${formatPrice(offer.price)}</div>
                    <a href="${buyUrl}" target="_blank" rel="noopener noreferrer" class="buy-btn">
                        Buy Now &rarr;
                    </a>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="variant-group">
            <div class="variant-group-header">
                <i class="fa-solid fa-layer-group"></i> ${escapeHtml(plan.name)}
            </div>
            ${offersHtml}
        </div>
    `;
}

function toggleServiceTree(brand) {
    if (openServices.has(brand)) {
        openServices.delete(brand);
    } else {
        openServices.add(brand);
    }
    const card = document.querySelector(`.service-tree-card[data-service="${brand}"]`);
    if (card) {
        card.classList.toggle('is-expanded');
    }
}

function toggleAllTrees() {
    const btn = document.getElementById('toggleAllTreesBtn');
    const label = document.getElementById('toggleAllLabel');
    const icon = document.getElementById('toggleAllIcon');

    const cards = document.querySelectorAll('.service-tree-card');
    const allOpen = openServices.size >= cards.length && cards.length > 0;

    if (allOpen) {
        openServices.clear();
        cards.forEach(c => c.classList.remove('is-expanded'));
        if (label) label.textContent = 'Expand All';
        if (icon) icon.className = 'fa-solid fa-angles-down';
    } else {
        cards.forEach(c => {
            const b = c.getAttribute('data-service');
            if (b) openServices.add(b);
            c.classList.add('is-expanded');
        });
        if (label) label.textContent = 'Collapse All';
        if (icon) icon.className = 'fa-solid fa-angles-up';
    }
}

// ==============================================================================
// 8. Payment Filter Pills
// ==============================================================================
function renderPaymentFilterPills() {
    const container = document.getElementById('filter-payment');
    if (!container) return;

    container.innerHTML = filterPaymentOptions.map(p => {
        const isActive = filters.payment.toLowerCase() === p.toLowerCase();
        const label = p === 'all' ? 'All Methods' : p;
        return `
            <button type="button" class="pill${isActive ? ' active' : ''}" data-payment="${escapeHtml(p)}">
                ${getPaymentIcon(p)} ${escapeHtml(label)}
            </button>
        `;
    }).join('');

    container.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filters.payment = btn.getAttribute('data-payment') || 'all';
            updateURL();
            applyFilters();
        });
    });
}

function resetFilters() {
    filters.search = '';
    filters.payment = 'all';
    filters.sort = 'cheapest';

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    renderPaymentFilterPills();

    const priceSortPills = document.querySelectorAll('#filter-price-sort .pill');
    priceSortPills.forEach(p => {
        if (p.getAttribute('data-sort') === 'cheapest') p.classList.add('active');
        else p.classList.remove('active');
    });

    updateURL();
    applyFilters();
}

// ==============================================================================
// 9. Sources & Scraper Management (Guarded by WebLACASA Admin)
// ==============================================================================
function setupSourcesManager() {
    const openSourcesBtn = document.getElementById('openSourcesBtn');
    if (openSourcesBtn) {
        openSourcesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            guardAdminAction(() => openSourcesModalDirect());
        });
    }

    const syncNowBtn = document.getElementById('syncNowBtn');
    if (syncNowBtn) {
        syncNowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            guardAdminAction(() => triggerLiveSync());
        });
    }

    const closeBtn = document.getElementById('closeSourcesBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeSourcesModal);

    const closeFooterBtn = document.getElementById('closeModalFooterBtn');
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeSourcesModal);

    const syncAllBtn = document.getElementById('syncAllModalBtn');
    if (syncAllBtn) {
        syncAllBtn.addEventListener('click', () => {
            guardAdminAction(() => triggerLiveSync());
        });
    }

    // Modal Tabs switching
    const modalTabs = document.querySelectorAll('.modal-tab');
    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modalTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // Add Direct API Source
    const testApiBtn = document.getElementById('testApiBtn');
    if (testApiBtn) testApiBtn.addEventListener('click', testDirectApiSource);

    const saveApiBtn = document.getElementById('saveApiBtn');
    if (saveApiBtn) {
        saveApiBtn.addEventListener('click', () => {
            guardAdminAction(() => saveDirectApiSource());
        });
    }

    // Track Telegram Channel / Bot
    const discoverBtn = document.getElementById('discoverChatsBtn');
    if (discoverBtn) {
        discoverBtn.addEventListener('click', () => {
            guardAdminAction(() => discoverTelegramChats());
        });
    }

    const saveTgBtn = document.getElementById('saveTgSourceBtn');
    if (saveTgBtn) {
        saveTgBtn.addEventListener('click', () => {
            guardAdminAction(() => saveTelegramSource());
        });
    }

    const closeDiscoveredBtn = document.getElementById('closeDiscoveredBtn');
    if (closeDiscoveredBtn) {
        closeDiscoveredBtn.addEventListener('click', () => {
            const box = document.getElementById('discoveredChatsBox');
            if (box) box.classList.add('hidden');
        });
    }
}

function openSourcesModalDirect() {
    const modal = document.getElementById('sourcesModal');
    if (modal) modal.classList.remove('hidden');
    loadSources();
    loadTelegramStatus();
}

function closeSourcesModal() {
    const modal = document.getElementById('sourcesModal');
    if (modal) modal.classList.add('hidden');
}

async function loadSources() {
    try {
        const endpoint = getApiEndpoint('/api/sources');
        if (!endpoint) return;

        const res = await fetch(endpoint, {
            headers: { 'Accept': 'application/json', ...getAdminAuthHeader() }
        });
        if (!res.ok) return;

        const data = await res.json();
        sourcesState.sources = data.sources || [];

        renderConfiguredSources();
        updateSourcesBadge();

    } catch (e) {
        console.warn('Could not load sources:', e);
    }
}

function renderConfiguredSources() {
    const apiContainer = document.getElementById('apiSourcesContainer');
    const tgContainer = document.getElementById('tgSourcesContainer');

    const apiSources = sourcesState.sources.filter(s => s.type === 'direct_api');
    const tgSources = sourcesState.sources.filter(s => s.type !== 'direct_api');

    const apiCountEl = document.getElementById('apiSourcesCount');
    if (apiCountEl) apiCountEl.textContent = `${apiSources.length} configured`;

    const tgCountEl = document.getElementById('tgSourcesCount');
    if (tgCountEl) tgCountEl.textContent = `${tgSources.length} tracked`;

    if (apiContainer) {
        if (apiSources.length === 0) {
            apiContainer.innerHTML = '<div style="font-size:0.78rem; color:var(--text-secondary); padding: 8px;">No custom API sources added yet.</div>';
        } else {
            apiContainer.innerHTML = apiSources.map(s => createSourceItemCardHtml(s)).join('');
        }
    }

    if (tgContainer) {
        if (tgSources.length === 0) {
            tgContainer.innerHTML = '<div style="font-size:0.78rem; color:var(--text-secondary); padding: 8px;">No Telegram channels or bots tracked yet.</div>';
        } else {
            tgContainer.innerHTML = tgSources.map(s => createSourceItemCardHtml(s)).join('');
        }
    }
}

function createSourceItemCardHtml(source) {
    const isDirect = source.type === 'direct_api';
    const statusIcon = source.status === 'error'
        ? '<i class="fa-solid fa-circle-exclamation" style="color:var(--danger)"></i>'
        : '<i class="fa-solid fa-circle-check" style="color:var(--success)"></i>';

    return `
        <div class="source-item-card">
            <div class="source-item-info">
                <div class="source-item-name">
                    ${statusIcon} ${escapeHtml(source.name)}
                </div>
                <div class="source-item-endpoint">
                    ${escapeHtml(source.url || source.identifier || '')}
                </div>
            </div>
            <div class="source-item-actions">
                <button type="button" class="btn-xs" onclick="deleteSource('${source.id}')" title="Delete source">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `;
}

function updateSourcesBadge() {
    const badge = document.getElementById('sourcesCountBadge');
    if (badge) badge.textContent = sourcesState.sources.length;

    const directCount = document.getElementById('directApiCountBadge');
    if (directCount) {
        const count = sourcesState.sources.filter(s => s.type === 'direct_api').length;
        directCount.textContent = count;
    }
}

async function testDirectApiSource() {
    const urlInput = document.getElementById('apiSourceUrl');
    const keyInput = document.getElementById('apiSourceKey');
    const feedback = document.getElementById('apiTestFeedback');

    const url = (urlInput?.value || '').trim();
    const apiKey = (keyInput?.value || '').trim();

    if (!url) {
        showToast('Please enter an API URL', 'error');
        return;
    }

    if (feedback) {
        feedback.className = 'test-feedback';
        feedback.classList.remove('hidden');
        feedback.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Probing endpoint…';
    }

    try {
        if (serverNodeState.mode === 'cloud') {
            throw new Error('API testing requires local server mode. Run ./start.sh on PC.');
        }

        const endpoint = getApiEndpoint('/api/sources/test');
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
            body: JSON.stringify({ url, apiKey })
        });
        const result = await res.json();

        if (result.success) {
            feedback.className = 'test-feedback success';
            feedback.innerHTML = `✓ Connection OK! Found ${result.item_count || 0} products.`;
        } else {
            feedback.className = 'test-feedback error';
            feedback.innerHTML = `✗ ${escapeHtml(result.error || 'Connection failed')}`;
        }
    } catch (e) {
        if (feedback) {
            feedback.className = 'test-feedback error';
            feedback.innerHTML = `✗ ${escapeHtml(e.message)}`;
        }
    }
}

async function saveDirectApiSource() {
    const nameInput = document.getElementById('apiSourceName');
    const botInput = document.getElementById('apiBotHandle');
    const urlInput = document.getElementById('apiSourceUrl');
    const keyInput = document.getElementById('apiSourceKey');

    const name = (nameInput?.value || '').trim();
    const botUsername = (botInput?.value || '').trim();
    const url = (urlInput?.value || '').trim();
    const apiKey = (keyInput?.value || '').trim();

    if (!name || !url) {
        showToast('Source name and URL are required', 'error');
        return;
    }

    try {
        if (serverNodeState.mode === 'cloud') {
            throw new Error('Adding live sources requires running ./start.sh on PC.');
        }

        const endpoint = getApiEndpoint('/api/sources');
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
            body: JSON.stringify({
                type: 'direct_api',
                name,
                url,
                botUsername,
                apiKey
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to save source');
        }

        showToast(`✓ Added ${name}!`, 'success');
        if (nameInput) nameInput.value = '';
        if (botInput) botInput.value = '';
        if (urlInput) urlInput.value = '';
        if (keyInput) keyInput.value = '';

        await loadSources();

    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function saveTelegramSource() {
    const nameInput = document.getElementById('tgSourceName');
    const handleInput = document.getElementById('tgSourceHandle');
    const typeSelect = document.getElementById('tgSourceType');

    const name = (nameInput?.value || '').trim();
    const identifier = (handleInput?.value || '').trim();
    const type = typeSelect?.value || 'telegram_channel';

    if (!name || !identifier) {
        showToast('Source name and channel handle are required', 'error');
        return;
    }

    try {
        if (serverNodeState.mode === 'cloud') {
            throw new Error('Telegram scraping requires running ./start.sh on PC.');
        }

        const endpoint = getApiEndpoint('/api/sources');
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
            body: JSON.stringify({
                type,
                name,
                identifier,
                url: identifier.startsWith('http') ? identifier : `https://t.me/${identifier.replace('@', '')}`
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to save Telegram source');
        }

        showToast(`✓ Tracking ${name}!`, 'success');
        if (nameInput) nameInput.value = '';
        if (handleInput) handleInput.value = '';

        await loadSources();

    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function deleteSource(sourceId) {
    guardAdminAction(async () => {
        try {
            if (serverNodeState.mode === 'cloud') {
                showToast('Modifications require local silent server', 'error');
                return;
            }
            const endpoint = getApiEndpoint(`/api/sources/${sourceId}`);
            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: getAdminAuthHeader()
            });
            if (res.ok) {
                showToast('Source deleted', 'info');
                await loadSources();
            }
        } catch (e) {
            showToast(`Delete failed: ${e.message}`, 'error');
        }
    });
}

// Telegram Account Status
async function loadTelegramStatus() {
    const card = document.getElementById('tgAccountCard');
    if (!card) return;

    if (serverNodeState.mode === 'cloud') {
        card.innerHTML = `
            <div style="font-size:0.78rem; color:var(--text-secondary);">
                <i class="fa-brands fa-telegram"></i> Telegram account connection available via silent local PC runner (<code>./start.sh</code>).
            </div>
        `;
        return;
    }

    try {
        const endpoint = getApiEndpoint('/api/telegram/status');
        if (!endpoint) return;

        const res = await fetch(endpoint, { headers: getAdminAuthHeader() });
        if (!res.ok) return;

        const status = await res.json();
        sourcesState.tgStatus = status;

        if (status.authorized) {
            const userName = status.user?.first_name || 'Telegram User';
            const userHandle = status.user?.username ? ` (${status.user.username})` : '';
            const userPhone = status.user?.phone ? ` &bull; ${status.user.phone}` : '';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="status-chip chip-success"><i class="fa-solid fa-circle-check"></i> Connected</span>
                        <strong class="mono" style="font-size:0.85rem;">${escapeHtml(userName)}${escapeHtml(userHandle)} <span style="font-weight:normal; color:var(--text-secondary);">${userPhone}</span></strong>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="logoutTelegram()">
                        <i class="fa-solid fa-right-from-bracket"></i> Disconnect
                    </button>
                </div>
            `;
        } else {
            const isConfigured = Boolean(status.configured);
            const savedPhone = status.phone || '';
            card.innerHTML = `
                <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.45;">
                    <p style="margin-bottom:12px; color:var(--text-primary);">
                        Connect your Telegram account to scrape seller bots and discover channels directly from your active chats.
                    </p>
                    
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; ${isConfigured ? 'display:none;' : ''}" id="tgApiCredentialsBox">
                        <div class="form-group">
                            <label for="tgApiIdInput">Telegram API ID <a href="https://my.telegram.org" target="_blank" rel="noopener" style="font-size:11px; text-decoration:underline; color:var(--text-primary); margin-left:4px;">(my.telegram.org)</a></label>
                            <input type="text" id="tgApiIdInput" class="glass-input mono" placeholder="e.g. 21987654">
                        </div>
                        <div class="form-group">
                            <label for="tgApiHashInput">Telegram API Hash</label>
                            <input type="text" id="tgApiHashInput" class="glass-input mono" placeholder="e.g. a1b2c3d4e5f60718293a4b5c6d7e8f90">
                        </div>
                    </div>

                    ${isConfigured ? `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:6px 10px; background:rgba(34,197,94,0.06); border:1px solid rgba(34,197,94,0.2); border-radius:6px;">
                            <span style="color:var(--success); font-size:11px; font-weight:600;"><i class="fa-solid fa-circle-check"></i> Telegram API Credentials configured</span>
                            <button type="button" onclick="document.getElementById('tgApiCredentialsBox').style.display = 'grid'; this.parentElement.style.display = 'none';" style="text-decoration:underline; background:none; border:none; cursor:pointer; font-size:11px; color:var(--text-secondary);">Modifier API ID / Hash</button>
                        </div>
                    ` : ''}

                    <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap;">
                        <div class="form-group" style="flex:1; min-width:200px;">
                            <label for="tgPhoneInput">Telegram Phone Number (international)</label>
                            <input type="tel" id="tgPhoneInput" class="glass-input mono" placeholder="+33612345678" value="${escapeHtml(savedPhone)}">
                        </div>
                        <button type="button" class="btn btn-primary btn-sm" id="sendTgCodeBtn" onclick="sendTelegramAuthCode()" style="height:38px; margin-bottom:1px; white-space:nowrap;">
                            <i class="fa-solid fa-paper-plane"></i> Send Login Code
                        </button>
                    </div>
                    <div id="tgAuthFeedback" style="margin-top:10px; font-size:0.75rem;"></div>
                </div>
            `;
        }

    } catch (_) {}
}

async function sendTelegramAuthCode() {
    guardAdminAction(async () => {
        const phoneInput = document.getElementById('tgPhoneInput');
        const apiIdInput = document.getElementById('tgApiIdInput');
        const apiHashInput = document.getElementById('tgApiHashInput');
        const feedback = document.getElementById('tgAuthFeedback');
        const sendBtn = document.getElementById('sendTgCodeBtn');

        const phone = (phoneInput?.value || '').trim();
        const api_id = (apiIdInput?.value || '').trim();
        const api_hash = (apiHashInput?.value || '').trim();

        if (!phone) {
            showToast('Please enter your phone number', 'error');
            return;
        }

        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending…';
        }
        if (feedback) {
            feedback.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Requesting Telegram verification code…';
            feedback.style.color = 'var(--text-primary)';
        }

        try {
            const endpoint = getApiEndpoint('/api/telegram/send-code');
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
                body: JSON.stringify({ phone, api_id, api_hash })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Code sent to Telegram app!', 'success');
                renderTgCodeVerificationForm(phone);
            } else {
                throw new Error(data.error || 'Failed to send code');
            }
        } catch (e) {
            if (feedback) feedback.innerHTML = `<span style="color:var(--danger)">✗ ${escapeHtml(e.message)}</span>`;
            showToast(e.message, 'error');
        } finally {
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Login Code';
            }
        }
    });
}

function renderTgCodeVerificationForm(phone) {
    const card = document.getElementById('tgAccountCard');
    if (!card) return;
    card.innerHTML = `
        <div style="font-size:0.8rem; line-height:1.45;">
            <p style="color:var(--text-primary); margin-bottom:10px;">
                <i class="fa-solid fa-shield-halved" style="color:var(--success)"></i> A verification code was sent to your Telegram app for <strong>${escapeHtml(phone)}</strong>:
            </p>
            <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                <input type="text" id="tgCodeInput" class="glass-input mono" placeholder="Telegram Code (ex: 12345)" style="max-width:200px;" autofocus autocomplete="one-time-code">
                <input type="password" id="tg2faInput" class="glass-input" placeholder="2FA Password (if enabled)" style="max-width:200px;">
                <button type="button" class="btn btn-primary btn-sm" id="verifyTgBtn" onclick="verifyTelegramAuthCode()" style="height:38px;">
                    <i class="fa-solid fa-check"></i> Verify & Link
                </button>
            </div>
            <div id="tgVerifyFeedback" style="margin-top:10px; font-size:0.75rem;"></div>
        </div>
    `;
    setTimeout(() => {
        const inp = document.getElementById('tgCodeInput');
        if (inp) inp.focus();
    }, 100);
}

async function verifyTelegramAuthCode() {
    const codeInput = document.getElementById('tgCodeInput');
    const pwInput = document.getElementById('tg2faInput');
    const feedback = document.getElementById('tgVerifyFeedback');
    const verifyBtn = document.getElementById('verifyTgBtn');

    const code = (codeInput?.value || '').trim();
    const password = (pwInput?.value || '').trim();

    if (!code) {
        showToast('Please enter verification code', 'error');
        return;
    }

    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying…';
    }
    if (feedback) {
        feedback.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Authenticating with Telegram…';
        feedback.style.color = 'var(--text-primary)';
    }

    try {
        const endpoint = getApiEndpoint('/api/telegram/verify-code');
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
            body: JSON.stringify({ code, password })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('✓ Telegram connected successfully!', 'success');
            await loadTelegramStatus();
        } else {
            throw new Error(data.error || 'Verification failed');
        }
    } catch (e) {
        if (feedback) feedback.innerHTML = `<span style="color:var(--danger)">✗ ${escapeHtml(e.message)}</span>`;
        showToast(e.message, 'error');
    } finally {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Verify & Link';
        }
    }
}

async function logoutTelegram() {
    guardAdminAction(async () => {
        try {
            const endpoint = getApiEndpoint('/api/telegram/logout');
            await fetch(endpoint, { method: 'POST', headers: getAdminAuthHeader() });
            showToast('Telegram disconnected', 'info');
            loadTelegramStatus();
        } catch (_) {}
    });
}

async function discoverTelegramChats() {
    const btn = document.getElementById('discoverChatsBtn');
    const box = document.getElementById('discoveredChatsBox');
    const list = document.getElementById('discoveredList');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Reading chats…';
    }

    try {
        const endpoint = getApiEndpoint('/api/telegram/dialogs');
        const res = await fetch(endpoint, { headers: getAdminAuthHeader() });
        if (!res.ok) throw new Error('Connect Telegram account first.');

        const data = await res.json();
        const dialogs = data.dialogs || [];

        if (dialogs.length === 0) {
            showToast('No channel or bot dialogs found', 'info');
            return;
        }

        if (box && list) {
            box.classList.remove('hidden');
            list.innerHTML = dialogs.map(d => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--divider);">
                    <div>
                        <strong>${escapeHtml(d.title)}</strong>
                        <span class="mono-subtext">${escapeHtml(d.username ? '@' + d.username : '')}</span>
                    </div>
                    <button type="button" class="btn-xs" onclick="trackDiscoveredChat('${escapeHtml(d.title)}', '${escapeHtml(d.username || '')}', '${d.type}')">
                        Track
                    </button>
                </div>
            `).join('');
        }
        showToast(`Discovered ${dialogs.length} chats!`, 'success');

    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-compass"></i> Discover from My Chats';
        }
    }
}

function trackDiscoveredChat(title, handle, type) {
    const nameInput = document.getElementById('tgSourceName');
    const handleInput = document.getElementById('tgSourceHandle');
    const typeSelect = document.getElementById('tgSourceType');

    if (nameInput) nameInput.value = title;
    if (handleInput) handleInput.value = handle.startsWith('@') ? handle : `@${handle}`;
    if (typeSelect) typeSelect.value = type === 'bot' ? 'telegram_bot' : 'telegram_channel';

    saveTelegramSource();
}

// Live Sync
async function triggerLiveSync() {
    if (sourcesState.isSyncing) return;

    if (serverNodeState.mode === 'cloud') {
        showToast('Live bot scraping requires local silent server (./start.sh on PC)', 'info');
        openServerNodeModal();
        return;
    }

    sourcesState.isSyncing = true;
    const syncSpin = document.getElementById('syncSpinIcon');
    if (syncSpin) syncSpin.classList.add('fa-spin');

    showToast('Syncing all sources live…', 'info', 3000);

    try {
        const endpoint = getApiEndpoint('/api/sync');
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: getAdminAuthHeader()
        });
        const result = await res.json();

        if (result && result.success) {
            showToast(`✓ Sync complete: ${result.total_products || 0} products from ${result.sources_synced || 0} sources!`, 'success');
            await fetchData();
            await loadSources();
        } else {
            showToast(`Sync update: ${result?.message || 'Error syncing'}`, 'error');
        }
    } catch (e) {
        showToast(`Sync failed: ${e.message}`, 'error');
    } finally {
        sourcesState.isSyncing = false;
        if (syncSpin) syncSpin.classList.remove('fa-spin');
    }
}

// ==============================================================================
// 10. Event Listeners & Mobile Navigation
// ==============================================================================
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            filters.search = e.target.value.trim().toLowerCase();
            if (clearSearchBtn) {
                if (filters.search) clearSearchBtn.classList.remove('hidden');
                else clearSearchBtn.classList.add('hidden');
            }
            updateURL();
            applyFilters();
        }, 180));
    }

    if (clearSearchBtn && searchInput) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            filters.search = '';
            clearSearchBtn.classList.add('hidden');
            updateURL();
            applyFilters();
        });
    }

    // Pricing Sort Buttons (Cheapest First ONLY)
    const priceSortPills = document.querySelectorAll('#filter-price-sort .pill');
    priceSortPills.forEach(pill => {
        pill.addEventListener('click', () => {
            priceSortPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            filters.sort = pill.getAttribute('data-sort') || 'cheapest';
            updateURL();
            applyFilters();
        });
    });

    // Expand / Collapse all trees
    const toggleAllBtn = document.getElementById('toggleAllTreesBtn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', toggleAllTrees);
    }

    // Mobile Bottom Navigation Bar
    const navDeals = document.getElementById('mobileNavDealsBtn');
    const navFilter = document.getElementById('mobileNavFilterBtn');
    const navLock = document.getElementById('mobileNavLockBtn');
    const navTheme = document.getElementById('mobileNavThemeBtn');

    if (navDeals) {
        navDeals.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (navFilter) {
        navFilter.addEventListener('click', () => {
            const panel = document.getElementById('filtersPanel');
            if (panel) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    const navSources = document.getElementById('mobileNavSourcesBtn');
    if (navSources) {
        navSources.addEventListener('click', () => {
            guardAdminAction(() => openSourcesModalDirect());
        });
    }

    if (navLock) {
        navLock.addEventListener('click', () => {
            lockTerminal();
        });
    }

    if (navTheme) {
        navTheme.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('telecompare_theme', next);
            updateThemeIcon(next);
        });
    }
}

function updateStats(clusteredServices) {
    let totalPlans = 0;
    let avgSavingsSum = 0;
    let savingsCount = 0;

    clusteredServices.forEach(s => {
        totalPlans += s.productCount;
        if (s.maxSavings > 0) {
            avgSavingsSum += s.maxSavings;
            savingsCount++;
        }
    });

    const elServices = document.getElementById('stat-services');
    if (elServices) elServices.textContent = clusteredServices.length;

    const elProducts = document.getElementById('stat-products');
    if (elProducts) elProducts.textContent = totalPlans;

    const elSavings = document.getElementById('stat-savings');
    if (elSavings) {
        const avg = savingsCount > 0 ? Math.round(avgSavingsSum / savingsCount) : 0;
        elSavings.textContent = `${avg}%`;
    }
}

// ==============================================================================
// 11. Helpers & Formatting
// ==============================================================================
function formatPrice(val) {
    const num = Number(val) || 0;
    return `$${num.toFixed(2)}`;
}

function getPurchaseUrl(offer) {
    if (!offer) return '#';

    // 1. Direct explicit URL on offer
    const directUrl = offer.url || offer.buy_url || offer.telegram_url || offer.link;
    if (directUrl && typeof directUrl === 'string') {
        const clean = directUrl.trim();
        if (clean && clean !== 'https://t.me/' && clean !== 'https://t.me' && clean !== '#') {
            return clean;
        }
    }

    // 2. Lookup in bots dictionary
    const botTag = offer.bot || offer.bot_id || offer.source || offer.bot_username;
    if (botTag && typeof botTag === 'string') {
        const cleanTag = botTag.trim();
        if (bots && bots[cleanTag]?.url) return bots[cleanTag].url;
        const withAt = cleanTag.startsWith('@') ? cleanTag : `@${cleanTag}`;
        if (bots && bots[withAt]?.url) return bots[withAt].url;
        const withoutAt = cleanTag.replace(/^@/, '');
        if (bots && bots[withoutAt]?.url) return bots[withoutAt].url;

        // If it's already an HTTP URL
        if (cleanTag.startsWith('http://') || cleanTag.startsWith('https://')) {
            return cleanTag;
        }

        // Build valid t.me link from Telegram handle
        if (withoutAt && /^[a-zA-Z0-9_]{3,}$/.test(withoutAt)) {
            return `https://t.me/${withoutAt}`;
        }
    }

    // 3. Fallback: check sourcesState
    if (sourcesState && Array.isArray(sourcesState.sources)) {
        const match = sourcesState.sources.find(s =>
            (s.botUsername && s.botUsername === botTag) ||
            (s.name && s.name === botTag) ||
            (s.identifier && s.identifier === botTag)
        );
        if (match?.botUrl) return match.botUrl;
        if (match?.botUsername) return `https://t.me/${match.botUsername.replace(/^@/, '')}`;
    }

    return '#';
}

function getServiceAvatarIcon(brand) {
    const b = (brand || '').toLowerCase();
    if (b.includes('chatgpt') || b.includes('gpt')) return '<i class="fa-solid fa-brain"></i>';
    if (b.includes('capcut')) return '<i class="fa-solid fa-scissors"></i>';
    if (b.includes('canva')) return '<i class="fa-solid fa-palette"></i>';
    if (b.includes('netflix') || b.includes('stream')) return '<i class="fa-solid fa-film"></i>';
    if (b.includes('spotify') || b.includes('music')) return '<i class="fa-solid fa-music"></i>';
    if (b.includes('youtube')) return '<i class="fa-brands fa-youtube"></i>';
    if (b.includes('adobe')) return '<i class="fa-solid fa-bezier-curve"></i>';
    if (b.includes('vpn') || b.includes('nord') || b.includes('surfshark')) return '<i class="fa-solid fa-shield-halved"></i>';
    if (b.includes('office') || b.includes('microsoft')) return '<i class="fa-brands fa-microsoft"></i>';
    if (b.includes('apple')) return '<i class="fa-brands fa-apple"></i>';
    if (b.includes('claude') || b.includes('gemini') || b.includes('grok')) return '<i class="fa-solid fa-microchip"></i>';
    return '<i class="fa-solid fa-cube"></i>';
}

function getPaymentIcon(pm) {
    const p = (pm || '').toLowerCase();
    if (p.includes('usdt') || p.includes('crypto')) return '<i class="fa-brands fa-bitcoin"></i>';
    if (p.includes('visa') || p.includes('mastercard')) return '<i class="fa-regular fa-credit-card"></i>';
    if (p.includes('paypal')) return '<i class="fa-brands fa-paypal"></i>';
    if (p.includes('baridi') || p.includes('ccp')) return '<i class="fa-solid fa-building-columns"></i>';
    if (p.includes('paysera')) return '<i class="fa-solid fa-wallet"></i>';
    return '<i class="fa-solid fa-money-bill"></i>';
}

function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div style="flex:1;">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px) scale(0.96)';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function updateURL() {
    const url = new URL(window.location);
    if (filters.search) url.searchParams.set('search', filters.search);
    else url.searchParams.delete('search');

    if (filters.payment && filters.payment !== 'all') url.searchParams.set('payment', filters.payment);
    else url.searchParams.delete('payment');

    if (filters.sort && filters.sort !== 'cheapest') url.searchParams.set('sort', filters.sort);
    else url.searchParams.delete('sort');

    window.history.replaceState({}, '', url);
}

function loadFromURL() {
    const url = new URL(window.location);
    const s = url.searchParams.get('search');
    const p = url.searchParams.get('payment');
    const sort = url.searchParams.get('sort');

    if (s) {
        filters.search = s.trim().toLowerCase();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = s;
    }
    if (p) filters.payment = p;
    if (sort) filters.sort = sort;
}
