/**
 * admin.js — Egypt Digital Museum Admin Panel
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */

const API_BASE      = '/api';
const TOKEN_KEY      = 'edm_admin_token';
const PASSWORD_KEY   = 'edm_admin_pw';
const DASHBOARD_PAGE = 'admin.html';
const LOGIN_PAGE     = 'login.html';
const $ = id => document.getElementById(id);
let toastTimer = null;

/* ══════════════════════════════════════════════════════════════
   CREDENTIAL STORAGE
   Bug 9 fix: password goes to sessionStorage ONLY.
   Token may go to localStorage if "Remember me" is checked.
══════════════════════════════════════════════════════════════ */

function storeCredentials(token, password, remember) {
  sessionStorage.setItem(PASSWORD_KEY, password);

  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY); 
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

function getPassword() {
  return sessionStorage.getItem(PASSWORD_KEY);
}

function clearCredentials() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(PASSWORD_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

/* ══════════════════════════════════════════════════════════════
   API FETCH WRAPPER
══════════════════════════════════════════════════════════════ */

async function apiFetch(url, options = {}) {
  const token    = getToken();
  const password = getPassword();

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type':     'application/json',
      'x-admin-token':    token    || '',
      'x-admin-password': password || '',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.status === 204 ? null : res.json();
}

async function verifyCredentials(token, password) {
  try {
    const res = await fetch(`${API_BASE}/admin/verify`, {
      headers: {
        'x-admin-token':    token,
        'x-admin-password': password,
      },
    });
    if (res.status === 401) return 'invalid';
    if (res.ok)             return 'ok';
    return 'unreachable';
  } catch {
    return 'unreachable';
  }
}

/* ══════════════════════════════════════════════════════════════
   ENTITY CONFIGURATION
══════════════════════════════════════════════════════════════ */
const ENTITY_CONFIG = {
  artifacts: {
    endpoint:    'artifacts',
    idField:     'id',
    idIsNumeric: true,
    fields: {
      name:        'text',
      dynasty:     'text',
      period:      'text',
      material:    'text',
      location:    'text',
      description: 'text',
      image:       'text',
      sortYear:    'number',
    },
    columns: [
      { key: 'id',       label: 'ID' },
      { key: 'name',     label: 'Name' },
      { key: 'dynasty',  label: 'Dynasty' },
      { key: 'material', label: 'Material' },
      { key: 'location', label: 'Location' },
    ],
  },

  exhibitions: {
    endpoint:    'exhibitions',
    idField:     'slug',
    idIsNumeric: false,
    fields: {
      slug:        'text',
      title:       'text',
      subtitle:    'text',
      description: 'text',
      image:       'text',
      featured:    'checkbox',
    },
    columns: [
      { key: 'slug',     label: 'Slug' },
      { key: 'title',    label: 'Title' },
      { key: 'subtitle', label: 'Subtitle' },
      { key: 'featured', label: 'Featured', format: v => v ? 'Yes' : '—' },
    ],
  },

  announcements: {
    endpoint:    'announcements',
    idField:     'id',
    idIsNumeric: true,
    fields: {
      title:   'text',
      message: 'text',
      active:  'checkbox',
    },
    columns: [
      { key: 'id',      label: 'ID' },
      { key: 'title',   label: 'Title' },
      { key: 'date',    label: 'Date', format: v => v ? new Date(v).toLocaleDateString() : '—' },
      { key: 'active',  label: 'Active', format: v => v ? 'Yes' : '—' },
    ],
  },
};

/* ══════════════════════════════════════════════════════════════
   IN-MEMORY STATE
══════════════════════════════════════════════════════════════ */
const state = {
  data:       { artifacts: [], exhibitions: [], announcements: [] },
  editingId:  { artifacts: null, exhibitions: null, announcements: null },
};

/* ══════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════════════════════ */

function showToast(message, type = 'success') {
  const toast = $('adminToast');
  if (!toast) return;

  toast.textContent = message;
  toast.className   = `admin-toast ${type}`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

/* ══════════════════════════════════════════════════════════════
   TAB NAVIGATION
══════════════════════════════════════════════════════════════ */
function setupTabs() {
  const tabList = $('adminTabs');
  if (!tabList) return;

  tabList.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;

    document.querySelectorAll('#adminTabs .chip').forEach(c => {
      c.classList.toggle('active', c === btn);
    });
    document.querySelectorAll('.admin-panel').forEach(panel => {
      panel.classList.toggle('hidden', panel.id !== `panel-${btn.dataset.tab}`);
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   TABLE RENDERING
══════════════════════════════════════════════════════════════ */

function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTable(entityName) {
  const config = ENTITY_CONFIG[entityName];
  const tbody  = document.querySelector(`#panel-${entityName} tbody`);
  if (!tbody) return;

  const rows = state.data[entityName];

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${config.columns.length + 1}" class="admin-empty">No records yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => {
    const cells = config.columns.map(col => {
      const raw = row[col.key];
      return `<td>${esc(col.format ? col.format(raw) : (raw ?? '—'))}</td>`;
    }).join('');

    return `
      <tr>
        ${cells}
        <td>
          <button type="button" class="admin-row-btn"
                  data-action="edit"
                  data-entity="${entityName}"
                  data-id="${esc(row[config.idField])}">Edit</button>
          <button type="button" class="admin-row-btn danger"
                  data-action="delete"
                  data-entity="${entityName}"
                  data-id="${esc(row[config.idField])}">Delete</button>
        </td>
      </tr>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   TABLE ACTION EVENT DELEGATION
══════════════════════════════════════════════════════════════ */
function initTableActions() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, entity, id } = btn.dataset;
    if (action === 'edit')   startEdit(entity, id);
    if (action === 'delete') confirmDelete(entity, id);
  });
}

/* ══════════════════════════════════════════════════════════════
   FORM HANDLING
══════════════════════════════════════════════════════════════ */
function setupForms() {
  Object.keys(ENTITY_CONFIG).forEach(entityName => {
    const formId = entityName === 'artifacts'    ? 'form-artifact'
                 : entityName === 'exhibitions'  ? 'form-exhibition'
                 : 'form-announcement';

    const form = $(formId);
    if (!form) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      await saveEntity(entityName, form);
    });
  });

  document.querySelectorAll('[data-cancel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const entityName = btn.dataset.cancel;
      state.editingId[entityName] = null;
      resetForm(entityName);
    });
  });
}

function startEdit(entityName, id) {
  const config  = ENTITY_CONFIG[entityName];
  const idValue = config.idIsNumeric ? Number(id) : id;
  const item    = state.data[entityName].find(row => row[config.idField] === idValue);
  if (!item) return;

  state.editingId[entityName] = idValue;

  const formId = entityName === 'artifacts'   ? 'form-artifact'
               : entityName === 'exhibitions' ? 'form-exhibition'
               : 'form-announcement';
  const form = $(formId);
  if (!form) return;

  Object.keys(config.fields).forEach(field => {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return;

    if (input.type === 'checkbox') {
      input.checked = Boolean(item[field]);
    } else {
      input.value = item[field] ?? '';
    }
  });

  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetForm(entityName) {
  const formId = entityName === 'artifacts'   ? 'form-artifact'
               : entityName === 'exhibitions' ? 'form-exhibition'
               : 'form-announcement';
  $(formId)?.reset();
}

async function saveEntity(entityName, form) {
  const config   = ENTITY_CONFIG[entityName];
  const editingId = state.editingId[entityName];
  const payload  = {};

  Object.entries(config.fields).forEach(([field, type]) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return;

    if (type === 'checkbox') {
      payload[field] = input.checked;
    } else if (type === 'number') {
      payload[field] = input.value === '' ? undefined : Number(input.value);
    } else {
      payload[field] = input.value.trim() || undefined;
    }
  });

  try {
    if (editingId !== null) {
      await apiFetch(`${API_BASE}/${config.endpoint}/${encodeURIComponent(editingId)}`, {
        method: 'PUT',
        body:   JSON.stringify(payload),
      });
      showToast('Saved.', 'success');
    } else {
      await apiFetch(`${API_BASE}/${config.endpoint}`, {
        method: 'POST',
        body:   JSON.stringify(payload),
      });
      showToast('Created.', 'success');
    }

    state.editingId[entityName] = null;
    resetForm(entityName);
    await loadEntity(entityName);

  } catch (err) {
    showToast(err.message || 'Save failed.', 'error');
  }
}

/* ══════════════════════════════════════════════════════════════
   DELETE
══════════════════════════════════════════════════════════════ */
async function confirmDelete(entityName, id) {
  if (!confirm(`Delete this ${entityName.slice(0, -1)}? This cannot be undone.`)) return;

  const config = ENTITY_CONFIG[entityName];
  try {
    await apiFetch(`${API_BASE}/${config.endpoint}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    showToast('Deleted.', 'success');
    await loadEntity(entityName);
  } catch (err) {
    showToast(err.message || 'Delete failed.', 'error');
  }
}

/* ══════════════════════════════════════════════════════════════
   DATA LOADING
══════════════════════════════════════════════════════════════ */
async function loadEntity(entityName) {
  const config = ENTITY_CONFIG[entityName];
  try {
    const data = await fetch(`${API_BASE}/${config.endpoint}`).then(r => r.json());
    state.data[entityName] = Array.isArray(data) ? data : [];
    renderTable(entityName);
  } catch {
    showToast(`Failed to load ${entityName}.`, 'error');
  }
}

async function loadAll() {
  await Promise.all(Object.keys(ENTITY_CONFIG).map(loadEntity));
}

/* ══════════════════════════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════════════════════════ */
function initLogout() {
  $('adminLogoutBtn')?.addEventListener('click', () => {
    clearCredentials();
    window.location.href = LOGIN_PAGE;
  });
}

/* ══════════════════════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════════════════════ */
async function initLoginPage() {
  const existingToken    = getToken();
  const existingPassword = getPassword();

  if (existingToken && existingPassword) {
    const status = await verifyCredentials(existingToken, existingPassword);

    if (status === 'ok') {
      window.location.href = DASHBOARD_PAGE;
      return;
    }
     */
    if (status === 'invalid') {
      clearCredentials();
    }
  }

  const form       = $('adminLoginForm');
  const tokenInput = $('adminTokenInput');

  if (existingToken && tokenInput) {
    tokenInput.value = existingToken;
  }

  const toggleBtn     = $('passwordToggleBtn');
  const passwordInput = $('adminPasswordInput');

  toggleBtn?.addEventListener('click', () => {
    const reveal       = passwordInput?.type === 'password';
    if (tokenInput)    tokenInput.type    = reveal ? 'text' : 'password';
    if (passwordInput) passwordInput.type = reveal ? 'text' : 'password';
    toggleBtn.setAttribute('aria-pressed', String(reveal));
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();

    const token    = tokenInput?.value.trim()    || '';
    const password = passwordInput?.value.trim() || '';
    const remember = $('rememberMeInput')?.checked ?? false;

    if (!token || !password) {
      showToast?.('Please enter both token and password.', 'error');
      return;
    }

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const status = await verifyCredentials(token, password);

    if (status === 'ok') {
      storeCredentials(token, password, remember);
      window.location.href = DASHBOARD_PAGE;
    } else {
      clearCredentials();
      const msg = status === 'unreachable'
        ? 'Could not reach the server. Check your connection.'
        : 'Incorrect token or password.';
      showLoginError(msg);
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

function showLoginError(message) {
  let errEl = $('loginError');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.id        = 'loginError';
    errEl.className = 'login-error';
    errEl.setAttribute('role', 'alert');
    $('adminLoginForm')?.appendChild(errEl);
  }
  errEl.textContent = message;
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════════════════════════════ */
async function initDashboardPage() {
  const token    = getToken();
  const password = getPassword();

  if (!token || !password) {
    window.location.href = LOGIN_PAGE;
    return;
  }

  const status = await verifyCredentials(token, password);
  if (status !== 'ok') {
    clearCredentials();
    window.location.href = LOGIN_PAGE;
    return;
  }

  $('adminDashboard')?.classList.remove('hidden');

  setupTabs();
  setupForms();
  initTableActions();
  initLogout();
  await loadAll();
}

/* ══════════════════════════════════════════════════════════════
   ENTRY POINT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const onLoginPage     = Boolean($('adminLoginForm'));
  const onDashboardPage = Boolean($('adminDashboard'));

  if (onLoginPage)     initLoginPage();
  if (onDashboardPage) initDashboardPage();
});
