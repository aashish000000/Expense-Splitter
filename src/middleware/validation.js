const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({ field: err.path, message: err.msg })),
    });
  }
  next();
};

const registerRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginRules = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const createGroupRules = [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Group name must be 1-50 characters'),
  body('userId').notEmpty().withMessage('User ID is required'),
];

const addExpenseRules = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Expense name is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('category').optional().trim().isLength({ max: 50 }),
];

const groupIdParam = [param('groupId').notEmpty().withMessage('Group ID is required')];

module.exports = {
  validate,
  registerRules,
  loginRules,
  createGroupRules,
  addExpenseRules,
  groupIdParam,
};
