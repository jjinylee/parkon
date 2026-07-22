require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`ParkON server running on http://localhost:${PORT}`);
});
