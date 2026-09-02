export function renderLogin(state, helpers) {
  const { brand, icons } = helpers;

  return `
    <main class="auth-shell">
      <section class="auth-card">
        ${brand()}
        <p class="eyebrow">Inventory workspace</p>
        <h1>Welcome back</h1>
        <p class="auth-copy">Sign in to manage your store.</p>
        <form data-form="login" novalidate>
          <label>
            Username
            <input name="username" required autocomplete="username" placeholder="Enter your username" />
          </label>
          <label>
            Password
            <input name="password" required type="password" autocomplete="current-password" placeholder="Enter your password" />
          </label>
          <label class="remember-option">
            <input name="remember" type="checkbox" />
            <span>Remember me</span>
          </label>
          <button class="primary-button auth-submit" type="submit">Sign in</button>
          <p class="auth-error" data-message></p>
        </form>
        <p class="demo-hint"><strong>Development-only account</strong><br>Admin: <strong>nishi / admin</strong></p>
      </section>
    </main>
  `;
}
