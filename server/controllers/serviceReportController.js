const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');
const { getBackendOrigin, fileToDataUri } = require('../utils/urlHelper');


exports.getServiceReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, ticketId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = []; const params = []; let idx = 1;
    if (req.user.role === 'technician') { conditions.push(`sr.technician_id = $${idx++}`); params.push(req.user.id); }
    if (ticketId) { conditions.push(`sr.ticket_id = $${idx++}`); params.push(ticketId); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`
      SELECT sr.*, t.ticket_number, t.subject AS ticket_title, u.full_name AS technician_name
      FROM service_reports sr JOIN tickets t ON sr.ticket_id = t.id JOIN users u ON sr.technician_id = u.id
      ${where} ORDER BY sr.created_at DESC LIMIT $${idx++} OFFSET $${idx}`, [...params, parseInt(limit), offset]);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

exports.getServiceReportById = async (req, res, next) => {
  try {
    const result = await query(`SELECT sr.*, t.ticket_number, t.subject AS ticket_title, u.full_name AS technician_name, u.contact_number AS technician_contact FROM service_reports sr JOIN tickets t ON sr.ticket_id = t.id JOIN users u ON sr.technician_id = u.id WHERE sr.id = $1`, [req.params.id]);
    if (!result.rows[0]) throw createError('Service report not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.createServiceReport = async (req, res, next) => {
  try {
    const { ticketId, title, workPerformed, materialsUsed, completionNotes, gpsLatitude, gpsLongitude, gpsAddress, customerNameSigned, workStartTime, workEndTime, isComplete } = req.body;
    // Convert uploaded files to persistent Base64 Data URIs so photos persist across Render redeploys!
    const imagesUrls = req.files ? req.files.map(f => fileToDataUri(f)).filter(Boolean) : [];
    const result = await query(
      `INSERT INTO service_reports (ticket_id, technician_id, title, work_performed, materials_used, completion_notes, gps_latitude, gps_longitude, gps_address, images_urls, customer_name_signed, work_start_time, work_end_time, is_complete)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [ticketId, req.user.id, title, workPerformed, materialsUsed, completionNotes, gpsLatitude || null, gpsLongitude || null, gpsAddress, imagesUrls, customerNameSigned, workStartTime || null, workEndTime || null, isComplete || false]
    );
    if (isComplete) {
      await query(`UPDATE tickets SET status = 'resolved' WHERE id = $1 AND status NOT IN ('resolved','closed')`, [ticketId]);
    }
    res.status(201).json({ success: true, data: result.rows[0], message: 'Service report created' });
  } catch (error) { next(error); }
};

exports.updateServiceReport = async (req, res, next) => {
  try {
    const { workPerformed, materialsUsed, completionNotes, isComplete, customerNameSigned } = req.body;
    const updates = []; const values = []; let i = 1;
    if (workPerformed !== undefined) { updates.push(`work_performed = $${i++}`); values.push(workPerformed); }
    if (materialsUsed !== undefined) { updates.push(`materials_used = $${i++}`); values.push(materialsUsed); }
    if (completionNotes !== undefined) { updates.push(`completion_notes = $${i++}`); values.push(completionNotes); }
    if (isComplete !== undefined) { updates.push(`is_complete = $${i++}`); values.push(isComplete); }
    if (customerNameSigned !== undefined) { updates.push(`customer_name_signed = $${i++}`); values.push(customerNameSigned); }
    if (updates.length === 0) throw createError('No fields to update', 400);
    values.push(req.params.id);
    const result = await query(`UPDATE service_reports SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
    if (!result.rows[0]) throw createError('Service report not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.uploadSignature = async (req, res, next) => {
  try {
    if (!req.file) throw createError('No signature file provided', 400);
    const signatureUrl = fileToDataUri(req.file);
    const result = await query('UPDATE service_reports SET signature_url = $1 WHERE id = $2 RETURNING *', [signatureUrl, req.params.id]);
    if (!result.rows[0]) throw createError('Service report not found', 404);
    res.json({ success: true, data: result.rows[0], message: 'Signature uploaded' });
  } catch (error) { next(error); }
};

