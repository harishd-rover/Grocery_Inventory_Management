import { renderApp as renderAppView } from './components/AppLayout.js';
import { renderLogin as renderLoginView } from './components/views/LoginView.js';
import { renderModal as renderModalView } from './components/modals/ModalView.js';

import './styles.css';

const API = 'http://localhost:5000/api';
const root = document.querySelector('#root');
const units = {
  Vegetables: ['kg', 'gram', 'piece', 'crate', 'bundle'],
  Fruits: ['kg', 'gram', 'piece', 'dozen', 'crate'],
  Dairy: ['litre', 'millilitre', 'piece', 'packet', 'box'],
  Bakery: ['piece', 'packet', 'box', 'dozen'],
  Grocery: ['kg', 'gram', 'packet', 'pouch', 'box', 'piece'],
  Household: ['piece', 'pack', 'bottle', 'litre', 'box'],
  'Personal Care': ['piece', 'pack', 'bottle', 'millilitre'],
  Drinks: ['litre', 'millilitre', 'bottle', 'can', 'pack'],
};
const navItems = ['Overview', 'Inventory', 'Purchases', 'Suppliers', 'Billing', 'Sales', 'Reports'];
const icons = {
  chevron: '<span aria-hidden="true">›</span>',
  close: '<span aria-hidden="true">&#215;</span>',
  plus: '<span aria-hidden="true">+</span>',
  alert: '<span aria-hidden="true">!</span>',
  search: '<span aria-hidden="true">&#8981;</span>',
  arrow: '<span aria-hidden="true">&#8599;</span>',
  download: '<span aria-hidden="true">&#8595;</span>',
  menu: '<span aria-hidden="true">&#9776;</span>',
  bell: '<span aria-hidden="true">&#128276;</span>',
  box: '<span aria-hidden="true">&#9638;</span>',
  truck: '<span aria-hidden="true">&#9646;</span>',
  bill: '<span aria-hidden="true">&#9776;</span>',
};

const state = {
  user: readUser(),
  page: readUser()?.role === 'staff' ? 'Inventory' : 'Overview',
  summary: null,
  products: [],
  suppliers: [],
  purchases: [],
  sales: [],
  users: [],
  search: '',
  modal: null,
  loading: false,
  billing: {},
};

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value) || 0);
const dateLabel = (value) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
const today = () => new Date().toISOString().slice(0, 10);
const dateSort = (records) =>
  [...records].sort(
    (a, b) =>
      (Date.parse(b.date_added || b.date || '') || 0) -
        (Date.parse(a.date_added || a.date || '') || 0) ||
      Number(b.id) - Number(a.id),
  );
const todayTotal = (records) =>
  records
    .filter((record) => record.date === today())
    .reduce((total, record) => total + Number(record.total || 0), 0);

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('grocery_user') || sessionStorage.getItem('grocery_user')) || null;
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character]));
}

function apiFetch(path, options = {}) {
  const token = localStorage.getItem('grocery_token') || sessionStorage.getItem('grocery_token');
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API}${path}`, { ...options, headers }).then((response) => {
    if (response.status === 401) logout();
    return response;
  });
}

async function apiJson(path, options = {}) {
  const response = await apiFetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load data');
  return data;
}

function brand() {
  return '<div class="brand"><span class="brand-mark">g</span><span>grocerly<span class="brand-dot">.</span></span></div>';
}

function button(label, action, className = 'primary-button') {
  return `<button class="${className}" data-action="${action}">${label}</button>`;
}

const viewHelpers = {
  brand,
  button,
  money,
  dateLabel,
  dateSort,
  todayTotal,
  escapeHtml,
  icons,
  units,
  renderModal: renderModalView,
};

function render() {
  root.innerHTML = state.user ? renderAppView(state, viewHelpers) : renderLoginView(state, viewHelpers);
  bindEvents();
}

function bindEvents() {
  root.querySelectorAll('[data-page]').forEach((element) => {
    element.addEventListener('click', () => {
      state.page = element.dataset.page;
      state.search = '';
      render();
    });
  });

  root.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-action]');
    if (!actionElement) return;

    if (actionElement.dataset.action === 'close-modal') {
      const clickedInsideModal = event.target.closest('.modal');
      if (clickedInsideModal && !event.target.closest('button[data-action="close-modal"]')) return;
    }

    handleAction(actionElement.dataset.action);
  });

  const search = root.querySelector('[data-search]');
  if (search) {
    search.addEventListener('input', () => {
      state.search = search.value;
      render();
    });
  }

  root.querySelectorAll('[data-billing-id]').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) state.billing[input.dataset.billingId] = 1;
      else delete state.billing[input.dataset.billingId];
      render();
    });
  });

  root.querySelectorAll('[data-billing-quantity]').forEach((input) => {
    input.addEventListener('input', () => {
      state.billing[input.dataset.billingQuantity] = input.value;
    });
  });

  root.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', handleSubmit);
  });

  root.querySelectorAll('[data-delete-user]').forEach((element) => {
    element.addEventListener('click', () => deleteUser(element.dataset.deleteUser));
  });

  root.querySelectorAll('[data-edit-user]').forEach((element) => {
    element.addEventListener('click', () => {
      state.modal = { type: 'user', user: state.users.find((user) => user.id === Number(element.dataset.editUser)) };
      render();
    });
  });

  const category = root.querySelector('[name="category"]');
  if (category) {
    category.addEventListener('change', () => {
      const unit = root.querySelector('[name="unit"]');
      unit.innerHTML = units[category.value].map((item) => `<option>${item}</option>`).join('');
    });
  }
}

function handleAction(action) {
  if (action === 'logout') logout();
  else if (action === 'close-modal') {
    state.modal = null;
    render();
  } else if (action === 'mobile-menu') {
    root.querySelector('.sidebar')?.classList.toggle('mobile-open');
  } else if (action === 'toggle-password') {
    const input = root.querySelector('[name="password"]');
    const toggle = root.querySelector('[data-action="toggle-password"]');
    if (input && toggle) {
      input.type = input.type === 'password' ? 'text' : 'password';
      toggle.textContent = input.type === 'password' ? 'Show' : 'Hide';
      toggle.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password');
    }
  } else if (action === 'forgot-password') {
    const message = root.querySelector('[data-message]');
    if (message) message.textContent = 'Please contact your administrator to reset your password.';
  } else if (action === 'add-product' || action === 'add-purchase' || action === 'add-supplier' || action === 'add-user') {
    state.modal = action.replace('add-', '');
    render();
  } else if (['inventory', 'purchases', 'billing', 'reports'].includes(action)) {
    state.page = action[0].toUpperCase() + action.slice(1);
    render();
  } else if (action.startsWith('export-')) {
    download(action === 'export-sales' ? state.sales : state.purchases, action === 'export-sales' ? 'sales-invoices.csv' : 'purchase-history.csv');
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const message = form.querySelector('[data-message]');

  if (form.dataset.form === 'login') {
    const username = data.username?.trim();
    const password = data.password;
    if (!username || username.length < 3) {
      if (message) message.textContent = 'Enter a valid username or email.';
      return;
    }
    if (!password || password.length < 4) {
      if (message) message.textContent = 'Password must contain at least 4 characters.';
      return;
    }
  }

  try {
    if (form.dataset.form === 'login') {
      const result = await apiJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: data.username.trim(),
          password: data.password,
        }),
      });
      const storage = form.elements.remember?.checked ? localStorage : sessionStorage;
      storage.setItem('grocery_token', result.token);
      storage.setItem('grocery_user', JSON.stringify(result.user));
      state.user = result.user;
      await loadData();
    } else if (form.dataset.form === 'billing') {
      const result = await apiJson('/sales', {
        method: 'POST',
        body: JSON.stringify({
          items: Object.entries(state.billing).map(([product_id, quantity]) => ({
            product_id: Number(product_id),
            quantity: Number(quantity),
          })),
        }),
      });
      state.billing = {};
      if (message) message.textContent = `Invoice ${result.id} created for ${money(result.total)}`;
      await loadData();
    } else if (form.dataset.form === 'supplier') {
      const selectedProductIds = [];
      const supplyQuantities = {};
      const supplyPrices = {};

      for (const [key, value] of new FormData(form).entries()) {
        if (key === 'product_id') {
          selectedProductIds.push(Number(value));
        } else if (key.startsWith('qty_')) {
          const productId = Number(key.replace('qty_', ''));
          supplyQuantities[productId] = Number(value);
        } else if (key.startsWith('price_')) {
          const productId = Number(key.replace('price_', ''));
          supplyPrices[productId] = Number(value);
        }
      }

      if (!selectedProductIds.length) {
        if (message) message.textContent = 'Select at least one product to assign to this supplier.';
        return;
      }

      await apiJson('/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          contact: data.contact,
          product_ids: selectedProductIds,
          supply_quantities: supplyQuantities,
          supply_prices: supplyPrices,
        }),
      });
      state.modal = null;
      await loadData();
    } else {
      const routes = {
        product: '/products',
        purchase: '/purchases',
        user: form.dataset.userId ? `/users/${form.dataset.userId}` : '/users',
      };
      const method = form.dataset.userId ? 'PATCH' : 'POST';
      await apiJson(routes[form.dataset.form], {
        method,
        body: JSON.stringify({
          ...data,
          price: data.price ? Number(data.price) : undefined,
          quantity: data.quantity ? Number(data.quantity) : undefined,
        }),
      });
      state.modal = null;
      await loadData();
    }
  } catch (error) {
    if (message) message.textContent = error.message;
  }
}

async function deleteUser(id) {
  if (!window.confirm('Delete this user?')) return;
  try {
    await apiJson(`/users/${id}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    window.alert(error.message);
  }
}

async function loadData() {
  state.loading = true;
  render();
  const calls = [
    apiJson('/summary'),
    apiJson('/products'),
    apiJson('/suppliers'),
    apiJson('/purchases'),
    state.user.role === 'admin' ? apiJson('/sales') : Promise.resolve([]),
    state.user.role === 'admin' ? apiJson('/users') : Promise.resolve([]),
  ];

  const results = await Promise.allSettled(calls);
  [state.summary, state.products, state.suppliers, state.purchases, state.sales, state.users] = results.map((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );

  state.loading = false;
  render();
}

function logout() {
  localStorage.removeItem('grocery_token');
  localStorage.removeItem('grocery_user');
  sessionStorage.removeItem('grocery_token');
  sessionStorage.removeItem('grocery_user');
  state.user = null;
  state.modal = null;
  render();
}

function download(records, filename) {
  const csv = records
    .map((record) => Object.values(record).join(','))
    .join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

window.addEventListener('auth-expired', logout);

render();

if (state.user) {
  loadData().catch(() => {
    state.loading = false;
    render();
  });
}
