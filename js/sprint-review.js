document.addEventListener('DOMContentLoaded', () => {
    const agendaInput = document.getElementById('agendaInput');
    const addAgendaBtn = document.getElementById('addAgendaBtn');
    const agendaList = document.getElementById('agendaList');

    function addAgendaItem() {
        const text = agendaInput.value.trim();
        if (!text) return;

        const label = document.createElement('label');
        label.className = 'check-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';

        const span = document.createElement('span');
        span.className = 'check-text';
        span.textContent = text;

        label.appendChild(checkbox);
        label.appendChild(span);

        agendaList.appendChild(label);

        agendaInput.value = '';
    }

    addAgendaBtn.addEventListener('click', addAgendaItem);

    agendaInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addAgendaItem();
        }
    });
});
