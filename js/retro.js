document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
});

function handleKeyPress(event, type) {
    if (event.key === 'Enter') {
        addNote(type);
    }
}

function addNote(type) {
    // Find input relative to the button or hardcode based on type logic if simple
    // Here we use type to find the specific input
    const container = document.querySelector(`#col-${type}`);
    const input = container.querySelector('input');
    const text = input.value.trim();

    if (!text) return;

    // Create Note Object
    const note = {
        id: Date.now(),
        text: text,
        type: type,
        timestamp: new Date().toISOString()
    };

    // Save to LocalStorage
    saveNoteToStorage(note);

    // Render Logic
    renderNote(note);

    // Clear Input
    input.value = '';
    input.focus();
}

function renderNote(note) {
    const listId = `notes-${note.type}`;
    const list = document.getElementById(listId);

    const div = document.createElement('div');
    div.className = `note-card note-${note.type}`;
    div.setAttribute('data-id', note.id);

    div.innerHTML = `
        ${escapeHtml(note.text)}
        <button class="delete-note" onclick="deleteNote(${note.id}, '${note.type}')">
            <ion-icon name="close-circle-outline"></ion-icon>
        </button>
    `;

    // Prepend to show newest first
    list.prepend(div);
}

function saveNoteToStorage(note) {
    const notes = getNotesFromStorage();
    notes.push(note);
    localStorage.setItem('retro_notes', JSON.stringify(notes));
}

function getNotesFromStorage() {
    const json = localStorage.getItem('retro_notes');
    return json ? JSON.parse(json) : [];
}

function loadNotes() {
    const notes = getNotesFromStorage();
    // Sort by timestamp
    notes.sort((a, b) => a.id - b.id); // Oldest first, but we prepend, so newest ends up top if we iterate

    notes.forEach(note => {
        renderNote(note);
    });
}

function deleteNote(id, type) {
    // Remove from UI
    const card = document.querySelector(`.note-card[data-id="${id}"]`);
    if (card) {
        card.remove();
    }

    // Remove from Storage
    const notes = getNotesFromStorage();
    const filtered = notes.filter(n => n.id !== id);
    localStorage.setItem('retro_notes', JSON.stringify(filtered));
}

function clearAllNotes() {
    if (confirm('Tüm notları silmek istediğine emin misin?')) {
        localStorage.removeItem('retro_notes');
        document.querySelectorAll('.notes-area').forEach(area => area.innerHTML = '');
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

/* --- EXPORT FUNCTIONS --- */

function openExportModal() {
    const preview = document.getElementById('exportPreview');
    preview.innerHTML = generateExportHTML();
    document.getElementById('exportModal').style.display = 'flex';
}

function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

function generateExportHTML(forWord = false) {
    const notes = getNotesFromStorage();
    const categories = {
        well: { title: '🟢 İyi Gidenler', color: '#15803d', list: [] },
        improve: { title: '🟠 Geliştirilmeli', color: '#c2410c', list: [] },
        action: { title: '🔵 Aksiyonlar', color: '#1e40af', list: [] }
    };

    notes.forEach(note => {
        if (categories[note.type]) {
            categories[note.type].list.push(note.text);
        }
    });

    let html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #333; border-bottom: 2px solid #ccc; padding-bottom: 10px;">Sprint Retro Raporu</h1>
            <p style="color: #666; margin-bottom: 20px;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
    `;

    Object.keys(categories).forEach(key => {
        const cat = categories[key];
        if (cat.list.length > 0) {
            html += `
                <div style="margin-bottom: 20px;">
                    <h3 style="color: ${cat.color}; border-bottom: 1px solid #eee; padding-bottom: 5px;">${cat.title}</h3>
                    <ul style="padding-left: 20px;">
                        ${cat.list.map(text => `<li style="margin-bottom: 5px;">${escapeHtml(text)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    });

    html += '</div>';
    return html;
}

function copyToClipboard() {
    const htmlContent = generateExportHTML();

    // Create a Blob for Rich Text
    const blobHtml = new Blob([htmlContent], { type: 'text/html' });
    const blobText = new Blob([document.getElementById('exportPreview').innerText], { type: 'text/plain' });

    const data = [new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
    })];

    navigator.clipboard.write(data).then(() => {
        alert('Rapor panoya kopyalandı! Mailinize yapıştırabilirsiniz.');
    }).catch(err => {
        console.error(err);
        alert('Kopyalama başarısız oldu.');
    });
}

function downloadWord() {
    const htmlContent = generateExportHTML(true);

    // Add standard HTML wrapping for Word to interpret correctly
    const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Retro Raporu</title></head>
        <body>${htmlContent}</body>
        </html>
    `;

    const blob = new Blob([wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `Retro_Raporu_${new Date().toLocaleDateString('tr-TR')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
