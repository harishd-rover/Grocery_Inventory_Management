export function renderBilling(state, helpers) {
  const { money, icons, escapeHtml } = helpers;
  const selected = (state.billingOrder || []).map((id) => state.products.find((product) => product.id === id)).filter(Boolean);
  const total = selected.reduce((sum, product) => sum + product.price * Number(state.billing[product.id]), 0);
  const invoiceDate = new Date().toLocaleDateString('en-IN');
  const customerName = escapeHtml(state.billingCustomer?.name || '');
  const customerContact = escapeHtml(state.billingCustomer?.contact || '');

  return `
    <section class="billing-workspace">
      <div class="panel simple-workflow">
        <p class="eyebrow">Billing</p>
        <h2>Create a customer bill</h2>
        <p>Select products and set the quantity for each item.</p>
        <form data-form="billing">
          <div class="billing-customer">
            <h3>Customer details</h3>
            <div class="form-grid">
              <label>Customer name<input name="customer_name" required value="${customerName}" placeholder="e.g. Priya Sharma" /></label>
              <label>Contact number<input name="customer_contact" required type="tel" inputmode="tel" value="${customerContact}" placeholder="e.g. 9876543210" /></label>
            </div>
          </div>
          <div class="quick-billing-entry">
            <label>Quick add product
              <span class="billing-combobox">
                <input data-billing-product-entry role="combobox" aria-controls="billing-suggestions" aria-expanded="false" placeholder="Search products..." autocomplete="off" />
                <div id="billing-suggestions" class="billing-suggestions" data-billing-suggestions hidden></div>
              </span>
            </label>
            <label>Quantity
              <input data-billing-entry-quantity type="number" min="1" value="1" />
            </label>
            <small class="quick-entry-hint">Press Enter to select a product, then Enter in quantity to add it.</small>
          </div>
          <div class="billing-actions">
            <button class="outline-button" type="submit" ${selected.length ? '' : 'disabled'}>${icons.bill} Create bill</button>
            <button class="primary-button" type="submit" data-submit-action="create-print" ${selected.length ? '' : 'disabled'}>&#128424; Create &amp; print bill</button>
          </div>
          <p class="workflow-message" data-message></p>
        </form>
      </div>

      <aside class="bill-preview" aria-label="Bill preview">
        <div class="bill-preview-header">
          <div>
            <p class="eyebrow">Grocerly Market</p>
            <h2>Customer invoice</h2>
            <small class="bill-meta">Invoice # Draft · <span data-bill-date>${invoiceDate}</span></small>
          </div>
          <div class="bill-header-actions">
            <span class="bill-status">Draft</span>
            <button type="button" class="primary-button print-bill-button" data-action="print-bill">&#128424; Print bill</button>
          </div>
        </div>
        <div class="bill-customer">
          <span>Billed to</span>
          <strong data-bill-customer>${customerName || 'Customer details'}</strong>
          <small data-bill-contact>${customerContact || 'Add a name and contact'}</small>
        </div>
        <div class="bill-items">
          <div class="bill-items-heading"><span>Item</span><span>Amount</span></div>
          ${selected.length ? selected.map((product) => `
            <div class="bill-item" data-billing-row="${product.id}">
              <div>
                <strong>${escapeHtml(product.name)}</strong>
                <small><span data-billing-row-quantity="${product.id}">${state.billing[product.id]}</span> × ${money(product.price)}</small>
              </div>
              <div class="bill-item-actions"><strong data-billing-amount="${product.id}">${money(product.price * Number(state.billing[product.id]))}</strong><button type="button" class="remove-bill-item" data-remove-billing="${product.id}" aria-label="Remove ${escapeHtml(product.name)}">&#215;</button></div>
            </div>
          `).join('') : '<p class="bill-empty">Select products to build the bill.</p>'}
        </div>
        <div class="bill-total"><span>Total</span><strong data-billing-total>${money(total)}</strong></div>
        <div class="bill-payment"><img data-payment-qr alt="Payment QR code" /><div><strong>Scan to pay</strong><small>UPI payment · ${money(total)}</small></div></div>
        <p class="bill-note">Thank you for shopping with us.</p>
      </aside>
    </section>
  `;
}
