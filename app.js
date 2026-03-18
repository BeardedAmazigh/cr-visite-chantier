// State Management (LocalStorage Simulation)
let currentUser = null;
let currentProjectId = null;
let currentReportId = null; // null if creating a new one

// Mock Database initializers
if (!localStorage.getItem('users')) localStorage.setItem('users', JSON.stringify({}));
if (!localStorage.getItem('projects')) localStorage.setItem('projects', JSON.stringify([]));
if (!localStorage.getItem('reports')) localStorage.setItem('reports', JSON.stringify([]));
if (!localStorage.getItem('actors')) localStorage.setItem('actors', JSON.stringify([]));

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
  actors: document.getElementById('view-actors')
};

// Setup Listeners on Load
document.addEventListener('DOMContentLoaded', () => {
  setupAuthListeners();
  setupDashboardListeners();
  setupProjectListeners();
  setupGeneratorListeners();
  setupActorListeners();
  
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
    if(!email) return;

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
    currentReportId = null; // New report
    resetGeneratorUI();
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
      document.getElementById('output-section').classList.remove('hidden');
      document.getElementById('input-section').classList.add('hidden'); // Hide input if viewing history
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

// --- 4. Generator (MVP) Flow ---
function setupGeneratorListeners() {
  document.getElementById('cancel-report-btn').addEventListener('click', () => {
    const proj = getDb('projects').find(p => p.id === currentProjectId);
    showView('projectDetail');
    renderProjectDetail(proj);
  });

  // Mock Extraction logic...
  document.getElementById('generate-btn').addEventListener('click', async () => {
    const b = document.getElementById('generate-btn');
    const loading = document.getElementById('loading');
    const err = document.getElementById('error-message');
    
    b.disabled = true;
    err.classList.add('hidden');
    loading.classList.remove('hidden');

    // Simulate LLM Call
    setTimeout(() => {
        const mockData = {
          observations: ["Fissure observée sur le mur porteur de la façade ouest."],
          actions: [
            { task: "Réparer la fissure du mur porteur", owner: "Jean", deadline: "Vendredi" }
          ],
          blockers: ["Accès au chantier bloqué"],
          points_to_verify: ["Vérifier l'étanchéité"]
        };
        
        populateForm(mockData);
        document.getElementById('output-section').classList.remove('hidden');
        loading.classList.add('hidden');
        b.disabled = false;
        
        // Hide input after generating to focus on editing (creates a clean page break for save)
        document.getElementById('input-section').classList.add('hidden');
    }, 1500);
  });

  // Photo uploads
  document.getElementById('photo-upload').addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(f => {
      if(!f.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => addPhotoToGallery(e.target.result);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  });

  // Export
  document.getElementById('print-btn').addEventListener('click', () => window.print());

  // Save Report Logic
  document.getElementById('save-draft-btn').addEventListener('click', () => {
    saveCurrentReportForm();
    
    // Return to project
    const proj = getDb('projects').find(p => p.id === currentProjectId);
    showView('projectDetail');
    renderProjectDetail(proj);
  });
}

function resetGeneratorUI() {
  document.getElementById('input-section').classList.remove('hidden');
  document.getElementById('output-section').classList.add('hidden');
  document.getElementById('notes-input').value = '';
  document.getElementById('error-message').classList.add('hidden');
  
  // clear lists
  document.getElementById('observations-container').innerHTML = '';
  document.getElementById('actions-tbody').innerHTML = '';
  document.getElementById('blockers-container').innerHTML = '';
  document.getElementById('points-to-verify-container').innerHTML = '';
  document.getElementById('photo-gallery').innerHTML = '';
}

// Scrape the DOM to save the edited form state
function saveCurrentReportForm() {
  const data = {
    observations: scrapeList('observations-container'),
    actions: scrapeTable(),
    blockers: scrapeList('blockers-container'),
    points_to_verify: scrapeList('points-to-verify-container'),
    // Note: Saving photos to LocalStorage can exceed 5MB quota very quickly. 
    // For this prototype, we're mimicking success, but in a real DB we'd save image URLs.
  };

  const reports = getDb('reports');
  
  if (currentReportId) {
    // Update existing
    const idx = reports.findIndex(r => r.id === currentReportId);
    if(idx > -1) {
      reports[idx].data = data;
      // We do not change the status automatically, let the user change it.
    }
  } else {
    // Create new
    const newReport = {
      id: generateId(),
      projectId: currentProjectId,
      createdAt: new Date().toISOString(),
      status: 'unsent', // Default to yellow
      data: data
    };
    reports.push(newReport);
  }
  
  saveDb('reports', reports);
}

function scrapeList(containerId) {
  const container = document.getElementById(containerId);
  const textareas = container.querySelectorAll('textarea');
  return Array.from(textareas).map(ta => ta.value).filter(v => v.trim() !== '');
}

function scrapeTable() {
  const tbody = document.getElementById('actions-tbody');
  const rows = tbody.querySelectorAll('tr');
  return Array.from(rows).map(tr => {
    const inputs = tr.querySelectorAll('input');
    return {
      task: inputs[0].value.trim(),
      owner: inputs[1].value.trim(),
      deadline: inputs[2].value.trim()
    };
  }).filter(a => a.task || a.owner || a.deadline);
}

// --- Generic Render Helpers (same as MVP) ---
function populateForm(data) {
  const getEl = id => document.getElementById(id);
  getEl('observations-container').innerHTML = '';
  getEl('blockers-container').innerHTML = '';
  getEl('points-to-verify-container').innerHTML = '';
  getEl('actions-tbody').innerHTML = '';

  (data.observations || []).forEach(v => renderListItem(getEl('observations-container'), v));
  (data.blockers || []).forEach(v => renderListItem(getEl('blockers-container'), v, 'alert-item'));
  (data.points_to_verify || []).forEach(v => renderListItem(getEl('points-to-verify-container'), v, 'warning-item'));
  (data.actions || []).forEach(a => renderActionRow(a.task, a.owner, a.deadline));

  if(!(data.observations?.length)) renderListItem(getEl('observations-container'), "");
  if(!(data.actions?.length)) renderActionRow("", "", "");
}

function renderListItem(container, value = "", customClass = "") {
  const div = document.createElement('div');
  div.className = `list-item ${customClass}`;
  div.innerHTML = `
    <textarea rows="1" oninput="this.style.height='';this.style.height=this.scrollHeight+'px'">${value}</textarea>
    <button class="delete-btn" onclick="this.parentElement.remove()">✖</button>`;
  container.appendChild(div);
  setTimeout(() => { const t=div.querySelector('textarea'); t.style.height='auto'; t.style.height=t.scrollHeight+'px'; }, 0);
}

function addListItem(containerId, cls = "") { renderListItem(document.getElementById(containerId), "", cls); }

let activeResponsableInput = null;

function showActorDropdown(inputElem) {
  const actors = getDb('actors').filter(a => a.projectId === currentProjectId);
  if(actors.length === 0) return;

  const dropdown = document.getElementById('actor-dropdown');
  dropdown.innerHTML = '';
  
  const filterText = inputElem.value.toLowerCase();
  let hasMatches = false;
  
  actors.forEach(a => {
    const fullName = `${a.firstname} ${a.lastname}`;
    const searchString = `${fullName} ${a.company} ${a.type}`.toLowerCase();
    if(filterText && !searchString.includes(filterText)) return;
    
    hasMatches = true;
    const item = document.createElement('div');
    item.className = 'actor-dropdown-item';
    item.innerHTML = `
      <span class="actor-dropdown-name">${fullName}</span>
      <span class="actor-dropdown-company">${a.company} - ${a.type}</span>
    `;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevents input from losing focus before click resolves
      inputElem.value = fullName;
      inputElem.style.color = 'inherit';
      inputElem.style.fontStyle = 'normal';
      inputElem.style.fontWeight = 'normal';
      dropdown.classList.add('hidden');
    });
    dropdown.appendChild(item);
  });
  
  if(!hasMatches) {
     dropdown.classList.add('hidden');
     return;
  }

  const rect = inputElem.getBoundingClientRect();
  dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
  dropdown.style.left = (rect.left + window.scrollX) + 'px';
  dropdown.style.width = Math.max(rect.width, 220) + 'px';
  dropdown.classList.remove('hidden');
  activeResponsableInput = inputElem;
}

document.addEventListener('mousedown', (e) => {
  const dropdown = document.getElementById('actor-dropdown');
  if(dropdown && !dropdown.contains(e.target) && e.target !== activeResponsableInput) {
    dropdown.classList.add('hidden');
    activeResponsableInput = null;
  }
});

function renderActionRow(t="", o="", d="") {
  const tr = document.createElement('tr');
  const valC = (v) => v === "à vérifier" || v === "" ? "style='color:#ef4444;font-style:italic;font-weight:500;'" : "";
  tr.innerHTML = `
    <td><input type="text" value="${t}" placeholder="Action"></td>
    <td><input type="text" value="${o}" placeholder="Responsable" class="responsable-input" ${valC(o)}></td>
    <td><input type="text" value="${d}" placeholder="Délai" ${valC(d)}></td>
    <td style="width:40px"><button class="delete-btn" onclick="this.parentElement.parentElement.remove()">✖</button></td>`;
  document.getElementById('actions-tbody').appendChild(tr);
  
  const inputs = tr.querySelectorAll('input');
  inputs.forEach(i => i.addEventListener('input', e=>{ e.target.style.color='inherit'; e.target.style.fontStyle='normal'; e.target.style.fontWeight='normal'; }));
  
  const respInput = tr.querySelector('.responsable-input');
  respInput.addEventListener('focus', () => showActorDropdown(respInput));
  respInput.addEventListener('input', () => showActorDropdown(respInput));
}
function addActionRow() { renderActionRow(); }

function addPhotoToGallery(imgSrc) {
  const div = document.createElement('div');
  div.className = 'photo-card fade-in';
  div.innerHTML = `
    <button class="remove-photo-btn" onclick="this.parentElement.remove()">✖</button>
    <img src="${imgSrc}" alt="Photo">
    <textarea placeholder="Commentaire..." oninput="this.style.height='';this.style.height=this.scrollHeight+'px'"></textarea>`;
  document.getElementById('photo-gallery').appendChild(div);
}
