const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, findGroupByName, findGroupById } = require('../db');

const router = express.Router();

router.post('/create', async (req, res) => {
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
      expenses: [],
    };
    await db.insert(newGroup);
    res.status(201).json({ message: 'Group created successfully', group: newGroup });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/join', async (req, res) => {
  try {
    const { code, userId } = req.body;
    const group = await findGroupByName(code);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.users.includes(userId)) {
      group.users.push(userId);
      await db.update({ _id: group._id }, group);
    }

    res.status(200).json({ message: 'Successfully joined the group', group });
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:groupId/users', async (req, res) => {
  try {
    const group = await findGroupById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const usersDocs = await db.find({ collection: 'users', id: { $in: group.users } });
    const userDetails = usersDocs.map((u) => ({
      username: u.username,
      balance: group.balances[u.id] || 0,
    }));

    res.status(200).json({ users: userDetails });
  } catch (err) {
    console.error('Get group users error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:groupId/expenses', async (req, res) => {
  try {
    const { name, amount } = req.body;
    const group = await findGroupById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!name || !amount) return res.status(400).json({ message: 'Expense name and amount are required' });

    const expense = { id: uuidv4(), name, amount: parseFloat(amount) };
    group.expenses.push(expense);

    const share = expense.amount / group.users.length;
    group.users.forEach((uid) => {
      group.balances[uid] = (group.balances[uid] || 0) + share;
    });

    await db.update({ _id: group._id }, group);
    res.status(201).json({ message: 'Expense added successfully', expense, balances: group.balances });
  } catch (err) {
    console.error('Add expense error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:groupId/expenses', async (req, res) => {
  try {
    const group = await findGroupById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.status(200).json({ expenses: group.expenses });
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:groupId/paid', async (req, res) => {
  try {
    const { uid } = req.body;
    const group = await findGroupById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.users.includes(uid)) return res.status(400).json({ message: 'User is not a member of this group' });

    group.balances[uid] = 0;
    await db.update({ _id: group._id }, group);
    res.status(200).json({ message: 'Payment status updated successfully' });
  } catch (err) {
    console.error('Mark paid error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:groupId/rename', async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
      return res.status(400).json({ message: 'New group name is required' });
    }

    const sanitizedName = newName.trim();
    const exists = await findGroupByName(sanitizedName);
    if (exists && exists.id !== req.params.groupId) {
      return res.status(400).json({ message: 'Group name already exists' });
    }

    const updated = await db.update(
      { collection: 'groups', id: req.params.groupId },
      { $set: { name: sanitizedName } }
    );
    if (!updated) return res.status(404).json({ message: 'Group not found' });
    res.status(200).json({ message: 'Group name updated successfully', name: sanitizedName });
  } catch (err) {
    console.error('Rename group error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:groupId', async (req, res) => {
  try {
    const removed = await db.remove({ collection: 'groups', id: req.params.groupId }, {});
    if (!removed) return res.status(404).json({ message: 'Group not found' });
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
