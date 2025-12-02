const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');

// Check if already logged in via session
fetch('/api/session')
  .then(res => res.json())
  .then(data => {
    if (data.authenticated) {
      window.location.href = 'index.html';
    }
  })
  .catch(err => console.error('Session check failed:', err));

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  errorMessage.textContent = '';

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Successful login - redirect to main page
      window.location.href = 'index.html';
    } else {
      // Failed login
      errorMessage.textContent = data.error || 'Invalid username or password';
      loginForm.classList.add('shake');
      setTimeout(() => {
        loginForm.classList.remove('shake');
      }, 500);
    }
  } catch (error) {
    console.error('Login error:', error);
    errorMessage.textContent = 'Network error. Please check your connection.';
    loginForm.classList.add('shake');
    setTimeout(() => {
      loginForm.classList.remove('shake');
    }, 500);
  }
});
