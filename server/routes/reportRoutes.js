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

// Helper query function for fetching report data by type
const getReportData = async (reportType, startDate, endDate) => {
  const { conditions, params } = buildDateConditions(startDate, endDate, 't');
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
    return result.rows;
  }
  
  if (reportType === 'service-trends') {
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
    return result.rows;
  }

  if (reportType === 'sla-performance') {
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
      LIMIT 1000
    `, params);
    return result.rows;
  }

  if (reportType === 'resolution-times') {
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
      LIMIT 1000
    `, params);
    return result.rows;
  }

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
    LIMIT 1000
  `, params);
  return result.rows;
};

// GET /api/reports/preview — Live Report Data Generator Preview
router.get('/preview', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { reportType = 'ticket-summary', startDate, endDate } = req.query;
    const rows = await getReportData(reportType, startDate, endDate);
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
    const rows = await getReportData('technician-performance', startDate, endDate);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// ─── GET /api/reports/download/pdf (Landscape A4, Perfectly Proportioned Columns) ───
router.get('/download/pdf', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { reportType = 'ticket-summary', startDate, endDate } = req.query;
    const rows = await getReportData(reportType, startDate, endDate);

    // A4 Landscape: 841.89 points wide x 595.28 points high
    // Left/Right margin: 30pt -> Printable width = 781.89pt (we target 780pt total table width)
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${reportType}-${Date.now()}.pdf`);
    doc.pipe(res);

    // Header Title Banner
    doc.rect(30, 25, 781.89, 50).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('Converge IT Solutions Inc.', 45, 33);
    doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold').text(`REPORT: ${reportType.toUpperCase().replace(/-/g, ' ')}`, 45, 52);

    const genDateStr = `Generated: ${new Date().toLocaleString()}`;
    const rangeStr = `Period: ${startDate || 'All Time'} to ${endDate || 'Present'}`;
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(genDateStr, 580, 33, { align: 'right', width: 220 });
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(rangeStr, 580, 50, { align: 'right', width: 220 });

    doc.y = 85;

    // Report specific column definitions (Width sum = 780pt)
    let columns = [];
    let getRowValues = (r) => [];

    if (reportType === 'technician-performance') {
      columns = [
        { name: 'Technician Name', width: 140 },
        { name: 'Employee ID', width: 90 },
        { name: 'Specialization', width: 130 },
        { name: 'Assigned', width: 70 },
        { name: 'Completed', width: 70 },
        { name: 'Active', width: 70 },
        { name: 'Avg Turnaround', width: 100 },
        { name: 'CSAT Rating', width: 110 },
      ];
      getRowValues = (r) => [
        r.full_name || '-',
        r.employee_id || '-',
        r.specialization || 'General',
        String(r.total_assigned || 0),
        String(r.completed || 0),
        String(r.active || 0),
        r.avg_resolution_hours ? `${r.avg_resolution_hours}h` : '-',
        r.avg_satisfaction ? `${r.avg_satisfaction} / 5` : '-'
      ];
    } else if (reportType === 'service-trends') {
      columns = [
        { name: 'Service Category', width: 220 },
        { name: 'Total Tickets', width: 140 },
        { name: 'Resolved Tickets', width: 140 },
        { name: 'SLA Breached', width: 130 },
        { name: 'Avg Resolution Time', width: 150 },
      ];
      getRowValues = (r) => [
        r.category_name || 'General',
        String(r.total_tickets || 0),
        String(r.resolved_tickets || 0),
        String(r.sla_breached || 0),
        r.avg_hours ? `${r.avg_hours}h` : '-'
      ];
    } else if (reportType === 'sla-performance') {
      columns = [
        { name: 'Ticket #', width: 95 },
        { name: 'Customer', width: 135 },
        { name: 'Category', width: 125 },
        { name: 'Priority', width: 65 },
        { name: 'Status', width: 75 },
        { name: 'SLA Status', width: 85 },
        { name: 'SLA Deadline', width: 105 },
        { name: 'Assignee', width: 95 },
      ];
      getRowValues = (r) => [
        r.ticket_number || '-',
        (r.customer_name || '-').substring(0, 22),
        (r.category_name || '-').substring(0, 20),
        (r.priority || '-').toUpperCase(),
        (r.status || '-').toUpperCase(),
        (r.sla_status || 'WITHIN').toUpperCase().replace('_', ' '),
        r.sla_deadline ? new Date(r.sla_deadline).toLocaleDateString() : '-',
        (r.assignee_name || 'Unassigned').substring(0, 16)
      ];
    } else if (reportType === 'resolution-times') {
      columns = [
        { name: 'Ticket #', width: 95 },
        { name: 'Customer', width: 145 },
        { name: 'Category', width: 130 },
        { name: 'Priority', width: 70 },
        { name: 'Created Date', width: 100 },
        { name: 'Resolved Date', width: 100 },
        { name: 'Turnaround Time', width: 140 },
      ];
      getRowValues = (r) => [
        r.ticket_number || '-',
        (r.customer_name || '-').substring(0, 24),
        (r.category_name || '-').substring(0, 20),
        (r.priority || '-').toUpperCase(),
        r.created_at ? new Date(r.created_at).toLocaleDateString() : '-',
        r.resolved_at ? new Date(r.resolved_at).toLocaleDateString() : 'Pending',
        r.resolution_hours ? `${r.resolution_hours} hours` : '-'
      ];
    } else {
      // Default: ticket-summary
      columns = [
        { name: 'Ticket #', width: 95 },
        { name: 'Subject', width: 160 },
        { name: 'Status', width: 70 },
        { name: 'Priority', width: 65 },
        { name: 'Customer', width: 130 },
        { name: 'Category', width: 115 },
        { name: 'Assignee', width: 85 },
        { name: 'Created', width: 60 },
      ];
      getRowValues = (r) => [
        r.ticket_number || '-',
        (r.subject || '-').substring(0, 28),
        (r.status || '-').toUpperCase(),
        (r.priority || '-').toUpperCase(),
        (r.customer_name || '-').substring(0, 20),
        (r.category_name || '-').substring(0, 18),
        (r.assignee_name || 'Unassigned').substring(0, 14),
        r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'
      ];
    }

    // Draw Summary Count Bar
    doc.fillColor('#0284c7').fontSize(9).font('Helvetica-Bold').text(`Total Exported Records: ${rows.length}`, 30, 85);
    doc.moveDown(0.6);

    // Function to render table header on top of page
    const renderTableHeader = () => {
      let curX = 30;
      let curY = doc.y;

      doc.rect(30, curY, 781.89, 20).fill('#1e293b');
      doc.fillColor('#f8fafc').fontSize(8).font('Helvetica-Bold');
      columns.forEach((col) => {
        doc.text(col.name, curX + 5, curY + 5, { width: col.width - 8, lineBreak: false });
        curX += col.width;
      });
      doc.y = curY + 23;
    };

    renderTableHeader();

    // Render Data Rows
    doc.font('Helvetica').fontSize(7.5);
    rows.forEach((row, rowIdx) => {
      if (doc.y > 540) {
        doc.addPage();
        doc.y = 30;
        renderTableHeader();
      }

      const curY = doc.y;
      if (rowIdx % 2 === 1) {
        doc.rect(30, curY - 1, 781.89, 17).fill('#f8fafc');
      }

      let curX = 30;
      const vals = getRowValues(row);

      vals.forEach((v, i) => {
        // Apply color badge styling for Status/Priority/SLA
        let textCol = '#334155';
        const strV = String(v).toUpperCase();
        if (['CRITICAL', 'BREACHED'].includes(strV)) textCol = '#dc2626';
        else if (['HIGH', 'AT RISK', 'PENDING', 'OPEN'].includes(strV)) textCol = '#d97706';
        else if (['RESOLVED', 'CLOSED', 'COMPLETED', 'WITHIN'].includes(strV)) textCol = '#16a34a';

        doc.fillColor(textCol).text(String(v), curX + 5, curY + 3, { width: columns[i].width - 8, lineBreak: false });
        curX += columns[i].width;
      });

      doc.y = curY + 16;
    });

    // Add Footer to all pages
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text(
        `Converge IT Solutions MTS Report • Confidential • Page ${i + 1} of ${range.count}`,
        30, 575, { align: 'center', width: 781.89 }
      );
    }

    doc.end();
  } catch (error) { next(error); }
});

// ─── GET /api/reports/download/excel (Auto-Fitted Columns & Responsive Excel Layout) ───
router.get('/download/excel', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { reportType = 'ticket-summary', startDate, endDate } = req.query;
    const rows = await getReportData(reportType, startDate, endDate);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Converge IT Solutions Inc.';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(reportType.toUpperCase().replace(/-/g, ' '), {
      properties: { tabColor: { argb: '0284c7' } },
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });

    let columns = [];
    let mapRow = (r) => ({});

    if (reportType === 'technician-performance') {
      columns = [
        { header: 'Technician Name', key: 'full_name' },
        { header: 'Employee ID', key: 'employee_id' },
        { header: 'Specialization', key: 'specialization' },
        { header: 'Total Assigned', key: 'total_assigned' },
        { header: 'Completed', key: 'completed' },
        { header: 'Active Workload', key: 'active' },
        { header: 'Avg Resolution (Hours)', key: 'avg_resolution_hours' },
        { header: 'CSAT Rating (1-5)', key: 'avg_satisfaction' },
      ];
      mapRow = (r) => ({
        ...r,
        full_name: r.full_name || 'N/A',
        employee_id: r.employee_id || '-',
        specialization: r.specialization || 'General',
        total_assigned: parseInt(r.total_assigned || 0),
        completed: parseInt(r.completed || 0),
        active: parseInt(r.active || 0),
        avg_resolution_hours: r.avg_resolution_hours ? `${r.avg_resolution_hours} hrs` : '-',
        avg_satisfaction: r.avg_satisfaction ? `${r.avg_satisfaction} / 5` : '-'
      });
    } else if (reportType === 'service-trends') {
      columns = [
        { header: 'Service Category', key: 'category_name' },
        { header: 'Total Tickets', key: 'total_tickets' },
        { header: 'Resolved Tickets', key: 'resolved_tickets' },
        { header: 'SLA Breached', key: 'sla_breached' },
        { header: 'Avg Resolution Time (Hours)', key: 'avg_hours' },
      ];
      mapRow = (r) => ({
        ...r,
        category_name: r.category_name || 'General',
        total_tickets: parseInt(r.total_tickets || 0),
        resolved_tickets: parseInt(r.resolved_tickets || 0),
        sla_breached: parseInt(r.sla_breached || 0),
        avg_hours: r.avg_hours ? `${r.avg_hours} hrs` : '-'
      });
    } else if (reportType === 'sla-performance') {
      columns = [
        { header: 'Ticket #', key: 'ticket_number' },
        { header: 'Customer Name', key: 'customer_name' },
        { header: 'Category', key: 'category_name' },
        { header: 'Priority', key: 'priority' },
        { header: 'Status', key: 'status' },
        { header: 'SLA Status', key: 'sla_status' },
        { header: 'SLA Deadline', key: 'sla_deadline' },
        { header: 'Assignee', key: 'assignee_name' },
      ];
      mapRow = (r) => ({
        ...r,
        priority: (r.priority || '-').toUpperCase(),
        status: (r.status || '-').toUpperCase(),
        sla_status: (r.sla_status || 'WITHIN').toUpperCase().replace('_', ' '),
        sla_deadline: r.sla_deadline ? new Date(r.sla_deadline).toLocaleString() : '-',
        assignee_name: r.assignee_name || 'Unassigned'
      });
    } else if (reportType === 'resolution-times') {
      columns = [
        { header: 'Ticket #', key: 'ticket_number' },
        { header: 'Customer Name', key: 'customer_name' },
        { header: 'Category', key: 'category_name' },
        { header: 'Priority', key: 'priority' },
        { header: 'Created Date', key: 'created_at' },
        { header: 'Resolved Date', key: 'resolved_at' },
        { header: 'Turnaround Duration', key: 'resolution_hours' },
      ];
      mapRow = (r) => ({
        ...r,
        priority: (r.priority || '-').toUpperCase(),
        created_at: r.created_at ? new Date(r.created_at).toLocaleString() : '-',
        resolved_at: r.resolved_at ? new Date(r.resolved_at).toLocaleString() : 'Pending',
        resolution_hours: r.resolution_hours ? `${r.resolution_hours} hours` : '-'
      });
    } else {
      // Default: ticket-summary
      columns = [
        { header: 'Ticket #', key: 'ticket_number' },
        { header: 'Subject', key: 'subject' },
        { header: 'Status', key: 'status' },
        { header: 'Priority', key: 'priority' },
        { header: 'Customer Name', key: 'customer_name' },
        { header: 'Contact Number', key: 'customer_contact' },
        { header: 'Category', key: 'category_name' },
        { header: 'Assignee', key: 'assignee_name' },
        { header: 'Created Date', key: 'created_at' },
        { header: 'Resolved Date', key: 'resolved_at' },
      ];
      mapRow = (r) => ({
        ...r,
        status: (r.status || '-').toUpperCase(),
        priority: (r.priority || '-').toUpperCase(),
        assignee_name: r.assignee_name || 'Unassigned',
        created_at: r.created_at ? new Date(r.created_at).toLocaleString() : '-',
        resolved_at: r.resolved_at ? new Date(r.resolved_at).toLocaleString() : '-'
      });
    }

    sheet.columns = columns.map(c => ({ ...c, width: 20 }));

    // Apply Navy Header Style
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
    sheet.getRow(1).height = 26;
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add Data Rows
    rows.forEach(r => sheet.addRow(mapRow(r)));

    // Auto-fit column widths based on maximum content length so no column text is cut off!
    sheet.columns.forEach((column) => {
      let maxLen = column.header ? column.header.length : 12;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const valStr = cell.value ? String(cell.value) : '';
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      });
      column.width = Math.min(Math.max(maxLen + 4, 15), 50);
    });

    // Apply Zebra Striping to Data Rows
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.height = 20;
        row.alignment = { vertical: 'middle' };
        if (rowNumber % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        }
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report-${reportType}-${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
});

// ─── GET /api/reports/download/csv ───
router.get('/download/csv', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { reportType = 'ticket-summary', startDate, endDate } = req.query;
    const rows = await getReportData(reportType, startDate, endDate);

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let headers = [];
    let mapLine = (r) => [];

    if (reportType === 'technician-performance') {
      headers = ['Technician Name', 'Employee ID', 'Specialization', 'Total Assigned', 'Completed', 'Active Workload', 'Avg Resolution Hours', 'CSAT Rating'];
      mapLine = (r) => [
        r.full_name || '',
        r.employee_id || '',
        r.specialization || 'General',
        r.total_assigned || 0,
        r.completed || 0,
        r.active || 0,
        r.avg_resolution_hours || '',
        r.avg_satisfaction || ''
      ];
    } else if (reportType === 'service-trends') {
      headers = ['Category Name', 'Total Tickets', 'Resolved Tickets', 'SLA Breached', 'Avg Resolution Hours'];
      mapLine = (r) => [
        r.category_name || '',
        r.total_tickets || 0,
        r.resolved_tickets || 0,
        r.sla_breached || 0,
        r.avg_hours || ''
      ];
    } else if (reportType === 'sla-performance') {
      headers = ['Ticket Number', 'Customer Name', 'Category', 'Priority', 'Status', 'SLA Status', 'SLA Deadline', 'Assignee'];
      mapLine = (r) => [
        r.ticket_number || '',
        r.customer_name || '',
        r.category_name || '',
        r.priority || '',
        r.status || '',
        r.sla_status || '',
        r.sla_deadline ? new Date(r.sla_deadline).toLocaleString() : '',
        r.assignee_name || 'Unassigned'
      ];
    } else if (reportType === 'resolution-times') {
      headers = ['Ticket Number', 'Customer Name', 'Category', 'Priority', 'Created Date', 'Resolved Date', 'Resolution Duration (Hours)'];
      mapLine = (r) => [
        r.ticket_number || '',
        r.customer_name || '',
        r.category_name || '',
        r.priority || '',
        r.created_at ? new Date(r.created_at).toLocaleString() : '',
        r.resolved_at ? new Date(r.resolved_at).toLocaleString() : '',
        r.resolution_hours || ''
      ];
    } else {
      // Default: ticket-summary
      headers = ['Ticket Number', 'Subject', 'Status', 'Priority', 'Customer Name', 'Contact Number', 'Category', 'Assignee', 'Created Date', 'Resolved Date'];
      mapLine = (r) => [
        r.ticket_number || '',
        r.subject || '',
        r.status || '',
        r.priority || '',
        r.customer_name || '',
        r.customer_contact || '',
        r.category_name || '',
        r.assignee_name || 'Unassigned',
        r.created_at ? new Date(r.created_at).toLocaleString() : '',
        r.resolved_at ? new Date(r.resolved_at).toLocaleString() : ''
      ];
    }

    let csvStr = headers.map(escapeCsv).join(',') + '\n';
    rows.forEach((r) => {
      csvStr += mapLine(r).map(escapeCsv).join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=report-${reportType}-${Date.now()}.csv`);
    res.status(200).send(csvStr);
  } catch (error) { next(error); }
});

module.exports = router;
