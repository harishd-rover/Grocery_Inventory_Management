import { renderAccount } from './views/AccountView.js';
import { renderBilling } from './views/BillingView.js';
import { renderDirectory } from './views/DirectoryView.js';
import { renderHeading } from './views/PageHeading.js';
import { renderOverview } from './views/OverviewView.js';
import { renderReports } from './views/ReportsView.js';
import { renderSales } from './views/SalesView.js';
import { renderUsers } from './views/UsersView.js';
import { renderSidebar, renderTopbar } from './views/Navigation.js';

export function renderApp(state, helpers) {
  const admin = state.user.role === 'admin';
  const heading = state.page === 'Overview' ? `Good morning, ${helpers.escapeHtml(state.user.name.split(' ')[0])}` : state.page;

  return `<div class="app-shell">
    ${renderSidebar(state, helpers)}
    <main class="main-content">
      ${renderTopbar(state, helpers)}
      <div class="page-content">
        ${state.page !== 'Account' ? renderHeading(state, helpers, heading, admin) : ''}
        ${renderPage(state, helpers, admin)}
      </div>
    </main>
    ${state.modal ? helpers.renderModal(state, helpers) : ''}
    ${state.loading ? '<div class="loading-bar"></div>' : ''}
  </div>`;
}

function renderPage(state, helpers, admin) {
  if (state.page === 'Account') return renderAccount(state, helpers, admin);
  if (state.page === 'Overview') return renderOverview(state, helpers, admin);
  if (state.page === 'Billing') return renderBilling(state, helpers);
  if (state.page === 'Reports') return renderReports(state, helpers);
  if (state.page === 'Sales') return renderSales(state, helpers);
  if (state.page === 'Users') return renderUsers(state, helpers);
  return renderDirectory(state, helpers);
}
