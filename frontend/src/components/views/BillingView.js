export function renderBilling(state, helpers) {
  const { money, icons, escapeHtml } = helpers;
  const selected = state.products.filter((product) => state.billing[product.id]);
  const total = selected.reduce((sum, product) => sum + product.price * Number(state.billing[product.id]), 0);

  return `<section class="panel simple-workflow"><p class="eyebrow">Billing</p><h2>Create a customer bill</h2><p>Select one or more items to sell. Stock is updated automatically.</p><form data-form="billing"><fieldset class="product-picker"><legend>Products to bill (${selected.length} selected)</legend>${state.products.map((product) => `<div class="product-picker-row"><label><input type="checkbox" data-billing-id="${product.id}" ${state.billing[product.id] ? 'checked' : ''} />${escapeHtml(product.name)}<small>${product.quantity} in stock · ${money(product.price)} each</small></label>${state.billing[product.id] ? `<input required type="number" min="1" max="${product.quantity}" data-billing-quantity="${product.id}" value="${state.billing[product.id]}" />` : ''}</div>`).join('')}</fieldset><div class="workflow-total">Invoice total <strong>${money(total)}</strong></div><button class="primary-button" type="submit" ${selected.length ? '' : 'disabled'}>${icons.bill} Create bill</button><p class="workflow-message" data-message></p></form></section>`;
}
