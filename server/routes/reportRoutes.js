const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Helper to construct date conditions for ticket queries
const buildDateConditions = (startDate, endDate, prefix = 't') => {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (startDate) {
    conditions.push(`${prefix}.created_at >= $${idx++}`);
    params.push(startDate);
  }
  if (endDate) {
    conditions.push(`${prefix}.created_at <= $${idx++}`);
    params.push(endDate);
  }
  return { conditions, params, idx };
};

// GET /api/reports/preview — Live Report Data Generator Preview
router.get('/preview', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { reportType = 'ticket-summary', startDate, endDate } = req.query;
    const { conditions, params } = buildDateConditions(startDate, endDate, 't');
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let rows = [];
    if (reportType === 'technician-performance') {
      const techConds = [];
      const techParams = [];
      let tIdx = 1;
      if (startDate) { techConds.push(`t.created_at >= $${tIdx++}`); techParams.push(startDate); }
      if (endDate) { techConds.push(`t.created_at <= $${tIdx++}`); techParams.push(endDate); }
      const tWhere = techConds.length > 0 ? `AND ${techConds.join(' AND ')}` : '';

      const result = await query(`
        SELECT u.id, u.full_name, u.employee_id, u.specialization,
               COUNT(t.id) AS total_assigned,
               COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed')) AS completed,
               COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed','cancelled')) AS active,
               ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600) FILTER (WHERE t.resolved_at IS NOT NULL ${tWhere})::numeric, 2) AS avg_resolution_hours,
               ROUND(AVG(f.rating)::numeric, 2) AS avg_satisfaction
        FROM users u
        LEFT JOIN tickets t ON u.id = t.assigned_technician_id ${tWhere}
        LEFT JOIN feedback f ON t.id = f.ticket_id
        WHERE u.role = 'technician' AND u.status = 'active'
        GROUP BY u.id
        ORDER BY completed DESC
      `, techParams);
      rows = result.rows;
    } else if (reportType === 'service-trends') {
      const catConds = [];
      const catParams = [];
      let cIdx = 1;
      if (startDate) { catConds.push(`t.created_at >= $${cIdx++}`); catParams.push(startDate); }
      if (endDate) { catConds.push(`t.created_at <= $${cIdx++}`); catParams.push(endDate); }
      const cWhere = catConds.length > 0 ? `WHERE ${catConds.join(' AND ')}` : '';

      const result = await query(`
        SELECT cat.id, cat.name AS category_name,
               COUNT(t.id) AS total_tickets,
               COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed')) AS resolved_tickets,
               COUNT(t.id) FILTER (WHERE t.sla_deadline < COALESCE(t.resolved_at, NOW())) AS sla_breached,
               ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600) FILTER (WHERE t.resolved_at IS NOT NULL)::numeric, 2) AS avg_hours
        FROM service_categories cat
        LEFT JOIN tickets t ON cat.id = t.service_category_id ${cWhere ? 'AND ' + cWhere.replace('WHERE ', '') : ''}
        GROUP BY cat.id
        ORDER BY total_tickets DESC
      `, catParams);
      rows = result.rows;
    } else if (reportType === 'sla-performance') {
      const result = await query(`
        SELECT t.id, t.ticket_number, t.subject, t.priority, t.status, t.created_at, t.resolved_at, t.sla_deadline,
               c.full_name AS customer_name, cat.name AS category_name, u.full_name AS assignee_name,
               CASE
                 WHEN t.status IN ('resolved','closed') AND (t.sla_deadline IS NULL OR t.resolved_at <= t.sla_deadline) THEN 'within'
                 WHEN t.status IN ('resolved','closed') AND t.resolved_at > t.sla_deadline THEN 'breached'
                 WHEN t.sla_deadline < NOW() THEN 'breached'
                 WHEN t.sla_deadline <= NOW() + INTERVAL '3 hours' THEN 'at_risk'
                 ELSE 'within'
               END AS sla_status
        FROM tickets t
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN service_categories cat ON t.service_category_id = cat.id
        LEFT JOIN users u ON t.assigned_technician_id = u.id
        ${where}
        ORDER BY t.created_at DESC
        LIMIT 500
      `, params);
      rows = result.rows;
    } else if (reportType === 'resolution-times') {
      const result = await query(`
        SELECT t.id, t.ticket_number, t.subject, t.priority, t.status, t.created_at, t.resolved_at,
               ROUND((EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, NOW()) - t.created_at))/3600)::numeric, 2) AS resolution_hours,
               c.full_name AS customer_name, cat.name AS category_name, u.full_name AS assignee_name
        FROM tickets t
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN service_categories cat ON t.service_category_id = cat.id
        LEFT JOIN users u ON t.assigned_technician_id = u.id
        ${where}
        ORDER BY resolution_hours DESC
        LIMIT 500
      `, params);
      rows = result.rows;
    } else {
      // Default: ticket-summary
      const result = await query(`
        SELECT t.id, t.ticket_number, t.subject, t.status, t.priority, t.created_at, t.resolved_at, t.sla_deadline,
               c.full_name AS customer_name, c.contact_number AS customer_contact,
               cat.name AS category_name, u.full_name AS assignee_name
        FROM tickets t
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN service_categories cat ON t.service_category_id = cat.id
        LEFT JOIN users u ON t.assigned_technician_id = u.id
        ${where}
        ORDER BY t.created_at DESC
        LIMIT 500
      `, params);
      rows = result.rows;
    }

    res.json({
      success: true,
      reportType,
      startDate,
      endDate,
      totalCount: rows.length,
      data: rows
    });
  } catch (error) { next(error); }
});

// GET /api/reports/ticket-summary
router.get('/ticket-summary', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { conditions, params } = buildDateConditions(startDate, endDate, 't');
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [summary, byPriority, byCategory, byStatus] = await Promise.all([
      query(`SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status IN ('resolved','closed')) AS completed,
                    COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed','cancelled')) AS open,
                    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL)::numeric, 2) AS avg_resolution_hours,
                    COUNT(*) FILTER (WHERE sla_deadline < COALESCE(resolved_at, NOW())) AS sla_breached
             FROM tickets t ${where}`, params),
      query(`SELECT priority, COUNT(*) AS count FROM tickets t ${where} GROUP BY priority`, params),
      query(`SELECT cat.name, COUNT(t.id) AS count FROM tickets t LEFT JOIN service_categories cat ON t.service_category_id = cat.id ${where} GROUP BY cat.id, cat.name ORDER BY count DESC`, params),
      query(`SELECT status, COUNT(*) AS count FROM tickets t ${where} GROUP BY status`, params)
    ]);
    res.json({ success: true, data: { summary: summary.rows[0], byPriority: byPriority.rows, byCategory: byCategory.rows, byStatus: byStatus.rows, startDate, endDate } });
  } catch (error) { next(error); }
});

// GET /api/reports/technician-performance
router.get('/technician-performance', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { conditions, params } = buildDateConditions(startDate, endDate, 't');
    const tWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const result = await query(`
      SELECT u.id, u.full_name, u.employee_id, u.specialization,
             COUNT(t.id) AS total_assigned,
             COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed') ${tWhere}) AS completed,
             ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600) FILTER (WHERE t.resolved_at IS NOT NULL ${tWhere})::numeric, 2) AS avg_resolution_hours,
             ROUND(AVG(f.rating)::numeric, 2) AS avg_satisfaction
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assigned_technician_id ${tWhere}
      LEFT JOIN feedback f ON t.id = f.ticket_id
      WHERE u.role = 'technician' AND u.status = 'active'
      GROUP BY u.id ORDER BY completed DESC`, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
});

// GET /api/reports/download/pdf
router.get('/download/pdf', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { reportType = 'ticket-summary', startDate, endDate } = req.query;
    const { conditions, params } = buildDateConditions(startDate, endDate, 't');
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const tickets = await query(`
      SELECT t.ticket_number, t.subject, t.status, t.priority, t.created_at, t.resolved_at,
             c.full_name AS customer_name, cat.name AS category_name, u.full_name AS assignee_name
      FROM tickets t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN service_categories cat ON t.service_category_id = cat.id
      LEFT JOIN users u ON t.assigned_technician_id = u.id
      ${where}
      ORDER BY t.created_at DESC
      LIMIT 1000
    `, params);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${reportType}-${Date.now()}.pdf`);
    doc.pipe(res);

    doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text('Converge IT Solutions', { align: 'center' });
    doc.fillColor('#334155').fontSize(12).font('Helvetica').text(`Report Type: ${reportType.toUpperCase().replace(/-/g, ' ')}`, { align: 'center' });
    doc.fontSize(9).text(`Generated On: ${new Date().toLocaleString()}`, { align: 'center' });
    if (startDate || endDate) doc.text(`Date Range: ${startDate || 'Start'} to ${endDate || 'Present'}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.fillColor('#0284c7').fontSize(11).font('Helvetica-Bold').text(`Total Records: ${tickets.rows.length}`);
    doc.moveDown(0.5);

    const headers = ['Ticket #', 'Subject', 'Status', 'Priority', 'Customer', 'Category', 'Assignee', 'Created'];
    const colWidths = [70, 110, 60, 55, 80, 75, 75, 70];
    let x = 40;
    let y = doc.y;

    doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: colWidths[i] });
      x += colWidths[i];
    });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#cbd5e1').stroke();

    doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
    tickets.rows.forEach((row) => {
      if (doc.y > 750) { doc.addPage(); }
      x = 40;
      y = doc.y + 4;
      const values = [
        row.ticket_number || '-',
        (row.subject || '-').substring(0, 22),
        (row.status || '-').toUpperCase(),
        (row.priority || '-').toUpperCase(),
        (row.customer_name || '-').substring(0, 15),
        (row.category_name || '-').substring(0, 14),
        (row.assignee_name || 'Unassigned').substring(0, 14),
        row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'
      ];
      values.forEach((v, i) => {
        doc.text(v, x, y, { width: colWidths[i], lineBreak: false });
        x += colWidths[i];
      });
      doc.moveDown(0.8);
    });

    doc.end();
  } catch (error) { next(error); }
});

// GET /api/reports/download/excel
router.get('/download/excel', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { reportType = 'ticket-summary', startDate, endDate } = req.query;
    const { conditions, params } = buildDateConditions(startDate, endDate, 't');
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const tickets = await query(`
      SELECT t.ticket_number, t.subject, t.status, t.priority, t.created_at, t.resolved_at, t.sla_deadline,
             c.full_name AS customer_name, c.contact_number AS customer_contact,
             cat.name AS category_name, u.full_name AS assignee_name
      FROM tickets t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN service_categories cat ON t.service_category_id = cat.id
      LEFT JOIN users u ON t.assigned_technician_id = u.id
      ${where}
      ORDER BY t.created_at DESC
    `, params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Converge IT Solutions';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Report', { properties: { tabColor: { argb: '0284c7' } } });
    sheet.columns = [
      { header: 'Ticket #', key: 'ticket_number', width: 16 },
      { header: 'Subject', key: 'subject', width: 35 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Customer', key: 'customer_name', width: 22 },
      { header: 'Contact', key: 'customer_contact', width: 18 },
      { header: 'Category', key: 'category_name', width: 20 },
      { header: 'Assignee', key: 'assignee_name', width: 22 },
      { header: 'Created Date', key: 'created_at', width: 20 },
      { header: 'Resolved Date', key: 'resolved_at', width: 20 },
      { header: 'SLA Deadline', key: 'sla_deadline', width: 20 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0284c7' } };
    sheet.getRow(1).height = 24;

    tickets.rows.forEach(row => {
      sheet.addRow({
        ...row,
        created_at: row.created_at ? new Date(row.created_at).toLocaleString() : '-',
        resolved_at: row.resolved_at ? new Date(row.resolved_at).toLocaleString() : '-',
        sla_deadline: row.sla_deadline ? new Date(row.sla_deadline).toLocaleString() : '-',
        assignee_name: row.assignee_name || 'Unassigned'
      });
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report-${reportType}-${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
});

// GET /api/reports/download/csv
router.get('/download/csv', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { reportType = 'ticket-summary', startDate, endDate } = req.query;
    const { conditions, params } = buildDateConditions(startDate, endDate, 't');
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const tickets = await query(`
      SELECT t.ticket_number, t.subject, t.status, t.priority, t.created_at, t.resolved_at, t.sla_deadline,
             c.full_name AS customer_name, c.contact_number AS customer_contact,
             cat.name AS category_name, u.full_name AS assignee_name
      FROM tickets t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN service_categories cat ON t.service_category_id = cat.id
      LEFT JOIN users u ON t.assigned_technician_id = u.id
      ${where}
      ORDER BY t.created_at DESC
    `, params);

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = ['Ticket Number', 'Subject', 'Status', 'Priority', 'Customer Name', 'Contact Number', 'Category', 'Assignee', 'Created Date', 'Resolved Date', 'SLA Deadline'];
    let csvStr = headers.map(escapeCsv).join(',') + '\n';

    tickets.rows.forEach(row => {
      const line = [
        row.ticket_number,
        row.subject,
        row.status,
        row.priority,
        row.customer_name || '',
        row.customer_contact || '',
        row.category_name || '',
        row.assignee_name || 'Unassigned',
        row.created_at ? new Date(row.created_at).toLocaleString() : '',
        row.resolved_at ? new Date(row.resolved_at).toLocaleString() : '',
        row.sla_deadline ? new Date(row.sla_deadline).toLocaleString() : ''
      ];
      csvStr += line.map(escapeCsv).join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=report-${reportType}-${Date.now()}.csv`);
    res.status(200).send(csvStr);
  } catch (error) { next(error); }
});

module.exports = router;
