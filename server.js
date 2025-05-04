const express = require('express');
const cors = require('cors'); // Import the cors package

// Create an instance of an Express application
const app = express();

// Enable CORS with origin *
app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

// Define a port for the server to listen on
const PORT = 3000;

// Mock database (in-memory for simplicity)
const users = [];

// Register endpoint
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;

    // Check if user already exists
    const userExists = users.find(user => user.email === email);
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Add new user to the mock database
    users.push({ username, email, password });

    res.status(201).json({ message: 'User registered successfully' });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // print the request body to the console


    // Check if user exists and password matches
    const user = users.find(user => user.username === username && user.password === password);
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({ message: 'Login successful' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});