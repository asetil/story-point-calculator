document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    const resultSection = document.getElementById('result');
    const spValue = document.getElementById('spValue');
    const mdValue = document.getElementById('mdValue');
    const hoursValue = document.getElementById('hoursValue');
    const rangeFill = document.getElementById('rangeFill');

    // --- DATA ---
    const spThresholds = [
        { max: 4, sp: 1, rangePerc: 10 },
        { max: 10, sp: 2, rangePerc: 30 },
        { max: 20, sp: 3, rangePerc: 50 },
        { max: 35, sp: 5, rangePerc: 70 },
        { max: 55, sp: 8, rangePerc: 85 },
        { max: Infinity, sp: 13, rangePerc: 100 }
    ];

    // State
    let frontendScore = 1;
    let backendScore = 1;
    let integrationScore = 1;

    let currentVolume = 1;
    let currentComplexity = 1.1;
    let currentRisk = 1.1;

    // Elements
    const frontendGroup = document.getElementById('frontendGroup');
    const backendGroup = document.getElementById('backendGroup');
    const integrationGroup = document.getElementById('integrationGroup');

    const volumeGroup = document.getElementById('volumeGroup');
    const complexityGroup = document.getElementById('complexityGroup');
    const riskGroup = document.getElementById('riskGroup');

    // --- SETUP HELPER ---
    function setupButtonGroup(groupElement, callback, isInput = false) {
        if (!groupElement) return;

        const buttons = groupElement.querySelectorAll('.selection-btn');
        const descEl = groupElement.parentElement.querySelector('.factor-description');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // UI
                updateActiveButton(groupElement, btn);

                // Value
                const value = parseFloat(btn.getAttribute('data-value'));
                callback(value);

                // Description
                if (descEl && btn.hasAttribute('data-desc')) {
                    updateDescription(descEl, btn.getAttribute('data-desc'));
                } else if (descEl && isInput) {
                    let descriptions = [];

                    if (groupElement.id === 'frontendGroup') {
                        descriptions = [
                            "Ufak bir label veya metin değişikliği.",
                            "Basit bir form tasarımı veya tekil alan.",
                            "Liste, CRUD ve detay ekranı.",
                            "Birkaç ekran veya akışın tasarlanması.",
                            "Tamamen özel, karmaşık tasarımı olan ve birden fazla ekranı kapsayan düzenleme"
                        ];
                    } else if (groupElement.id === 'backendGroup') {
                        descriptions = [
                            "Basit bir metin/kod düzenlemesi",
                            "Bir yada birkaç metodda akış düzenlemesi veya tabloya alan ekleme/çıkarma.",
                            "Yeni endpoint'ler, CRUD işlemleri ve standart iş mantığı.",
                            "Karmaşık hesaplamalar, transaction yönetimi veya performans ihtiyacı içeren büyük iş süreci.",
                            "Birçok sürecin, iş mantığının, tablo kullanımın, dış servis entegrasyonunun olduğu kapsamlı geliştirme"
                        ];
                    } else if (groupElement.id === 'integrationGroup') {
                        descriptions = [
                            "Dış bağımlılık veya risk yok.",
                            "Güvenilir ve tanıdık bir kütüphane kullanımı.",
                            "Dokümantasyonu tam standart bir REST API entegrasyonu.",
                            "Dokümantasyonu eksik veya stabil olmayan dış servis.",
                            "Legacy sistemler, bilinmeyen protokoller veya kritik güvenlik riski."
                        ];
                    }

                    updateDescription(descEl, descriptions[value - 1] || "");
                }

                // Trigger Auto-Map
                if (isInput) {
                    applyHeuristicMapping();
                }
            });
        });
    }

    function updateActiveButton(group, activeBtn) {
        group.querySelectorAll('.selection-btn').forEach(b => b.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    function updateDescription(el, text) {
        el.textContent = text;
        // Simple animation reset
        el.style.animation = 'none';
        el.offsetHeight;
        el.style.animation = 'fadeIn 0.3s ease';
    }

    // --- INITIALIZE ---
    setupButtonGroup(frontendGroup, (val) => frontendScore = val, true);
    setupButtonGroup(backendGroup, (val) => backendScore = val, true);
    setupButtonGroup(integrationGroup, (val) => integrationScore = val, true);

    setupButtonGroup(volumeGroup, (val) => currentVolume = val);
    setupButtonGroup(complexityGroup, (val) => currentComplexity = val);
    setupButtonGroup(riskGroup, (val) => currentRisk = val);

    // --- HEURISTIC MAPPING ---
    function applyHeuristicMapping() {
        // Volume (Use Fibonacci)
        // Frontend drives Volume directly. Backend drives it with -1 lag (1 step behind).
        // e.g. Backend 5 -> Volume 4. Frontend 5 -> Volume 5.
        let volIndex = Math.max(frontendScore, Math.max(1, backendScore - 1));

        // Custom Rule: Integration impact on Volume
        if (integrationScore === 4) volIndex = Math.max(volIndex, 2); // Zor -> Min S (2)
        else if (integrationScore === 5) volIndex = Math.max(volIndex, 3); // Çok Zor -> Min M (3)

        const volValues = [1, 2, 3, 5, 8];
        const newVolume = volValues[volIndex - 1];

        currentVolume = newVolume;
        selectButtonByValue(volumeGroup, newVolume);

        // Complexity (Use Fibonacci)
        // Start with average
        let compIndex = Math.round((frontendScore + backendScore + integrationScore) / 3);

        // Custom Rule: Frontend impact on Complexity
        if (frontendScore === 4) compIndex = Math.max(compIndex, 3);
        else if (frontendScore === 5) compIndex = Math.max(compIndex, 4);

        // Custom Rule: Backend increases complexity more than volume (Direct impact)
        // If Backend is 5, Complexity becomes at least 5.
        // This ensures Complexity (5) > Volume (4) for a Backend task.
        compIndex = Math.max(compIndex, backendScore);

        // Custom Rule: Integration impact on Complexity
        if (integrationScore === 4) compIndex = Math.max(compIndex, 3); // Zor -> Min Orta (3)
        else if (integrationScore === 5) compIndex = Math.max(compIndex, 4); // Çok Zor -> Min Yüksek (4)

        compIndex = Math.max(1, Math.min(5, compIndex));

        const compValues = [1, 2, 3, 5, 8];
        const newComplexity = compValues[compIndex - 1];

        currentComplexity = newComplexity;
        selectButtonByValue(complexityGroup, newComplexity);

        // Risk (Use Fibonacci)
        let riskIndex = integrationScore;

        // Custom Rule: Frontend impact on Risk
        if (frontendScore === 4) riskIndex = Math.max(riskIndex, 2);
        else if (frontendScore === 5) riskIndex = Math.max(riskIndex, 3);

        // Custom Rule: Backend impact on Risk
        if (backendScore === 4) riskIndex = Math.max(riskIndex, 2);
        else if (backendScore === 5) riskIndex = Math.max(riskIndex, 3);

        const riskValues = [1, 2, 3, 5, 8];
        const newRisk = riskValues[riskIndex - 1];

        currentRisk = newRisk;
        selectButtonByValue(riskGroup, newRisk);
    }

    function selectButtonByValue(group, val) {
        if (!group) return;
        const buttons = Array.from(group.querySelectorAll('.selection-btn'));
        const targetBtn = buttons.find(b => Math.abs(parseFloat(b.getAttribute('data-value')) - val) < 0.01);

        if (targetBtn) {
            updateActiveButton(group, targetBtn);
            const descEl = group.parentElement.querySelector('.factor-description');
            if (descEl && targetBtn.hasAttribute('data-desc')) {
                updateDescription(descEl, targetBtn.getAttribute('data-desc'));
            }
        }
    }

    // --- CALCULATION ---
    calculateBtn.addEventListener('click', calculateEstimates);

    function calculateEstimates() {
        if (currentVolume === 0) {
            alert("Hata: Hesaplama yapılamadı.");
            return;
        }

        // Use the new weighted calculation method
        const result = calculateStory(currentVolume, currentComplexity, currentRisk);
        const storyPoint = result.sp || 13;
        const weightedHours = result.estimatedHours || 0;
        const manDays = weightedHours / 7;

        // Calculate simplified fill percentage based on SP for progress bar
        let fillPercentage = 0;
        if (storyPoint <= 1) fillPercentage = 10;
        else if (storyPoint <= 2) fillPercentage = 30;
        else if (storyPoint <= 3) fillPercentage = 50;
        else if (storyPoint <= 5) fillPercentage = 70;
        else if (storyPoint <= 8) fillPercentage = 85;
        else fillPercentage = 100;

        spValue.textContent = storyPoint;
        mdValue.textContent = manDays.toFixed(1);
        hoursValue.textContent = weightedHours.toFixed(1) + ' sa';

        // Show Assign Button
        document.getElementById('assignBtn').style.display = 'flex';

        // --- FUN MESSAGE LOGIC ---
        const funMessageEl = document.getElementById('funMessage');
        const funAvatarEl = document.getElementById('funAvatar');

        let message = "";
        let avatar = "🤖";

        // Define styles per level
        const container = document.querySelector('.fun-container-wide');

        if (storyPoint <= 2) {
            avatar = "😎"; // Cool
            container.style.background = "#f0fdf4";
            container.style.borderColor = "#bbf7d0";
            container.querySelector('.fun-message-bubble').style.color = "#15803d";

            const msgs = [
                "Çerez niyetine biter bu! 🍪",
                "Öğle yemeğinden önce 'Done'.",
                "Bunu yaparken kahve soğumaz.",
                "Ctrl+C Ctrl+V ile çözülür gibi.",
                "Stand-up’ta anlatması 10 saniye.",
                "Refactor bile sayılmaz 😎",
                "Junior’a versek o bile yapar (şaka şaka).",
                "Test yazması implementten uzun sürer.",
                "Issue açılır, issue kapanır.",
                "Bu task backlog’da fazla bile durmuş."
            ];
            message = msgs[Math.floor(Math.random() * msgs.length)];

        } else if (storyPoint <= 5) {
            avatar = "☕"; // Coffee
            container.style.background = "#eff6ff";
            container.style.borderColor = "#bfdbfe";
            container.querySelector('.fun-message-bubble').style.color = "#1d4ed8";

            const msgs = [
                "Standart bir iş, kahveni al başla ☕",
                "Biraz terletir ama gün içinde biter.",
                "Temiz kod yazmak için güzel fırsat.",
                "2 commit, 1 PR, bol yorum.",
                "Bug çıkar ama sürpriz değil.",
                "Test yazmazsak yarın ağlarız.",
                "Akşam deploy’a yetişir.",
                "PO’ya anlatması 1 slide.",
                "Refactor dürtüsü gelecek, diren.",
                "Bu iş tam sprintlik."
            ];
            message = msgs[Math.floor(Math.random() * msgs.length)];

        } else if (storyPoint <= 8) {
            avatar = "🤔"; // Thinking
            container.style.background = "#fff7ed";
            container.style.borderColor = "#fed7aa";
            container.querySelector('.fun-message-bubble').style.color = "#c2410c";

            const msgs = [
                "Ciddi iş, kulaklığı takma vakti 🎧",
                "Toplantıları iptal etsek iyi olur.",
                "Stack Overflow sekmeleri hazırlansın!",
                "Burada edge case kaynıyor.",
                "‘Bir şey daha ekleyelim’ denecek.",
                "Debug modu: ON 🧠",
                "Bu story grooming isterdi sanki.",
                "PR review uzun sürecek.",
                "Test senaryosu yazarken yorulursun.",
                "Done tanımı tartışmaya açık 😅"
            ];
            message = msgs[Math.floor(Math.random() * msgs.length)];

        } else {
            avatar = "🔥"; // Fire
            container.style.background = "#fef2f2";
            container.style.borderColor = "#fecaca";
            container.querySelector('.fun-message-bubble').style.color = "#b91c1c";

            const msgs = [
                "Bunu sprint’e sığdırmak yürek ister 🚀",
                "Haftasonu mesaisi loading… 💀",
                "Ejderha ile savaşmaya hazır mısın? 🐉",
                "Burada teknik borç doğar.",
                "PO ‘küçük bir şey’ dedi, biz inandık.",
                "Prod’da patlama ihtimali var 🔥",
                "Rollback planı hazır mı?",
                "Bu işten sonra tatil şart.",
                "Legacy kod seni izliyor 👀",
                "Bunu bitiren kişi sprint kahramanı olur 🏆"
            ];
            message = msgs[Math.floor(Math.random() * msgs.length)];
        }

        if (funMessageEl) funMessageEl.textContent = message;
        if (funAvatarEl) funAvatarEl.textContent = avatar;

        setTimeout(() => {
            if (rangeFill) rangeFill.style.width = fillPercentage + '%';
        }, 100);
    }

    function calculateStory(H, K, R) {
        // Ağırlıklar
        const W_H = 0.26;
        const W_K = 0.34;
        const W_R = 0.40;
        const SCALE = 1.375;

        // 1️⃣ Skor
        const baseScore = (H * W_H) + (K * W_K) + (R * W_R);
        const score = baseScore * SCALE;

        // 2️⃣ SP + skor/saat aralıkları
        const ranges = [
            { sp: 1, sMin: 1.38, sMax: 2.00, hMin: 1, hMax: 4 },
            { sp: 2, sMin: 2.01, sMax: 3.20, hMin: 4, hMax: 14 },
            { sp: 3, sMin: 3.21, sMax: 4.60, hMin: 14, hMax: 28 },
            { sp: 5, sMin: 4.61, sMax: 6.50, hMin: 28, hMax: 47 },
            { sp: 8, sMin: 6.51, sMax: 8.80, hMin: 47, hMax: 63 },
            { sp: 13, sMin: 8.81, sMax: 11.0, hMin: 63, hMax: 85 }
        ];

        const bucket = ranges.find(r => score <= r.sMax);

        // 3️⃣ Lineer saat hesaplama
        const ratio = (score - bucket.sMin) / (bucket.sMax - bucket.sMin);
        let estimatedHours = bucket.hMin + ratio * (bucket.hMax - bucket.hMin);
        estimatedHours = Math.max(1, estimatedHours);

        return {
            key: `${H}${K}${R}`,
            score: Number(score.toFixed(2)),
            sp: bucket.sp,
            estimatedHours: Number(estimatedHours.toFixed(1))
        };
    }


    // --- TASK ASSIGNMENT LOGIC ---

    // 1. Team Data State
    let teamMembers = JSON.parse(localStorage.getItem('AW_TEAM_MEMBERS')) || [];

    const assignBtn = document.getElementById('assignBtn');
    const assignModal = document.getElementById('assignModal');
    const cancelAssignBtn = document.getElementById('cancelAssignBtn');
    const confirmAssignBtn = document.getElementById('confirmAssignBtn');

    // Dashboard Elements
    const viewDashboardBtn = document.getElementById('viewDashboardBtn');
    const dashboardModal = document.getElementById('dashboardModal');
    const closeDashboardBtn = document.getElementById('closeDashboardBtn');
    const resetTeamBtn = document.getElementById('resetTeamBtn');

    // Add Member Elements
    const addMemberBtn = document.getElementById('addMemberBtn');
    const newMemberName = document.getElementById('newMemberName');

    const taskTitleInput = document.getElementById('taskTitleInput');
    const assigneeSelect = document.getElementById('assigneeSelect');
    const manualSelectGroup = document.getElementById('manualSelectGroup');

    // 2. Modal Handling
    // Assignment Modal
    assignBtn.addEventListener('click', () => {
        if (teamMembers.length === 0) {
            alert("Atama yapabilmek için önce 'Ekip Durumu' panelinden ekip üyesi eklemelisiniz!");
            return;
        }
        assignModal.style.display = 'flex';
        renderAssigneeOptions();
    });

    cancelAssignBtn.addEventListener('click', () => {
        assignModal.style.display = 'none';
    });

    // Dashboard Modal Logic
    if (viewDashboardBtn) {
        viewDashboardBtn.addEventListener('click', () => {
            dashboardModal.style.display = 'flex';
            renderTeamDashboard();
        });
    }

    if (closeDashboardBtn) {
        closeDashboardBtn.addEventListener('click', () => {
            dashboardModal.style.display = 'none';
        });
    }

    // Add New Member Logic
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => {
            const name = newMemberName.value.trim();
            if (name) {
                const newId = teamMembers.length > 0 ? Math.max(...teamMembers.map(m => m.id)) + 1 : 1;
                teamMembers.push({
                    id: newId,
                    name: name,
                    tasks: [],
                    totalSP: 0,
                    totalHours: 0
                });
                saveTeamData();
                renderTeamDashboard();
                renderAssigneeOptions();
                newMemberName.value = '';
            } else {
                alert("Lütfen bir isim girin.");
            }
        });
    }

    // Toggle Manual Select
    const radioButtons = document.querySelectorAll('input[name="assignMethod"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            manualSelectGroup.style.display = e.target.value === 'manual' ? 'block' : 'none';
        });
    });

    function renderAssigneeOptions() {
        assigneeSelect.innerHTML = '';
        teamMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = `${member.name} (Yük: ${member.totalSP} SP)`;
            assigneeSelect.appendChild(option);
        });
    }

    // 3. Confirm Assignment
    confirmAssignBtn.addEventListener('click', () => {
        const title = taskTitleInput.value.trim() || "İsimsiz Görev";
        const spText = spValue.textContent;
        const sp = spText === '?' ? 0 : parseInt(spText); // Default 0 if not calculated
        const hoursText = hoursValue.textContent;
        const hours = hoursText === '?' ? 0 : parseFloat(hoursText);

        if (sp === 0) {
            alert("Lütfen önce bir tahmin hesaplayın!");
            return;
        }

        const method = document.querySelector('input[name="assignMethod"]:checked').value;
        let selectedMemberId;

        if (method === 'auto') {
            // Find member with lowest SP load
            const sortedMembers = [...teamMembers].sort((a, b) => a.totalSP - b.totalSP);
            selectedMemberId = sortedMembers[0].id;
        } else {
            selectedMemberId = parseInt(assigneeSelect.value);
        }

        assignTaskToMember(selectedMemberId, {
            title: title,
            sp: sp,
            hours: hours,
            date: new Date().toLocaleDateString('tr-TR')
        });

        // alert("Görev başarıyla atandı!");
        assignModal.style.display = 'none';
        taskTitleInput.value = ''; // Reset input
    });

    function assignTaskToMember(memberId, task) {
        const member = teamMembers.find(m => m.id === memberId);
        if (member) {
            member.tasks.push(task);
            member.totalSP += task.sp;
            member.totalHours += task.hours;
            saveTeamData();
            renderTeamDashboard();
        }
    }

    function saveTeamData() {
        localStorage.setItem('AW_TEAM_MEMBERS', JSON.stringify(teamMembers));
    }

    // 4. Render Dashboard
    function renderTeamDashboard() {
        const grid = document.getElementById('teamGrid');
        if (!grid) return;

        grid.innerHTML = '';

        // Calculate Min/Max for highlights
        const spValues = teamMembers.map(m => m.totalSP);
        const maxSP = spValues.length ? Math.max(...spValues) : 0;
        const minSP = spValues.length ? Math.min(...spValues) : 0;
        // Highlight logic: Only if we have multiple people, there is some load, and there is a difference
        const shouldHighlight = teamMembers.length > 1 && maxSP > 0 && maxSP !== minSP;

        teamMembers.forEach(member => {
            const card = document.createElement('div');
            card.classList.add('member-card');

            if (shouldHighlight) {
                if (member.totalSP === maxSP) card.classList.add('max-load');
                else if (member.totalSP === minSP) card.classList.add('min-load');
            }

            let taskListHTML = '';
            member.tasks.forEach(t => {
                taskListHTML += `
                    <li class="task-item">
                        <span>${t.title}</span>
                        <span class="sp-badge">${t.sp} SP</span>
                    </li>
                `;
            });

            if (member.tasks.length === 0) {
                taskListHTML = '<li class="task-item" style="justify-content:center;">Henüz görev yok</li>';
            }

            card.innerHTML = `
                <div class="member-header">
                    <span class="member-name">${member.name}</span>
                    <span class="member-load">${member.totalSP} SP (${member.totalHours.toFixed(1)} sa)</span>
                </div>
                <ul class="task-list">
                    ${taskListHTML}
                </ul>
            `;
            grid.appendChild(card);
        });
    }

    // Reset Team Data
    if (resetTeamBtn) {
        resetTeamBtn.addEventListener('click', () => {
            if (confirm("Tüm atamaları ve ekip verilerini sıfırlamak istiyor musunuz?")) {
                teamMembers = [];
                saveTeamData();
                renderTeamDashboard();
            }
        });
    }

    // Initialize Dashboard
    renderTeamDashboard();

    // Defaults
    selectButtonByValue(frontendGroup, 1);
    selectButtonByValue(backendGroup, 1);
    selectButtonByValue(integrationGroup, 1);
    applyHeuristicMapping();
});
