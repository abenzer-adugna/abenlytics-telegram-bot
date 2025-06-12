// Check authentication
if (!localStorage.getItem('authenticated')) {
    window.location.href = 'login.html';
}
