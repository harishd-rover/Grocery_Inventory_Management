const API_URL = 'http://localhost:5000/api/auth/login'
const form = document.querySelector('#login-form')
const card = document.querySelector('.login-card')
const username = document.querySelector('#username')
const password = document.querySelector('#password')
const remember = document.querySelector('#remember')
const passwordToggle = document.querySelector('#password-toggle')
const forgotPassword = document.querySelector('#forgot-password')
const loginButton = document.querySelector('#login-button')
const message = document.querySelector('#form-message')

function setMessage(text, type = '') {
  message.textContent = text
  message.className = `form-message ${type}`.trim()
}

function setLoading(loading) {
  loginButton.disabled = loading
  loginButton.classList.toggle('loading', loading)
}

function shakeForm() {
  card.classList.remove('shake')
  requestAnimationFrame(() => card.classList.add('shake'))
}

passwordToggle.addEventListener('click', () => {
  const showing = password.type === 'text'
  password.type = showing ? 'password' : 'text'
  passwordToggle.textContent = showing ? 'Show' : 'Hide'
  passwordToggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password')
})

forgotPassword.addEventListener('click', () => {
  setMessage('Please contact your system administrator to reset your password.')
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  setMessage('')
  const usernameValue = username.value.trim()
  const passwordValue = password.value

  if (usernameValue.length < 3) {
    setMessage('Enter a valid username or email.')
    username.focus()
    shakeForm()
    return
  }
  if (passwordValue.length < 4) {
    setMessage('Password must contain at least 4 characters.')
    password.focus()
    shakeForm()
    return
  }

  setLoading(true)
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameValue.toLowerCase(), password: passwordValue }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Unable to sign in.')

    const storage = remember.checked ? localStorage : sessionStorage
    storage.setItem('grocery_token', result.token)
    storage.setItem('grocery_user', JSON.stringify(result.user))
    loginButton.classList.remove('loading')
    loginButton.classList.add('success')
    loginButton.querySelector('.button-label').textContent = 'Success'
    setMessage('Login successful. Opening your dashboard.', 'success')
    window.setTimeout(() => { window.location.href = '/' }, 650)
  } catch (error) {
    setLoading(false)
    setMessage(error.message)
    shakeForm()
  }
})
