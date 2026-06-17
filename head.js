// TREEBALANCE LOCAL AUTHENTICATION
// ==========================================

const BADGE_CATALOG = [
    { id: 'bronze_leaf', name: 'Bronze Leaf', cost: 10, icon: '🥉' },
    { id: 'silver_seed', name: 'Silver Seed', cost: 25, icon: '🥈' },
    { id: 'gold_tree', name: 'Gold Tree', cost: 50, icon: '🥇' },
    { id: 'plat_earth', name: 'Platinum Earth', cost: 100, icon: '💎' },
    { id: 'vegan_star', name: 'Vegan Star', cost: 20, icon: '⭐', requirement: { habit: 'Plant-based meal', count: 5 } },
    { id: 'bike_champ', name: 'Bike Champion', cost: 20, icon: '🚲', requirement: { habit: 'Biked to work', count: 3 } },
    { id: 'energy_saver', name: 'Energy Saver', cost: 10, icon: '⚡', requirement: { habit: 'Unplugged devices', count: 5 } },
    { id: 'water_guardian', name: 'Water Guardian', cost: 15, icon: '💧', requirement: { habit: 'Shorter shower', count: 3 } },
    { id: 'zero_waste', name: 'Zero Waste Hero', cost: 20, icon: '♻️', requirement: { habit: 'Refused plastic', count: 5 } },
    { id: 'solar_pioneer', name: 'Solar Pioneer', cost: 50, icon: '☀️' },
    { id: 'eco_warrior', name: 'Eco Warrior', cost: 75, icon: '🌱' },
    { id: 'climate_guardian', name: 'Climate Guardian', cost: 150, icon: '🌍' }
];

const state = {
    user: null, // Firebase user object
    currentPage: 'login', // Default to login until auth state resolves

    calculatorInput: {
        miles: '',
        meatMeals: '',
        electricity: ''
    },
    village: {
        leaves: 0
    },
    unlockedBadges: [],
    habits: [],
    habitCounts: {},
    liveInterval: null,
    carouselInterval: null,
    theme: localStorage.getItem('theme') || 'light'
};

// ==========================================
// EPIC UX UPDATE LOGIC
// ==========================================

function initTheme() {
    if (state.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function toggleDarkMode() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', state.theme);
    initTheme();
    // Update the checkbox if we are on the settings page or header
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.checked = (state.theme === 'dark');
    const headerToggle = document.getElementById('theme-toggle-header');
    if (headerToggle) headerToggle.checked = (state.theme === 'dark');
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#2d6a4f', '#52b788', '#d8f3dc', '#fef08a']
        });
    }
}

function renderLevelProgressBar() {
    let barContainer = document.getElementById('level-progress-container');
    if (!barContainer) {
        barContainer = document.createElement('div');
        barContainer.id = 'level-progress-container';
        barContainer.style.position = 'fixed';
        barContainer.style.top = '0';
        barContainer.style.left = '0';
        barContainer.style.width = '100%';
        barContainer.style.height = '6px';
        barContainer.style.backgroundColor = 'rgba(0,0,0,0.1)';
        barContainer.style.zIndex = '9999';
        
        const barFill = document.createElement('div');
        barFill.id = 'level-progress-fill';
        barFill.style.height = '100%';
        barFill.style.width = '0%';
        barFill.style.backgroundColor = 'var(--leaf)';
        barFill.style.transition = 'width 1s cubic-bezier(0.4, 0, 0.2, 1)';
        barFill.style.boxShadow = '0 0 10px var(--leaf)';
        
        barContainer.appendChild(barFill);
        document.body.appendChild(barContainer);
    }
    
    updateLevelProgressBar();
}

function updateLevelProgressBar() {
    const barFill = document.getElementById('level-progress-fill');
    if (barFill) {
        // Simple formula: every 100 leaves is a level. Max visual level cap 10 (1000 leaves)
        const currentLeaves = state.village.leaves;
        const leavesInCurrentLevel = currentLeaves % 100;
        const progressPercent = Math.min((leavesInCurrentLevel / 100) * 100, 100);
        barFill.style.width = `${progressPercent}%`;
    }
}

// Call these immediately
initTheme();
renderLevelProgressBar();

// Security: Basic checksum to prevent casual tampering
function generateChecksum(dataString) {
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
}

// Security: HTML escape to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// LocalStorage Persistence
function saveState() {
    // Only save persistent data, not intervals
    const dataToSave = {
        village: state.village,
        calculatorInput: state.calculatorInput,
        unlockedBadges: state.unlockedBadges,
        habits: state.habits,
        habitCounts: state.habitCounts
    };
    const jsonString = JSON.stringify(dataToSave);
    const checksum = generateChecksum(jsonString);
    localStorage.setItem('treeBalanceState', JSON.stringify({ data: jsonString, checksum }));
}

function loadState() {
    const saved = localStorage.getItem('treeBalanceState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            
            // Validate Checksum (Anti-tampering)
            if (parsed.data && parsed.checksum) {
                const currentChecksum = generateChecksum(parsed.data);
                if (currentChecksum !== parsed.checksum) {
                    console.error("Security Warning: State tampering detected. Resetting to default state.");
                    localStorage.removeItem('treeBalanceState');
                    return;
                }
                
                const realData = JSON.parse(parsed.data);
                if (realData.village && typeof realData.village.leaves === 'number') state.village = realData.village;
                if (realData.calculatorInput) state.calculatorInput = realData.calculatorInput;
                if (Array.isArray(realData.unlockedBadges)) state.unlockedBadges = realData.unlockedBadges;
                if (Array.isArray(realData.habits)) state.habits = realData.habits;
                if (realData.habitCounts) state.habitCounts = realData.habitCounts;
            } else {
                // Support legacy state without checksum during transition
                if (parsed.village) state.village = parsed.village;
                if (parsed.calculatorInput) state.calculatorInput = parsed.calculatorInput;
                if (parsed.unlockedBadges) state.unlockedBadges = parsed.unlockedBadges;
                if (parsed.habits) state.habits = parsed.habits;
                if (parsed.habitCounts) state.habitCounts = parsed.habitCounts;
                // Save it back with checksum
                saveState();
            }
        } catch (e) {
            console.error("Failed to load saved state", e);
            localStorage.removeItem('treeBalanceState');
        }
    }
}

const sessionStartTime = Date.now();
const CO2_RATE_PER_MS = 1.337; // 1337 tonnes per second

const DYK_FACTS = [
    "If everyone skipped meat one day a week, it would save ≈ 1.5 billion tonnes of CO₂ a year.",
    "Biking just 2 miles to work instead of driving saves 1.5kg of CO₂ per trip.",
    "Unplugging unused electronics can save you up to 10% on your energy bill and reduce phantom load emissions.",
    "A single mature tree can absorb roughly 22kg of carbon dioxide per year.",
    "Air-drying your clothes instead of using a machine can shrink your household footprint by 2.4 million tonnes globally."
];
let currentFactIndex = 0;

// Initialize Lucide icons
function updateIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Navigation logic
function navigate(page) {
    // Auth Guard
    if (!state.user && page !== 'login' && page !== 'signup') {
        page = 'login';
    }
    
    loadState(); // Ensure state is loaded
    state.currentPage = page;
    
    // Update active nav link & visibility
    const navLinksContainer = document.querySelector('.nav-links');
    if (page === 'login' || page === 'signup') {
        navLinksContainer.style.display = 'none';
    } else {
        navLinksContainer.style.display = 'flex';
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeNav = document.getElementById('nav-' + page);
        if (activeNav) activeNav.classList.add('active');
    }

    // Clear any running intervals
    if (state.liveInterval) clearInterval(state.liveInterval);
    if (state.carouselInterval) clearInterval(state.carouselInterval);

    // Render page content
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = ''; // clear current
    
    // Add fade animation class
    mainContent.className = 'fade-enter';
    // Remove class after animation ends so it can be re-triggered
    setTimeout(() => {
        mainContent.classList.remove('fade-enter');
    }, 400);

    if (page === 'login') {
        renderLogin(mainContent);
    } else if (page === 'signup') {
        renderSignup(mainContent);
    } else if (page === 'home') {
        renderHome(mainContent);
        initLiveWidgets();
        updateLevelProgressBar();
    } else if (page === 'calculator') {
        renderCalculator(mainContent);
    } else if (page === 'tracker') {
        renderTracker(mainContent);
    } else if (page === 'ai') {
        renderAi(mainContent);
    } else if (page === 'settings') {
        renderSettings(mainContent);
    }
    
    updateIcons();
}

// ==========================================
// AUTHENTICATION RENDERING & LOGIC
// ==========================================

function renderLogin(container) {
    container.innerHTML = `
        <div class="auth-container fade-in-up">
            <div class="auth-card">
                <i data-lucide="leaf" class="brand-icon" style="width: 48px; height: 48px; color: var(--forest); margin: 0 auto 16px;"></i>
                <h2 style="font-size: 2rem; color: var(--deep); text-align: center; margin-bottom: 8px;">Welcome Back</h2>
                <p style="text-align: center; color: var(--text-secondary); margin-bottom: 32px;">Continue your green journey.</p>
                
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <input type="email" id="login-email" class="styled-input" placeholder="Email address" required>
                    <input type="password" id="login-password" class="styled-input" placeholder="Password" required>
                    <button class="button primary" data-action="auth-email-login" style="width: 100%; justify-content: center;">Sign In</button>
                </div>
                
                <p style="text-align: center; margin-top: 16px; font-size: 0.9rem; color: var(--text-secondary);">
                    Don't have an account? <span data-action="navigate" data-target="signup" style="color: var(--forest); cursor: pointer; font-weight: 600;">Sign up</span>
                </p>
                <div id="auth-error" style="color: #ef4444; text-align: center; margin-top: 16px; font-size: 0.9rem;"></div>
            </div>
        </div>
    `;
}

function renderSignup(container) {
    container.innerHTML = `
        <div class="auth-container fade-in-up">
            <div class="auth-card">
                <i data-lucide="sprout" class="brand-icon" style="width: 48px; height: 48px; color: var(--forest); margin: 0 auto 16px;"></i>
                <h2 style="font-size: 2rem; color: var(--deep); text-align: center; margin-bottom: 8px;">Join TreeBalance</h2>
                <p style="text-align: center; color: var(--text-secondary); margin-bottom: 32px;">Start tracking your footprint today.</p>
                
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="display: flex; gap: 16px;">
                        <input type="text" id="signup-firstname" class="styled-input" placeholder="First Name" style="flex: 1;" required>
                        <input type="text" id="signup-lastname" class="styled-input" placeholder="Last Name" style="flex: 1;" required>
                    </div>
                    <select id="signup-gender" class="styled-input" required style="appearance: auto;">
                        <option value="" disabled selected>Select Gender</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                    </select>
                    <input type="email" id="signup-email" class="styled-input" placeholder="Email address" required>
                    <input type="password" id="signup-password" class="styled-input" placeholder="Create Password" required>
                    <input type="password" id="signup-confirm-password" class="styled-input" placeholder="Confirm Password" required>
                    <button class="button primary" data-action="auth-email-signup" style="width: 100%; justify-content: center;">Sign Up</button>
                </div>
                
                <p style="text-align: center; margin-top: 16px; font-size: 0.9rem; color: var(--text-secondary);">
                    Already have an account? <span data-action="navigate" data-target="login" style="color: var(--forest); cursor: pointer; font-weight: 600;">Log in</span>
                </p>
                <div id="signup-error" style="color: #ef4444; text-align: center; margin-top: 16px; font-size: 0.9rem;"></div>
            </div>
        </div>
    `;
}

// Local Authentication System (Mock Backend)
function getLocalUsers() {
    return JSON.parse(localStorage.getItem('treebalance_users') || '{}');
}

function saveLocalUsers(users) {
    localStorage.setItem('treebalance_users', JSON.stringify(users));
}

function setSession(user) {
    localStorage.setItem('treebalance_session', JSON.stringify(user));
    state.user = user;
    navigate('home');
}

async function handleEmailLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('auth-error');
    
    if (!email || !pass) {
        errorDiv.textContent = "Please fill in all fields.";
        return;
    }

    const users = getLocalUsers();
    if (users[email] && users[email].password === pass) {
        // Remove password before saving to session state
        const sessionUser = { ...users[email] };
        delete sessionUser.password;
        setSession(sessionUser);
    } else {
        errorDiv.textContent = "Invalid email or password.";
    }
}

async function handleEmailSignup() {
    const firstName = document.getElementById('signup-firstname').value.trim();
    const lastName = document.getElementById('signup-lastname').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const pass = document.getElementById('signup-password').value;
    const confirmPass = document.getElementById('signup-confirm-password').value;
    const genderSelect = document.getElementById('signup-gender');
    const gender = genderSelect ? genderSelect.value : 'female';
    const errorDiv = document.getElementById('signup-error');

    if (!firstName || !lastName || !email || !pass || !confirmPass) {
        errorDiv.textContent = "Please fill in all fields.";
        return;
    }

    if (!gender) {
        errorDiv.textContent = "Please select a gender.";
        return;
    }

    if (pass !== confirmPass) {
        errorDiv.textContent = "Passwords do not match!";
        return;
    }

    if (pass.length < 6) {
        errorDiv.textContent = "Password must be at least 6 characters.";
        return;
    }

    const users = getLocalUsers();
    if (users[email]) {
        errorDiv.textContent = "An account with this email already exists.";
        return;
    }

    users[email] = {
        email: email,
        password: pass, // Storing in plain text locally for mockup purposes
        displayName: `${firstName} ${lastName}`,
        gender: gender
    };
    saveLocalUsers(users);

    // Auto login
    const sessionUser = { ...users[email] };
    delete sessionUser.password;
    setSession(sessionUser);
    
    // Clear state
    state.user = { email: email, displayName: `${firstName} ${lastName}`, gender: gender };
    state.habits = [];
    state.habitCounts = {};
    state.unlockedBadges = [];
    state.totalCO2Saved = 0;
    state.leavesBalance = 0;
    saveState();

    navigate('home');
}

async function handleLogout() {
    localStorage.removeItem('treebalance_session');
    state.user = null;
    navigate('login');
}

// ==========================================
// SETTINGS RENDERING
// ==========================================

function renderSettings(container) {
    const displayName = state.user?.displayName || 'Eco Explorer';
    const email = state.user?.email || 'Not provided';
    const gender = state.user?.gender || 'female';
    const avatarSrc = gender === 'female' ? 'avatar_female.png' : 'avatar_male.png';

    container.innerHTML = `
        <div class="home-container">
            <header class="dashboard-header fade-in-up">
                <div>
                    <h2>Settings & Profile</h2>
                    <p>Manage your account and app preferences</p>
                </div>
            </header>

            <div class="dashboard-grid" style="grid-template-columns: 1fr; max-width: 600px; margin: 0 auto;">
                
                <div class="card fade-in-up" style="animation-delay: 0.1s; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 32px 24px;">
                    <div style="width: 220px; height: 350px; background: #f0f9ff; border-radius: 20px; overflow: hidden; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.15); margin-bottom: 24px; border: 4px solid var(--surface);">
                        <h3 style="position: absolute; top: 24px; left: 0; right: 0; text-align: center; color: #1e293b; font-size: 1.4rem; font-weight: 800; letter-spacing: 1px; margin: 0; z-index: 2;">TREEBALANCE</h3>
                        <img src="${avatarSrc}" alt="Profile Avatar" style="width: 100%; height: 100%; object-fit: cover; position: absolute; bottom: 0; left: 0; z-index: 1;">
                    </div>
                    <h3 style="font-size: 1.5rem; margin: 0 0 8px 0; color: var(--text-primary);">${displayName}</h3>
                    <p style="color: var(--text-secondary); margin: 0; max-width: 400px; font-size: 0.95rem; line-height: 1.5;">${email}</p>
                </div>

                <div class="card fade-in-up" style="animation-delay: 0.2s">
                    <h3 style="display: flex; align-items: center; gap: 8px; margin-top: 0;">
                        <i data-lucide="settings" style="color: var(--forest);"></i> App Preferences
                    </h3>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--border-glass);">
                        <div>
                            <p style="margin: 0; font-weight: 500; color: var(--deep);">Push Notifications</p>
                            <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-secondary);">Daily reminders to log your habits</p>
                        </div>
                        <label style="position: relative; display: inline-block; width: 44px; height: 24px;">
                            <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
                            <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--forest); border-radius: 24px; transition: .4s;">
                                <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; border-radius: 50%; transition: .4s; transform: translateX(20px);"></span>
                            </span>
                        </label>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--border-glass);">
                        <div>
                            <p style="margin: 0; font-weight: 500; color: var(--deep);">Dark Mode</p>
                            <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-secondary);">Switch to a dark theme (Midnight Canopy)</p>
                        </div>
                        <label class="theme-switch" onchange="toggleDarkMode()">
                            <i data-lucide="moon" class="theme-icon-moon"></i>
                            <div class="toggle-slider-container">
                                <input type="checkbox" id="theme-toggle" ${state.theme === 'dark' ? 'checked' : ''}>
                                <div class="toggle-thumb"></div>
                            </div>
                            <i data-lucide="sun" class="theme-icon-sun"></i>
                        </label>
                    </div>
                </div>

                <div class="card fade-in-up" style="animation-delay: 0.3s; margin-top: 16px;">
                    <button class="button" data-action="auth-logout" style="width: 100%; justify-content: center; background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5;">
                        <i data-lucide="log-out" style="width: 16px; height: 16px; margin-right: 8px;"></i> Log Out
                    </button>
                </div>
            </div>
        </div>
    `;
}


function renderHome(container) {
    container.innerHTML = `
        <div class="home-container">
            <section class="hero-section" style="position: relative; overflow: hidden;">
                <div style="position: absolute; inset: 0; z-index: -1; background: var(--gradient-canopy)"></div>
                <div class="badge fade-in-up" style="animation-delay: 0.1s">🌱 Welcome to TreeBalance</div>
                <h1 class="hero-title fade-in-up" style="animation-delay: 0.2s"><span class="rainbow-text">Every choice plants a greener tomorrow</span></h1>
                <p class="hero-subtitle fade-in-up" style="animation-delay: 0.3s">
                    TreeBalance turns climate action into a joyful daily ritual — calculate, track, and earn badges.
                </p>
                <div class="hero-actions fade-in-up" style="animation-delay: 0.4s">
                    <button class="button primary" data-action="navigate" data-target="calculator">
                        <i data-lucide="calculator"></i> Try the Calculator
                    </button>
                    <button class="button secondary" data-action="navigate" data-target="tracker">
                        <i data-lucide="award"></i> View Rewards
                    </button>
                </div>
                
                <div class="live-widget-container fade-in-up" style="animation-delay: 0.5s">
                    <!-- Live CO2 Counter -->
                    <div class="live-card">
                        <div class="live-card-header">
                            <div class="live-card-title">Global CO₂ Since You Opened TreeBalance</div>
                            <div class="live-badge"><div class="pulse-dot"></div> LIVE</div>
                        </div>
                        <div class="live-number">
                            <span id="live-co2-counter">0</span>
                            <span class="live-unit">tonnes</span>
                        </div>
                        <div class="live-footer-text">Every habit you log helps tip this number the other way.</div>
                    </div>

                    <!-- Did You Know Carousel -->
                    <div class="live-card dyk-card">
                        <div class="quote-bg">"</div>
                        <div class="dyk-content">
                            <div class="dyk-title">Did You Know?</div>
                            <div class="fact-text" id="dyk-fact-text">${DYK_FACTS[0]}</div>
                            <div class="carousel-dots" id="dyk-dots">
                                ${DYK_FACTS.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="equiv-widget fade-in-up" style="animation-delay: 0.7s; margin-top: 40px; margin-bottom: 40px;">
                    <div style="font-size: 0.85rem; letter-spacing: 0.15em; color: var(--forest); font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">What does it mean?</div>
                    <h2 style="font-size: 2.2rem; color: var(--deep); margin-bottom: 24px;">Save <span id="equiv-kg" style="background: linear-gradient(90deg, #3b82f6, #84cc16); -webkit-background-clip: text; color: transparent; font-weight: 800;">5 kg</span> of CO₂ and you've...</h2>
                    
                    <input type="range" id="equiv-slider" min="1" max="50" value="5" class="styled-slider" style="width: 100%; margin-bottom: 30px;" oninput="updateEquivalencies(this.value)">
                    
                    <div style="display: flex; gap: 16px; justify-content: space-between;">
                        <div class="equiv-card">
                            <i data-lucide="tree-pine" style="color: var(--forest); margin-bottom: 12px; width: 32px; height: 32px;"></i>
                            <div id="equiv-trees" style="font-size: 2.2rem; font-weight: 800; color: var(--deep);">88</div>
                            <div style="font-size: 0.95rem; color: var(--text-secondary);">tree-days of work</div>
                        </div>
                        <div class="equiv-card">
                            <i data-lucide="bike" style="color: #38bdf8; margin-bottom: 12px; width: 32px; height: 32px;"></i>
                            <div id="equiv-km" style="font-size: 2.2rem; font-weight: 800; color: var(--deep);">26</div>
                            <div style="font-size: 0.95rem; color: var(--text-secondary);">km not driven</div>
                        </div>
                        <div class="equiv-card">
                            <i data-lucide="leaf" style="color: #84cc16; margin-bottom: 12px; width: 32px; height: 32px;"></i>
                            <div id="equiv-meals" style="font-size: 2.2rem; font-weight: 800; color: var(--deep);">2.0</div>
                            <div style="font-size: 0.95rem; color: var(--text-secondary);">plant-based meals</div>
                        </div>
                    </div>
                </div>

                <div class="pledge-widget fade-in-up" style="animation-delay: 0.8s; margin-bottom: 40px; background: var(--surface-glass); padding: 32px; border-radius: 24px; text-align: left; max-width: 760px; width: 100%; border: 1px solid var(--border-glass);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <i data-lucide="hand-heart" style="color: #ff6b6b; width: 28px; height: 28px;"></i>
                        <h2 style="font-size: 2rem; color: var(--text-primary); font-weight: 800; margin: 0;">Make today's pledge</h2>
                    </div>
                    <p style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 24px;">Tap the ones you'll commit to.</p>
                    
                    <div class="pledge-grid" id="pledge-grid-container">
                        ${renderPledgeGrid()}
                    </div>
                </div>

            </section>
        </div>
    `;
}

function initLiveWidgets() {
    // 1. Live CO2 Counter Logic
    const counterEl = document.getElementById('live-co2-counter');
    if (counterEl) {
        state.liveInterval = setInterval(() => {
            const elapsedMs = Date.now() - sessionStartTime;
            const tonnes = Math.floor(elapsedMs * CO2_RATE_PER_MS);
            // Format with commas
            counterEl.textContent = tonnes.toLocaleString('en-US');
        }, 100);
    }

    // 2. Fact Carousel Logic
    const factTextEl = document.getElementById('dyk-fact-text');
    const dotsContainer = document.getElementById('dyk-dots');
    
    if (factTextEl && dotsContainer) {
        state.carouselInterval = setInterval(() => {
            currentFactIndex = (currentFactIndex + 1) % DYK_FACTS.length;
            
            // Fade effect
            factTextEl.style.opacity = 0;
            setTimeout(() => {
                factTextEl.textContent = DYK_FACTS[currentFactIndex];
                factTextEl.style.opacity = 1;
            }, 300);
            
            // Update dots
            dotsContainer.innerHTML = DYK_FACTS.map((_, i) => 
                `<div class="dot ${i === currentFactIndex ? 'active' : ''}"></div>`
            ).join('');
        }, 6000); // Rotate every 6 seconds
    }
    
    // Initialize Equivalency Widget
    setTimeout(() => {
        const slider = document.getElementById('equiv-slider');
        if (slider) updateEquivalencies(slider.value);
    }, 50);
}

function updateEquivalencies(val) {
    const kg = parseFloat(val);
    const kgEl = document.getElementById('equiv-kg');
    if(kgEl) kgEl.textContent = kg + ' kg';
    
    const trees = document.getElementById('equiv-trees');
    if(trees) trees.textContent = Math.round(kg * (88/5));
    
    const km = document.getElementById('equiv-km');
    if(km) km.textContent = Math.round(kg * (26/5));
    
    const meals = document.getElementById('equiv-meals');
    if(meals) meals.textContent = (kg * (2/5)).toFixed(1);
    
    const slider = document.getElementById('equiv-slider');
    if(slider) {
        const percentage = ((val - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.background = 'linear-gradient(to right, #22c55e 0%, #22c55e ' + percentage + '%, #4b5563 ' + percentage + '%, #4b5563 100%)';
    }
}

function renderCalculator(container) {
    let milesCO2 = 0;
    let meatCO2 = 0;
    let energyCO2 = 0;
    
    state.habits.forEach(h => {
        if (h.name.includes('Walked') || h.name.includes('Biked')) {
            milesCO2 += h.co2;
        } else if (h.name.includes('Plant-based')) {
            meatCO2 += h.co2;
        } else {
            energyCO2 += h.co2;
        }
    });

    const total = milesCO2 + meatCO2 + energyCO2;
    const footprint = total.toFixed(2);
    
    let milesPct = 0; let meatPct = 0; let energyPct = 0;
    if (total > 0) {
        milesPct = (milesCO2 / total) * 100;
        meatPct = (meatCO2 / total) * 100;
        energyPct = (energyCO2 / total) * 100;
    }
    
    // Green palette
    const c1 = '#3b82f6'; // Bright Blue
    const c2 = '#f97316'; // Bright Orange
    const c3 = '#facc15'; // Bright Yellow 

    const pieGradient = total > 0 ? `conic-gradient(
        ${c1} 0% ${milesPct}%, 
        ${c2} ${milesPct}% ${milesPct + meatPct}%, 
        ${c3} ${milesPct + meatPct}% 100%
    )` : 'background: #e2e8f0;';

    const maxCO2 = Math.max(milesCO2, meatCO2, energyCO2, 0.1);
    const milesHeight = (milesCO2 / maxCO2) * 100;
    const meatHeight = (meatCO2 / maxCO2) * 100;
    const energyHeight = (energyCO2 / maxCO2) * 100;

    let message = "";
    if (total == 0) {
        message = "Start logging habits to see your impact breakdown!";
    } else {
        message = "Amazing! You are making a real difference by consistently logging habits. 🌱";
    }

    container.innerHTML = `
        <div class="calculator-container fade-in-up">
            <h2 class="section-title" style="margin-top: 20px;">Instant Carbon Calculator</h2>
            <p class="section-subtitle">Enter your activity in at least one field and tap Calculate to see your footprint.</p>
            
            <div class="calculator-card glass-vivid">
                <div class="input-group">
                    <label><i data-lucide="car"></i> Daily Driving (miles)</label>
                    <input type="number" id="calc-miles" placeholder="e.g. 15" min="0" value="${state.calculatorInput.miles !== undefined ? state.calculatorInput.miles : ''}">
                </div>
                
                <div class="input-group">
                    <label><i data-lucide="drumstick"></i> Meat Meals Today</label>
                    <input type="number" id="calc-meat" placeholder="e.g. 2" min="0" value="${state.calculatorInput.meatMeals !== undefined ? state.calculatorInput.meatMeals : ''}">
                </div>
                
                <div class="input-group">
                    <label><i data-lucide="zap"></i> Home Energy (hours AC/Heat)</label>
                    <input type="number" id="calc-energy" placeholder="e.g. 4" min="0" value="${state.calculatorInput.electricity !== undefined ? state.calculatorInput.electricity : ''}">
                </div>

                <button class="button primary calculate-btn" data-action="calculate-footprint">
                    <i data-lucide="activity"></i> Reveal My Footprint
                </button>
            </div>

            <div id="calculator-result" class="result-card glass-vivid hidden">
                <h3>Your Estimated Daily Footprint</h3>
                <div class="result-value"><span id="footprint-value">0</span> kg CO₂</div>
                <p id="footprint-message"></p>
            </div>

            <hr style="border: 0; border-top: 2px dashed #cbd5e1; margin: 60px 0 40px 0;">

            <h2 class="section-title">Your Overall Impact</h2>
            <p class="section-subtitle">A constant view of the CO₂ you've prevented through your daily habits.</p>
            
            <div id="impact-dashboard" class="result-card glass-vivid" style="display: block;">
                <h3>Total CO₂ Prevented</h3>
                <div class="result-value"><span>${footprint}</span> kg CO₂</div>
                <p id="footprint-message">${message}</p>
                
                ${total > 0 ? `
                <div class="charts-row" style="display: flex; flex-wrap: wrap; gap: 40px; justify-content: center; margin-top: 40px; padding: 20px; background: var(--surface-glass); border-radius: 24px;">
                    
                    <!-- Pie Chart -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; flex: 1; min-width: 250px;">
                        <h4 style="color: var(--forest); margin: 0;">Breakdown</h4>
                        <div style="position: relative; width: 180px; height: 180px;">
                            <div style="width: 100%; height: 100%; border-radius: 50%; background: ${pieGradient}; box-shadow: inset 0 4px 12px rgba(0,0,0,0.1);"></div>
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--surface-glass); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">${total.toFixed(1)}</div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.95rem; font-weight: 600; margin-top: 8px; width: 100%; max-width: 220px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;"><div style="display: flex; align-items: center; gap: 6px;"><div style="width:14px; height:14px; background:${c1}; border-radius:3px;"></div> Transport</div> <span>${milesCO2.toFixed(1)}kg (${Math.round(milesPct)}%)</span></div>
                            <div style="display: flex; align-items: center; justify-content: space-between;"><div style="display: flex; align-items: center; gap: 6px;"><div style="width:14px; height:14px; background:${c2}; border-radius:3px;"></div> Diet</div> <span>${meatCO2.toFixed(1)}kg (${Math.round(meatPct)}%)</span></div>
                            <div style="display: flex; align-items: center; justify-content: space-between;"><div style="display: flex; align-items: center; gap: 6px;"><div style="width:14px; height:14px; background:${c3}; border-radius:3px;"></div> Energy+</div> <span>${energyCO2.toFixed(1)}kg (${Math.round(energyPct)}%)</span></div>
                        </div>
                    </div>

                    <!-- Bar Chart -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; flex: 1; min-width: 250px;">
                        <h4 style="color: var(--forest); margin: 0;">Comparison</h4>
                        <div style="display: flex; gap: 32px; align-items: flex-end; height: 180px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; width: 100%; max-width: 280px; justify-content: center;">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end;">
                                <span style="font-size: 1rem; font-weight: 800; color: var(--text-primary);">${milesCO2.toFixed(1)}</span>
                                <div style="height: ${milesHeight}%; width: 44px; background: ${c1}; border-radius: 4px 4px 0 0; transition: height 0.5s ease; box-shadow: 0 -2px 8px rgba(0,0,0,0.05);"></div>
                                <span style="font-size: 0.85rem; font-weight: 600;">Transport</span>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end;">
                                <span style="font-size: 1rem; font-weight: 800; color: var(--text-primary);">${meatCO2.toFixed(1)}</span>
                                <div style="height: ${meatHeight}%; width: 44px; background: ${c2}; border-radius: 4px 4px 0 0; transition: height 0.5s ease; box-shadow: 0 -2px 8px rgba(0,0,0,0.05);"></div>
                                <span style="font-size: 0.85rem; font-weight: 600;">Diet</span>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end;">
                                <span style="font-size: 1rem; font-weight: 800; color: var(--text-primary);">${energyCO2.toFixed(1)}</span>
                                <div style="height: ${energyHeight}%; width: 44px; background: ${c3}; border-radius: 4px 4px 0 0; transition: height 0.5s ease; box-shadow: 0 -2px 8px rgba(0,0,0,0.05);"></div>
                                <span style="font-size: 0.85rem; font-weight: 600;">Energy+</span>
                            </div>
                        </div>
                    </div>

                </div>
                ` : `
                <div style="margin-top: 40px; padding: 40px; background: var(--surface-glass); border-radius: 24px; text-align: center; color: var(--moss);">
                    <i data-lucide="leaf" style="width: 48px; height: 48px; opacity: 0.5; margin-bottom: 16px; display: inline-block;"></i>
                    <p style="font-size: 1.1rem; font-weight: 500;">Your charts will appear here once you log your first habit.</p>
                </div>
                `}

                <!-- Recommended Actions -->
                <div class="tips-section" style="margin-top: 48px; text-align: left;">
                    <h3 style="color: var(--forest); font-size: 1.5rem; margin-bottom: 24px; font-family: var(--font-heading);">Recommended Actions</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                        <div style="background: var(--surface-glass); border-radius: 20px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <h4 style="color: var(--forest); margin: 0 0 8px 0; font-size: 1.2rem;">Reduce Driving</h4>
                                <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0 0 24px 0; font-weight: 600;">Could save 2,000 kg CO2/year</p>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-glass); padding-top: 16px;">
                                <span style="font-size: 0.95rem; color: var(--text-primary); font-weight: 500;">Use public transport 2 days/week</span>
                                <i data-lucide="arrow-right" style="width:16px; color:#94a3b8;"></i>
                            </div>
                        </div>

                        <div style="background: var(--surface-glass); border-radius: 20px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <h4 style="color: var(--forest); margin: 0 0 8px 0; font-size: 1.2rem;">Go Plant-Based</h4>
                                <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0 0 24px 0; font-weight: 600;">Could save 1,500 kg CO2/year</p>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-glass); padding-top: 16px;">
                                <span style="font-size: 0.95rem; color: var(--text-primary); font-weight: 500;">Try 3 meat-free days per week</span>
                                <i data-lucide="arrow-right" style="width:16px; color:#94a3b8;"></i>
                            </div>
                        </div>

                        <div style="background: var(--surface-glass); border-radius: 20px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <h4 style="color: var(--forest); margin: 0 0 8px 0; font-size: 1.2rem;">Lower Energy Use</h4>
                                <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0 0 24px 0; font-weight: 600;">Could save 800 kg CO2/year</p>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-glass); padding-top: 16px;">
                                <span style="font-size: 0.95rem; color: var(--text-primary); font-weight: 500;">Switch to LED bulbs, insulate home</span>
                                <i data-lucide="arrow-right" style="width:16px; color:#94a3b8;"></i>
                            </div>
                        </div>8;"></i>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) {
        lucide.createIcons();
    }
}

function calculateFootprint() {
    const miles = parseFloat(document.getElementById('calc-miles').value) || 0;
    const meat = parseFloat(document.getElementById('calc-meat').value) || 0;
    const energy = parseFloat(document.getElementById('calc-energy').value) || 0;

    // Save state
    state.calculatorInput.miles = miles;
    state.calculatorInput.meatMeals = meat;
    state.calculatorInput.electricity = energy;
    saveState();

    let footprint = (miles * 0.404) + (meat * 2.5) + (energy * 1.5);
    footprint = footprint.toFixed(2);

    const resultCard = document.getElementById('calculator-result');
    const footprintValue = document.getElementById('footprint-value');
    const footprintMessage = document.getElementById('footprint-message');

    footprintValue.textContent = footprint;

    if (footprint == 0) {
        footprintMessage.textContent = "Please enter some activities to see your footprint!";
    } else if (footprint < 5) {
        footprintMessage.textContent = "Great job! Your footprint is remarkably low. 🌱";
    } else if (footprint < 15) {
        footprintMessage.textContent = "Not bad! There is still room for small, joyful improvements. 🚲";
    } else {
        footprintMessage.textContent = "Consider trading one habit today, like a meatless lunch or a bike ride! 🌍";
    }

    resultCard.classList.remove('hidden');
    resultCard.classList.add('fade-in-up');
    
    triggerConfetti();
}

function getVillageMetrics() {
    let totalImpact = 0;
    let earnedToday = 0;
    const actionsLogged = state.habits.length;
    const badgesEarned = state.unlockedBadges.length;
    
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    let uniqueDays = new Set();
    
    state.habits.forEach(h => {
        totalImpact += h.co2;
        if (h.dateKey === todayKey) {
            earnedToday += h.leaves;
        }
        if (h.dateKey) {
            uniqueDays.add(h.dateKey);
        }
    });
    
    const dayStreak = uniqueDays.size; // Simplified streak calculation

    return {
        totalImpact: totalImpact.toFixed(1),
        earnedToday,
        actionsLogged,
        dayStreak,
        badgesEarned,
        leavesBalance: state.village.leaves
    };
}

function renderTracker(container) {
    const metrics = getVillageMetrics();
    
    container.innerHTML = `
        <div class="village-dashboard fade-in-up">
            <div class="village-header-section">
                <h2 class="village-title">Your Carbon Hero Stats</h2>
                <p class="village-subtitle">Complete daily habits to earn leaves and level up your Carbon Hero!</p>
            </div>
            
            <div class="village-metrics">
                <div class="metric-card">
                    <div class="metric-icon">🔥</div>
                    <div class="metric-value" id="metric-streak">${metrics.dayStreak}</div>
                    <div class="metric-label">Day Streak</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">📝</div>
                    <div class="metric-value" id="metric-actions">${metrics.actionsLogged}</div>
                    <div class="metric-label">Actions Logged</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">🏅</div>
                    <div class="metric-value" id="metric-badges">${metrics.badgesEarned}</div>
                    <div class="metric-label">Badges Earned</div>
                </div>
                <div class="metric-card highlight">
                    <div class="metric-icon">🍃</div>
                    <div class="metric-value" id="metric-leaves">${metrics.leavesBalance}.0</div>
                    <div class="metric-label">Leaves Balance</div>
                </div>
            </div>
            
            <div class="village-main-content">
                <div class="village-habits-section">
                    <p style="color: var(--forest); margin: 0; font-size: 1.1rem;">Complete habits to earn leaves. Build your hero stats with purchases!</p>
                    <div class="village-habits-grid" id="village-habits-grid">
                        ${renderVillageHabits()}
                    </div>
                </div>
                
                <div class="village-sidebar">
                    <h3 class="village-sidebar-title">Hero Stats</h3>
                    
                    <div class="stat-card impact">
                        <div class="stat-card-header">💚 TOTAL IMPACT</div>
                        <div class="stat-card-value" id="stat-impact">${metrics.totalImpact} kg CO₂</div>
                        <div class="stat-card-sub">Prevented</div>
                    </div>
                    
                    <div class="stat-card earned">
                        <div class="stat-card-header">🌿 EARNED TODAY</div>
                        <div class="stat-card-value" id="stat-earned">${metrics.earnedToday} leaves</div>
                    </div>
                    
                    <div class="stat-card tip">
                        <div class="stat-card-header">💡 TIP</div>
                        <div class="stat-card-sub">Keep your streak alive! Daily actions compound into big impact.</div>
                    </div>
                </div>
            </div>

            <!-- Keep existing components at the bottom -->
            <section class="village-section" style="margin-top: 40px;">
                <h3 class="subsection-title">Badge Rewards Store</h3>
                <div class="badge-store-grid" id="badge-store-grid">
                    ${renderBadgeStore()}
                </div>
            </section>

            <section class="calendar-section fade-in-up" style="margin-top: 40px;">
                <h3 class="subsection-title">Daily Impact Calendar</h3>
                <div class="calendar-card" id="calendar-container">
                    ${renderCalendar()}
                </div>
            </section>
        </div>
    `;
}

function logVillageHabit(name, co2, leaves) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayKey = `${year}-${month}-${day}`;

    // Check if already logged today
    if (state.habits.some(h => h.name === name && h.dateKey === todayKey)) {
        const toast = document.createElement('div');
        toast.className = 'toast show';
        toast.style.background = '#f59e0b';
        toast.textContent = 'You already logged this today! 💚';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        return;
    }

    state.habits.unshift({
        name,
        co2: parseFloat(co2),
        leaves: parseFloat(leaves),
        date: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        dateKey: todayKey
    });
    
    let countKey = name;
    if (name.includes('Walked')) countKey = 'Biked to work';
    state.habitCounts[countKey] = (state.habitCounts[countKey] || 0) + 1;
    
    state.village.leaves += parseFloat(leaves);
    saveState();
    updateLevelProgressBar();
    
    // Update DOM directly to avoid full re-render scroll jump
    const metrics = getVillageMetrics();
    
    const mStreak = document.getElementById('metric-streak');
    if(mStreak) mStreak.textContent = metrics.dayStreak;
    
    const mActions = document.getElementById('metric-actions');
    if(mActions) mActions.textContent = metrics.actionsLogged;
    
    const mLeaves = document.getElementById('metric-leaves');
    if(mLeaves) mLeaves.textContent = metrics.leavesBalance + (Number.isInteger(metrics.leavesBalance) ? '.0' : '');
    
    const sImpact = document.getElementById('stat-impact');
    if(sImpact) sImpact.textContent = metrics.totalImpact + ' kg CO₂';
    
    const sEarned = document.getElementById('stat-earned');
    if(sEarned) sEarned.textContent = metrics.earnedToday + ' leaves';
    
    const calContainer = document.getElementById('calendar-container');
    if(calContainer) calContainer.innerHTML = renderCalendar();
    
    const grid = document.getElementById('village-habits-grid');
    if(grid) {
        grid.innerHTML = renderVillageHabits();
    }
    
    // Show toast
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.textContent = `Added ${leaves} leaves to your balance!`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function renderVillageHabits() {
    const todayStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
    const habits = [
        { name: 'Walked to work', co2: 1.5, leaves: 2, icon: '🚶‍♂️' },
        { name: 'Plant-based meal', co2: 0.8, leaves: 1, icon: '🥗' },
        { name: 'Unplugged devices', co2: 0.5, leaves: 0.5, icon: '🔌' },
        { name: 'Shorter shower', co2: 0.5, leaves: 1, icon: '⏱️' },
        { name: 'Refused plastic', co2: 0.2, leaves: 0.5, icon: '🛍️' },
        { name: 'Planted a tree', co2: 5, leaves: 5, icon: '🌱' }
    ];

    return habits.map(h => {
        const isDone = state.habits.some(sh => sh.name === h.name && sh.dateKey === todayStr);
        const cardStyle = isDone ? 'opacity: 0.5; cursor: not-allowed; filter: grayscale(1);' : '';
        const actionAttr = isDone ? '' : `data-action="log-village-habit" data-name="${h.name}" data-co2="${h.co2}" data-leaves="${h.leaves}"`;
        const icon = isDone ? '✅' : h.icon;
        
        return `<div class="village-habit-item" ${actionAttr} style="${cardStyle}"><span class="village-habit-icon">${icon}</span><div class="village-habit-name">${h.name}</div><div class="village-habit-reward">🍃 +${h.leaves}</div></div>`;
    }).join('');
}

function renderBadgeStore() {
    return BADGE_CATALOG.map(badge => {
        const isUnlocked = state.unlockedBadges.includes(badge.id);
        const cardClass = isUnlocked ? 'badge-card unlocked' : 'badge-card';
        
        let actionHtml = '';
        if (isUnlocked) {
            actionHtml = `<div class="badge-cost"><i data-lucide="check" style="width:14px; height:14px; display:inline;"></i> Unlocked</div>`;
        } else {
            if (badge.requirement) {
                const currentCount = state.habitCounts[badge.requirement.habit] || 0;
                if (currentCount < badge.requirement.count) {
                    actionHtml = `<div style="font-size: 0.85rem; color: var(--muted); font-weight: 700;">Locked: ${currentCount} / ${badge.requirement.count} ${badge.requirement.habit}s</div>`;
                } else {
                    actionHtml = `<button class="button" style="padding: 6px 12px; font-size: 0.9rem;" data-action="buy-badge" data-badge-id="${badge.id}">Buy (${badge.cost} 🍃)</button>`;
                }
            } else {
                actionHtml = `<button class="button" style="padding: 6px 12px; font-size: 0.9rem;" data-action="buy-badge" data-badge-id="${badge.id}">Buy (${badge.cost} 🍃)</button>`;
            }
        }

        return `
            <div class="${cardClass}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                ${actionHtml}
            </div>
        `;
    }).join('');
}

function buyBadge(badgeId) {
    const badge = BADGE_CATALOG.find(b => b.id === badgeId);
    if (!badge) return;

    if (state.unlockedBadges.includes(badgeId)) {
        alert('You already own this badge!');
        return;
    }

    if (state.village.leaves >= badge.cost) {
        state.village.leaves -= badge.cost;
        state.unlockedBadges.push(badgeId);
        saveState();
        updateLevelProgressBar();
        triggerConfetti();
        
        // Re-render DOM elements
        const metricLeaves = document.getElementById('metric-leaves');
        if (metricLeaves) metricLeaves.textContent = state.village.leaves + (Number.isInteger(state.village.leaves) ? '.0' : '');
        
        const metricBadges = document.getElementById('metric-badges');
        if (metricBadges) metricBadges.textContent = state.unlockedBadges.length;

        const storeGrid = document.getElementById('badge-store-grid');
        if (storeGrid) storeGrid.innerHTML = renderBadgeStore();
        
        updateIcons();
    } else {
        alert('Not enough leaves! You need ' + badge.cost + ' leaves to unlock the ' + badge.name + '.');
    }
}

function logHabit() {
    const select = document.getElementById('habit-select');
    const [co2, leaves, name] = select.value.split(',');

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    state.habits.unshift({
        name,
        co2: parseFloat(co2),
        leaves: parseInt(leaves),
        date: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        dateKey: `${year}-${month}-${day}`
    });
    
    // Increment habit count for achievements
    let countKey = name;
    if (name.includes('Biked')) countKey = 'Biked to work';
    if (name.includes('Plant')) countKey = 'Plant-based meal';
    if (name.includes('Unplugged')) countKey = 'Unplugged devices';
    state.habitCounts[countKey] = (state.habitCounts[countKey] || 0) + 1;
    
    state.village.leaves += parseInt(leaves);
    
    saveState();
    updateLevelProgressBar();
    
    // Re-render safely
    const leavesEl = document.getElementById('leaves-count');
    if (leavesEl) leavesEl.textContent = state.village.leaves;
    
    const habitsList = document.getElementById('habits-list');
    if (habitsList) habitsList.innerHTML = renderHabitsList();
    
    const calContainer = document.getElementById('calendar-container');
    if (calContainer) calContainer.innerHTML = renderCalendar();
}

function renderHabitsList() {
    if (state.habits.length === 0) {
        return '<p class="empty-state">No habits logged yet today. Start making a difference!</p>';
    }
    
    return state.habits.map(habit => `
        <div class="habit-item fade-in-up">
            <div class="habit-info">
                <strong>${habit.name}</strong>
                <span class="habit-time">${habit.date}</span>
            </div>
            <div class="habit-rewards">
                <span class="co2-saved">-${habit.co2}kg COÃƒÂ¢Ã¢â‚¬Å¡Ã¢â‚¬Å¡</span>
                <span class="leaves-earned">+${habit.leaves} ÃƒÂ°Ã…Â¸Ã‚Â Ã†â€™</span>
            </div>
        </div>
    `).join('');
}

function renderCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Calculate aggregate CO2 per day
    const dailyCo2 = {};
    state.habits.forEach(h => {
        if (h.dateKey) {
            dailyCo2[h.dateKey] = (dailyCo2[h.dateKey] || 0) + h.co2;
        }
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const totalDays = lastDay.getDate();

    let gridHtml = '<div class="calendar-grid">';
    
    // Weekdays header
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        gridHtml += `<div class="calendar-weekday">${day}</div>`;
    });

    // Empty slots before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        gridHtml += '<div class="calendar-day empty"></div>';
    }

    // Days of the month
    const todayKey = today.toISOString().split('T')[0];
    for (let i = 1; i <= totalDays; i++) {
        // Build DateKey for this cell
        // Careful with timezone offsets for local formatting
        const cellDate = new Date(year, month, i);
        // Correct way to get local YYYY-MM-DD
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(i).padStart(2, '0');
        const dateKey = `${year}-${monthStr}-${dayStr}`;

        const saved = dailyCo2[dateKey];
        const isToday = dateKey === todayKey;
        
        let classes = 'calendar-day fade-in-up';
        if (saved > 0) classes += ' has-data';
        if (isToday) classes += ' today';

        let badgeHtml = '';
        if (saved > 0) {
            badgeHtml = `<div class="daily-co2-badge">-${saved.toFixed(1)}kg</div>`;
        }

        gridHtml += `
            <div class="${classes}" style="animation-delay: ${i * 0.02}s;">
                ${i}
                ${badgeHtml}
            </div>
        `;
    }

    gridHtml += '</div>';

    const monthName = today.toLocaleString('default', { month: 'long' });
    return `
        <div class="calendar-header">
            <h3>${monthName} ${year}</h3>
        </div>
        ${gridHtml}
    `;
}

// Init app
document.addEventListener('DOMContentLoaded', () => {
    // Check for local session
    const savedSession = localStorage.getItem('treebalance_session');
    if (savedSession) {
        state.user = JSON.parse(savedSession);
        if (state.currentPage === 'login' || state.currentPage === 'signup') {
            navigate('home');
        } else {
            navigate(state.currentPage);
        }
    } else {
        state.user = null;
        navigate('login');
    }
    
    generateRandomDoodles(200);
});

// ========================================
// CarbonSense AI Implementation
// ========================================

function renderAi(container) {
    container.innerHTML = `
        <div class="ai-container fade-in-up">
            <div class="ai-header">
                <h2 class="text-vivid">CarbonSense AI</h2>
                <p class="section-subtitle" style="margin-top:10px;">Your intelligent sustainability companion.</p>
            </div>

            <div class="ai-tabs">
                <div class="ai-tab active" data-action="switch-ai-tab" data-target="diary" id="tab-diary">Daily Diary</div>
                <div class="ai-tab" data-action="switch-ai-tab" data-target="appliance" id="tab-appliance">Home Evaluator</div>
            </div>

            <!-- Daily Check-in & Quiz Section -->
            <div class="ai-section-content active" id="section-diary">
                <div class="ai-card">
                    <h3 style="color:var(--deep);"><i data-lucide="book-open"></i> Daily Check-in</h3>
                    <p style="color:var(--text-secondary);">Write a natural language entry about your day. I will analyze your transport, energy, diet, and waste.</p>
                    <textarea class="ai-input-box" id="ai-diary-input" placeholder="e.g. I took the bus to college, stayed in an AC room for 4 hours, and ordered chicken biryani..."></textarea>
                    <button class="button primary" data-action="process-diary" style="align-self: flex-start;">Analyze My Day</button>
                    
                    <div id="ai-diary-response" class="ai-response"></div>
                </div>
            </div>

            <!-- Appliance Evaluator Section -->
            <div class="ai-section-content" id="section-appliance">
                <div class="ai-card">
                    <h3 style="color:var(--deep);"><i data-lucide="zap"></i> Home Footprint Evaluator</h3>
                    <p style="color:var(--text-secondary);">List your household appliances to get an efficiency grade and actionable tips.</p>
                    <textarea class="ai-input-box" id="ai-appliance-input" placeholder="e.g. 3 ACs and 2 coolers..."></textarea>
                    <button class="button primary" data-action="evaluate-appliances" style="align-self: flex-start;">Calculate Footprint</button>
                    
                    <div id="ai-appliance-response" class="ai-response"></div>
                </div>
            </div>
        </div>
    `;
}

function switchAiTab(tab) {
    document.querySelectorAll('.ai-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.ai-section-content').forEach(el => el.classList.remove('active'));
    
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('section-' + tab).classList.add('active');
}

function processDiary() {
    const input = document.getElementById('ai-diary-input').value.toLowerCase();
    const responseBox = document.getElementById('ai-diary-response');
    
    if(!input.trim()) {
        alert('Please write something about your day!');
        return;
    }
    
    // Simple Mock AI parsing logic based on keywords
    let transport = 'Unknown';
    let diet = 'Unknown';
    let energy = 'Unknown';
    
    if(input.includes('plane') || input.includes('flight') || input.includes('fly')) transport = 'Airplane (High Impact)';
    else if(input.includes('bus') || input.includes('public transit')) transport = 'Public Transit (Bus)';
    else if(input.includes('car') || input.includes('drive')) transport = 'Personal Car';
    else if(input.includes('bike') || input.includes('walk')) transport = 'Active (Zero-emission)';
    
    if(input.includes('chicken') || input.includes('meat')) diet = 'High-Impact (Meat)';
    else if(input.includes('vegan') || input.includes('plant')) diet = 'Low-Impact (Plant-based)';
    else if(input.includes('vegetarian')) diet = 'Medium-Impact (Vegetarian)';
    
    if(input.includes('ac') || input.includes('aircon')) energy = 'High (AC usage)';
    else if(input.includes('fan') || input.includes('cooler')) energy = 'Moderate (Fan/Cooler)';

    let achievementsHtml = '';
    if (state.unlockedBadges.length > 0) {
        achievementsHtml += `<div style="margin-top: 24px; margin-bottom: 24px; padding: 16px; background: rgba(16, 185, 129, 0.1); border-radius: 16px; border: 1px solid var(--leaf);">`;
        achievementsHtml += `<h4 style="color: var(--forest); margin: 0 0 8px 0;"><i data-lucide="award" style="display:inline; width:18px;"></i> Achievements Recognized</h4><ul style="margin:0; padding-left:20px; color: var(--forest); font-size: 0.95rem;">`;
        if (state.unlockedBadges.includes('vegan_star')) achievementsHtml += `<li><strong>Vegan Star:</strong> I see you are maintaining your plant-based streak! Your diet alone is heavily offsetting your footprint.</li>`;
        if (state.unlockedBadges.includes('bike_champ')) achievementsHtml += `<li><strong>Bike Champion:</strong> Excellent commitment to active transport! Every mile pedaled is a victory.</li>`;
        if (state.unlockedBadges.includes('energy_saver')) achievementsHtml += `<li><strong>Energy Saver:</strong> Your diligence in unplugging devices is preventing unnecessary phantom loads!</li>`;
        if (state.unlockedBadges.includes('plat_earth')) achievementsHtml += `<li><strong>Platinum Earth:</strong> You are a true environmental hero! Your village is thriving.</li>`;
        if (state.unlockedBadges.includes('gold_tree')) achievementsHtml += `<li><strong>Gold Tree:</strong> Your forest is expanding. Beautiful work!</li>`;
        if (state.unlockedBadges.includes('silver_seed') || state.unlockedBadges.includes('bronze_leaf')) achievementsHtml += `<li><strong>Budding Eco-Warrior:</strong> Every great forest begins with a single seed or leaf. Keep growing!</li>`;
        achievementsHtml += `</ul></div>`;
    }

    let feedbackHtml = `
        <div class="ai-response-header">
            <i data-lucide="bot"></i> Digital Twin Analysis
        </div>
        ${achievementsHtml}
        <p>I've analyzed your daily entry across key sectors. Here is how your current routine compares to a "Greener You":</p>
        
        <table class="ai-table">
            <tr>
                <th>Sector</th>
                <th>Your Input</th>
                <th>"Greener You" Alternative</th>
            </tr>
            <tr>
                <td><strong>Transport</strong></td>
                <td>${transport}</td>
                <td>${transport === 'Personal Car' ? 'Carpooling or Public Transit' : 'Biking or Walking'}</td>
            </tr>
            <tr>
                <td><strong>Diet</strong></td>
                <td>${diet}</td>
                <td>${diet === 'High-Impact (Meat)' ? 'Swap 1 meal for plant-based alternative' : 'Keep up the local, sustainable eating!'}</td>
            </tr>
            <tr>
                <td><strong>Energy</strong></td>
                <td>${energy}</td>
                <td>${energy === 'High (AC usage)' ? 'Set AC to 24°C and use ceiling fans' : 'Rely on natural ventilation'}</td>
            </tr>
        </table>
    `;

    // Generate Quiz Contextually
    let quizHtml = '';
    if (transport === 'Public Transit (Bus)') {
        quizHtml = generateQuizHtml(
            "Since you took the bus today, how much less COÃ¢â€šâ€š does public transit emit per passenger mile compared to driving alone?",
            ["A) About 20% less", "B) About 45% less", "C) About 80% less"],
            1, // B is correct
            "Correct! Public transportation produces 45% less carbon dioxide per passenger mile compared to driving a single-occupancy vehicle. Great job choosing the bus!"
        );
    } else if (diet === 'High-Impact (Meat)') {
        quizHtml = generateQuizHtml(
            "You had chicken today. Compared to beef, how does the carbon footprint of poultry compare?",
            ["A) Chicken is 2x worse than beef", "B) They are exactly the same", "C) Chicken emits about 80% less COÃ¢â€šâ€š than beef"],
            2,
            "Spot on! While all meat has a footprint, switching from beef to chicken is a massive win, reducing your meal's carbon footprint by roughly 80%!"
        );
    } else if (energy === 'High (AC usage)') {
        quizHtml = generateQuizHtml(
            "You mentioned using the AC. What is the scientifically recommended optimal temperature for balancing comfort and energy efficiency?",
            ["A) 18°C", "B) 24°C", "C) 20°C"],
            1,
            "Absolutely right! Setting your AC to 24°C (75°F) is the sweet spot. Every degree you raise the thermostat can save 6-8% on cooling energy costs!"
        );
    } else {
        quizHtml = generateQuizHtml(
            "General Sustainability Trivia: Which sector is responsible for the largest share of global greenhouse gas emissions?",
            ["A) Agriculture", "B) Transportation", "C) Energy Production"],
            2,
            "Correct! Energy production (electricity and heat) is the largest single source of global greenhouse gas emissions. Conserving energy at home makes a huge difference."
        );
    }

    responseBox.innerHTML = feedbackHtml + quizHtml;
    responseBox.classList.add('active');
    updateIcons();
}

function generateQuizHtml(question, options, correctIndex, feedbackText) {
    const opts = options.map((opt, i) => `
        <button class="quiz-option" data-action="quiz-answer" data-correct="${i === correctIndex}" data-feedback="${escapeHtml(feedbackText)}">${escapeHtml(opt)}</button>
    `).join('');

    return `
        <div class="quiz-container">
            <div class="quiz-title"><i data-lucide="help-circle"></i> Challenge Mode Quiz</div>
            <p style="margin-bottom:16px; font-weight:500;">${question}</p>
            <div class="quiz-options">
                ${opts}
            </div>
            <div class="quiz-feedback" id="quiz-feedback-box"></div>
        </div>
    `;
}

function handleQuizAnswer(btn, isCorrect, feedback) {
    const container = btn.parentElement;
    
    // Disable all options
    Array.from(container.children).forEach(child => {
        child.disabled = true;
        child.style.pointerEvents = 'none';
    });

    if(isCorrect) {
        btn.classList.add('correct');
    } else {
        btn.classList.add('wrong');
    }

    const feedbackBox = container.parentElement.querySelector('.quiz-feedback');
    feedbackBox.innerHTML = isCorrect ? 
        `<span style="color:#15803d"><i data-lucide="check-circle" style="display:inline; width:18px;"></i> ${feedback}</span>` : 
        `<span style="color:#b91c1c"><i data-lucide="x-circle" style="display:inline; width:18px;"></i> Not quite. ${feedback}</span>`;
    feedbackBox.classList.add('show');
    updateIcons();
}

function evaluateAppliances() {
    const input = document.getElementById('ai-appliance-input').value.toLowerCase();
    const responseBox = document.getElementById('ai-appliance-response');
    
    if(!input.trim()) {
        alert('Please list your appliances!');
        return;
    }

    // Mock parsing "3 ACs and 2 coolers"
    let acCount = 0;
    let coolerCount = 0;
    
    const acMatch = input.match(/(\d+)\s*(ac|acs|air conditioner)/);
    if(acMatch) acCount = parseInt(acMatch[1]);
    
    const coolerMatch = input.match(/(\d+)\s*cooler/);
    if(coolerMatch) coolerCount = parseInt(coolerMatch[1]);

    if (acCount === 0 && coolerCount === 0) {
        // Fallback generic parse
        acCount = 1;
        coolerCount = 1;
    }

    const acFootprint = acCount * 800; // estimated kg CO2/year per AC
    const coolerFootprint = coolerCount * 150; // estimated kg CO2/year per Cooler
    const total = acFootprint + coolerFootprint;

    let html = `
        <div class="ai-response-header">
            <i data-lucide="home"></i> Home Footprint Evaluation
        </div>
        <p>I've calculated the yearly estimated emissions based on standard usage benchmarks for the appliances you listed.</p>
        
        <table class="ai-table">
            <tr>
                <th>Appliance</th>
                <th>Qty</th>
                <th>Est. Yearly Impact</th>
                <th>Efficiency Grade</th>
                <th>Optimization Tip</th>
            </tr>
    `;

    if(acCount > 0) {
        html += `
            <tr>
                <td><strong>Air Conditioner</strong></td>
                <td>${acCount}</td>
                <td>${acFootprint} kg CO₂</td>
                <td><span style="color:#ef4444; font-weight:800;">D</span> (High Energy)</td>
                <td>Setting the thermostat to 24°C saves 6-8% energy per degree. Ensure filters are cleaned monthly.</td>
            </tr>
        `;
    }

    if(coolerCount > 0) {
        html += `
            <tr>
                <td><strong>Evaporative Cooler</strong></td>
                <td>${coolerCount}</td>
                <td>${coolerFootprint} kg CO₂</td>
                <td><span style="color:#22c55e; font-weight:800;">A</span> (Eco-friendly)</td>
                <td>Use cross-ventilation by keeping a window slightly open. Use cooling pads for maximum efficiency.</td>
            </tr>
        `;
    }

    html += `
        </table>
        <div style="background:var(--surface-glass); padding:20px; border-radius:16px; margin-top:20px; border:1px solid var(--border-glass);">
            <strong style="color:var(--deep); font-size:1.2rem;">Total Estimated Appliance Impact: ${total} kg CO₂/year</strong>
            <p style="color:var(--text-secondary); margin-top:8px;">💡 <strong>Simulation:</strong> If you replaced 1 AC with a ceiling fan or cooler, you could save approximately <strong>650 kg CO₂/year</strong>. That's a <span class="text-vivid" style="font-weight:800;">High Impact</span> savings!</p>
        </div>
    `;

    responseBox.innerHTML = html;
    responseBox.classList.add('active');
    updateIcons();
}


// Dynamic Doodle Generator
function scatterDoodlesDynamically(count) {
    const doodleLayer = document.querySelector('.doodle-layer');
    if (!doodleLayer) return;
    
    const existingSvgs = Array.from(doodleLayer.querySelectorAll('svg'));
    if (existingSvgs.length === 0) return;
    
    const animations = ['doodle-drift', 'doodle-bounce', 'doodle-wiggle', 'doodle-sway', 'doodle-float'];
    
    for (let i = 0; i < count; i++) {
        const randomSvgTemplate = existingSvgs[Math.floor(Math.random() * existingSvgs.length)];
        const svgClone = randomSvgTemplate.cloneNode(true);
        
        const size = Math.floor(Math.random() * 40) + 30; // 30px to 70px
        const top = Math.random() * 150; // allow going past 100vh a bit
        const left = Math.random() * 100;
        const opacity = (Math.random() * 0.3) + 0.2; // Increase visibility (0.2 to 0.5)
        const rotation = Math.random() * 360;
        const animation = animations[Math.floor(Math.random() * animations.length)];
        
        svgClone.style.position = 'absolute';
        svgClone.style.top = top + '%';
        svgClone.style.left = left + '%';
        svgClone.style.width = size + 'px';
        svgClone.style.height = size + 'px';
        svgClone.style.opacity = opacity;
        svgClone.style.transform = 'rotate(' + rotation + 'deg)';
        
        // Force all strokes to be Teal Blue and remove inline stroke colors
        svgClone.setAttribute('stroke', '#0d9488');
        svgClone.querySelectorAll('*').forEach(child => {
            if (child.hasAttribute('stroke')) {
                child.removeAttribute('stroke');
            }
        });
        
        // Override with random animation class
        svgClone.setAttribute('class', animation);
        
        doodleLayer.appendChild(svgClone);
    }
    
    // Remove the original unpositioned SVGs that formed a strip
    existingSvgs.forEach(svg => svg.remove());
    });
    
