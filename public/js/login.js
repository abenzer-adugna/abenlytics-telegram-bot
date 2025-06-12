// public/js/login.js
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('errorMessage');
    
    // Replace 'yourpassword123' with your actual password
    if (password === 'yourpassword123') {
        localStorage.setItem('authenticated', 'true');
        window.location.href = 'index.html';
    } else {
        errorElement.classList.remove('hidden');
        setTimeout(() => errorElement.classList.add('hidden'), 3000);
    }
});
