require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const getPinIndex = (pin) => {
  return crypto.createHash('sha256').update(String(pin) + (process.env.JWT_SECRET || 'converge_pin_salt')).digest('hex');
};

async function main() {
  const pin = '123456';
  const pinIndex = getPinIndex(pin);
  const salt = await bcrypt.genSalt(12);
  const pinHash = await bcrypt.hash(String(pin), salt);

  const res = await query(
    `UPDATE users 
     SET pin_hash = $1, pin_index = $2 
     WHERE full_name ILIKE '%Mich Villarosa%' 
     RETURNING id, full_name, employee_id, email`,
    [pinHash, pinIndex]
  );

  if (res.rows.length > 0) {
    console.log(`✅ PIN updated to 123456 for: ${res.rows[0].full_name} (${res.rows[0].employee_id})`);
  } else {
    console.log('⚠️  No user found for Mich Villarosa');
  }
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
