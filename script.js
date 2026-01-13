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

    let currentVolume = 8;
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
        // Volume
        const volIndex = Math.max(frontendScore, backendScore);
        const volValues = [1, 4, 8, 16, 24]; // Updated min volume to 1 for 0.1 MD
        const newVolume = volValues[volIndex - 1];

        currentVolume = newVolume;
        selectButtonByValue(volumeGroup, newVolume);

        // Complexity
        const avgScore = Math.round((frontendScore + backendScore + integrationScore) / 3);
        const compIndex = Math.max(1, Math.min(5, avgScore));
        const compValues = [0.7, 0.9, 1.1, 1.5, 2.0];
        const newComplexity = compValues[compIndex - 1];

        currentComplexity = newComplexity;
        selectButtonByValue(complexityGroup, newComplexity);

        // Risk
        const riskIndex = integrationScore;
        const riskValues = [1.0, 1.1, 1.2, 1.5, 1.8];
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

        let weightedHours = currentVolume * currentComplexity * currentRisk;
        let storyPoint = 0;
        let fillPercentage = 0;

        for (const threshold of spThresholds) {
            if (weightedHours <= threshold.max) {
                storyPoint = threshold.sp;
                fillPercentage = threshold.rangePerc;
                break;
            }
            if (threshold.max === Infinity) {
                storyPoint = threshold.sp;
                fillPercentage = threshold.rangePerc;
            }
        }

        const manDays = weightedHours / 7;

        spValue.textContent = storyPoint;
        mdValue.textContent = manDays.toFixed(1);
        hoursValue.textContent = weightedHours.toFixed(1) + ' sa';

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

    // Defaults
    selectButtonByValue(frontendGroup, 1);
    selectButtonByValue(backendGroup, 1);
    selectButtonByValue(integrationGroup, 1);
    applyHeuristicMapping();
});
