import { renderApp as renderAppView } from './components/AppLayout.js';
import { renderLogin as renderLoginView } from './components/views/LoginView.js';
import { renderModal as renderModalView } from './components/modals/ModalView.js';
import QRCode from 'qrcode';

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
  billingOrder: [],
  billingCustomer: { name: '', contact: '' },
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
  if (state.user && state.page === 'Billing') renderPaymentQr();
}

function bindEvents() {
  root.querySelectorAll('[data-page]').forEach((element) => {
    element.addEventListener('click', () => {
      state.page = element.dataset.page;
      state.search = '';
      render();
    });
  });

  if (!root.dataset.eventsBound) {
    root.addEventListener('click', (event) => {
      const actionElement = event.target.closest('[data-action]');
      if (!actionElement) return;

      if (actionElement.dataset.action === 'close-modal') {
        const clickedInsideModal = event.target.closest('.modal');
        if (clickedInsideModal && !event.target.closest('button[data-action="close-modal"]')) return;
      }

      handleAction(actionElement.dataset.action);
    });
    root.dataset.eventsBound = 'true';
  }

  const search = root.querySelector('[data-search]');
  if (search) {
    search.addEventListener('input', () => {
      state.search = search.value;
      render();
    });
  }

  root.querySelectorAll('[data-billing-id]').forEach((input) => {
    input.addEventListener('change', () => {
      state.billing[input.dataset.billingId] = 1;
      if (!state.billingOrder.includes(Number(input.dataset.billingId))) state.billingOrder.unshift(Number(input.dataset.billingId));
      render();
    });
  });

  const productEntry = root.querySelector('[data-billing-product-entry]');
  const quantityEntry = root.querySelector('[data-billing-entry-quantity]');
  productEntry?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      selectBillingProduct(productEntry.value);
    }
  });
  productEntry?.addEventListener('input', () => renderBillingSuggestions(productEntry.value));
  productEntry?.addEventListener('focus', () => renderBillingSuggestions(productEntry.value));
  quantityEntry?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addBillingItem(productEntry?.value, quantityEntry.value);
    }
  });

  root.querySelectorAll('[data-billing-suggestion]').forEach((suggestion) => {
    suggestion.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      productEntry.value = suggestion.dataset.billingSuggestion;
      addBillingItem(productEntry.value, quantityEntry?.value);
    });
  });

  root.querySelectorAll('[data-billing-quantity]').forEach((input) => {
    input.addEventListener('input', () => {
      state.billing[input.dataset.billingQuantity] = input.value;
    });
    input.addEventListener('blur', () => updateBillingSummary(input.dataset.billingQuantity));
  });

  root.querySelectorAll('[data-remove-billing]').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = Number(button.dataset.removeBilling);
      delete state.billing[productId];
      state.billingOrder = state.billingOrder.filter((id) => id !== productId);
      render();
    });
  });

  const billingForm = root.querySelector('[data-form="billing"]');
  if (billingForm) {
    billingForm.elements.customer_name?.addEventListener('input', (event) => {
      state.billingCustomer.name = event.target.value;
      const customer = root.querySelector('[data-bill-customer]');
      if (customer) customer.textContent = event.target.value || 'Customer details';
    });
    billingForm.elements.customer_contact?.addEventListener('input', (event) => {
      state.billingCustomer.contact = event.target.value;
      const contact = root.querySelector('[data-bill-contact]');
      if (contact) contact.textContent = event.target.value || 'Add a name and contact';
    });
  }

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

function addBillingItem(productValue, quantityValue) {
  const product = state.products.find((item) => item.id === Number(productValue) || item.name.toLowerCase() === String(productValue || '').trim().toLowerCase());
  if (!product) return;

  const quantity = Math.max(1, Math.min(Number(quantityValue) || 1, Number(product.quantity)));
  state.billing[product.id] = quantity;
  state.billingOrder = [product.id, ...state.billingOrder.filter((id) => id !== product.id)];
  render();
}

function selectBillingProduct(productValue) {
  const product = state.products.find((item) => item.id === Number(productValue) || item.name.toLowerCase() === String(productValue || '').trim().toLowerCase());
  const productEntry = root.querySelector('[data-billing-product-entry]');
  const quantityEntry = root.querySelector('[data-billing-entry-quantity]');
  if (!product || !productEntry) return;

  productEntry.value = product.name;
  productEntry.setAttribute('aria-expanded', 'false');
  const suggestions = root.querySelector('[data-billing-suggestions]');
  if (suggestions) suggestions.hidden = true;
  quantityEntry?.focus();
}

function renderBillingSuggestions(query = '') {
  const suggestions = root.querySelector('[data-billing-suggestions]');
  const productEntry = root.querySelector('[data-billing-product-entry]');
  if (!suggestions || !productEntry) return;

  const normalizedQuery = query.trim().toLowerCase();
  const matches = state.products
    .filter((product) => product.name.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);
  suggestions.innerHTML = matches.length
    ? matches.map((product) => `<button type="button" class="billing-suggestion" data-billing-suggestion="${escapeHtml(product.name)}"><span><strong>${escapeHtml(product.name)}</strong><small>${money(product.price)} · ${product.quantity} ${escapeHtml(product.unit)} available</small></span><span class="suggestion-arrow">Enter</span></button>`).join('')
    : '<p class="billing-suggestions-empty">No matching products</p>';
  suggestions.hidden = false;
  productEntry.setAttribute('aria-expanded', 'true');

  suggestions.querySelectorAll('[data-billing-suggestion]').forEach((suggestion) => {
    suggestion.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      productEntry.value = suggestion.dataset.billingSuggestion;
      selectBillingProduct(productEntry.value);
    });
  });
}

function updateBillingSummary(productId) {
  const product = state.products.find((item) => item.id === Number(productId));
  if (!product) return;

  const quantityInput = root.querySelector(`[data-billing-quantity="${productId}"]`);
  const quantity = Math.max(1, Math.min(Number(quantityInput?.value) || 1, Number(product.quantity)));
  state.billing[productId] = quantity;

  const quantityElement = root.querySelector(`[data-billing-row-quantity="${productId}"]`);
  const amountElement = root.querySelector(`[data-billing-amount="${productId}"]`);
  if (quantityElement) quantityElement.textContent = quantity;
  if (amountElement) amountElement.textContent = money(product.price * quantity);

  const total = Object.entries(state.billing).reduce((sum, [id, value]) => {
    const item = state.products.find((productRecord) => productRecord.id === Number(id));
    return sum + (item ? item.price * Number(value) : 0);
  }, 0);
  const totalElement = root.querySelector('[data-billing-total]');
  if (totalElement) totalElement.textContent = money(total);
  renderPaymentQr();
}

async function renderPaymentQr() {
  const qrElement = root.querySelector('[data-payment-qr]');
  if (!qrElement) return;

  const total = Object.entries(state.billing).reduce((sum, [id, value]) => {
    const product = state.products.find((item) => item.id === Number(id));
    return sum + (product ? product.price * Number(value) : 0);
  }, 0);
  const paymentId = import.meta.env.VITE_UPI_ID || 'grocery@upi';
  const paymentUrl = `upi://pay?pa=${encodeURIComponent(paymentId)}&pn=Grocerly%20Market&am=${total.toFixed(2)}&cu=INR&tn=Invoice%20Draft`;

  try {
    qrElement.src = await QRCode.toDataURL(paymentUrl, { width: 128, margin: 1, errorCorrectionLevel: 'M' });
    qrElement.alt = `Payment QR for ${money(total)}`;
  } catch {
    qrElement.removeAttribute('src');
  }
}

function handleAction(action) {
  if (action === 'logout') logout();
  else if (action === 'print-bill') window.print();
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
  const printAfterCreate = event.submitter?.dataset.submitAction === 'create-print';
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
          customer_name: data.customer_name,
          customer_contact: data.customer_contact,
          items: Object.entries(state.billing).map(([product_id, quantity]) => ({
            product_id: Number(product_id),
            quantity: Number(quantity),
          })),
        }),
      });
      if (printAfterCreate) window.print();
      state.billing = {};
      state.billingOrder = [];
      state.billingCustomer = { name: '', contact: '' };
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
