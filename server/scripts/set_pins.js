require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// Same logic as authController.js
const getPinIndex = (pin) => {
  return crypto.createHash('sha256').update(String(pin) + (process.env.JWT_SECRET || 'converge_pin_salt')).digest('hex');
};

async function setPin(userId, name, pin) {
  const pinIndex = getPinIndex(pin);
  const salt = await bcrypt.genSalt(12);
  const pinHash = await bcrypt.hash(String(pin), salt);

  const res = await query(
    'UPDATE users SET pin_hash = $1, pin_index = $2 WHERE id = $3 RETURNING full_name, employee_id',
    [pinHash, pinIndex, userId]
  );

  if (res.rows.length > 0) {
    console.log(`✅ PIN set for: ${res.rows[0].full_name} (${res.rows[0].employee_id}) → PIN: ${pin}`);
  } else {
    console.log(`⚠️  No user found with id: ${userId}`);
  }
}

async function main() {
  // Bernie Besa → PIN: 123456
  await setPin('e8b1e045-b05a-429a-a679-a6ce970c001c', 'Bernie Besa', '123456');

  // Mich Villarosa → PIN: 1234
  await setPin('f679dd28-de25-4e05-a0c6-73d203d51a82', 'Mich Villarosa', '1234');

  console.log('\nDone! PINs have been assigned.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
