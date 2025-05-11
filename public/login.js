
// Handle form submission
document.querySelector('form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent the default form submission

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // ya nera login.js le front end bata data liyera backend ma api call garxa ani account created vaye paxi home.html ma pathauxa

    // const API_BASE_URL = 'http://localhost:3000';
    const API_BASE_URL = 'https://expense-splitter-br477lj8k-aashish000000s-projects.vercel.app';

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
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