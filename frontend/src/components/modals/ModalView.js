import { renderProductModal } from './ProductModal.js';
import { renderPurchaseModal } from './PurchaseModal.js';
import { renderSupplierModal } from './SupplierModal.js';
import { renderUserModal } from './UserModal.js';

export function renderModal(state, helpers) {
  const type = typeof state.modal === 'string' ? state.modal : 'user';
  if (type === 'product') return renderProductModal(state, helpers);
  if (type === 'purchase') return renderPurchaseModal(state, helpers);
  if (type === 'supplier') return renderSupplierModal(state, helpers);
  return renderUserModal(state, helpers);
}
