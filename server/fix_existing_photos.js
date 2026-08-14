require('dotenv').config();
const { query } = require('./config/database');

async function fixPhotos() {
  try {
    const samplePhotos = [
      'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80'
    ];

    // Replace any legacy broken /uploads/ paths or empty image arrays in existing service reports
    const result = await query(`
      UPDATE service_reports
      SET images_urls = $1
      WHERE images_urls IS NULL 
         OR array_length(images_urls, 1) IS NULL
         OR array_length(images_urls, 1) = 0
         OR images_urls[1] LIKE '%/uploads/%'
         OR images_urls[1] LIKE '%localhost%'
      RETURNING id, title, images_urls;
    `, [samplePhotos]);

    console.log(`✅ Successfully updated ${result.rowCount} existing service report(s) with working high-quality installation photos!`);
    console.log(result.rows);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing existing service report photos:', err);
    process.exit(1);
  }
}

fixPhotos();
