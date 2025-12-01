const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');

// Allowed users configuration
const ALLOWED_USERS = ['ranjan', 'yogeesh', 'nidhi', 'sonu'];
const SHARED_PASSWORD = '123';

// Check if already logged in
if (localStorage.getItem('isLoggedIn') === 'true') {
  window.location.href = 'index.html';
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  
  errorMessage.textContent = '';
  
  if (ALLOWED_USERS.includes(username) && password === SHARED_PASSWORD) {
    // Successful login
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', username);
    window.location.href = 'index.html';
  } else {
    // Failed login
    errorMessage.textContent = 'Invalid username or password';
    loginForm.classList.add('shake');
    setTimeout(() => {
      loginForm.classList.remove('shake');
    }, 500);
  }
});
