import { modalActions, renderModalShell } from './ModalShell.js';

export function renderPurchaseModal(state, helpers) {
  const { escapeHtml } = helpers;
  const content = `<form data-form="purchase">
    <label>Supplier<select name="supplier" required><option value="">Select a supplier</option>${state.suppliers.map((supplier) => `<option>${escapeHtml(supplier.name)}</option>`).join('')}</select></label>
    <label>Product<select name="product_id" required>${state.products.map((product) => `<option value="${product.id}">${escapeHtml(product.name)}</option>`).join('')}</select></label>
    <label>Quantity<input name="quantity" required type="number" min="1" /></label>
    ${modalActions('Save purchase')}
  </form>`;
  return renderModalShell('Record a purchase', content, helpers);
}
