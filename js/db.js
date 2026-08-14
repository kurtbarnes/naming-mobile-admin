// localStorage-backed data store for the prototype. No backend — this stands in for the
// real Naming Opportunities data service so the UI/UX can be evaluated end to end.

const DB = (() => {
  const KEYS = {
    objects: 'no_objects',
    instances: 'no_instances',
    notes: 'no_notes',
    tasks: 'no_tasks',
    templates: 'no_templates',
    actionLists: 'no_action_lists',
    user: 'no_user',
    seeded: 'no_seeded_v2',
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function seedIfNeeded(force) {
    if (force || !localStorage.getItem(KEYS.seeded)) {
      save(KEYS.objects, JSON.parse(JSON.stringify(SEED_OBJECTS)));
      save(KEYS.instances, JSON.parse(JSON.stringify(SEED_INSTANCES)));
      save(KEYS.notes, JSON.parse(JSON.stringify(SEED_NOTES)));
      save(KEYS.tasks, JSON.parse(JSON.stringify(SEED_TASKS)));
      save(KEYS.templates, JSON.parse(JSON.stringify(SEED_TASK_TEMPLATES)));
      save(KEYS.actionLists, JSON.parse(JSON.stringify(SEED_ACTION_LISTS)));
      if (!load(KEYS.user, null)) save(KEYS.user, 'Field Admin');
      localStorage.setItem(KEYS.seeded, '1');
    }
  }

  function nextId(prefix, list) {
    let max = 0;
    list.forEach((item) => {
      const n = parseInt(String(item.id).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return `${prefix}${max + 1}`;
  }

  // ---- Objects ----
  function getObjects() { return load(KEYS.objects, []); }
  function getObject(id) { return getObjects().find((o) => o.id === id); }
  function saveObject(obj) {
    const list = getObjects();
    const idx = list.findIndex((o) => o.id === obj.id);
    if (idx >= 0) list[idx] = obj; else list.push(obj);
    save(KEYS.objects, list);
  }

  // ---- Instances ----
  function getInstances() { return load(KEYS.instances, []); }
  function getInstance(id) { return getInstances().find((i) => i.id === id); }
  function getInstancesForObject(objectId) { return getInstances().filter((i) => i.objectId === objectId); }
  function saveInstance(inst) {
    const list = getInstances();
    const idx = list.findIndex((i) => i.id === inst.id);
    if (idx >= 0) list[idx] = inst; else list.push(inst);
    save(KEYS.instances, list);
  }
  function nextObjectId() { return nextId('O', getObjects()); }
  function nextInstanceId() { return nextId('I', getInstances()); }

  // ---- Notes ----
  function getNotes() { return load(KEYS.notes, []); }
  function getNotesFor(parentType, parentId) {
    return getNotes()
      .filter((n) => n.parentType === parentType && n.parentId === parentId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  function addNote(parentType, parentId, subject, comments) {
    const list = getNotes();
    const id = nextId('N', list);
    const note = { id, parentType, parentId, subject, comments, date: todayISO() };
    list.unshift(note);
    save(KEYS.notes, list);
    return note;
  }

  // ---- Tasks ----
  function getTasks() { return load(KEYS.tasks, []); }
  function getTasksFor(parentType, parentId) {
    return getTasks()
      .filter((t) => t.parentType === parentType && t.parentId === parentId)
      .sort((a, b) => (a.dateAssigned < b.dateAssigned ? 1 : -1));
  }
  function addTask(parentType, parentId, { name, description, assignee, comments }) {
    const list = getTasks();
    const id = nextId('T', list);
    const task = {
      id, parentType, parentId, name, description: description || '',
      assignee: assignee || 'Field Admin', dateAssigned: todayISO(), status: 'Open',
      comments: comments || '',
    };
    list.unshift(task);
    save(KEYS.tasks, list);
    return task;
  }
  function updateTask(task) {
    const list = getTasks();
    const idx = list.findIndex((t) => t.id === task.id);
    if (idx >= 0) list[idx] = task;
    save(KEYS.tasks, list);
  }
  function setTaskStatus(taskId, status) {
    const list = getTasks();
    const t = list.find((x) => x.id === taskId);
    if (t) { t.status = status; save(KEYS.tasks, list); }
    return t;
  }

  // ---- Task templates ----
  function getTemplates() { return load(KEYS.templates, []); }
  function saveTemplates(list) { save(KEYS.templates, list); }
  function addTemplate(tpl) {
    const list = getTemplates();
    const id = nextId('TT', list);
    const full = { id, name: tpl.name, description: tpl.description || '', assignee: tpl.assignee || 'Field Admin' };
    list.push(full);
    saveTemplates(list);
    return full;
  }
  function updateTemplate(tpl) {
    const list = getTemplates();
    const idx = list.findIndex((t) => t.id === tpl.id);
    if (idx >= 0) list[idx] = tpl;
    saveTemplates(list);
  }
  function deleteTemplate(id) {
    saveTemplates(getTemplates().filter((t) => t.id !== id));
  }

  // ---- Action lists (named, many-to-many with objects/instances) ----
  function getActionLists() { return load(KEYS.actionLists, []); }
  function saveActionListsAll(list) { save(KEYS.actionLists, list); }
  function createActionList(name) {
    const list = getActionLists();
    const id = nextId('AL', list);
    const al = { id, name, items: [] };
    list.push(al);
    saveActionListsAll(list);
    return al;
  }
  function deleteActionList(id) {
    saveActionListsAll(getActionLists().filter((l) => l.id !== id));
  }
  function getListsContaining(kind, recordId) {
    return getActionLists().filter((l) => l.items.some((it) => it.kind === kind && it.id === recordId));
  }
  function isOnActionList(listId, kind, recordId) {
    const l = getActionLists().find((x) => x.id === listId);
    return !!(l && l.items.some((it) => it.kind === kind && it.id === recordId));
  }
  function toggleActionListMembership(listId, kind, recordId) {
    const lists = getActionLists();
    const l = lists.find((x) => x.id === listId);
    if (!l) return;
    const idx = l.items.findIndex((it) => it.kind === kind && it.id === recordId);
    if (idx >= 0) l.items.splice(idx, 1); else l.items.push({ kind, id: recordId });
    saveActionListsAll(lists);
  }

  // ---- Session user ----
  function getUser() { return load(KEYS.user, 'Field Admin'); }
  function setUser(name) { save(KEYS.user, name); }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function reset() { seedIfNeeded(true); }

  return {
    seedIfNeeded, reset,
    getObjects, getObject, saveObject, nextObjectId,
    getInstances, getInstance, getInstancesForObject, saveInstance, nextInstanceId,
    getNotesFor, addNote,
    getTasks, getTasksFor, addTask, updateTask, setTaskStatus,
    getTemplates, addTemplate, updateTemplate, deleteTemplate,
    getActionLists, createActionList, deleteActionList, getListsContaining, isOnActionList, toggleActionListMembership,
    getUser, setUser,
    todayISO,
  };
})();

// ---- Geo helpers ----
function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(mi) {
  if (mi < 0.1) return `${Math.round(mi * 5280)} ft`;
  return `${mi.toFixed(1)} mi`;
}
