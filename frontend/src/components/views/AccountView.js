export function renderAccount(state, helpers, admin) {
  const { icons, escapeHtml, button } = helpers;
  return `<section class="panel account-panel"><div class="account-hero"><span class="account-avatar">${icons.box}</span><div><p class="eyebrow">User account</p><h2>${escapeHtml(state.user.name)}</h2><p>${admin ? 'Administrator' : 'Staff member'}</p></div></div><div class="account-details"><div><span>Username</span><strong>${escapeHtml(state.user.username)}</strong></div><div><span>Access level</span><strong>${admin ? 'Full administration' : 'Daily operations'}</strong></div></div>${button(`${icons.close} Sign out`, 'logout', 'outline-button')}</section>`;
}
