import { modalActions, renderModalShell } from './ModalShell.js';

export function renderUserModal(state, helpers) {
  const { escapeHtml } = helpers;
  const editing = typeof state.modal === 'object';
  const user = editing ? state.modal.user : {};
  const content = `<form data-form="user" data-user-id="${user.id || ''}">
    <label>Full name<input name="name" required value="${escapeHtml(user.name || '')}" /></label>
    <label>Username<input name="username" required value="${escapeHtml(user.username || '')}" /></label>
    <label>${editing ? 'New password (optional)' : 'Password'}<input name="password" type="password" ${editing ? '' : 'required'} /></label>
    <label>Role<select name="role"><option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option></select></label>
    ${modalActions(editing ? 'Save changes' : 'Create user')}
  </form>`;
  return renderModalShell(editing ? 'Edit user' : 'Add a user', content, helpers);
}
