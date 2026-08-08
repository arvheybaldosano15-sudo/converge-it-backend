const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// GET /api/reports/ticket-summary
router.get('/ticket-summary', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const conditions = []; const params = []; let idx = 1;
    if (startDate) { conditions.push(`t.created_at >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`t.created_at <= $${idx++}`); params.push(endDate); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [summary, byPriority, byCategory, byStatus] = await Promise.all([
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status IN ('resolved','closed')) AS completed, COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed','cancelled')) AS open, ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL)::numeric, 2) AS avg_resolution_hours, COUNT(*) FILTER (WHERE sla_due_at < COALESCE(resolved_at, NOW())) AS sla_breached FROM tickets t ${where}`, params),
      query(`SELECT priority, COUNT(*) AS count FROM tickets t ${where} GROUP BY priority`, params),
      query(`SELECT cat.name, COUNT(t.id) AS count FROM tickets t LEFT JOIN categories cat ON t.category_id = cat.id ${where} GROUP BY cat.id ORDER BY count DESC`, params),
      query(`SELECT status, COUNT(*) AS count FROM tickets t ${where} GROUP BY status`, params)
    ]);
    res.json({ success: true, data: { summary: summary.rows[0], byPriority: byPriority.rows, byCategory: byCategory.rows, byStatus: byStatus.rows, startDate, endDate } });
  } catch (error) { next(error); }
});

// GET /api/reports/technician-performance
router.get('/technician-performance', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const conditions = [`u.role = 'technician'`, `u.status = 'active'`]; const tConditions = []; const params = []; let idx = 1;
    if (startDate) { tConditions.push(`t.created_at >= $${idx++}`); params.push(startDate); }
    if (endDate) { tConditions.push(`t.created_at <= $${idx++}`); params.push(endDate); }
    const tWhere = tConditions.length > 0 ? `AND ${tConditions.join(' AND ')}` : '';
    const result = await query(`
      SELECT u.id, u.full_name, u.employee_id, u.specialization,
             COUNT(t.id) AS total_assigned, COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed') ${tWhere}) AS completed,
             ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600) FILTER (WHERE t.resolved_at IS NOT NULL ${tWhere})::numeric, 2) AS avg_resolution_hours,
             ROUND(AVG(f.rating)::numeric, 2) AS avg_satisfaction
      FROM users u LEFT JOIN tickets t ON u.id = t.assigned_to AND 1=1 ${tWhere} LEFT JOIN feedback f ON t.id = f.ticket_id
      WHERE ${conditions.join(' AND ')} GROUP BY u.id ORDER BY completed DESC`, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
});

// GET /api/reports/download/pdf
router.get('/download/pdf', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { reportType = 'ticket-summary', startDate, endDate } = req.query;
    const params = []; let idx = 1;
    const conditions = [];
    if (startDate) { conditions.push(`created_at >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`created_at <= $${idx++}`); params.push(endDate); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const tickets = await query(`SELECT t.ticket_number, t.title, t.status, t.priority, t.created_at, t.resolved_at, c.full_name AS customer_name, cat.name AS category_name, u.full_name AS assignee_name FROM tickets t LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN categories cat ON t.category_id = cat.id LEFT JOIN users u ON t.assigned_to = u.id ${where} ORDER BY t.created_at DESC LIMIT 1000`, params);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Converge IT Solutions', { align: 'center' });
    doc.fontSize(14).text('Ticket Report', { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    if (startDate || endDate) doc.text(`Period: ${startDate || 'All time'} to ${endDate || 'Present'}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12).text(`Total Tickets: ${tickets.rows.length}`);
    doc.moveDown();

    const headers = ['Ticket #', 'Title', 'Status', 'Priority', 'Customer', 'Category', 'Assignee', 'Created'];
    const colWidths = [80, 120, 70, 60, 90, 80, 80, 80];
    let x = 50; let y = doc.y;
    doc.fontSize(8).font('Helvetica-Bold');
    headers.forEach((h, i) => { doc.text(h, x, y, { width: colWidths[i] }); x += colWidths[i]; });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();

    doc.font('Helvetica').fontSize(7);
    tickets.rows.forEach(row => {
      if (doc.y > 700) { doc.addPage(); }
      x = 50; y = doc.y + 5;
      const values = [row.ticket_number, row.title?.substring(0, 20), row.status, row.priority, row.customer_name || '-', row.category_name || '-', row.assignee_name || 'Unassigned', new Date(row.created_at).toLocaleDateString()];
      values.forEach((v, i) => { doc.text(v || '-', x, y, { width: colWidths[i], lineBreak: false }); x += colWidths[i]; });
      doc.moveDown(1);
    });

    doc.end();
  } catch (error) { next(error); }
});

// GET /api/reports/download/excel
router.get('/download/excel', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const params = []; let idx = 1;
    const conditions = [];
    if (startDate) { conditions.push(`t.created_at >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`t.created_at <= $${idx++}`); params.push(endDate); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const tickets = await query(`SELECT t.ticket_number, t.title, t.status, t.priority, t.created_at, t.resolved_at, t.sla_due_at, c.full_name AS customer_name, c.contact_number AS customer_contact, cat.name AS category_name, u.full_name AS assignee_name FROM tickets t LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN categories cat ON t.category_id = cat.id LEFT JOIN users u ON t.assigned_to = u.id ${where} ORDER BY t.created_at DESC`, params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Converge IT Solutions';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Tickets', { properties: { tabColor: { argb: '1e40af' } } });
    sheet.columns = [
      { header: 'Ticket #', key: 'ticket_number', width: 15 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Customer', key: 'customer_name', width: 25 },
      { header: 'Contact', key: 'customer_contact', width: 18 },
      { header: 'Category', key: 'category_name', width: 20 },
      { header: 'Assignee', key: 'assignee_name', width: 25 },
      { header: 'Created', key: 'created_at', width: 20 },
      { header: 'Resolved', key: 'resolved_at', width: 20 },
      { header: 'SLA Due', key: 'sla_due_at', width: 20 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e40af' } };
    sheet.getRow(1).height = 25;

    tickets.rows.forEach(row => {
      sheet.addRow({
        ...row,
        created_at: row.created_at ? new Date(row.created_at).toLocaleString() : '-',
        resolved_at: row.resolved_at ? new Date(row.resolved_at).toLocaleString() : '-',
        sla_due_at: row.sla_due_at ? new Date(row.sla_due_at).toLocaleString() : '-',
        assignee_name: row.assignee_name || 'Unassigned'
      });
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=tickets-${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
});

module.exports = router;
