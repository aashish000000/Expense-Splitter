const { findUserById, findGroupById } = require('../db');

const authenticate = async (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const user = await findUserById(userId);
  if (!user) {
    return res.status(401).json({ message: 'Invalid user' });
  }

  req.user = user;
  next();
};

const verifyGroupMember = async (req, res, next) => {
  const groupId = req.params.groupId;
  const group = await findGroupById(groupId);

  if (!group) {
    return res.status(404).json({ message: 'Group not found' });
  }

  if (!group.users.includes(req.user.id)) {
    return res.status(403).json({ message: 'Not a member of this group' });
  }

  req.group = group;
  next();
};

module.exports = { authenticate, verifyGroupMember };
