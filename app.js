// State Management (LocalStorage Simulation)
let currentUser = null;
let currentProjectId = null;
let currentReportId = null; // null if creating a new one

// Mock Database initializers
if (!localStorage.getItem('users')) localStorage.setItem('users', JSON.stringify({}));
if (!localStorage.getItem('projects')) localStorage.setItem('projects', JSON.stringify([]));
if (!localStorage.getItem('reports')) localStorage.setItem('reports', JSON.stringify([]));
if (!localStorage.getItem('actors')) localStorage.setItem('actors', JSON.stringify([]));
if (!localStorage.getItem('lots')) localStorage.setItem('lots', JSON.stringify([]));

// Helpers
const getDb = (table) => JSON.parse(localStorage.getItem(table)) || [];
const saveDb = (table, data) => localStorage.setItem(table, JSON.stringify(data));
const generateId = () => Math.random().toString(36).substr(2, 9);

// DOM Elements
const views = {
  auth: document.getElementById('view-auth'),
  dashboard: document.getElementById('view-dashboard'),
  projectDetail: document.getElementById('view-project-detail'),
  generator: document.getElementById('view-generator'),
  actors: document.getElementById('view-actors'),
  lots: document.getElementById('view-lots')
};

// Setup Listeners on Load
document.addEventListener('DOMContentLoaded', () => {
  setupAuthListeners();
  setupDashboardListeners();
  setupProjectListeners();
  setupGeneratorListeners();
  setupActorListeners();
  setupLotListeners();
  
  // Check if already logged in conceptually
  const savedUserId = sessionStorage.getItem('activeUserId');
  if(savedUserId) {
      currentUser = getDb('users')[savedUserId];
      showView('dashboard');
      renderDashboard();
  } else {
      showView('auth');
  }
});

// --- View Router ---
function showView(viewId) {
  Object.values(views).forEach(el => el.classList.add('hidden'));
  views[viewId].classList.remove('hidden');
}

// --- 1. Auth Flow ---
function setupAuthListeners() {
  const authForm = document.getElementById('auth-form');
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    if(!email) return;

    // Direct Login (Simulation - always succeeds if email given)

    const users = getDb('users');
    let userId = Object.keys(users).find(id => users[id].email === email);
    
    // Auto-Register if not found
    if(!userId) {
      userId = generateId();
      users[userId] = { id: userId, email: email };
      saveDb('users', users);
    }

    currentUser = users[userId];
    sessionStorage.setItem('activeUserId', userId);
    
    showView('dashboard');
    renderDashboard();
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('activeUserId');
    currentUser = null;
    currentProjectId = null;
    showView('auth');
  });
}

// --- 2. Dashboard Flow ---
let currentProjectPhotoBase64 = '';

function setupDashboardListeners() {
  document.getElementById('project-photo-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (et) => {
      currentProjectPhotoBase64 = et.target.result;
      const preview = document.getElementById('project-photo-preview');
      preview.src = currentProjectPhotoBase64;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('create-project-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('new-project-name');
    const name = nameInput.value.trim();
    if(!name) return;

    const projects = getDb('projects');
    const newProject = { 
      id: generateId(), 
      name: name, 
      userId: currentUser.id, 
      createdAt: new Date().toISOString(),
      coverPhoto: currentProjectPhotoBase64
    };
    projects.push(newProject);
    saveDb('projects', projects);
    
    // Reset Form
    nameInput.value = '';
    currentProjectPhotoBase64 = '';
    document.getElementById('project-photo-preview').classList.add('hidden');
    document.getElementById('project-photo-preview').src = '';
    document.getElementById('project-photo-upload').value = '';

    renderDashboard();
  });
}

function renderDashboard() {
  document.getElementById('user-display').textContent = currentUser.email;
  const list = document.getElementById('projects-list');
  const allProjects = getDb('projects').filter(p => p.userId === currentUser.id);
  
  list.innerHTML = '';
  if(allProjects.length === 0) {
    list.innerHTML = '<p class="subtitle">Aucun projet. Créez-en un ci-dessus.</p>';
    return;
  }

  // Sort by newest
  allProjects.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  allProjects.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'grid-card fade-in';
    const reportCount = getDb('reports').filter(r => r.projectId === proj.id).length;
    
    const coverHtml = proj.coverPhoto ? `<img src="${proj.coverPhoto}" class="project-cover">` : '';

    card.innerHTML = `
      ${coverHtml}
      <div class="grid-card-content">
        <h3>${proj.name}</h3>
        <p>${reportCount} Comptes rendus</p>
      </div>
    `;
    card.addEventListener('click', () => {
      currentProjectId = proj.id;
      showView('projectDetail');
      renderProjectDetail(proj);
    });
    list.appendChild(card);
  });
}

// --- 3. Project Detail Flow ---
function setupProjectListeners() {
  document.getElementById('back-to-dashboard').addEventListener('click', () => {
    currentProjectId = null;
    showView('dashboard');
    renderDashboard();
  });

  document.getElementById('create-report-btn').addEventListener('click', () => {
    // Inheritance Logic: find the last report for this project
    const reports = getDb('reports').filter(r => r.projectId === currentProjectId);
    reports.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const lastReport = reports[0];

    currentReportId = null; // New report
    resetGeneratorUI();

    if (lastReport && lastReport.data) {
        // Inherit non-closed observations
        const openEntries = (lastReport.data.entries || []).filter(e => !e.cloture);
        // Inherit checklists
        const checklists = lastReport.data.checklists || [];
        
        populateForm({ 
            attendance: [], // Attendance starts fresh
            entries: openEntries,
            checklists: checklists,
            meetingActions: [], // Usually fresh per meeting
            keyDates: lastReport.data.keyDates || [], // Dates usually persist
            transmissions: [] 
        });
    }

    showView('generator');
  });

  document.getElementById('edit-project-cover').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (et) => {
      const b64 = et.target.result;
      const projects = getDb('projects');
      const idx = projects.findIndex(p => p.id === currentProjectId);
      if(idx > -1) {
        projects[idx].coverPhoto = b64;
        saveDb('projects', projects);
        document.getElementById('detail-project-cover').src = b64;
        document.getElementById('detail-project-cover').classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderProjectDetail(proj) {
  document.getElementById('current-project-title').textContent = proj.name;
  
  const coverImg = document.getElementById('detail-project-cover');
  if(proj.coverPhoto) {
    coverImg.src = proj.coverPhoto;
    coverImg.classList.remove('hidden');
  } else {
    coverImg.src = '';
    coverImg.classList.add('hidden');
  }
  const list = document.getElementById('reports-list');
  const reports = getDb('reports').filter(r => r.projectId === proj.id);
  
  list.innerHTML = '';
  if(reports.length === 0) {
    list.innerHTML = '<p class="subtitle">Aucun compte rendu pour ce chantier.</p>';
    return;
  }

  reports.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  reports.forEach(r => {
    const dateStr = new Date(r.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
    const isSent = r.status === 'sent';
    const statusClass = isSent ? 'status-sent' : 'status-unsent';
    const statusText = isSent ? 'Envoyé' : 'Brouillon';

    const card = document.createElement('div');
    card.className = 'report-card fade-in';
    
    // Status Badge Click Handler
    const badgeHtml = `<span class="status-badge ${statusClass}" data-id="${r.id}" title="Cliquer pour changer le statut">${statusText}</span>`;

    card.innerHTML = `
      <div class="report-info">
        <h3>Compte Rendu - ${dateStr}</h3>
        <span>${r.data.observations.length} Observations • ${r.data.actions.length} Actions</span>
      </div>
      <div>${badgeHtml}</div>
    `;

    // Toggle Status Logic
    const badge = card.querySelector('.status-badge');
    badge.addEventListener('click', (e) => {
      e.stopPropagation(); // don't trigger the card click
      toggleReportStatus(r.id);
    });

    // View/Edit report Logic
    card.querySelector('.report-info').addEventListener('click', () => {
      currentReportId = r.id;
      resetGeneratorUI();
      populateForm(r.data); // load existing data
      // showView handles the visibility of the generator view correctly
      showView('generator');
    });

    list.appendChild(card);
  });
}

function toggleReportStatus(reportId) {
  const reports = getDb('reports');
  const r = reports.find(rep => rep.id === reportId);
  if(r) {
    if(r.status === 'unsent') {
      // Open distribution modal
      openDistributionModal(r.id);
    } else {
      // Mark unsent directly
      r.status = 'unsent';
      saveDb('reports', reports);
      const proj = getDb('projects').find(p => p.id === currentProjectId);
      renderProjectDetail(proj); 
    }
  }
}

// --- 3.5 Actor Management Flow ---
let currentActorPhotoBase64 = '';

function setupActorListeners() {
  document.getElementById('view-actors-btn').addEventListener('click', () => {
    showView('actors');
    renderActorsList();
  });

  document.getElementById('back-to-project-from-actors').addEventListener('click', () => {
    showView('projectDetail');
  });

  document.getElementById('add-actor-btn').addEventListener('click', () => {
    document.getElementById('actor-id').value = '';
    document.getElementById('actor-form').reset();
    document.getElementById('actor-photo-preview').classList.add('hidden');
    document.getElementById('actor-photo-placeholder').classList.remove('hidden');
    currentActorPhotoBase64 = '';
    
    document.getElementById('actor-modal-title').textContent = "Ajouter un acteur";
    document.getElementById('actor-modal').classList.remove('hidden');
  });

  // Photo Upload logic for Actor profile
  document.getElementById('actor-photo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (et) => {
      currentActorPhotoBase64 = et.target.result;
      const preview = document.getElementById('actor-photo-preview');
      preview.src = currentActorPhotoBase64;
      preview.classList.remove('hidden');
      document.getElementById('actor-photo-placeholder').classList.add('hidden');
    };
    reader.readAsDataURL(file);
  });

  // Custom Type visibility
  document.getElementById('actor-type').addEventListener('change', (e) => {
    const customInput = document.getElementById('actor-type-custom');
    if(e.target.value === 'Autre') {
      customInput.classList.remove('hidden');
      customInput.required = true;
    } else {
      customInput.classList.add('hidden');
      customInput.required = false;
    }
  });

  // Save Actor
  document.getElementById('actor-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('actor-id').value || generateId();
    let type = document.getElementById('actor-type').value;
    if(type === 'Autre') type = document.getElementById('actor-type-custom').value;

    const actor = {
      id: id,
      projectId: currentProjectId,
      type: type,
      company: document.getElementById('actor-company').value,
      firstname: document.getElementById('actor-firstname').value,
      lastname: document.getElementById('actor-lastname').value,
      role: document.getElementById('actor-role').value,
      email: document.getElementById('actor-email').value,
      phone: document.getElementById('actor-phone').value,
      mobile: document.getElementById('actor-mobile').value,
      address: document.getElementById('actor-address').value,
      zip: document.getElementById('actor-zip').value,
      city: document.getElementById('actor-city').value,
      photo: currentActorPhotoBase64
    };

    const actors = getDb('actors');
    const existingIndex = actors.findIndex(a => a.id === id);
    if(existingIndex > -1) {
      actors[existingIndex] = actor;
    } else {
      actors.push(actor);
    }
    saveDb('actors', actors);
    closeActorModal();
    renderActorsList();
  });

  // Distribution config confirmation
  document.getElementById('confirm-distribution-btn').addEventListener('click', () => {
    const reportId = document.getElementById('confirm-distribution-btn').dataset.reportId;
    const checkboxes = document.querySelectorAll('.dist-actor-checkbox:checked');
    const recipientIds = Array.from(checkboxes).map(cb => cb.value);

    // Update Report Status
    const reports = getDb('reports');
    const idx = reports.findIndex(r => r.id === reportId);
    if(idx > -1) {
      reports[idx].status = 'sent';
      reports[idx].recipients = recipientIds; // Save who it was sent to
      saveDb('reports', reports);
    }

    closeDocModal();
    const proj = getDb('projects').find(p => p.id === currentProjectId);
    renderProjectDetail(proj); // Update the badge
  });
}

function renderActorsList() {
  const list = document.getElementById('actors-list');
  const actors = getDb('actors').filter(a => a.projectId === currentProjectId);
  list.innerHTML = '';

  if(actors.length === 0) {
    list.innerHTML = '<p class="subtitle">Aucun acteur. Ajoutez-en un pour faciliter la distribution du CR.</p>';
    return;
  }

  actors.forEach(actor => {
    const card = document.createElement('div');
    card.className = 'grid-card actor-card fade-in';
    // URL-encoded SVG so it works directly in a src attribute without breaking quotes
    const photoSrc = actor.photo || "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
    
    card.innerHTML = `
      <div class="grid-card-content actor-card" style="padding: 1rem;">
        <img src='${photoSrc}' class="avatar">
        <h3>${actor.firstname} ${actor.lastname}</h3>
        <div class="role">${actor.type}</div>
        <div class="company">${actor.company} ${actor.role ? '('+actor.role+')' : ''}</div>
        <div class="contact">
          ${actor.email || 'Pas d\'email'} <br>
          ${actor.mobile ? 'Port: ' + actor.mobile : ''} 
          ${actor.mobile && actor.phone ? '•' : ''} 
          ${actor.phone ? 'Fixe: ' + actor.phone : ''}
          ${!actor.mobile && !actor.phone ? 'Pas de tél' : ''}
        </div>
        <button class="icon-btn mt-2" onclick="editActor('${actor.id}')">✏️ Modifier</button>
      </div>
    `;
    list.appendChild(card);
  });
}

window.editActor = function(id) {
  const actor = getDb('actors').find(a => a.id === id);
  if(!actor) return;

  document.getElementById('actor-id').value = actor.id;
  
  const typeSelect = document.getElementById('actor-type');
  const customInput = document.getElementById('actor-type-custom');
  
  // Checking if type is in predefined options
  const optionExists = Array.from(typeSelect.options).some(opt => opt.value === actor.type);
  if(optionExists) {
    typeSelect.value = actor.type;
    customInput.classList.add('hidden');
    customInput.required = false;
  } else {
    typeSelect.value = 'Autre';
    customInput.value = actor.type;
    customInput.classList.remove('hidden');
    customInput.required = true;
  }

  document.getElementById('actor-company').value = actor.company || '';
  document.getElementById('actor-firstname').value = actor.firstname || '';
  document.getElementById('actor-lastname').value = actor.lastname || '';
  document.getElementById('actor-role').value = actor.role || '';
  document.getElementById('actor-email').value = actor.email || '';
  document.getElementById('actor-phone').value = actor.phone || '';
  document.getElementById('actor-mobile').value = actor.mobile || '';
  document.getElementById('actor-address').value = actor.address || '';
  document.getElementById('actor-zip').value = actor.zip || '';
  document.getElementById('actor-city').value = actor.city || '';

  currentActorPhotoBase64 = actor.photo || '';
  const preview = document.getElementById('actor-photo-preview');
  const placeholder = document.getElementById('actor-photo-placeholder');
  
  if(actor.photo) {
    preview.src = actor.photo;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }

  document.getElementById('actor-modal-title').textContent = "Modifier l'acteur";
  document.getElementById('actor-modal').classList.remove('hidden');
}

window.closeActorModal = function() {
  document.getElementById('actor-modal').classList.add('hidden');
}

window.openDistributionModal = function(reportId) {
  const modal = document.getElementById('distribution-modal');
  const list = document.getElementById('distribution-actors-list');
  const actors = getDb('actors').filter(a => a.projectId === currentProjectId);
  const report = getDb('reports').find(r => r.id === reportId);
  const prevRecipients = report.recipients || [];

  list.innerHTML = '';
  if(actors.length === 0) {
    list.innerHTML = `<p class="desc">Aucun acteur dans ce projet. <a href="#" onclick="closeDocModal(); showView('actors'); renderActorsList(); return false;">Ajoutez-en un ici</a></p>`;
  } else {
    actors.forEach(actor => {
      const isChecked = prevRecipients.includes(actor.id) ? 'checked' : '';
      const div = document.createElement('label');
      div.className = 'checkbox-item';
      div.innerHTML = `
        <input type="checkbox" class="dist-actor-checkbox" value="${actor.id}" ${isChecked}>
        <div>
          <span class="title">${actor.firstname} ${actor.lastname} (${actor.company})</span>
          <span class="desc">${actor.type} • ${actor.email || 'Email manquant'}</span>
        </div>
      `;
      list.appendChild(div);
    });
  }

  document.getElementById('confirm-distribution-btn').dataset.reportId = reportId;
  modal.classList.remove('hidden');
}

window.closeDocModal = function() {
  document.getElementById('distribution-modal').classList.add('hidden');
}

// --- 3.6 Lots Management Flow ---

function setupLotListeners() {
  document.getElementById('view-lots-btn').addEventListener('click', () => {
    showView('lots');
    renderLotsList();
  });

  document.getElementById('back-to-project-from-lots').addEventListener('click', () => {
    showView('projectDetail');
  });

  document.getElementById('add-lot-btn').addEventListener('click', () => {
    document.getElementById('lot-id').value = '';
    document.getElementById('lot-form').reset();
    document.getElementById('lot-modal-title').textContent = "Ajouter un Lot";
    renderLotActorCheckboxes();
    document.getElementById('lot-modal').classList.remove('hidden');
  });

  document.getElementById('lot-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('lot-id').value || generateId();
    const name = document.getElementById('lot-name').value;
    
    const checkboxes = document.querySelectorAll('.lot-actor-checkbox:checked');
    const assignedActors = Array.from(checkboxes).map(cb => cb.value);

    const lot = {
      id: id,
      projectId: currentProjectId,
      name: name,
      actors: assignedActors
    };

    const lots = getDb('lots');
    const existingIndex = lots.findIndex(l => l.id === id);
    if(existingIndex > -1) {
      lots[existingIndex] = lot;
    } else {
      lots.push(lot);
    }
    saveDb('lots', lots);
    closeLotModal();
    renderLotsList();
  });
}

function renderLotsList() {
  const list = document.getElementById('lots-list');
  const lots = getDb('lots').filter(l => l.projectId === currentProjectId);
  list.innerHTML = '';

  if(lots.length === 0) {
    list.innerHTML = '<p class="subtitle">Aucun lot. Ajoutez un lot pour organiser les responsabilités.</p>';
    return;
  }

  const allActors = getDb('actors').filter(a => a.projectId === currentProjectId);

  lots.forEach(lot => {
    const card = document.createElement('div');
    card.className = 'grid-card lot-card fade-in';
    
    const assignedActorNames = (lot.actors || []).map(actorId => {
      const actor = allActors.find(a => a.id === actorId);
      return actor ? `${actor.firstname} ${actor.lastname}` : 'Inconnu';
    }).join(', ');

    card.innerHTML = `
      <div class="grid-card-content" style="padding: 1rem;">
        <h3>${lot.name}</h3>
        <div class="desc mt-2">
          <strong>Acteurs assignés:</strong><br>
          ${assignedActorNames || 'Aucun acteur assigné'}
        </div>
        <button class="icon-btn mt-3" onclick="editLot('${lot.id}')">✏️ Modifier</button>
      </div>
    `;
    list.appendChild(card);
  });
}

window.editLot = function(id) {
  const lot = getDb('lots').find(l => l.id === id);
  if(!lot) return;

  document.getElementById('lot-id').value = lot.id;
  document.getElementById('lot-name').value = lot.name;
  
  renderLotActorCheckboxes(lot.actors || []);

  document.getElementById('lot-modal-title').textContent = "Modifier le Lot";
  document.getElementById('lot-modal').classList.remove('hidden');
}

window.closeLotModal = function() {
  document.getElementById('lot-modal').classList.add('hidden');
}

function renderLotActorCheckboxes(selectedActorIds = []) {
  const container = document.getElementById('lot-actors-checkboxes');
  const actors = getDb('actors').filter(a => a.projectId === currentProjectId);
  container.innerHTML = '';

  if(actors.length === 0) {
    container.innerHTML = '<p class="desc text-sm">Aucun acteur disponible.</p>';
    return;
  }

  actors.forEach(actor => {
    const isChecked = selectedActorIds.includes(actor.id) ? 'checked' : '';
    const div = document.createElement('label');
    div.className = 'checkbox-item';
    div.innerHTML = `
      <input type="checkbox" class="lot-actor-checkbox" value="${actor.id}" ${isChecked}>
      <div>
        <span class="title">${actor.firstname} ${actor.lastname}</span>
        <span class="desc">${actor.company}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

// --- 4. Generator (MVP) Flow ---
function setupGeneratorListeners() {
  document.getElementById('cancel-report-btn')?.addEventListener('click', () => {
    const proj = getDb('projects').find(p => p.id === currentProjectId);
    showView('projectDetail');
    renderProjectDetail(proj);
  });

  // Export
  document.getElementById('print-btn')?.addEventListener('click', () => window.print());

  // Save Report Logic
  document.getElementById('save-draft-btn')?.addEventListener('click', () => {
    saveCurrentReportForm();
    
    // Return to project
    const proj = getDb('projects').find(p => p.id === currentProjectId);
    showView('projectDetail');
    renderProjectDetail(proj);
  });
}

function resetGeneratorUI() {
  document.getElementById('cr-editor-section').classList.remove('hidden');
  document.getElementById('notes-input')?.parentElement?.classList.add('hidden'); // Ensure AI input stays hidden
  const containers = [
    'entries-container', 
    'next-meeting-actions-tbody', 
    'key-dates-tbody', 
    'documents-tbody', 
    'checklists-container'
  ];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = '';
  });
}

// Scrape the DOM to save the edited form state
function saveCurrentReportForm() {
  const data = {
    attendance: scrapeAttendance(),
    entries: scrapeEntries(),
    meetingActions: scrapeTableData('next-meeting-actions-tbody'),
    keyDates: scrapeTableData('key-dates-tbody'),
    transmissions: scrapeTableData('documents-tbody'),
    checklists: scrapeChecklists()
  };

  const reports = getDb('reports');
  
  if (currentReportId) {
    const idx = reports.findIndex(r => r.id === currentReportId);
    if(idx > -1) {
      reports[idx].data = data;
    }
  } else {
    const newReport = {
      id: generateId(),
      projectId: currentProjectId,
      createdAt: new Date().toISOString(),
      status: 'unsent',
      data: data
    };
    reports.push(newReport);
    currentReportId = newReport.id; // Corrected: assign ID to prevent duplicate on next save
  }
  
  saveDb('reports', reports);
}

function scrapeAttendance() {
  const container = document.getElementById('attendance-container');
  if(!container) return [];
  const rows = container.querySelectorAll('.attendance-row');
  return Array.from(rows).map(tr => ({
    actorId: tr.dataset.actorId,
    status: tr.querySelector('.attendance-status-select').value,
    comment: tr.querySelector('.attendance-comment-input').value.trim()
  }));
}

function scrapeEntries() {
  const container = document.getElementById('entries-container');
  if(!container) return [];
  const cards = container.querySelectorAll('.entry-card');
  return Array.from(cards).map(card => {
    const photos = Array.from(card.querySelectorAll('.entry-photo-thumb img')).map(img => img.src);
    return {
        html: card.querySelector('.entry-body').innerHTML,
        type: card.querySelector('.entry-type-select').value,
        actorId: card.querySelector('.entry-actor-select').value,
        actorName: card.querySelector('.entry-actor-select').selectedOptions[0]?.text || '',
        deadline: card.querySelector('.entry-deadline-text').value.trim(),
        cloture: card.querySelector('.cloture-cb').checked,
        photos: photos
    };
  }).filter(e => e.html.trim() && e.html.trim() !== '<br>');
}

function scrapeTableData(tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if(!tbody) return [];
    return Array.from(tbody.rows).map(row => {
        const inputs = Array.from(row.querySelectorAll('input, select'));
        return inputs.map(i => i.value);
    });
}

function scrapeChecklists() {
    const container = document.getElementById('checklists-container');
    if(!container) return [];
    return Array.from(container.querySelectorAll('.checklist-card')).map(card => {
        return {
            title: card.querySelector('.checklist-title-input').value,
            items: Array.from(card.querySelectorAll('.checklist-item')).map(item => ({
                text: item.querySelector('.item-text').value,
                checked: item.querySelector('.item-cb').checked
            }))
        };
    });
}

// --- Generic Render Helpers ---
function populateForm(data) {
  const getEl = id => document.getElementById(id);
  
  // 1. Attendance
  if(getEl('attendance-container')) renderAttendance(data.attendance);

  // 2. Observations
  const entriesContainer = getEl('entries-container');
  if(entriesContainer) {
    entriesContainer.innerHTML = '';
    if (data.entries && data.entries.length > 0) {
      data.entries.forEach(e => addEntry(e));
    } else {
      addEntry();
    }
  }

  // 3. Meeting Actions
  const actionsTbody = getEl('next-meeting-actions-tbody');
  if(actionsTbody) {
      actionsTbody.innerHTML = '';
      (data.meetingActions || []).forEach(row => addMeetingAction(row));
  }

  // 4. Key Dates
  const datesTbody = getEl('key-dates-tbody');
  if(datesTbody) {
      datesTbody.innerHTML = '';
      (data.keyDates || []).forEach(row => addKeyDateRow(row));
  }

  // 5. Documents
  const docsTbody = getEl('documents-tbody');
  if(docsTbody) {
      docsTbody.innerHTML = '';
      (data.transmissions || []).forEach(row => addDocumentRow(row));
  }

  // 6. Checklists
  const checklistsContainer = getEl('checklists-container');
  if(checklistsContainer) {
      checklistsContainer.innerHTML = '';
      (data.checklists || []).forEach(c => renderChecklist(c));
  }
}

function renderAttendance(savedAttendance) {
  const container = document.getElementById('attendance-container');
  if(!container) return;
  
  let projectActors = getDb('actors').filter(a => a.projectId === currentProjectId);
  
  const savedMap = {};
  if (savedAttendance && Array.isArray(savedAttendance)) {
    savedAttendance.forEach(a => { savedMap[a.actorId] = a; });
  }

  const attendanceList = projectActors.map(a => {
    const saved = savedMap[a.id] || {};
    return {
      actorId: a.id,
      name: `${a.firstname} ${a.lastname}`,
      company: a.company,
      role: a.role,
      photo: a.photo,
      status: saved.status || 'Présent',
      comment: saved.comment || ''
    };
  });

  const coordList = attendanceList.filter(a => ['Maître d\'Ouvrage', 'Maîtrise d\'œuvre', 'Architecte', 'BET', 'Coordinateur SPS', 'Contrôle Technique'].includes(a.role) || a.role.toLowerCase().includes('coordination'));
  const execList = attendanceList.filter(a => !coordList.find(c => c.actorId === a.actorId));

  let html = `<table class="actions-table" style="width:100%; text-align:left;">`;
  html += `<thead><tr><th>Photo</th><th>Acteur</th><th>Société</th><th>Rôle / Lot</th><th>Statut</th><th>Commentaire</th></tr></thead>`;
  
  const buildRows = (list, groupName) => {
    if(list.length === 0) return '';
    let res = `<tr><th colspan="6" style="background-color: var(--bg-color); padding: 0.5rem; text-transform: uppercase; font-size: 0.8rem; color: var(--text-color);">${groupName}</th></tr>`;
    res += list.map(a => {
      const isAbsent = a.status === 'Absent';
      const rowClass = isAbsent ? 'row-absent' : '';
      const photoHtml = a.photo ? `<img src="${a.photo}" class="attendance-photo" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">` : `<div class="photo-placeholder" style="width:32px; height:32px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-size:10px; color:#64748b;">N/A</div>`;
      
      return `
      <tr class="attendance-row ${rowClass}" data-actor-id="${a.actorId}">
        <td style="width:40px; text-align:center;">${photoHtml}</td>
        <td>${a.name}</td>
        <td>${a.company}</td>
        <td>${a.role}</td>
        <td>
          <select class="text-input attendance-status-select" style="padding: 0.25rem; font-size: 0.9rem;" onchange="updateAttendanceRowStyle(this)">
            <option value="Présent" ${a.status === 'Présent' ? 'selected' : ''}>Présent</option>
            <option value="Absent" ${a.status === 'Absent' ? 'selected' : ''}>Absent</option>
            <option value="Excusé" ${a.status === 'Excusé' ? 'selected' : ''}>Excusé</option>
            <option value="Non requis" ${a.status === 'Non requis' ? 'selected' : ''}>Non requis</option>
          </select>
        </td>
        <td><input type="text" class="text-input attendance-comment-input" style="padding: 0.25rem;" placeholder="Commentaire..." value="${a.comment}"></td>
      </tr>`;
    }).join('');
    return res;
  };

  html += `<tbody>`;
  html += buildRows(coordList, "Coordination & Maîtrise d'œuvre");
  html += buildRows(execList, "Entreprises d'exécution (Lots)");
  html += `</tbody></table>`;
  
  if(attendanceList.length === 0) {
    html = `<p class="subtitle" style="margin-left:1rem; margin-bottom:1rem;">Aucun acteur dans le projet. Ajoutez-en dans le carnet d'adresses.</p>`;
  }
  
  container.innerHTML = html;
}

window.updateAttendanceRowStyle = function(selectElem) {
  const tr = selectElem.closest('tr');
  if (selectElem.value === 'Absent') {
    tr.classList.add('row-absent');
  } else {
    tr.classList.remove('row-absent');
  }
};

function renderListItem(container, value = "", customClass = "") {
  const div = document.createElement('div');
  div.className = `list-item ${customClass}`;
  div.innerHTML = `
    <textarea rows="1" oninput="this.style.height='';this.style.height=this.scrollHeight+'px'">${value}</textarea>
    <button class="delete-btn" onclick="this.parentElement.remove()">âœ–</button>`;
  container.appendChild(div);
  setTimeout(() => { const t=div.querySelector('textarea'); t.style.height='auto'; t.style.height=t.scrollHeight+'px'; }, 0);
}

function addListItem(containerId, cls = "") { renderListItem(document.getElementById(containerId), "", cls); }

function renderActionRow(t="", o="", d="") {
  const tr = document.createElement('tr');
  const valC = (v) => v === "à vérifier" || v === "" ? "style='color:#ef4444;font-style:italic;font-weight:500;'" : "";
  
  const actors = getDb('actors').filter(a => a.projectId === currentProjectId);
  let optionsHtml = `<option value="">Saisir responsable...</option>`;
  
  let selectedActorMatched = false;
  actors.forEach(a => {
    const fullName = `${a.firstname} ${a.lastname}`;
    const isSelected = (o && fullName.toLowerCase().includes(o.toLowerCase())) || (o === fullName) ? 'selected' : '';
    if(isSelected) selectedActorMatched = true;
    optionsHtml += `<option value="${fullName}" ${isSelected}>${fullName} (${a.company})</option>`;
  });
  
  if (o && !selectedActorMatched && o !== "à vérifier") {
    optionsHtml += `<option value="${o}" selected>${o}</option>`;
  } else if (o === "à vérifier") {
    optionsHtml += `<option value="à vérifier" selected disabled style="color:red">à vérifier</option>`;
  }

  tr.innerHTML = `
    <td><input type="text" value="${t}" placeholder="Action"></td>
    <td><select class="text-input responsable-input" ${valC(o)}>${optionsHtml}</select></td>
    <td style="display: flex; gap: 0.5rem; justify-content: space-between; align-items: center;">
      <input type="text" value="${d}" placeholder="DÃ©lai" class="text-input" style="flex: 1;" ${valC(d)}>
      <div style="position: relative; width: 32px; height: 32px; flex-shrink: 0;" title="Choisir une date">
        <input type="date" style="position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; left: 0; top: 0;" onchange="if(this.value){ const dVal = new Date(this.value); if(!isNaN(dVal)){ const txt = this.parentElement.previousElementSibling; txt.value = dVal.toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric'}); txt.style.color='inherit'; txt.style.fontStyle='normal'; txt.style.fontWeight='normal'; } }">
        <span style="font-size: 1.25rem; pointer-events: none; position: absolute; top: 1px; left: 4px;">ðŸ“…</span>
      </div>
    </td>
    <td style="width:40px"><button class="delete-btn" onclick="this.parentElement.parentElement.remove()">âœ–</button></td>`;
  document.getElementById('actions-tbody').appendChild(tr);
  
  const inputs = tr.querySelectorAll('input, select');
  inputs.forEach(i => i.addEventListener('input', e=>{ 
    e.target.style.color='inherit'; 
    e.target.style.fontStyle='normal'; 
    e.target.style.fontWeight='normal'; 
  }));
}
function addActionRow() { renderActionRow(); }

// ============================================================
// RICH TEXT ENTRY SYSTEM
// ============================================================
window.addEntry = function(data = {}) {
  const container = document.getElementById('entries-container');
  if(!container) return;

  const actors = getDb('actors').filter(a => a.projectId === currentProjectId);

  // Build actor options
  let actorOptions = `<option value="">â€” Aucun acteur â€”</option>`;
  actors.forEach(a => {
    const fullName = `${a.firstname} ${a.lastname}`;
    const sel = data.actorId === a.id ? 'selected' : '';
    actorOptions += `<option value="${a.id}" ${sel}>${fullName} (${a.company})</option>`;
  });

  const typeOptions = ['Observation', 'Action', 'Point bloquant', 'À vérifier']
    .map(t => `<option value="${t}" ${(data.type || 'Observation') === t ? 'selected' : ''}>${t}</option>`)
    .join('');
  
  const clotureChecked = data.cloture ? 'checked' : '';
  const clotureClass = data.cloture ? 'cloture' : '';

  const card = document.createElement('div');
  card.className = `entry-card fade-in ${clotureClass}`;
  card.innerHTML = `
    <div class="entry-toolbar">
      <button type="button" class="toolbar-btn" title="Gras" onclick="document.execCommand('bold')"><b>B</b></button>
      <button type="button" class="toolbar-btn" title="Italique" onclick="document.execCommand('italic')"><i>I</i></button>
      <button type="button" class="toolbar-btn" title="Souligné" onclick="document.execCommand('underline')"><u>S</u></button>
      <button type="button" class="toolbar-btn" title="Barré" onclick="document.execCommand('strikeThrough')"><s>X</s></button>
      <span class="toolbar-separator"></span>
      <label class="toolbar-btn color-btn" title="Couleur du texte">
        🎨
        <input type="color" class="color-picker-input" onchange="document.execCommand('foreColor', false, this.value)">
      </label>
      <button type="button" class="toolbar-btn" title="Sans mise en forme" onclick="document.execCommand('removeFormat')" style="font-size:0.75rem;">✖ Fmt</button>
      
      <span class="toolbar-separator"></span>
      <label class="toolbar-btn" title="Ajouter une photo" style="cursor:pointer">
        📸
        <input type="file" accept="image/*" class="hidden-input entry-photo-input">
      </label>

      <div style="margin-left:auto; display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; font-weight:600;">
        <label>Cloturé</label>
        <input type="checkbox" class="cloture-cb" ${clotureChecked} onchange="this.closest('.entry-card').classList.toggle('cloture', this.checked)">
      </div>
    </div>
    <div class="entry-body" contenteditable="true" data-placeholder="Rédigez votre remarque ici...">${data.html || ''}</div>
    <div class="entry-photos ${data.photos && data.photos.length > 0 ? '' : 'hidden'}">
      ${(data.photos || []).map(p => `
        <div class="entry-photo-thumb">
          <img src="${p}">
          <span class="remove-thumb" onclick="const p=this.parentElement; const c=p.parentElement; p.remove(); if(c.children.length===0) c.classList.add('hidden')">✖</span>
        </div>
      `).join('')}
    </div>
    <div class="entry-meta">
      <select class="text-input entry-type-select">
        ${typeOptions}
      </select>
      <select class="text-input entry-actor-select">
        ${actorOptions}
      </select>
      <div class="entry-deadline-wrapper">
        <input type="text" class="text-input entry-deadline-text" placeholder="Date limite..." value="${data.deadline || ''}">
        <div class="deadline-icon-wrapper" title="Choisir une date">
          <input type="date" class="deadline-date-picker" onchange="
            if(this.value){
              const d = new Date(this.value);
              if(!isNaN(d)){
                this.closest('.entry-deadline-wrapper').querySelector('.entry-deadline-text').value =
                  d.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric'});
              }
            }">
          <span class="deadline-icon-label">📅</span>
        </div>
      </div>
      <button type="button" class="delete-btn entry-delete-btn" onclick="this.closest('.entry-card').remove()" title="Supprimer">✖</button>
    </div>
  `;

  // Photo Upload Handler
  card.querySelector('.entry-photo-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (et) => {
        const photosDiv = card.querySelector('.entry-photos');
        photosDiv.classList.remove('hidden');
        const thumb = document.createElement('div');
        thumb.className = 'entry-photo-thumb';
        thumb.innerHTML = `<img src="${et.target.result}"><span class="remove-thumb" onclick="const p=this.parentElement; const c=p.parentElement; p.remove(); if(c.children.length===0) c.classList.add('hidden')">✖</span>`;
        photosDiv.appendChild(thumb);
    };
    reader.readAsDataURL(file);
  });

  // Update type badge color on change
  const typeSelect = card.querySelector('.entry-type-select');
  const updateTypeStyle = () => {
    const colors = {
      'Observation': '#2563eb',
      'Action': '#7c3aed',
      'Point bloquant': '#ef4444',
      'À vérifier': '#f59e0b'
    };
    typeSelect.style.borderLeftColor = colors[typeSelect.value] || '#2563eb';
    typeSelect.style.borderLeftWidth = '4px';
  };
  typeSelect.addEventListener('change', updateTypeStyle);
  updateTypeStyle();

  container.appendChild(card);
};

// 3. Meeting Actions Helper
window.addMeetingAction = function(rowData = ["", "", ""]) {
    const tbody = document.getElementById('next-meeting-actions-tbody');
    if(!tbody) return;
    const tr = document.createElement('tr');
    
    // Actor options for internal Responsable selection
    const actors = getDb('actors').filter(a => a.projectId === currentProjectId);
    let optionsHtml = `<option value="">Choisir responsable...</option>`;
    actors.forEach(a => {
        const fullName = `${a.firstname} ${a.lastname}`;
        const sel = rowData[1] === fullName ? 'selected' : '';
        optionsHtml += `<option value="${fullName}" ${sel}>${fullName} (${a.company})</option>`;
    });

    tr.innerHTML = `
        <td><input type="text" class="text-input" placeholder="Tâche / Action..." value="${rowData[0] || ''}"></td>
        <td><select class="text-input">${optionsHtml}</select></td>
        <td><input type="text" class="text-input" placeholder="Délai..." value="${rowData[2] || ''}"></td>
        <td><button class="delete-btn" onclick="this.closest('tr').remove()">✖</button></td>
    `;
    tbody.appendChild(tr);
};

// 4. Key Dates Helper
window.addKeyDateRow = function(rowData = ["", ""]) {
    const tbody = document.getElementById('key-dates-tbody');
    if(!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="text-input" placeholder="Jalon (ex: Fin Gros Œuvre)..." value="${rowData[0] || ''}"></td>
        <td><input type="text" class="text-input" placeholder="Date..." value="${rowData[1] || ''}"></td>
        <td><button class="delete-btn" onclick="this.closest('tr').remove()">✖</button></td>
    `;
    tbody.appendChild(tr);
};

// 5. Document Transmissions Helper
window.addDocumentRow = function(rowData = ["", "", ""]) {
    const tbody = document.getElementById('documents-tbody');
    if(!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="text-input" placeholder="Nom du document..." value="${rowData[0] || ''}"></td>
        <td><input type="text" class="text-input" placeholder="Destinataires..." value="${rowData[1] || ''}"></td>
        <td><input type="text" class="text-input" placeholder="Date..." value="${rowData[2] || ''}"></td>
        <td><button class="delete-btn" onclick="this.closest('tr').remove()">✖</button></td>
    `;
    tbody.appendChild(tr);
};

// 6. Checklists Helper
window.addChecklist = function() {
    renderChecklist({ title: "Nouvelle Checklist", items: [{ text: "", checked: false }] });
};

window.renderChecklist = function(data) {
    const container = document.getElementById('checklists-container');
    if(!container) return;
    const card = document.createElement('div');
    card.className = 'checklist-card fade-in';
    card.innerHTML = `
        <div class="checklist-title">
            <input type="text" class="text-input checklist-title-input" value="${data.title || ''}" placeholder="Titre de la checklist...">
            <button class="delete-btn" onclick="this.closest('.checklist-card').remove()">✖</button>
        </div>
        <div class="checklist-items">
            ${(data.items || []).map(item => `
                <div class="checklist-item">
                    <input type="checkbox" class="item-cb" ${item.checked ? 'checked' : ''}>
                    <input type="text" class="item-text" value="${item.text || ''}" placeholder="Tâche...">
                    <button class="text-btn" onclick="this.parentElement.remove()">✖</button>
                </div>
            `).join('')}
        </div>
        <button class="add-btn" style="font-size:0.8rem;" onclick="addChecklistItem(this)">+ Ajouter un élément</button>
    `;
    container.appendChild(card);
};

window.addChecklistItem = function(btn) {
    const itemsContainer = btn.previousElementSibling;
    const div = document.createElement('div');
    div.className = 'checklist-item';
    div.innerHTML = `
        <input type="checkbox" class="item-cb">
        <input type="text" class="item-text" placeholder="Tâche...">
        <button class="text-btn" onclick="this.parentElement.remove()">✖</button>
    `;
    itemsContainer.appendChild(div);
};

// --- Cleanup Legacy Functions ---
// (We might want to remove addPhotoToGallery if it's no longer used)
