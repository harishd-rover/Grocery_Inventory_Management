import { modalActions, renderModalShell } from './ModalShell.js';

export function renderProductModal(state, helpers) {
  const { units, escapeHtml } = helpers;
  const content = `<form data-form="product">
    <label>Product name<input name="name" required placeholder="e.g. Basmati rice" /></label>
    <div class="form-grid"><label>Product family<select name="category">${Object.keys(units).map((category) => `<option>${category}</option>`).join('')}</select></label><label>Unit<select name="unit">${units.Vegetables.map((unit) => `<option>${unit}</option>`).join('')}</select></label></div>
    <div class="form-grid"><label>Inventory unit price<input name="price" required type="number" min="0" step="0.01" /></label><label>Opening quantity<input name="quantity" required type="number" min="0" /></label></div>
    <label>Supplier (optional)<select name="supplier"><option value="">No supplier</option>${state.suppliers.map((supplier) => `<option>${escapeHtml(supplier.name)}</option>`).join('')}</select></label>
    ${modalActions('Save product')}
  </form>`;
  return renderModalShell('Add a product', content, helpers);
}
