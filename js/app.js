// App shell, routing, and rendering for the Naming Opportunities mobile admin prototype.

const state = {
  view: 'browse', // browse | actionlist | tasks | templates
  mode: 'object', // object | instance
  search: '',
  locationFilterValue: '', // Location field filter (distinct from GPS "my location")
  userLocation: null, // { lat, lng, ts }
  nearOnly: false,
  taskFilter: 'Open', // Open | In Progress | Complete | All
  taskSelectMode: false,
  selectedTaskIds: new Set(),
  actionListSelectedId: null,
  sheetStack: [],
};

const el = (id) => document.getElementById(id);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function money(n) {
  if (n === null || n === undefined || n === '') return '';
  return '$' + Number(n).toLocaleString();
}

function toast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), 1800);
}

// ---------------------------------------------------------------------------
// Distance helpers
// ---------------------------------------------------------------------------
function objectDistance(obj) {
  if (!state.userLocation || obj.lat == null || obj.lng == null) return null;
  return haversineMiles(state.userLocation.lat, state.userLocation.lng, obj.lat, obj.lng);
}
function instanceDistance(inst) {
  const parent = DB.getObject(inst.objectId);
  if (!parent) return null;
  return objectDistance(parent);
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------
function renderTopBar() {
  const title = {
    browse: 'Naming Opportunities',
    actionlist: 'Action List',
    tasks: 'My Tasks',
    templates: 'Settings',
  }[state.view];
  el('viewTitle').textContent = title;

  const showSearchToggle = state.view === 'browse' || state.view === 'actionlist';
  el('searchRow').classList.toggle('hidden', !showSearchToggle);
  el('btnLocation').classList.toggle('hidden', !showSearchToggle);

  if (showSearchToggle) {
    el('searchInput').placeholder = state.mode === 'object'
      ? 'Search opportunities...'
      : 'Search instances...';
    el('searchInput').value = state.search;
    document.querySelectorAll('#typeToggle .toggle-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === state.mode);
    });
    populateLocationSelect();
  }

  renderLocationBanner();

  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === state.view);
  });

  el('fabAdd').classList.toggle('hidden', !(state.view === 'browse' && state.mode === 'object'));
}

function populateLocationSelect() {
  const sel = el('locationSelect');
  const locations = Array.from(new Set(DB.getObjects().map((o) => o.location).filter(Boolean))).sort();
  sel.innerHTML = `<option value="">All Locations</option>` +
    locations.map((l) => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
  sel.value = state.locationFilterValue || '';
}

function renderLocationBanner() {
  const banner = el('locationBanner');
  const showSearchToggle = state.view === 'browse' || state.view === 'actionlist';
  if (!showSearchToggle || !state.userLocation) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    return;
  }
  banner.classList.remove('hidden');
  const t = new Date(state.userLocation.ts);
  banner.innerHTML = `
    <span class="loc-dot">📍</span>
    <span class="loc-text">Location set ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &middot; sorted by distance</span>
    <button class="chip ${state.nearOnly ? 'chip-active' : ''}" data-action="toggle-near">Within 0.5 mi</button>
    <button class="link-btn" data-action="clear-location">Clear</button>
  `;
}

// ---------------------------------------------------------------------------
// Browse + Action List (shared list rendering)
// ---------------------------------------------------------------------------
function filteredObjects(opts = {}) {
  let list = DB.getObjects();
  if (opts.restrictIds) list = list.filter((o) => opts.restrictIds.has(o.id));
  const q = state.search.trim().toLowerCase();
  if (q) {
    list = list.filter((o) => [o.name, o.description, o.type, o.location, o.specialty, o.fund]
      .some((f) => f && String(f).toLowerCase().includes(q)));
  }
  if (state.locationFilterValue) {
    list = list.filter((o) => o.location === state.locationFilterValue);
  }
  if (state.userLocation && state.nearOnly) {
    list = list.filter((o) => {
      const d = objectDistance(o);
      return d !== null && d <= 0.5;
    });
  }
  if (state.userLocation) {
    list = list.slice().sort((a, b) => (objectDistance(a) ?? 1e9) - (objectDistance(b) ?? 1e9));
  } else {
    list = list.slice().sort((a, b) => a.name.localeCompare(b.name));
  }
  return list;
}

function filteredInstances(opts = {}) {
  let list = DB.getInstances();
  if (opts.restrictIds) list = list.filter((i) => opts.restrictIds.has(i.id));
  const q = state.search.trim().toLowerCase();
  if (q) {
    list = list.filter((i) => [i.instanceName, i.dedication, i.specificLocation, i.section, i.comments]
      .some((f) => f && String(f).toLowerCase().includes(q)));
  }
  if (state.locationFilterValue) {
    list = list.filter((i) => {
      const parent = DB.getObject(i.objectId);
      return parent && parent.location === state.locationFilterValue;
    });
  }
  if (state.userLocation && state.nearOnly) {
    list = list.filter((i) => {
      const d = instanceDistance(i);
      return d !== null && d <= 0.5;
    });
  }
  if (state.userLocation) {
    list = list.slice().sort((a, b) => (instanceDistance(a) ?? 1e9) - (instanceDistance(b) ?? 1e9));
  } else {
    list = list.slice().sort((a, b) => a.instanceName.localeCompare(b.instanceName));
  }
  return list;
}

function objectCard(o) {
  const d = objectDistance(o);
  const openTasks = DB.getTasksFor('object', o.id).filter((t) => t.status !== 'Complete').length;
  const onLists = DB.getListsContaining('object', o.id).length > 0;
  return `
    <div class="card" data-action="open-record" data-kind="object" data-id="${o.id}">
      <div class="card-main">
        <div class="card-title">${esc(o.name)}</div>
        <div class="card-sub">${esc(o.type)} &middot; ${esc(o.location)}</div>
        <div class="card-meta">
          ${o.askAmount ? `<span class="tag">${money(o.askAmount)}</span>` : ''}
          ${openTasks ? `<span class="tag tag-task">${openTasks} open task${openTasks > 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>
      <div class="card-side">
        ${d !== null ? `<span class="dist-badge">${formatDistance(d)}</span>` : ''}
        <span class="star ${onLists ? 'star-active' : ''}" data-action="open-action-picker" data-kind="object" data-id="${o.id}">${onLists ? '★' : '☆'}</span>
      </div>
    </div>`;
}

function instanceCard(i) {
  const parent = DB.getObject(i.objectId);
  const d = instanceDistance(i);
  const openTasks = DB.getTasksFor('instance', i.id).filter((t) => t.status !== 'Complete').length;
  const onLists = DB.getListsContaining('instance', i.id).length > 0;
  return `
    <div class="card" data-action="open-record" data-kind="instance" data-id="${i.id}">
      <div class="card-main">
        <div class="card-title">${esc(i.instanceName)}</div>
        <div class="card-sub">${esc(parent ? parent.name : 'Unknown opportunity')}${i.specificLocation ? ' &middot; ' + esc(i.specificLocation) : ''}</div>
        <div class="card-meta">
          ${i.dedication ? `<span class="tag">${esc(i.dedication)}</span>` : ''}
          ${openTasks ? `<span class="tag tag-task">${openTasks} open task${openTasks > 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>
      <div class="card-side">
        ${d !== null ? `<span class="dist-badge">${formatDistance(d)}</span>` : ''}
        <span class="star ${onLists ? 'star-active' : ''}" data-action="open-action-picker" data-kind="instance" data-id="${i.id}">${onLists ? '★' : '☆'}</span>
      </div>
    </div>`;
}

function renderBrowse() {
  const objects = filteredObjects();
  const instances = filteredInstances();
  const list = state.mode === 'object' ? objects : instances;
  const cards = state.mode === 'object' ? list.map(objectCard) : list.map(instanceCard);
  return `
    <div class="list-header">
      <span>${list.length} ${state.mode === 'object' ? 'opportunit' + (list.length === 1 ? 'y' : 'ies') : 'instance' + (list.length === 1 ? '' : 's')}</span>
    </div>
    <div class="card-list">
      ${cards.length ? cards.join('') : emptyState('No records match your search.')}
    </div>`;
}

function renderActionList() {
  const lists = DB.getActionLists();
  if (!state.actionListSelectedId || !lists.some((l) => l.id === state.actionListSelectedId)) {
    state.actionListSelectedId = lists[0] ? lists[0].id : null;
  }
  const chips = lists.map((l) => `<button class="chip ${l.id === state.actionListSelectedId ? 'chip-active' : ''}" data-action="select-action-list" data-id="${l.id}">${esc(l.name)}</button>`).join('');
  const selected = lists.find((l) => l.id === state.actionListSelectedId);

  let body;
  if (!selected) {
    body = emptyState('No action lists yet. Tap "+ New List" to create one.');
  } else {
    const objIds = new Set(selected.items.filter((i) => i.kind === 'object').map((i) => i.id));
    const instIds = new Set(selected.items.filter((i) => i.kind === 'instance').map((i) => i.id));
    const objects = filteredObjects({ restrictIds: objIds });
    const instances = filteredInstances({ restrictIds: instIds });
    const list = state.mode === 'object' ? objects : instances;
    const cards = state.mode === 'object' ? list.map(objectCard) : list.map(instanceCard);
    body = `
      <div class="list-header">
        <span>${list.length} in "${esc(selected.name)}"</span>
        <button class="link-btn" data-action="delete-action-list" data-id="${selected.id}">Delete list</button>
      </div>
      <div class="card-list">${cards.length ? cards.join('') : emptyState('Nothing in this list yet. Tap the ☆ on any record to add it here.')}</div>`;
  }

  return `
    <div class="chip-row">
      ${chips}
      <button class="chip chip-add" data-action="new-action-list">+ New List</button>
    </div>
    ${body}
  `;
}

function emptyState(msg) {
  return `<div class="empty-state">${esc(msg)}</div>`;
}

// ---------------------------------------------------------------------------
// My Tasks
// ---------------------------------------------------------------------------
function taskParentLabel(t) {
  if (t.parentType === 'object') {
    const o = DB.getObject(t.parentId);
    return o ? o.name : 'Unknown';
  }
  const i = DB.getInstance(t.parentId);
  if (!i) return 'Unknown';
  const parent = DB.getObject(i.objectId);
  return `${i.instanceName} (${parent ? parent.name : 'Unknown'})`;
}

function renderTasks() {
  const filters = ['Open', 'In Progress', 'Complete', 'All'];
  let list = DB.getTasks();
  if (state.taskFilter !== 'All') list = list.filter((t) => t.status === state.taskFilter);
  list = list.slice().sort((a, b) => (a.dateAssigned < b.dateAssigned ? 1 : -1));

  const rows = list.map((t) => {
    if (state.taskSelectMode) {
      const selected = state.selectedTaskIds.has(t.id);
      return `
      <div class="task-row ${selected ? 'task-row-selected' : ''}" data-action="toggle-task-select-item" data-id="${t.id}">
        <input type="checkbox" class="task-check" ${selected ? 'checked' : ''} />
        <div class="task-row-main">
          <div class="task-row-title ${t.status === 'Complete' ? 'task-done' : ''}">${esc(t.name)}</div>
          <div class="task-row-sub">${esc(taskParentLabel(t))}</div>
          <div class="task-row-meta">
            <span class="status-pill status-${t.status.replace(/\s/g, '')}">${esc(t.status)}</span>
            <span class="task-date">${esc(t.dateAssigned)}</span>
          </div>
        </div>
      </div>`;
    }
    return `
    <div class="task-row">
      <input type="checkbox" class="task-check" data-action="toggle-task" data-id="${t.id}" ${t.status === 'Complete' ? 'checked' : ''} />
      <div class="task-row-main" data-action="open-task-parent" data-id="${t.id}">
        <div class="task-row-title ${t.status === 'Complete' ? 'task-done' : ''}">${esc(t.name)}</div>
        <div class="task-row-sub">${esc(taskParentLabel(t))}</div>
        <div class="task-row-meta">
          <span class="status-pill status-${t.status.replace(/\s/g, '')}">${esc(t.status)}</span>
          <span class="task-date">${esc(t.dateAssigned)}</span>
          <span class="task-assignee">${esc(t.assignee)}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  const selCount = state.selectedTaskIds.size;

  return `
    <div class="filter-row">
      ${filters.map((f) => `<button class="chip ${state.taskFilter === f ? 'chip-active' : ''}" data-action="set-task-filter" data-filter="${f}">${f}</button>`).join('')}
      <button class="chip ${state.taskSelectMode ? 'chip-active' : ''}" data-action="toggle-task-select-mode">${state.taskSelectMode ? 'Cancel' : 'Select'}</button>
    </div>
    <div class="task-list">
      ${rows || emptyState('No tasks in this filter.')}
    </div>
    ${state.taskSelectMode && selCount > 0 ? `
    <div class="bulk-bar">
      <span class="bulk-count">${selCount} selected</span>
      <button class="btn btn-secondary" data-action="bulk-set-status" data-status="Open">Mark Open</button>
      <button class="btn btn-primary" data-action="bulk-set-status" data-status="Complete">Mark Complete</button>
    </div>` : ''}
  `;
}

// ---------------------------------------------------------------------------
// Task templates + settings
// ---------------------------------------------------------------------------
function renderTemplates() {
  const templates = DB.getTemplates();
  const rows = templates.map((t) => `
    <div class="template-row">
      <div class="template-main">
        <div class="template-name">${esc(t.name)}</div>
        <div class="template-desc">${esc(t.description)}</div>
        <div class="template-assignee">Default assignee: ${esc(t.assignee)}</div>
      </div>
      <div class="template-actions">
        <button class="icon-btn" data-action="edit-template" data-id="${t.id}">✎</button>
        <button class="icon-btn" data-action="delete-template" data-id="${t.id}">🗑</button>
      </div>
    </div>`).join('');
  return `
    <div class="templates-intro">Quick-add task templates let you log the same field task on record after record without retyping it. They're saved on this device for this session.</div>
    <div class="template-list">${rows || emptyState('No templates yet.')}</div>
    <button class="btn btn-primary btn-block" data-action="new-template">+ New Task Template</button>
    <div class="user-row">
      <label>Session user (used as task assignee)</label>
      <input type="text" id="userNameInput" value="${esc(DB.getUser())}" />
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
function renderMain() {
  const c = el('viewContainer');
  if (state.view === 'browse') c.innerHTML = renderBrowse();
  else if (state.view === 'actionlist') c.innerHTML = renderActionList();
  else if (state.view === 'tasks') c.innerHTML = renderTasks();
  else if (state.view === 'templates') c.innerHTML = renderTemplates();
}

function render() {
  renderTopBar();
  renderMain();
  renderSheet();
}

// ---------------------------------------------------------------------------
// Sheet (record detail / forms) stack
// ---------------------------------------------------------------------------
function openSheet(view) {
  state.sheetStack.push(view);
  renderSheet();
}
function closeSheet() {
  state.sheetStack.pop();
  renderSheet();
}
function closeAllSheets() {
  state.sheetStack = [];
  renderSheet();
}
function currentRecordView() {
  const top = state.sheetStack[state.sheetStack.length - 1];
  return top && top.type === 'record' ? top : null;
}

function renderSheet() {
  const overlay = el('sheetOverlay');
  const sheet = el('sheet');
  if (!state.sheetStack.length) {
    overlay.classList.add('hidden');
    sheet.innerHTML = '';
    return;
  }
  overlay.classList.remove('hidden');
  const top = state.sheetStack[state.sheetStack.length - 1];
  sheet.innerHTML = renderSheetView(top);
}

function renderSheetView(view) {
  switch (view.type) {
    case 'record': return renderRecordSheet(view);
    case 'addNote': return renderAddNoteSheet(view);
    case 'addTask': return renderAddTaskSheet(view);
    case 'editTask': return renderEditTaskSheet(view);
    case 'editTemplate': return renderEditTemplateSheet(view);
    case 'pickActionLists': return renderActionListPickerSheet(view);
    case 'newActionList': return renderNewActionListSheet(view);
    default: return '';
  }
}

function sheetHeader(title, opts = {}) {
  return `
    <div class="sheet-header">
      ${opts.back ? `<button class="icon-btn" data-action="sheet-back">←</button>` : `<span class="sheet-spacer"></span>`}
      <div class="sheet-title">${esc(title)}</div>
      <button class="icon-btn" data-action="sheet-close">✕</button>
    </div>`;
}

// ---- Record detail sheet (draft-based: edits stage until Save/Cancel) ----
function getRecord(kind, id) {
  return kind === 'object' ? DB.getObject(id) : DB.getInstance(id);
}

function objectTabs(isNew) {
  return isNew ? ['Info', 'Photos', 'Location'] : ['Info', 'Photos', 'Location', 'Instances', 'Notes', 'Tasks'];
}
function instanceTabs(isNew) {
  return isNew ? ['Info', 'Photos'] : ['Info', 'Photos', 'Notes', 'Tasks'];
}

function renderRecordSheet(view) {
  const { kind, isNew } = view;
  const rec = view.draft;
  const tabs = kind === 'object' ? objectTabs(isNew) : instanceTabs(isNew);
  const activeTab = tabs.includes(view.tab) ? view.tab : 'Info';
  view.tab = activeTab;
  const nameField = kind === 'object' ? 'name' : 'instanceName';

  const tabsHtml = `
    <div class="tab-row">
      ${tabs.map((t) => {
        let label = t;
        if (t === 'Instances' && kind === 'object') {
          label = `Instances (${DB.getInstancesForObject(rec.id).length})`;
        }
        return `<button class="tab-btn ${t === activeTab ? 'active' : ''}" data-action="set-tab" data-tab="${t}">${esc(label)}</button>`;
      }).join('')}
    </div>`;

  let body = '';
  if (activeTab === 'Info') body = renderInfoTab(kind, rec);
  else if (activeTab === 'Photos') body = renderPhotosTab(rec);
  else if (activeTab === 'Location') body = renderLocationTab(rec);
  else if (activeTab === 'Instances') body = renderInstancesTab(rec);
  else if (activeTab === 'Notes') body = renderNotesTab(kind, rec.id);
  else if (activeTab === 'Tasks') body = renderTasksTab(kind, rec.id);

  const onLists = !isNew && DB.getListsContaining(kind, rec.id).length > 0;
  const starHtml = isNew ? '' : `<span class="star star-lg ${onLists ? 'star-active' : ''}" data-action="open-action-picker" data-kind="${kind}" data-id="${rec.id}">${onLists ? '★' : '☆'}</span>`;

  return `
    ${sheetHeader((kind === 'object' ? 'Naming Opportunity' : 'Instance') + (isNew ? ' (New)' : ''), { back: state.sheetStack.length > 1 })}
    <div class="sheet-recordhead">
      <input class="record-name-input" data-record-field="${nameField}" value="${esc(rec[nameField])}" />
      ${starHtml}
    </div>
    ${tabsHtml}
    <div class="sheet-body">${body}</div>
    <div class="sheet-footer">
      <button class="btn btn-secondary" data-action="cancel-record">Cancel</button>
      <button class="btn btn-primary" data-action="save-record">Save</button>
    </div>`;
}

function field(label, name, value, opts = {}) {
  if (opts.textarea) {
    return `<label class="field-label">${esc(label)}
      <textarea class="field-input" rows="${opts.rows || 3}" data-record-field="${name}">${esc(value == null ? '' : value)}</textarea>
    </label>`;
  }
  return `<label class="field-label">${esc(label)}
    <input class="field-input" type="${opts.type || 'text'}" data-record-field="${name}" value="${esc(value == null ? '' : value)}" />
  </label>`;
}

function renderInfoTab(kind, rec) {
  if (kind === 'object') {
    return `
      ${field('Description', 'description', rec.description, { textarea: true })}
      <div class="field-grid">
        ${field('Type', 'type', rec.type)}
        ${field('Location', 'location', rec.location)}
      </div>
      <div class="field-grid">
        ${field('Specialty / Department', 'specialty', rec.specialty)}
        ${field('Square Footage', 'squareFootage', rec.squareFootage, { type: 'number' })}
      </div>
      <div class="field-grid">
        ${field('Fund', 'fund', rec.fund)}
        ${field('Campaign', 'campaign', rec.campaign)}
      </div>
      ${field('Ask Amount', 'askAmount', rec.askAmount, { type: 'number' })}
      ${field('Comments', 'comments', rec.comments, { textarea: true })}
      ${field('Custom Field', 'customField', rec.customField)}
    `;
  }
  const parent = DB.getObject(rec.objectId);
  return `
    ${parent ? `<div class="parent-link" data-action="open-record" data-kind="object" data-id="${rec.objectId}">Part of: <strong>${esc(parent.name)}</strong> &rsaquo;</div>` : ''}
    ${field('Dedication', 'dedication', rec.dedication)}
    ${field('Specific Location', 'specificLocation', rec.specificLocation)}
    <div class="field-grid three">
      ${field('Section', 'section', rec.section)}
      ${field('Row', 'row', rec.row)}
      ${field('Sequence', 'sequence', rec.sequence)}
    </div>
    ${field('Engraving - Line 1', 'engravingLine1', rec.engravingLine1)}
    ${field('Engraving - Line 2', 'engravingLine2', rec.engravingLine2)}
    ${field('Comments', 'comments', rec.comments, { textarea: true })}
  `;
}

function renderPhotosTab(rec) {
  const pics = rec.pictures || [];
  const thumbs = pics.map((src, idx) => `
    <div class="photo-thumb">
      <img src="${src}" alt="Photo ${idx + 1}" />
      <button class="photo-remove" data-action="remove-photo" data-idx="${idx}">✕</button>
    </div>`).join('');
  return `
    <div class="photo-grid">${thumbs}</div>
    ${pics.length < 3
      ? `<button class="btn btn-primary btn-block" data-action="capture-photo">📷 Take / Upload Photo (${pics.length}/3)</button>`
      : `<div class="hint">Maximum of 3 photos reached.</div>`}
  `;
}

function renderLocationTab(rec) {
  const hasLoc = rec.lat != null && rec.lng != null;
  const mapsUrl = hasLoc ? `https://www.google.com/maps?q=${rec.lat},${rec.lng}` : null;
  return `
    <div class="field-grid">
      ${field('Latitude', 'lat', rec.lat, { type: 'number' })}
      ${field('Longitude', 'lng', rec.lng, { type: 'number' })}
    </div>
    <button class="btn btn-primary btn-block" data-action="capture-gps">📍 Capture My Current Location</button>
    ${hasLoc ? `<a class="btn btn-secondary btn-block" href="${mapsUrl}" target="_blank" rel="noopener">Open in Maps</a>` : ''}
    <div class="hint">Capturing your location sets the Latitude/Longitude fields on this record to your device's current GPS position. Tap Save to keep it.</div>
  `;
}

function renderInstancesTab(objectRec) {
  const instances = DB.getInstancesForObject(objectRec.id);
  const rows = instances.map((i) => `
    <div class="mini-row" data-action="open-record" data-kind="instance" data-id="${i.id}">
      <div>
        <div class="mini-row-title">${esc(i.instanceName)}</div>
        <div class="mini-row-sub">${esc(i.specificLocation || '')}</div>
      </div>
      <span class="chevron">›</span>
    </div>`).join('');
  return `
    <div class="mini-list">${rows || emptyState('No instances yet.')}</div>
    <button class="btn btn-primary btn-block" data-action="add-instance" data-id="${objectRec.id}">+ Add Instance</button>
  `;
}

function renderNotesTab(kind, recId) {
  const notes = DB.getNotesFor(kind, recId);
  const rows = notes.map((n) => `
    <div class="note-card">
      <div class="note-head"><span class="note-subject">${esc(n.subject)}</span><span class="note-date">${esc(n.date)}</span></div>
      <div class="note-comments">${esc(n.comments)}</div>
    </div>`).join('');
  return `
    <button class="btn btn-primary btn-block" data-action="add-note" data-kind="${kind}" data-id="${recId}">+ Add Note</button>
    <div class="note-list">${rows || emptyState('No notes yet.')}</div>
  `;
}

function renderTasksTab(kind, recId) {
  const tasks = DB.getTasksFor(kind, recId);
  const templates = DB.getTemplates();
  const rows = tasks.map((t) => `
    <div class="task-row">
      <input type="checkbox" class="task-check" data-action="toggle-task" data-id="${t.id}" ${t.status === 'Complete' ? 'checked' : ''} />
      <div class="task-row-main" data-action="edit-task" data-id="${t.id}">
        <div class="task-row-title ${t.status === 'Complete' ? 'task-done' : ''}">${esc(t.name)}</div>
        <div class="task-row-meta">
          <span class="status-pill status-${t.status.replace(/\s/g, '')}">${esc(t.status)}</span>
          <span class="task-date">${esc(t.dateAssigned)}</span>
          <span class="task-assignee">${esc(t.assignee)}</span>
        </div>
      </div>
    </div>`).join('');
  return `
    <div class="quick-add-label">Quick add from template</div>
    <div class="chip-row">
      ${templates.map((t) => `<button class="chip" data-action="quick-add-task" data-kind="${kind}" data-id="${recId}" data-template="${t.id}">+ ${esc(t.name)}</button>`).join('') || '<span class="hint">No templates yet — add one in Settings.</span>'}
    </div>
    <button class="btn btn-secondary btn-block" data-action="add-task" data-kind="${kind}" data-id="${recId}">+ Custom Task</button>
    <div class="task-list">${rows || emptyState('No tasks yet.')}</div>
  `;
}

// ---- Add note sheet ----
function renderAddNoteSheet(view) {
  return `
    ${sheetHeader('Add Note', { back: true })}
    <div class="sheet-body">
      <label class="field-label">Subject
        <input class="field-input" type="text" id="noteSubject" placeholder="e.g. Site visit" />
      </label>
      <label class="field-label">Comments
        <textarea class="field-input" rows="4" id="noteComments" placeholder="Details..."></textarea>
      </label>
      <button class="btn btn-primary btn-block" data-action="save-note" data-kind="${view.kind}" data-id="${view.id}">Save Note</button>
    </div>`;
}

// ---- Add / edit task sheets ----
function renderAddTaskSheet(view) {
  const defaultAssignee = DB.getUser();
  return `
    ${sheetHeader('New Task', { back: true })}
    <div class="sheet-body">
      <label class="field-label">Task Name
        <input class="field-input" type="text" id="taskName" placeholder="e.g. Verify engraving text" />
      </label>
      <label class="field-label">Description
        <textarea class="field-input" rows="3" id="taskDescription"></textarea>
      </label>
      <label class="field-label">Assignee
        <input class="field-input" type="text" id="taskAssignee" value="${esc(defaultAssignee)}" />
      </label>
      <button class="btn btn-primary btn-block" data-action="save-task" data-kind="${view.kind}" data-id="${view.id}">Add Task</button>
    </div>`;
}

function renderEditTaskSheet(view) {
  const t = DB.getTasks().find((x) => x.id === view.id);
  if (!t) return sheetHeader('Task') + `<div class="sheet-body">${emptyState('Task not found.')}</div>`;
  return `
    ${sheetHeader('Edit Task', { back: true })}
    <div class="sheet-body">
      <label class="field-label">Task Name
        <input class="field-input" type="text" id="taskName" value="${esc(t.name)}" />
      </label>
      <label class="field-label">Description
        <textarea class="field-input" rows="3" id="taskDescription">${esc(t.description)}</textarea>
      </label>
      <label class="field-label">Assignee
        <input class="field-input" type="text" id="taskAssignee" value="${esc(t.assignee)}" />
      </label>
      <label class="field-label">Status
        <select class="field-input" id="taskStatus">
          ${TASK_STATUSES.map((s) => `<option value="${s}" ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </label>
      <label class="field-label">Task Comments
        <textarea class="field-input" rows="3" id="taskComments">${esc(t.comments)}</textarea>
      </label>
      <button class="btn btn-primary btn-block" data-action="update-task" data-id="${t.id}">Save Changes</button>
    </div>`;
}

// ---- Template editor sheet ----
function renderEditTemplateSheet(view) {
  const tpl = view.id ? DB.getTemplates().find((t) => t.id === view.id) : null;
  return `
    ${sheetHeader(tpl ? 'Edit Template' : 'New Template', { back: true })}
    <div class="sheet-body">
      <label class="field-label">Task Name
        <input class="field-input" type="text" id="tplName" value="${esc(tpl ? tpl.name : '')}" placeholder="e.g. Take verification photo" />
      </label>
      <label class="field-label">Description
        <textarea class="field-input" rows="3" id="tplDescription">${esc(tpl ? tpl.description : '')}</textarea>
      </label>
      <label class="field-label">Default Assignee
        <input class="field-input" type="text" id="tplAssignee" value="${esc(tpl ? tpl.assignee : DB.getUser())}" />
      </label>
      <button class="btn btn-primary btn-block" data-action="save-template" data-id="${tpl ? tpl.id : ''}">Save Template</button>
    </div>`;
}

// ---- Action list picker (quick add from a record) ----
function renderActionListPickerSheet(view) {
  const { kind, id } = view;
  const lists = DB.getActionLists();
  const rows = lists.map((l) => {
    const on = DB.isOnActionList(l.id, kind, id);
    return `<label class="picker-row">
      <input type="checkbox" data-action="toggle-list-membership" data-list="${l.id}" data-kind="${kind}" data-id="${id}" ${on ? 'checked' : ''} />
      <span>${esc(l.name)}</span>
    </label>`;
  }).join('');
  return `
    ${sheetHeader('Add to Action List', { back: state.sheetStack.length > 1 })}
    <div class="sheet-body">
      <div class="picker-list">${rows || emptyState('No action lists yet — create one below.')}</div>
      <div class="new-list-row">
        <input type="text" id="newListName" class="field-input" placeholder="New action list name" />
        <button class="btn btn-secondary btn-block" data-action="create-and-add-list" data-kind="${kind}" data-id="${id}">+ Create &amp; Add</button>
      </div>
    </div>`;
}

function renderNewActionListSheet() {
  return `
    ${sheetHeader('New Action List', { back: true })}
    <div class="sheet-body">
      <label class="field-label">List Name
        <input class="field-input" type="text" id="alName" placeholder="e.g. Monday Rounds" />
      </label>
      <button class="btn btn-primary btn-block" data-action="save-new-action-list">Create List</button>
    </div>`;
}

// ---------------------------------------------------------------------------
// Event delegation
// ---------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const action = t.dataset.action;

  switch (action) {
    case 'open-record': {
      const kind = t.dataset.kind, id = t.dataset.id;
      const rec = getRecord(kind, id);
      if (!rec) return;
      openSheet({ type: 'record', kind, id, tab: 'Info', isNew: false, draft: JSON.parse(JSON.stringify(rec)) });
      break;
    }
    case 'add-object': {
      const draft = {
        id: DB.nextObjectId(), name: 'New Naming Opportunity', description: '', type: '', location: '',
        specialty: '', fund: '', campaign: '', askAmount: null, squareFootage: null, comments: '',
        customField: '', lat: null, lng: null, pictures: [],
      };
      openSheet({ type: 'record', kind: 'object', id: draft.id, tab: 'Info', isNew: true, draft });
      break;
    }
    case 'add-instance': {
      const objectId = t.dataset.id;
      const draft = {
        id: DB.nextInstanceId(), objectId, instanceName: 'New Instance', comments: '', dedication: '',
        specificLocation: '', engravingLine1: '', engravingLine2: '', section: '', row: '', sequence: '',
        pictures: [],
      };
      openSheet({ type: 'record', kind: 'instance', id: draft.id, tab: 'Info', isNew: true, draft });
      break;
    }
    case 'set-tab': {
      const top = state.sheetStack[state.sheetStack.length - 1];
      top.tab = t.dataset.tab;
      renderSheet();
      break;
    }
    case 'save-record': {
      const view = currentRecordView();
      if (!view) return;
      const nameField = view.kind === 'object' ? 'name' : 'instanceName';
      if (!view.draft[nameField] || !String(view.draft[nameField]).trim()) { toast('Name is required'); return; }
      if (view.kind === 'object') DB.saveObject(view.draft); else DB.saveInstance(view.draft);
      closeSheet();
      render();
      toast('Saved');
      break;
    }
    case 'cancel-record':
      closeSheet();
      render();
      break;
    case 'sheet-back':
      closeSheet();
      break;
    case 'sheet-close':
      closeAllSheets();
      render();
      break;
    case 'add-note':
      openSheet({ type: 'addNote', kind: t.dataset.kind, id: t.dataset.id });
      break;
    case 'save-note': {
      const subject = el('noteSubject').value.trim() || 'Note';
      const comments = el('noteComments').value.trim();
      DB.addNote(t.dataset.kind, t.dataset.id, subject, comments);
      closeSheet();
      toast('Note added');
      break;
    }
    case 'add-task':
      openSheet({ type: 'addTask', kind: t.dataset.kind, id: t.dataset.id });
      break;
    case 'save-task': {
      const name = el('taskName').value.trim();
      if (!name) { toast('Task name is required'); return; }
      DB.addTask(t.dataset.kind, t.dataset.id, {
        name,
        description: el('taskDescription').value.trim(),
        assignee: el('taskAssignee').value.trim() || DB.getUser(),
      });
      closeSheet();
      toast('Task added');
      break;
    }
    case 'quick-add-task': {
      const tpl = DB.getTemplates().find((x) => x.id === t.dataset.template);
      if (!tpl) return;
      DB.addTask(t.dataset.kind, t.dataset.id, {
        name: tpl.name, description: tpl.description, assignee: tpl.assignee,
      });
      renderSheet();
      toast(`Added "${tpl.name}"`);
      break;
    }
    case 'edit-task':
      openSheet({ type: 'editTask', id: t.dataset.id });
      break;
    case 'update-task': {
      const task = DB.getTasks().find((x) => x.id === t.dataset.id);
      task.name = el('taskName').value.trim() || task.name;
      task.description = el('taskDescription').value.trim();
      task.assignee = el('taskAssignee').value.trim() || task.assignee;
      task.status = el('taskStatus').value;
      task.comments = el('taskComments').value.trim();
      DB.updateTask(task);
      closeSheet();
      toast('Task updated');
      break;
    }
    case 'toggle-task': {
      e.stopPropagation();
      const task = DB.getTasks().find((x) => x.id === t.dataset.id);
      const newStatus = t.checked ? 'Complete' : 'Open';
      DB.setTaskStatus(task.id, newStatus);
      render();
      break;
    }
    case 'open-task-parent': {
      const task = DB.getTasks().find((x) => x.id === t.dataset.id);
      if (!task) return;
      const rec = getRecord(task.parentType, task.parentId);
      if (!rec) return;
      openSheet({ type: 'record', kind: task.parentType, id: task.parentId, tab: 'Tasks', isNew: false, draft: JSON.parse(JSON.stringify(rec)) });
      break;
    }
    case 'toggle-task-select-mode':
      state.taskSelectMode = !state.taskSelectMode;
      state.selectedTaskIds.clear();
      renderMain();
      break;
    case 'toggle-task-select-item': {
      const id = t.dataset.id;
      if (state.selectedTaskIds.has(id)) state.selectedTaskIds.delete(id); else state.selectedTaskIds.add(id);
      renderMain();
      break;
    }
    case 'bulk-set-status': {
      const status = t.dataset.status;
      const n = state.selectedTaskIds.size;
      state.selectedTaskIds.forEach((id) => DB.setTaskStatus(id, status));
      toast(`${n} task${n === 1 ? '' : 's'} marked ${status}`);
      state.selectedTaskIds.clear();
      state.taskSelectMode = false;
      renderMain();
      break;
    }
    case 'capture-photo':
      el('photoInput').click();
      break;
    case 'remove-photo': {
      const view = currentRecordView();
      if (!view) return;
      view.draft.pictures.splice(Number(t.dataset.idx), 1);
      renderSheet();
      break;
    }
    case 'capture-gps': {
      const view = currentRecordView();
      if (!view) return;
      if (!navigator.geolocation) { toast('Geolocation not supported'); return; }
      toast('Capturing location...');
      navigator.geolocation.getCurrentPosition((pos) => {
        view.draft.lat = +pos.coords.latitude.toFixed(6);
        view.draft.lng = +pos.coords.longitude.toFixed(6);
        renderSheet();
        toast('Location captured — tap Save to keep it');
      }, (err) => {
        toast('Could not get location: ' + err.message);
      }, { enableHighAccuracy: true, timeout: 10000 });
      break;
    }
    case 'toggle-near':
      state.nearOnly = !state.nearOnly;
      render();
      break;
    case 'clear-location':
      state.userLocation = null;
      state.nearOnly = false;
      render();
      break;
    case 'set-task-filter':
      state.taskFilter = t.dataset.filter;
      renderMain();
      break;
    case 'new-template':
      openSheet({ type: 'editTemplate', id: null });
      break;
    case 'edit-template':
      openSheet({ type: 'editTemplate', id: t.dataset.id });
      break;
    case 'delete-template':
      if (confirm('Delete this task template?')) {
        DB.deleteTemplate(t.dataset.id);
        renderMain();
      }
      break;
    case 'save-template': {
      const name = el('tplName').value.trim();
      if (!name) { toast('Template name is required'); return; }
      const data = {
        name,
        description: el('tplDescription').value.trim(),
        assignee: el('tplAssignee').value.trim() || DB.getUser(),
      };
      if (t.dataset.id) DB.updateTemplate({ id: t.dataset.id, ...data });
      else DB.addTemplate(data);
      closeSheet();
      renderMain();
      toast('Template saved');
      break;
    }
    case 'open-action-picker':
      openSheet({ type: 'pickActionLists', kind: t.dataset.kind, id: t.dataset.id });
      break;
    case 'toggle-list-membership': {
      e.stopPropagation();
      DB.toggleActionListMembership(t.dataset.list, t.dataset.kind, t.dataset.id);
      renderSheet();
      renderMain();
      break;
    }
    case 'create-and-add-list': {
      const name = el('newListName').value.trim();
      if (!name) { toast('Enter a list name'); return; }
      const newList = DB.createActionList(name);
      DB.toggleActionListMembership(newList.id, t.dataset.kind, t.dataset.id);
      renderSheet();
      toast('List created and added');
      break;
    }
    case 'select-action-list':
      state.actionListSelectedId = t.dataset.id;
      renderMain();
      break;
    case 'new-action-list':
      openSheet({ type: 'newActionList' });
      break;
    case 'save-new-action-list': {
      const name = el('alName').value.trim();
      if (!name) { toast('Enter a list name'); return; }
      const l = DB.createActionList(name);
      state.actionListSelectedId = l.id;
      closeSheet();
      renderMain();
      toast('List created');
      break;
    }
    case 'delete-action-list': {
      if (confirm('Delete this action list? Records on it will not be deleted.')) {
        DB.deleteActionList(t.dataset.id);
        state.actionListSelectedId = null;
        renderMain();
      }
      break;
    }
  }
});

// Nav + top bar controls
el('typeToggle').addEventListener('click', (e) => {
  const b = e.target.closest('.toggle-btn');
  if (!b) return;
  state.mode = b.dataset.mode;
  render();
});

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.view = btn.dataset.view;
    closeAllSheets();
    render();
  });
});

el('searchInput').addEventListener('input', (e) => {
  state.search = e.target.value;
  renderMain();
});

el('locationSelect').addEventListener('change', (e) => {
  state.locationFilterValue = e.target.value;
  renderMain();
});

el('btnLocation').addEventListener('click', () => {
  if (!navigator.geolocation) { toast('Geolocation not supported'); return; }
  toast('Getting your location...');
  navigator.geolocation.getCurrentPosition((pos) => {
    state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() };
    render();
    toast('Location set');
  }, (err) => {
    toast('Could not get location: ' + err.message);
  }, { enableHighAccuracy: true, timeout: 10000 });
});

el('btnUser').addEventListener('click', () => {
  state.view = 'templates';
  closeAllSheets();
  render();
});

el('sheetOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'sheetOverlay') {
    closeAllSheets();
    render();
  }
});

// Record field edits (delegated change event — fires on blur for text/textarea).
// Writes into the open sheet's draft only; DB is touched by Save.
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.recordField) {
    const view = currentRecordView();
    if (!view) return;
    let val = t.value;
    if (t.type === 'number') val = val === '' ? null : Number(val);
    view.draft[t.dataset.recordField] = val;
  } else if (t.id === 'userNameInput') {
    DB.setUser(t.value.trim() || 'Field Admin');
    toast('Session user updated');
  }
});

// Photo input (hidden, camera-capable on mobile via capture attribute)
el('photoInput').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  const view = currentRecordView();
  if (!file || !view) return;
  const reader = new FileReader();
  reader.onload = () => {
    view.draft.pictures = view.draft.pictures || [];
    if (view.draft.pictures.length >= 3) { toast('Maximum of 3 photos'); return; }
    view.draft.pictures.push(reader.result);
    renderSheet();
    toast('Photo added — tap Save to keep it');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
DB.seedIfNeeded(false);
render();
