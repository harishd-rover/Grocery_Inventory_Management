export function renderOverview(state, helpers, admin) {
  const { money, dateSort, dateLabel, escapeHtml, icons, button } = helpers;

  if (!state.summary) return '<div class="empty-state">Connecting to your inventory workspace...</div>';

  const low = state.products.filter((product) => product.quantity <= product.reorder_level);

  return `
    <section class="metrics-grid">
      ${metric('Inventory value', money(state.summary.inventory_value), `${state.summary.inventory_units} units`, 'green', helpers)}
      ${admin ? metric('Sales today', money(state.summary.sales_today), `${state.summary.orders_today} invoices`, 'yellow', helpers) : ''}
      ${admin ? metric('Purchases today', money(state.summary.purchases_today), `${state.summary.purchase_orders_today} orders`, 'blue', helpers) : ''}
      ${metric('Low stock items', state.summary.low_stock, 'Needs attention', 'red', helpers)}
    </section>
    <section class="dashboard-grid">
      <div class="panel inventory-panel">
        <div class="panel-heading"><div><p class="eyebrow">Product overview</p><h2>Inventory at a glance</h2></div>${button('View inventory ' + icons.chevron, 'inventory', 'text-button')}</div>
        <div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Stock level</th><th>Price</th></tr></thead><tbody>${dateSort(state.products).slice(0, 5).map((product) => productRow(product, helpers)).join('')}</tbody></table></div>
      </div>
      <div class="panel alerts-panel">
        <div class="panel-heading"><div><p class="eyebrow">Inventory watch</p><h2>Stock alerts</h2></div><span class="alert-count">${low.length} alerts</span></div>
        <div class="alert-list">${low.map((product) => `<div class="alert-item"><span class="alert-symbol">${icons.alert}</span><div><strong>${escapeHtml(product.name)}</strong><small>Only ${product.quantity} ${escapeHtml(product.unit)}s left</small></div></div>`).join('')}</div>
        ${button('Review stock levels ' + icons.chevron, 'inventory', 'outline-button')}
      </div>
    </section>
    <section class="lower-grid">
      <div class="panel purchases-panel">
        <div class="panel-heading"><div><p class="eyebrow">Latest activity</p><h2>Recent purchases</h2></div>${button('See all ' + icons.chevron, 'purchases', 'text-button')}</div>
        <div class="purchase-list">${dateSort(state.purchases).slice(0, 5).map((purchase) => `<div class="purchase-row"><span class="purchase-icon">${icons.truck}</span><div><strong>${escapeHtml(purchase.id)} <span class="status ${purchase.status === 'Pending' ? 'pending' : ''}">${escapeHtml(purchase.status)}</span></strong><small>${escapeHtml(purchase.product || 'Multiple products')} · ${escapeHtml(purchase.supplier)} · ${purchase.items} items</small></div><div class="purchase-total"><strong>${money(purchase.total)}</strong><small>${dateLabel(purchase.date)}</small></div></div>`).join('')}</div>
      </div>
      <div class="panel quick-panel"><p class="eyebrow">Quick actions</p><h2>Keep things moving</h2>${button(`${icons.bill} Create a new bill ${icons.arrow}`, 'billing', 'quick-action')}${button(`${icons.truck} Record a purchase ${icons.arrow}`, 'purchases', 'quick-action')}${admin ? button(`${icons.download} Export a report ${icons.arrow}`, 'reports', 'quick-action') : ''}</div>
    </section>
  `;
}

function metric(label, value, change, tone, helpers) {
  return `<article class="metric-card"><div class="metric-icon ${tone}">${helpers.icons.box}</div><div class="metric-info"><span>${label}</span><strong>${value}</strong><small>${helpers.icons.arrow} ${change}</small></div><div class="sparkline"><span></span><span></span><span></span><span></span><span></span><span></span></div></article>`;
}

function productRow(product, helpers) {
  const percent = Math.min((Number(product.quantity) / (Number(product.reorder_level || 10) * 3)) * 100, 100);
  return `<tr><td><div class="product-cell"><span class="product-icon cat-produce">${helpers.escapeHtml(product.name.charAt(0))}</span><span><strong>${helpers.escapeHtml(product.name)}</strong><small>${helpers.escapeHtml(product.sku)}</small></span></div></td><td><span class="category-pill">${helpers.escapeHtml(product.category)}</span></td><td><div class="stock-cell"><span class="${product.quantity <= product.reorder_level ? 'stock-low' : 'stock-good'}">${product.quantity} ${helpers.escapeHtml(product.unit)}s</span><div class="stock-track"><i style="width:${percent}%"></i></div></div></td><td>${helpers.money(product.price)}</td></tr>`;
}
