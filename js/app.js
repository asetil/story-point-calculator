/**
 * Simple Storage Wrapper for mocking backend persistence
 */
class IncidentStorage {
    constructor() {
        this.STORAGE_KEY = 'incident_wiki_data';
    }

    getAll() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    saveBox(incident) {
        const incidents = this.getAll();
        // Add timestamp and ID
        incident.id = Date.now().toString(); // Simple ID
        incident.createdAt = new Date().toISOString();

        incidents.unshift(incident); // Add to top
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(incidents));
        return incident;
    }

    search(query) {
        const incidents = this.getAll();
        if (!query) return incidents;

        const lowerQuery = query.toLowerCase();
        return incidents.filter(item =>
            item.jiraId.toLowerCase().includes(lowerQuery) ||
            item.title.toLowerCase().includes(lowerQuery) ||
            item.tags.toLowerCase().includes(lowerQuery) ||
            (item.notes && item.notes.toLowerCase().includes(lowerQuery))
        );
    }
}

/**
 * UI Controller
 */
class AppUI {
    constructor() {
        this.storage = new IncidentStorage();
        this.form = document.getElementById('incidentForm');
        this.searchInput = document.getElementById('searchInput');
        this.form = document.getElementById('incidentForm');
        this.searchInput = document.getElementById('searchInput');
        this.resultsList = document.getElementById('resultsList');
        this.detailContent = document.getElementById('detailContent');

        // Modal Elements
        this.modal = document.getElementById('modalOverlay');
        this.btnOpen = document.getElementById('btnOpenModal');
        this.btnClose = document.getElementById('btnCloseModal');
        this.btnCancel = document.getElementById('btnCancel');

        this.init();
    }

    init() {
        // Load demo data if empty
        if (this.storage.getAll().length === 0) {
            this.loadDemoData();
        }

        // Load initial data
        this.renderList(this.storage.getAll());

        // Event Listeners
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));

        // Modal Listeners
        this.btnOpen.addEventListener('click', () => this.toggleModal(true));
        this.btnClose.addEventListener('click', () => this.toggleModal(false));
        this.btnCancel.addEventListener('click', () => this.toggleModal(false));

        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.toggleModal(false);
        });
    }

    toggleModal(show) {
        if (show) {
            this.modal.classList.remove('hidden');
        } else {
            this.modal.classList.add('hidden');
        }
    }

    loadDemoData() {
        const demoData = [
            { id: '1', jiraId: 'JIRA-101', title: 'Login Timeout Hatası', notes: 'Sunucu logları incelendi, 504 Gateway Timeout görüldü. Veritabanı bağlantı havuzu dolmuş. Config dosyasında max pool size artırıldı.', tags: 'veritabanı, timeout', createdAt: new Date().toISOString() },
            { id: '2', jiraId: 'JIRA-102', title: 'Ödeme Sayfasında NullReference', notes: 'Stack trace null user object işaret ediyor. Kullanıcı oturumu null kontrolü yapılmadan kullanılmış. Null kontrolü ve varsayılan değer atandı.', tags: 'bug, null-pointer', createdAt: new Date(Date.now() - 86400000).toISOString() }
        ];
        localStorage.setItem(this.storage.STORAGE_KEY, JSON.stringify(demoData));
    }

    handleSubmit(e) {
        e.preventDefault();

        const formData = {
            jiraId: document.getElementById('jiraId').value,
            title: document.getElementById('title').value,
            notes: document.getElementById('notes').value,
            tags: document.getElementById('tags').value
        };

        this.storage.saveBox(formData);

        // Reset form and refresh list
        this.form.reset();
        this.renderList(this.storage.getAll());
        this.toggleModal(false); // Close modal
        // Optional: Show success animation/toast (simple alert for now)
        // alert('Record saved!'); 
    }

    handleSearch(e) {
        const query = e.target.value;
        const results = this.storage.search(query);
        this.renderList(results);
    }

    renderList(incidents) {
        this.resultsList.innerHTML = '';

        if (incidents.length === 0) {
            this.resultsList.innerHTML = `
                <div class="empty-state">
                    <ion-icon name="search-outline"></ion-icon>
                    <p>Kayıt bulunamadı.</p>
                </div>
            `;
            // Also clear detail view if list is filtered to empty?
            // Maybe not, keep looking at selected doc while searching others.
            return;
        }

        incidents.forEach(incident => {
            const card = document.createElement('div');
            card.className = 'incident-card';
            card.innerHTML = `
                <div class="card-header">
                    <span class="jira-id">${incident.jiraId}</span>
                    <span class="card-date">${new Date(incident.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="card-title">${incident.title}</div>
                <div class="card-preview">
                    ${incident.notes || 'Detay girilmedi.'}
                </div>
            `;

            // Interaction: Click to view details
            card.addEventListener('click', () => {
                this.selectIncident(incident);
            });

            this.resultsList.appendChild(card);
        });
    }


    selectIncident(incident) {
        // Highlight selected card (optional, but good UX - requires keeping ref to cards)
        // For now just render detail

        const tagsHtml = incident.tags.split(',').map(tag => `<span class="tag-badge">#${tag.trim()}</span>`).join('');

        this.detailContent.innerHTML = `
             <div class="doc-header">
                <div class="doc-meta">
                    <span class="doc-id">${incident.jiraId}</span>
                    <span class="doc-date">${new Date(incident.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
                <h1 class="doc-title">${incident.title}</h1>
            </div>

            <div class="doc-section">
                <h3>İnceleme Notları</h3>
                <div class="doc-content">${incident.notes || 'Detay girilmedi.'}</div>
            </div>

            <div class="doc-tags">
                ${tagsHtml}
            </div>
        `;
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    new AppUI();
});
