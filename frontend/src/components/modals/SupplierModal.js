import { modalActions, renderModalShell } from './ModalShell.js';

export function renderSupplierModal(state, helpers) {
  const { escapeHtml, money } = helpers;
  const products = state.products.length === 0
    ? '<p class="empty-picker">Create products first to assign them to this supplier.</p>'
    : state.products.map((product) => `<div class="product-picker-row"><label><input type="checkbox" name="product_id" value="${product.id}" />${escapeHtml(product.name)}<small>${escapeHtml(product.unit)} · inventory ${money(product.price)}</small></label><div class="product-supply-fields"><label>Supply quantity<input type="number" name="qty_${product.id}" min="1" value="1" /></label><label>Supplier unit price<input type="number" name="price_${product.id}" min="0" step="0.01" value="" placeholder="0.00" /></label></div></div>`).join('');
  const content = `<form data-form="supplier"><label>Supplier name<input name="name" required /></label><label>Contact number<input name="contact" required /></label><fieldset class="product-picker"><legend>Products, quantities and supplier prices (${state.products.filter((product) => product.supplier).length} assigned)</legend>${products}</fieldset>${modalActions('Save supplier')}</form>`;
  return renderModalShell('Add a supplier', content, helpers);
}
