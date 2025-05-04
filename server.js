const express = require('express');
const cors = require('cors'); // Import the cors package
const { v4: uuidv4 } = require('uuid'); // Import the uuid package

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
const groups = []; // Mock database for groups

// Register endpoint
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;

    // Check if user already exists
    const userExists = users.find(user => user.email === email);
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Generate a unique ID for the new user
    const userId = uuidv4();

    // Add new user to the mock database
    users.push({ id: userId, username, email, password });

    res.status(201).json({ message: 'User registered successfully', userId });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check if user exists and password matches
    const user = users.find(user => user.username === username && user.password === password);
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({ message: 'Login successful', user: user });
});

// Create a group endpoint
app.post('/groups/create', (req, res) => {
    const { name, userId } = req.body;

    // Check if group already exists
    const groupExists = groups.find(group => group.name === name);
    if (groupExists) {
        return res.status(400).json({ message: 'Group already exists' });
    }

    // Add new group to the mock database with an empty user list
    const newGroup = { id: groups.length + 1, name, users: [userId] };
    groups.push(newGroup);

    res.status(201).json({ message: 'Group created successfully', group: newGroup });
});

// Join a group endpoint
app.post('/groups/join', (req, res) => {
    const { code, userId } = req.body;

    // Find the group by ID (assuming code is the group ID)
    const group = groups.find(group => group.name === code);
    if (!group) {
        return res.status(404).json({ message: 'Group not found' });
    }

    // Add the user ID to the group's user list if not already added
    if (!group.users.includes(userId)) {
        group.users.push(userId);
    }

    res.status(200).json({ message: 'Successfully joined the group', group });
});

// Load groups for a user endpoint
app.get('/api/loadmygroup', (req, res) => {
    const { id: userId } = req.query;

    // Validate user ID
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    // Find groups the user belongs to
    const userGroups = groups.filter(group => group.users.includes(userId));

    // Extract group IDs and names
    const groupDetails = userGroups.map(group => ({
        id: group.id,
        name: group.name
    }));

    res.status(200).json(groupDetails);
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});