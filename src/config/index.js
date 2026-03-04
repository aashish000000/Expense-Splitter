require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_PATH: process.env.DB_PATH || './data/database.jsonl',
  CORS_ORIGINS: process.env.CORS_ORIGINS || '',
  BCRYPT_ROUNDS: 12,
};
