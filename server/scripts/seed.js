require('dotenv').config();
const connectDB = require('../config/db');
const seedAdmin = require('../utils/seedAdmin');

async function run() {
  console.log('--- Initializing FlashVarta Primary Administrator ---');
  try {
    await connectDB();
    await seedAdmin();
    console.log('--- Seeding completed successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('--- Seeding failed ---', err);
    process.exit(1);
  }
}

run();
