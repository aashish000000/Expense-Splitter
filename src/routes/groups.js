const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, findGroupByName, findGroupById } = require('../db');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { validate, createGroupRules, addExpenseRules, groupIdParam } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(apiLimiter);

const EXPENSE_CATEGORIES = [
  'Food & Drinks',
  'Transportation',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Utilities',
  'Healthcare',
  'Other',
];

router.get('/categories', (req, res) => {
  res.json({ success: true, categories: EXPENSE_CATEGORIES });
});

router.post(
  '/create',
  createGroupRules,
  validate,
  asyncHandler(async (req, res) => {
    const { name, userId } = req.body;

    const exists = await findGroupByName(name.trim());
    if (exists) {
      return res.status(400).json({ success: false, message: 'Group already exists' });
    }

    const newGroup = {
      collection: 'groups',
      id: uuidv4(),
      name: name.trim(),
      users: [userId],
      balances: {},
      expenses: [],
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    await db.insert(newGroup);
    res.status(201).json({ success: true, message: 'Group created successfully', group: newGroup });
  })
);

router.post(
  '/join',
  asyncHandler(async (req, res) => {
    const { code, userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({ success: false, message: 'Group code and userId required' });
    }

    const group = await findGroupByName(code.trim());
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.users.includes(userId)) {
      group.users.push(userId);
      await db.update({ _id: group._id }, group);
    }

    res.status(200).json({ success: true, message: 'Successfully joined the group', group });
  })
);

router.get(
  '/:groupId/users',
  groupIdParam,
  validate,
  asyncHandler(async (req, res) => {
    const group = await findGroupById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const usersDocs = await db.find({ collection: 'users', id: { $in: group.users } });
    const userDetails = usersDocs.map((u) => ({
      id: u.id,
      username: u.username,
      balance: group.balances[u.id] || 0,
    }));

    res.json({ success: true, users: userDetails });
  })
);

router.post(
  '/:groupId/expenses',
  groupIdParam,
  addExpenseRules,
  validate,
  asyncHandler(async (req, res) => {
    const { name, amount, category = 'Other', paidBy } = req.body;
    const group = await findGroupById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const expense = {
      id: uuidv4(),
      name: name.trim(),
      amount: parseFloat(amount),
      category,
      paidBy: paidBy || null,
      createdAt: new Date().toISOString(),
    };

    group.expenses.push(expense);

    const share = expense.amount / group.users.length;
    group.users.forEach((uid) => {
      group.balances[uid] = (group.balances[uid] || 0) + share;
    });

    await db.update({ _id: group._id }, group);

    res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      expense,
      balances: group.balances,
    });
  })
);

router.get(
  '/:groupId/expenses',
  groupIdParam,
  validate,
  asyncHandler(async (req, res) => {
    const group = await findGroupById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const total = group.expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = group.expenses.reduce((acc, e) => {
      acc[e.category || 'Other'] = (acc[e.category || 'Other'] || 0) + e.amount;
      return acc;
    }, {});

    res.json({
      success: true,
      expenses: group.expenses,
      summary: { total, byCategory, count: group.expenses.length },
    });
  })
);

router.get(
  '/:groupId/settlements',
  groupIdParam,
  validate,
  asyncHandler(async (req, res) => {
    const group = await findGroupById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const usersDocs = await db.find({ collection: 'users', id: { $in: group.users } });
    const userMap = Object.fromEntries(usersDocs.map((u) => [u.id, u.username]));

    const balances = Object.entries(group.balances)
      .map(([id, balance]) => ({ id, username: userMap[id], balance }))
      .filter((u) => Math.abs(u.balance) > 0.01);

    const debtors = balances.filter((u) => u.balance > 0).sort((a, b) => b.balance - a.balance);
    const creditors = balances.filter((u) => u.balance < 0).sort((a, b) => a.balance - b.balance);

    const settlements = [];
    let i = 0,
      j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.balance, -creditor.balance);

      if (amount > 0.01) {
        settlements.push({
          from: debtor.username,
          to: creditor.username,
          amount: Math.round(amount * 100) / 100,
        });
      }

      debtor.balance -= amount;
      creditor.balance += amount;

      if (debtor.balance < 0.01) i++;
      if (creditor.balance > -0.01) j++;
    }

    res.json({ success: true, settlements });
  })
);

router.get(
  '/:groupId/export',
  groupIdParam,
  validate,
  asyncHandler(async (req, res) => {
    const group = await findGroupById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const usersDocs = await db.find({ collection: 'users', id: { $in: group.users } });
    const userMap = Object.fromEntries(usersDocs.map((u) => [u.id, u.username]));

    const csvHeader = 'Date,Name,Category,Amount\n';
    const csvRows = group.expenses
      .map((e) => {
        const date = e.createdAt ? new Date(e.createdAt).toLocaleDateString() : 'N/A';
        return `"${date}","${e.name}","${e.category || 'Other'}",${e.amount}`;
      })
      .join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${group.name}-expenses.csv"`);
    res.send(csv);
  })
);

router.patch(
  '/:groupId/paid',
  groupIdParam,
  validate,
  asyncHandler(async (req, res) => {
    const { uid } = req.body;
    const group = await findGroupById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    if (!group.users.includes(uid)) {
      return res.status(400).json({ success: false, message: 'User is not a member of this group' });
    }

    group.balances[uid] = 0;
    await db.update({ _id: group._id }, group);

    res.json({ success: true, message: 'Payment status updated successfully' });
  })
);

router.patch(
  '/:groupId/rename',
  groupIdParam,
  validate,
  asyncHandler(async (req, res) => {
    const { newName } = req.body;

    if (!newName || newName.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'New group name is required' });
    }

    const sanitizedName = newName.trim();
    const exists = await findGroupByName(sanitizedName);

    if (exists && exists.id !== req.params.groupId) {
      return res.status(400).json({ success: false, message: 'Group name already exists' });
    }

    await db.update({ collection: 'groups', id: req.params.groupId }, { $set: { name: sanitizedName } });

    res.json({ success: true, message: 'Group name updated successfully', name: sanitizedName });
  })
);

router.delete(
  '/:groupId',
  groupIdParam,
  validate,
  asyncHandler(async (req, res) => {
    const removed = await db.remove({ collection: 'groups', id: req.params.groupId }, {});

    if (!removed) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    res.json({ success: true, message: 'Group deleted successfully' });
  })
);

module.exports = router;
