export function renderHeading(state, helpers, heading, admin) {
  const { icons, button } = helpers;
  let action = '';

  if (state.page === 'Users' && admin) action = button(`${icons.plus} Add user`, 'add-user');
  else if ((state.page === 'Overview' || state.page === 'Inventory') && admin) action = button(`${icons.plus} Add product`, 'add-product');
  else if (state.page === 'Purchases') action = button(`${icons.plus} Record purchase`, 'add-purchase');
  else if (state.page === 'Suppliers' && admin) action = button(`${icons.plus} Add supplier`, 'add-supplier');
  else if (state.page === 'Reports') {
    action = `<div class="page-actions">${button(`${icons.download} Export purchases`, 'export-purchases', 'outline-button')}${button(`${icons.download} Export sales`, 'export-sales', 'outline-button')}</div>`;
  }

  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">${new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}</p>
        <h1>${heading}</h1>
        <p class="heading-copy">Here’s what’s happening with your store today.</p>
      </div>
      ${action}
    </section>
  `;
}
