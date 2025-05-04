document.addEventListener('DOMContentLoaded', function () {
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        // Redirect to home.html if user is already logged in
        window.location.href = 'index.html';
    }
});