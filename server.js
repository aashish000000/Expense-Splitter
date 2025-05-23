// server.js
// Combined Express + WebSocket (same port)

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const Datastore = require('nedb-promises');
const WebSocket = require('ws');
const http = require('http');

//------------------------------------------------------
// Database setup
//------------------------------------------------------
const db = Datastore.create({ filename: 'mydb.jsonl', autoload: true });

//------------------------------------------------------
// Express setup
//------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

//------------------------------------------------------
// Helper DB lookups
//------------------------------------------------------
const findUserByEmail    = (email)    => db.findOne({ collection: 'users',  email });
const findUserByUsername = (username) => db.findOne({ collection: 'users',  username });
const findGroupByName    = (name)     => db.findOne({ collection: 'groups', name });
const findGroupById      = (id)       => db.findOne({ collection: 'groups', id });

//------------------------------------------------------
// Authentication routes
//------------------------------------------------------
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await findUserByEmail(email);
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashpassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await db.insert({ collection: 'users', id: userId, username, email, hashpassword });
    res.status(201).json({ message: 'User registered successfully', userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await findUserByUsername(username);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const valid = await bcrypt.compare(password, user.hashpassword);
    if (!valid) return res.status(401).json({ message: 'Invalid password' });

    res.status(200).json({ message: 'Login successful', user });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

//------------------------------------------------------
// Group routes
//------------------------------------------------------
app.post('/groups/create', async (req, res) => {
  try {
    const { name, userId } = req.body;
    if (!name || !userId) return res.status(400).json({ message: 'Group name and userId required' });

    const exists = await findGroupByName(name);
    if (exists) return res.status(400).json({ message: 'Group already exists' });

    const newGroup = {
      collection: 'groups',
      id: uuidv4(),
      name,
      users: [userId],
      balances: {},
      expenses: []
    };
    await db.insert(newGroup);
    res.status(201).json({ message: 'Group created successfully', group: newGroup });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/groups/join', async (req, res) => {
  try {
    const { code, userId } = req.body; // `code` is the group name/identifier
    const group = await findGroupByName(code);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.users.includes(userId)) {
      group.users.push(userId);
      await db.update({ _id: group._id }, group);
    }

    res.status(200).json({ message: 'Successfully joined the group', group });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/loadmygroup', async (req, res) => {
  try {
    const { id: userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const userGroups = await db.find({ collection: 'groups', users: userId });
    const details = userGroups.map(g => ({ id: g.id, name: g.name }));
    res.status(200).json(details);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/groups/:groupId/users', async (req, res) => {
  try {
    const group = await findGroupById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const usersDocs = await db.find({ collection: 'users', id: { $in: group.users } });
    const userDetails = usersDocs.map(u => ({ username: u.username, balance: group.balances[u.id] || 0 }));

    res.status(200).json({ users: userDetails });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/groups/:groupId/expenses', async (req, res) => {
  try {
    const { name, amount } = req.body;
    const group = await findGroupById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!name || !amount) return res.status(400).json({ message: 'Expense name and amount are required' });

    const expense = { id: uuidv4(), name, amount: parseFloat(amount) };
    group.expenses.push(expense);

    const share = expense.amount / group.users.length;
    group.users.forEach(uid => {
      group.balances[uid] = (group.balances[uid] || 0) + share;
    });

    await db.update({ _id: group._id }, group);
    res.status(201).json({ message: 'Expense added successfully', expense, balances: group.balances });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/groups/:groupId/expenses', async (req, res) => {
  try {
    const group = await findGroupById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.status(200).json({ expenses: group.expenses });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch('/groups/:groupId/paid', async (req, res) => {
  try {
    const { uid } = req.body;
    const group = await findGroupById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.users.includes(uid)) return res.status(400).json({ message: 'User is not a member of this group' });

    group.balances[uid] = 0;
    await db.update({ _id: group._id }, group);
    res.status(200).json({ message: 'Payment status updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/groups/:groupId', async (req, res) => {
  try {
    const removed = await db.remove({ collection: 'groups', id: req.params.groupId }, {});
    if (!removed) return res.status(404).json({ message: 'Group not found' });
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch('/groupdelete/:groupId', async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ message: 'New group name is required' });

    const exists = await findGroupByName(newName);
    if (exists && exists.id !== req.params.groupId) {
      return res.status(400).json({ message: 'Group name already exists' });
    }

    const updated = await db.update({ collection: 'groups', id: req.params.groupId }, { $set: { name: newName } });
    if (!updated) return res.status(404).json({ message: 'Group not found' });
    res.status(200).json({ message: 'Group name updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

//------------------------------------------------------
// Static assets
//------------------------------------------------------
app.use(express.static('public'));

//------------------------------------------------------
// HTTP server so WebSocket can share the same port
//------------------------------------------------------
const server = http.createServer(app);

//------------------------------------------------------
// WebSocket setup (shares same HTTP server)
//------------------------------------------------------
// Connect using: ws://HOST:PORT/ws/<groupId>
//------------------------------------------------------
const wss = new WebSocket.Server({ server });

const groupSockets = new Map(); // Map<groupId, Set<ws>>

wss.on('connection', (ws, req) => {
  // Extract the group ID from the URL
  const urlParts = req.url.split('/');
  const groupId = urlParts[urlParts.length - 1];
  if (!groupId) {
    ws.close(1008, 'Group ID is required in URL');
    return;
  }

  // Track sockets per group
  if (!groupSockets.has(groupId)) groupSockets.set(groupId, new Set());
  groupSockets.get(groupId).add(ws);

  // Broadcast helper
  const broadcastToGroup = (msgObj) => {
    const peers = groupSockets.get(groupId) || new Set();
    const data = JSON.stringify(msgObj);
    peers.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    });
  };

  // Incoming messages
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (_) {
      return; // Ignore malformed JSON
    }
    // Echo message to everyone in the same group
    broadcastToGroup(msg);
  });

  // Remove closed sockets
  ws.on('close', () => {
    const set = groupSockets.get(groupId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) groupSockets.delete(groupId);
    }
  });
});

//------------------------------------------------------
// Start the combined server
//------------------------------------------------------
server.listen(PORT, () => {
  console.log(`HTTP & WebSocket server running on http://localhost:${PORT}`);
});
