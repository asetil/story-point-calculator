document.addEventListener('DOMContentLoaded', () => {
    const circle = document.querySelector('.progress-ring__circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;

    // UI Elements
    const timeDisplay = document.getElementById('timeDisplay');
    const statusText = document.getElementById('statusText');
    const btnToggle = document.getElementById('btnToggle');
    const btnReset = document.getElementById('btnReset');
    const durationInput = document.getElementById('durationInput');
    const timerTextContainer = document.querySelector('.timer-text');

    // Setup Circle
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = 0;

    let duration = parseInt(durationInput.value) * 60;
    let timeLeft = duration;
    let timerInterval = null;
    let isRunning = false;

    // Load sound (optional, browser policy dependent, keeping silent config for now or using visual only)

    function setProgress(percent) {
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function updateDisplay() {
        timeDisplay.textContent = formatTime(timeLeft);
        const percent = (timeLeft / duration) * 100;
        setProgress(percent);

        // Visual Colors
        if (timeLeft <= 10) {
            circle.classList.add('danger');
            timerTextContainer.classList.add('danger');
        } else {
            circle.classList.remove('danger');
            timerTextContainer.classList.remove('danger');
        }
    }

    function startTimer() {
        if (isRunning) return;

        isRunning = true;
        statusText.textContent = "Konuşuyor...";
        btnToggle.innerHTML = '<ion-icon name="pause-outline"></ion-icon> Duraklat';
        btnToggle.classList.add('paused');

        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateDisplay();
            } else {
                clearInterval(timerInterval);
                isRunning = false;
                statusText.textContent = "Süre Doldu!";
                // Here we could play a sound
                flashScreen();
            }
        }, 1000);
    }

    function pauseTimer() {
        if (!isRunning) return;

        clearInterval(timerInterval);
        isRunning = false;
        statusText.textContent = "Duraklatıldı";
        btnToggle.innerHTML = '<ion-icon name="play-outline"></ion-icon> Devam Et';
        btnToggle.classList.remove('paused');
    }

    function resetTimer() {
        pauseTimer();
        duration = parseInt(durationInput.value) * 60;
        timeLeft = duration;
        statusText.textContent = "Hazır";
        btnToggle.innerHTML = '<ion-icon name="play-outline"></ion-icon> Başlat';
        circle.classList.remove('danger');
        timerTextContainer.classList.remove('danger');
        updateDisplay();
    }

    function toggleTimer() {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    function flashScreen() {
        // Visual alarm
        let count = 0;
        const flashInterval = setInterval(() => {
            document.body.style.backgroundColor = count % 2 === 0 ? '#450a0a' : '#0f172a';
            count++;
            if (count > 5) {
                clearInterval(flashInterval);
                document.body.style.backgroundColor = '';
            }
        }, 300);
    }

    // Event Listeners
    btnToggle.addEventListener('click', toggleTimer);
    btnReset.addEventListener('click', resetTimer);

    durationInput.addEventListener('change', () => {
        if (!isRunning) {
            // Only update duration if not currently running to avoid jumps
            resetTimer();
        }
    });

    // Initialize
    updateDisplay();
});
