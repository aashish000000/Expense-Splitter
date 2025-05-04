
// Handle form submission
document.querySelector('form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent the default form submission

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const result = await response.json();

            // Save the user data in localStorage
            localStorage.setItem('loggedInUser', JSON.stringify(result.user));

            // Redirect to home.html
            window.location.href = 'home.html';
        } else {
            const error = await response.json();
            alert('Login failed: ' + error.message);
        }
    } catch (err) {
        console.error('Error:', err);
        alert('An error occurred. Please try again.');
    }
});