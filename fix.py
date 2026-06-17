import os

file_path = 'app.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the marker
marker = "} else if (action === 'navigate') {"
start_idx = content.find(marker)

if start_idx != -1:
    end_marker = "    state.habits.unshift({"
    end_idx = content.find(end_marker, start_idx)
    
    if end_idx != -1:
        start_part = content[:start_idx + len(marker)]
        end_part = content[end_idx:]
        
        remainder = """
        navigate(target.getAttribute('data-target'));
    } else if (action === 'auth-email-login') {
        handleEmailLogin();
    } else if (action === 'auth-email-signup') {
        handleEmailSignup();
    } else if (action === 'auth-logout') {
        handleLogout();
    } else if (action === 'toggle-theme') {
        toggleDarkMode();
    } else if (action === 'calculate-footprint') {
        calculateFootprint();
    } else if (action === 'log-village-habit') {
        logVillageHabit(target.getAttribute('data-name'), target.getAttribute('data-co2'), target.getAttribute('data-leaves'));
    } else if (action === 'buy-badge') {
        buyBadge(target.getAttribute('data-badge-id'));
    } else if (action === 'switch-ai-tab') {
        switchAiTab(target.getAttribute('data-target'));
    } else if (action === 'process-diary') {
        processDiary();
    } else if (action === 'evaluate-appliances') {
        evaluateAppliances();
    } else if (action === 'quiz-answer') {
        handleQuizAnswer(target, target.getAttribute('data-correct') === 'true', target.getAttribute('data-feedback'));
    } else if (action === 'quick-log-habit') {
        quickLogHabit(parseFloat(target.getAttribute('data-co2')), parseInt(target.getAttribute('data-leaves')), target.getAttribute('data-name'));
    }
});

function renderPledgeGrid() {
    const todayStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
    const pledges = [
        { co2: 1.5, leaves: 15, name: 'Walk or cycle short trips', htmlName: 'Walk or cycle<br>short trips', icon: 'bike', color: '#a3e635' },
        { co2: 0.8, leaves: 10, name: 'One plant-based meal/day', htmlName: 'One plant-based<br>meal/day', icon: 'leaf', color: '#22c55e' },
        { co2: 0.5, leaves: 5, name: 'Shorter showers', htmlName: 'Shorter<br>showers', icon: 'droplets', color: '#06b6d4' },
        { co2: 0.2, leaves: 5, name: 'Refuse single-use plastic', htmlName: 'Refuse single-use<br>plastic', icon: 'recycle', color: '#f87171' },
        { co2: 0.5, leaves: 5, name: 'Unplug idle devices', htmlName: 'Unplug idle<br>devices', icon: 'sun', color: '#fbbf24' },
        { co2: 5.0, leaves: 50, name: 'Plant or sponsor a tree', htmlName: 'Plant or<br>sponsor a tree', icon: 'tree-pine', color: '#15803d' }
    ];
    
    return pledges.map(function(p) {
        const isDone = state.habits.some(function(h) { return h.name === p.name && h.dateKey === todayStr; });
        const bg = isDone ? '#e5e7eb' : p.color;
        const iconColor = isDone ? '#9ca3af' : 'var(--text-primary)';
        const textColor = isDone ? 'color: #9ca3af; text-decoration: line-through;' : '';
        const cardStyle = isDone ? 'opacity: 0.6; cursor: not-allowed; background: rgba(255,255,255,0.4); box-shadow: none;' : '';
        const icon = isDone ? 'check' : p.icon;
        const actionAttr = isDone ? 'disabled' : `data-action="quick-log-habit" data-co2="${p.co2}" data-leaves="${p.leaves}" data-name="${p.name}"`;
        
        return `<button class="pledge-card" ${actionAttr} style="${cardStyle}"><div class="pledge-icon-wrapper" style="background: ${bg};"><i data-lucide="${icon}" style="color: ${iconColor};"></i></div><div class="pledge-text" style="${textColor}">${p.htmlName}</div></button>`;
    }).join('');
}

// Initialization on script load
loadState();
navigate(state.currentPage);
scatterDoodlesDynamically(40);

function quickLogHabit(co2, leaves, name) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayKey = now.getFullYear() + '-' + month + '-' + day;
    
    // Check if already pledged today
    if (state.habits.some(h => h.name === name && h.dateKey === todayKey)) {
        const toast = document.createElement('div');
        toast.innerHTML = 'You already committed to this today! 💚';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = '#f59e0b';
        toast.style.color = 'white';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '20px';
        toast.style.boxShadow = 'var(--shadow-glass)';
        toast.style.zIndex = '9999';
        toast.style.animation = 'fadeInUp 0.3s ease-out';
        toast.style.fontWeight = 'bold';
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'pop-in 0.3s ease-in reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
        return;
    }
"""
        new_content = start_part + remainder + "\n" + end_part
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Success")
    else:
        print("End marker not found")
else:
    print("Start marker not found")
