require('dotenv').config();
const { query } = require('../config/database');

async function resetPins() {
  const ids = [
    'e8b1e045-b05a-429a-a679-a6ce970c001c', // Bernie Besa
    'f679dd28-de25-4e05-a0c6-73d203d51a82', // Mich Villarosa
    '4e061c9c-a869-4e70-8557-167404bb8d40', // Nikko Mickelle Bunda Besa
    '7db0e1bc-a030-4bd0-8d4c-83c02f92238f', // Fritz Besa
  ];

  for (const id of ids) {
    const res = await query(
      'UPDATE users SET pin_hash = NULL, pin_index = NULL WHERE id = $1 RETURNING full_name, employee_id',
      [id]
    );
    if (res.rows.length > 0) {
      console.log(`✅ PIN cleared for: ${res.rows[0].full_name} (${res.rows[0].employee_id})`);
    } else {
      console.log(`⚠️  No user found with id: ${id}`);
    }
  }

  console.log('\nDone! All selected technician PINs have been reset.');
  process.exit(0);
}

resetPins().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
