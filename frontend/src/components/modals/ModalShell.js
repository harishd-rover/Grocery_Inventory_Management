export function renderModalShell(title, content, helpers) {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal">
        <div class="modal-header">
          <div><p class="eyebrow">Workspace</p><h2>${title}</h2></div>
          <button class="icon-button" data-action="close-modal">${helpers.icons.close}</button>
        </div>
        <div class="modal-form">${content}</div>
      </section>
    </div>
  `;
}

export function modalActions(label) {
  return `<div class="modal-actions"><button type="button" class="outline-button" data-action="close-modal">Cancel</button><button type="submit" class="primary-button">${label}</button></div><p class="auth-error" data-message></p>`;
}
