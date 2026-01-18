document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const poolList = document.getElementById('poolList');
    const morningList = document.getElementById('morningList');
    const afternoonList = document.getElementById('afternoonList');
    const exportBtn = document.getElementById('exportBtn');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    // Load Data
    let planData = JSON.parse(localStorage.getItem('DAILY_PLAN_DATA')) || {
        pool: [],
        morning: [],
        afternoon: []
    };

    // Data Migration: Convert strings to objects if necessary
    ['pool', 'morning', 'afternoon'].forEach(slot => {
        planData[slot] = planData[slot].map(item => {
            if (typeof item === 'string') {
                return { text: item, completed: false };
            }
            return item;
        });
    });

    function save() {
        localStorage.setItem('DAILY_PLAN_DATA', JSON.stringify(planData));
        updateProgress();
    }

    function render() {
        renderList(poolList, planData.pool, 'pool');
        renderList(morningList, planData.morning, 'morning');
        renderList(afternoonList, planData.afternoon, 'afternoon');
        updateProgress();
    }

    function renderList(element, items, slotName) {
        element.innerHTML = '';
        items.forEach((task, index) => {
            const div = document.createElement('div');
            div.className = 'draggable-task';
            if (task.completed) {
                div.style.opacity = '0.6';
                div.style.textDecoration = 'line-through';
                div.style.background = '#f1f5f9';
            }
            div.draggable = true;

            // Checkbox logic
            const checkboxIcon = task.completed ? 'checkbox-outline' : 'square-outline';

            // Only allow toggling if NOT in pool
            const isPool = slotName === 'pool';
            const toggleButtonInfo = isPool
                ? `<span style="color:var(--text-muted); font-size:1.2rem; display:flex; align-items:center; opacity:0.5;"><ion-icon name="ellipse-outline"></ion-icon></span>`
                : `<button onclick="toggleTask('${slotName}', ${index})" style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:1.2rem; display:flex; align-items:center;"><ion-icon name="${checkboxIcon}"></ion-icon></button>`;

            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
                    ${toggleButtonInfo}
                    <span style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${task.text}</span>
                </div>
                <div class="task-actions">
                    <button onclick="removeTask('${slotName}', ${index})">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
            `;

            // Drag Events
            div.addEventListener('dragstart', (e) => {
                div.classList.add('dragging');
                e.dataTransfer.setData('text/plain', JSON.stringify({ slot: slotName, index: index }));
            });

            div.addEventListener('dragend', () => {
                div.classList.remove('dragging');
            });

            element.appendChild(div);
        });
    }

    // Add Task
    function addTask() {
        const text = taskInput.value.trim();
        if (text) {
            planData.pool.push({ text: text, completed: false });
            save();
            render();
            taskInput.value = '';
        }
    }

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Global Functions
    window.removeTask = function (slot, index) {
        planData[slot].splice(index, 1);
        save();
        render();
    };

    window.toggleTask = function (slot, index) {
        planData[slot][index].completed = !planData[slot][index].completed;
        save();
        render();
    };

    // Calculate Progress (Morning + Afternoon)
    function updateProgress() {
        const scheduledTasks = [...planData.morning, ...planData.afternoon];
        const total = scheduledTasks.length;

        if (total === 0) {
            progressBar.style.width = '0%';
            progressText.textContent = '%0';
            return;
        }

        const completed = scheduledTasks.filter(t => t.completed).length;
        const percent = Math.round((completed / total) * 100);

        progressBar.style.width = `${percent}%`;
        progressText.textContent = `%${percent}`;

        // Dynamic Color Coloring
        if (percent < 30) {
            progressBar.style.background = '#ef4444'; // Red
        } else if (percent < 70) {
            progressBar.style.background = '#f59e0b'; // Orange
        } else {
            progressBar.style.background = '#10b981'; // Green
        }
    }

    // Drop Logic
    [poolList, morningList, afternoonList].forEach(list => {
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            list.classList.add('drag-over');
        });

        list.addEventListener('dragleave', () => {
            list.classList.remove('drag-over');
        });

        list.addEventListener('drop', (e) => {
            e.preventDefault();
            list.classList.remove('drag-over');

            const rawData = e.dataTransfer.getData('text/plain');
            if (!rawData) return;

            const source = JSON.parse(rawData);

            let finalTarget = 'pool';
            if (list.id === 'morningList') finalTarget = 'morning';
            if (list.id === 'afternoonList') finalTarget = 'afternoon';

            if (source.slot === finalTarget) return;

            // Move item object
            const item = planData[source.slot].splice(source.index, 1)[0];
            planData[finalTarget].push(item);

            save();
            render();
        });
    });

    // Export Logic
    exportBtn.addEventListener('click', () => {
        const date = new Date().toLocaleDateString('tr-TR');
        let text = `📅 *Günlük Plan - ${date}* (Tamamlanma: ${progressText.textContent})\n\n`;

        text += `🌅 *Sabah*\n`;
        if (planData.morning.length === 0) text += `_Plan yok_\n`;
        planData.morning.forEach(t => {
            const check = t.completed ? '✅' : '⬜';
            text += `${check} ${t.text}\n`;
        });

        text += `\n☀️ *Öğleden Sonra*\n`;
        if (planData.afternoon.length === 0) text += `_Plan yok_\n`;
        planData.afternoon.forEach(t => {
            const check = t.completed ? '✅' : '⬜';
            text += `${check} ${t.text}\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
            alert('Plan kopyalandı! Slack/Teams\'e yapıştırabilirsin.');
        });
    });

    // Reset Logic
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', () => {
        if (confirm('Tüm planı silmek ve günü sıfırlamak istediğine emin misin?')) {
            planData = {
                pool: [],
                morning: [],
                afternoon: []
            };
            save();
            render();
        }
    });

    // Initial Render
    render();
});
