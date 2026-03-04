const Datastore = require('nedb-promises');
const config = require('../config');

const db = Datastore.create({ filename: config.DB_PATH, autoload: true });

(async () => {
  await db.ensureIndex({ fieldName: 'collection' });
  await db.ensureIndex({ fieldName: 'email', sparse: true });
  await db.ensureIndex({ fieldName: 'username', sparse: true });
  await db.ensureIndex({ fieldName: 'id', sparse: true });
})();

const findUserByEmail = (email) => db.findOne({ collection: 'users', email });
const findUserByUsername = (username) => db.findOne({ collection: 'users', username });
const findUserById = (id) => db.findOne({ collection: 'users', id });
const findGroupByName = (name) => db.findOne({ collection: 'groups', name });
const findGroupById = (id) => db.findOne({ collection: 'groups', id });

module.exports = {
  db,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  findGroupByName,
  findGroupById,
};
