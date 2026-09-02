export function renderSidebar(state, helpers) {
  const { brand, icons, button } = helpers;
  const admin = state.user.role === 'admin';
  const lowStock = state.products.filter((product) => product.quantity <= product.reorder_level);
  const visible = admin
    ? ['Overview', 'Inventory', 'Purchases', 'Suppliers', 'Billing', 'Sales', 'Reports']
    : ['Inventory', 'Billing'];

  return `
    <aside class="sidebar">
      ${brand()}
      <div class="workspace-switcher">
        <span class="workspace-avatar">G</span>
        <span><strong>${admin ? 'Admin Mode' : 'Staff Mode'}</strong></span>
        ${icons.chevron}
      </div>
      <p class="nav-label">Workspace</p>
      <nav>
        ${visible.map((item) => `
          <button class="nav-item ${state.page === item ? 'active' : ''}" data-page="${item}">
            ${icons.box}<span>${item}</span>
            ${item === 'Inventory' && lowStock.length ? `<em>${lowStock.length}</em>` : ''}
          </button>
        `).join('')}
        ${admin ? `<button class="nav-item ${state.page === 'Users' ? 'active' : ''}" data-page="Users">${icons.box}<span>Users</span></button>` : ''}
      </nav>
      <div class="sidebar-bottom">${button(`${icons.close}<span>Sign out</span>`, 'logout', 'nav-item')}</div>
    </aside>
  `;
}

export function renderTopbar(state, helpers) {
  const { icons, escapeHtml } = helpers;
  const admin = state.user.role === 'admin';
  const initials = state.user.name.split(' ').map((part) => part[0]).join('');

  return `
    <header class="topbar">
      <button class="mobile-menu" data-action="mobile-menu">${icons.menu}</button>
      <div class="breadcrumbs"><span>Workspace</span>${icons.chevron}<strong>${state.page}</strong></div>
      <div class="topbar-actions">
        <button class="icon-button">${icons.bell}<i></i></button>
        <button class="user-menu" data-page="Account">
          <span class="user-avatar">${escapeHtml(initials)}</span>
          <span>
            <strong>${escapeHtml(state.user.name)}</strong>
            <small>${admin ? 'Administrator' : 'Staff member'}</small>
          </span>
          ${icons.chevron}
        </button>
      </div>
    </header>
  `;
}
