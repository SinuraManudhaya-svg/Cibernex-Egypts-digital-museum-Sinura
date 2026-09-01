/**
 * admin.js
 * Shared by TWO separate pages:
 *   - login.html  (the token+password entry screen)
 *   - admin.html  (the dashboard — artifacts/exhibitions/announcements)
 *
 * Each page only has the DOM elements relevant to it, so every block
 * below checks for its own elements before touching them, rather than
 * assuming both pages' markup exists at once.
 *
 * SECURITY NOTE: the "login" here is a single shared token+password
 * pair checked server-side (see server.js requireAdmin) — there are
 * no user accounts. This is appropriate for local/personal use only.
 * Do not treat this as real authentication if this project is ever
 * deployed somewhere public.
 */

'use strict';

const $ = id => document.getElementById(id);
const API_BASE = 'https://egypt-museum-api.onrender.com/api';
const TOKEN_KEY = 'edm_admin_token';
const PASSWORD_KEY = 'edm_admin_password';
const LOGIN_PAGE = 'login.html';
const DASHBOARD_PAGE = 'admin.html';

function esc(v) {
    return String(v ?? '').replaceAll('&', '&amp;')
                           .replaceAll('<', '&lt;')
                           .replaceAll('>', '&gt;')
                           .replaceAll('"', '&quot;')
                           .replaceAll("'", '&#039;');
}

// ================= CREDENTIAL STORAGE =================
// "Remember Me" checked -> localStorage (survives closing the
// browser). Unchecked -> sessionStorage (cleared when the tab/browser
// closes), which was the original behavior. Reading always checks
// both, since we don't know which one a given visit used.

function getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
}

function getPassword() {
    return localStorage.getItem(PASSWORD_KEY) || sessionStorage.getItem(PASSWORD_KEY) || '';
}

function storeCredentials(token, password, remember) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(PASSWORD_KEY, password);
}

function clearCredentials() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PASSWORD_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PASSWORD_KEY);
}

// Checks a token+password pair against the server. Both must be
// correct — server.js rejects the request if either one is wrong.
async function verifyCredentials(token, password) {
    try {
        const res = await fetch(`${API_BASE}/admin/verify`, {
            headers: {
                'x-admin-token': token,
                'x-admin-password': password,
            },
        });
        return res.ok;
    } catch (err) {
        // Server unreachable (not running, wrong port, etc.) — treat
        // the same as "not verified" rather than letting the error
        // bubble up and stop the rest of the page's JS from running.
        console.warn('Could not reach the API to verify credentials:', err.message);
        return false;
    }
}

async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-admin-token': getToken(),
            'x-admin-password': getPassword(),
            ...options.headers,
        },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
    }
    return res.status === 204 ? null : res.json();
}

document.addEventListener('DOMContentLoaded', async () => {
    const onLoginPage = Boolean($('adminLoginForm'));
    const onDashboardPage = Boolean($('adminDashboard'));

    if (onLoginPage) {
        await initLoginPage();
    } else if (onDashboardPage) {
        await initDashboardPage();
    }
});

// ================= LOGIN PAGE (login.html) =================
async function initLoginPage() {
    const existingToken = getToken();
    const existingPassword = getPassword();

    // Already logged in from a previous visit — skip straight to the
    // dashboard instead of making them log in again.
    if (existingToken && existingPassword && await verifyCredentials(existingToken, existingPassword)) {
        window.location.href = DASHBOARD_PAGE;
        return;
    }
    clearCredentials();

    $('adminLoginForm').addEventListener('submit', async e => {
        e.preventDefault();
        const token = $('adminTokenInput').value.trim();
        const password = $('adminPasswordInput').value.trim();
        const remember = $('rememberMeInput')?.checked ?? false;
        if (!token || !password) return;

        const ok = await verifyCredentials(token, password);
        if (ok) {
            storeCredentials(token, password, remember);
            window.location.href = DASHBOARD_PAGE;
        } else {
            $('adminLoginError')?.classList.remove('hidden');
        }
    });

    // Show/hide password toggle
    const toggleBtn = $('passwordToggleBtn');
    const passwordInput = $('adminPasswordInput');
    toggleBtn?.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        toggleBtn.setAttribute('aria-pressed', String(isHidden));
        toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
}

// ================= DASHBOARD PAGE (admin.html) =================
async function initDashboardPage() {
    const token = getToken();
    const password = getPassword();

    if (!token || !password || !await verifyCredentials(token, password)) {
        clearCredentials();
        window.location.href = LOGIN_PAGE;
        return;
    }

    $('adminDashboard').classList.remove('hidden');

    $('adminLogoutBtn')?.addEventListener('click', () => {
        clearCredentials();
        window.location.href = LOGIN_PAGE;
    });

    setupTabs();
    setupForms();
    Object.keys(ENTITY_CONFIG).forEach(loadEntity);
}

// ================= ENTITY CONFIG =================
// Field types: 'text' | 'number' | 'checkbox' | 'csv-int' (comma
// list of numbers, stored as an array — used for exhibitions.artifactIds)
const ENTITY_CONFIG = {
    artifacts: {
        endpoint: 'artifacts',
        idField: 'id',
        idIsNumeric: true,
        fields: {
            name: 'text', objectId: 'text', subtitle: 'text', period: 'text',
            dynasty: 'text', date: 'text', sortYear: 'number', category: 'text',
            material: 'text', dimensions: 'text', origin: 'text', location: 'text',
            image: 'text', sourceName: 'text', sourceUrl: 'text', featured: 'checkbox',
            discovery: 'text', description: 'text', significance: 'text',
        },
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Name' },
            { key: 'period', label: 'Period' },
            { key: 'category', label: 'Category' },
            { key: 'featured', label: 'Featured', format: v => v ? 'Yes' : '—' },
        ],
    },
    exhibitions: {
        endpoint: 'exhibitions',
        idField: 'id',
        idIsNumeric: false,
        fields: {
            id: 'text', title: 'text', category: 'text', categoryLabel: 'text',
            period: 'text', glyph: 'text', image: 'text', featured: 'checkbox',
            description: 'text', longDescription: 'text', artifactIds: 'csv-int',
        },
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'title', label: 'Title' },
            { key: 'categoryLabel', label: 'Category' },
            { key: 'artifactIds', label: 'Artifacts', format: v => Array.isArray(v) ? v.length : 0 },
            { key: 'featured', label: 'Featured', format: v => v ? 'Yes' : '—' },
        ],
    },
    announcements: {
        endpoint: 'announcements',
        idField: 'id',
        idIsNumeric: true,
        fields: {
            title: 'text', message: 'text', active: 'checkbox',
        },
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'title', label: 'Title' },
            { key: 'date', label: 'Date', format: v => v ? new Date(v).toLocaleDateString() : '—' },
            { key: 'active', label: 'Active', format: v => v ? 'Yes' : '—' },
        ],
    },
};

const state = { data: { artifacts: [], exhibitions: [], announcements: [] } };

// ================= TABS =================

function setupTabs() {
    $('adminTabs').addEventListener('click', e => {
        const btn = e.target.closest('.chip');
        if (!btn) return;
        document.querySelectorAll('#adminTabs .chip').forEach(c => c.classList.toggle('active', c === btn));
        document.querySelectorAll('.admin-panel').forEach(panel => {
            panel.classList.toggle('hidden', panel.id !== `panel-${btn.dataset.tab}`);
        });
    });
}

// ================= TOAST =================

let toastTimer = null;
function showToast(message, type = 'success') {
    const toast = $('adminToast');
    toast.dataset.message = message;
    toast.className = `admin-toast ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ================= LOAD + RENDER TABLES =================

async function loadEntity(entityName) {
    const config = ENTITY_CONFIG[entityName];
    try {
        const data = await fetch(`${API_BASE}/${config.endpoint}`).then(r => r.json());
        state.data[entityName] = data;
        renderTable(entityName);
    } catch (err) {
        console.error(`Failed to load ${entityName}:`, err);
        showToast(`Could not load ${entityName}. Is the server running?`, 'error');
    }
}

function renderTable(entityName) {
    const config = ENTITY_CONFIG[entityName];
    const tbody = document.querySelector(`#table-${entityName} tbody`);
    const rows = state.data[entityName];

    if (!rows.length) {
        tbody.innerHTML = `<tr class="admin-table-empty"><td colspan="${config.columns.length + 1}">No ${entityName} yet — add your first one above.</td></tr>`;
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
                    <button type="button" class="admin-row-btn" data-action="edit" data-entity="${entityName}" data-id="${esc(row[config.idField])}">Edit</button>
                    <button type="button" class="admin-row-btn danger" data-action="delete" data-entity="${entityName}" data-id="${esc(row[config.idField])}">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ================= FORMS =================

function setupForms() {
    Object.keys(ENTITY_CONFIG).forEach(entityName => {
        const form = $(`form-${entityName === 'artifacts' ? 'artifact' : entityName === 'exhibitions' ? 'exhibition' : 'announcement'}`);
        if (!form) return;

        form.addEventListener('submit', e => {
            e.preventDefault();
            submitForm(entityName, form);
        });

        form.querySelector('.admin-cancel-btn')?.addEventListener('click', () => {
            form.reset();
            form.classList.add('hidden');
        });
    });

    document.querySelectorAll('.admin-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const formKey = btn.dataset.form;
            const form = $(`form-${formKey}`);
            form.reset();
            form.querySelector('[name="__editId"]').value = '';
            if (formKey === 'exhibition') {
                $('exhibitionIdInput').disabled = false;
            }
            form.classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    document.querySelectorAll('.admin-panel').forEach(panel => {
        panel.addEventListener('click', e => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, entity, id } = btn.dataset;
            if (action === 'edit') startEdit(entity, id);
            if (action === 'delete') confirmDelete(entity, id);
        });
    });
}

function startEdit(entityName, id) {
    const config = ENTITY_CONFIG[entityName];
    const idValue = config.idIsNumeric ? Number(id) : id;
    const item = state.data[entityName].find(row => row[config.idField] === idValue);
    if (!item) return;

    const formKey = entityName === 'artifacts' ? 'artifact' : entityName === 'exhibitions' ? 'exhibition' : 'announcement';
    const form = $(`form-${formKey}`);
    form.reset();

    Object.entries(config.fields).forEach(([field, type]) => {
        const input = form.elements[field];
        if (!input) return;
        if (type === 'checkbox') {
            input.checked = Boolean(item[field]);
        } else if (type === 'csv-int') {
            input.value = Array.isArray(item[field]) ? item[field].join(', ') : '';
        } else {
            input.value = item[field] ?? '';
        }
    });

    form.querySelector('[name="__editId"]').value = id;
    if (formKey === 'exhibition') {
        $('exhibitionIdInput').disabled = true; // id can't change once created
    }

    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function collectFormData(entityName, form) {
    const config = ENTITY_CONFIG[entityName];
    const payload = {};

    Object.entries(config.fields).forEach(([field, type]) => {
        const input = form.elements[field];
        if (!input) return;

        if (type === 'checkbox') {
            payload[field] = input.checked;
        } else if (type === 'number') {
            payload[field] = input.value === '' ? undefined : Number(input.value);
        } else if (type === 'csv-int') {
            payload[field] = input.value
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .map(Number)
                .filter(n => !Number.isNaN(n));
        } else {
            payload[field] = input.value;
        }
    });

    return payload;
}

async function submitForm(entityName, form) {
    const config = ENTITY_CONFIG[entityName];
    const editId = form.elements['__editId'].value;
    const payload = collectFormData(entityName, form);

    try {
        if (editId) {
            await apiFetch(`${API_BASE}/${config.endpoint}/${encodeURIComponent(editId)}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            showToast('Saved.', 'success');
        } else {
            await apiFetch(`${API_BASE}/${config.endpoint}`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            showToast('Added.', 'success');
        }
        form.reset();
        form.classList.add('hidden');
        await loadEntity(entityName);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function confirmDelete(entityName, id) {
    if (!confirm(`Delete this ${entityName.slice(0, -1)}? This can't be undone.`)) return;
    const config = ENTITY_CONFIG[entityName];
    try {
        await apiFetch(`${API_BASE}/${config.endpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        showToast('Deleted.', 'success');
        await loadEntity(entityName);
    } catch (err) {
        showToast(err.message, 'error');
    }
}
