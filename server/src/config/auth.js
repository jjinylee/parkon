module.exports = {
  secret: process.env.JWT_SECRET || 'parkon-dev-secret-key-2026',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};
