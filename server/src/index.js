require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = require('./app');
const logger = require('./utils/logger');
const blacklist = require('./services/blacklist.service');

const PORT = process.env.PORT || 4000;

// Clean expired blacklisted tokens every hour
blacklist.cleanExpired();
setInterval(() => blacklist.cleanExpired(), 3600000);

app.listen(PORT, () => {
  logger.info(`ParkON server running on http://localhost:${PORT}`);
});
