const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');
const { logAudit } = require('../services/auditService');
const { emitToAdmins } = require('../services/socketService');
const logger = require('../config/logger');

const getPinIndex = (pin) => {
  return crypto.createHash('sha256').update(String(pin) + (process.env.JWT_SECRET || 'converge_pin_salt')).digest('hex');
};

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw createError('Email and password are required', 400);

    const result = await query(
      `SELECT id, employee_id, full_name, email, password_hash, role, status, profile_image_url, is_first_login, contact_number
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) throw createError('Invalid email or password', 401);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw createError('Invalid email or password', 401);

    const userStatus = user.status || 'active';
    if (userStatus === 'pending') throw createError('Your account is pending administrator approval', 403);
    if (userStatus === 'rejected') throw createError('Your account application has been rejected', 403);
    if (userStatus === 'inactive') throw createError('Your account has been deactivated or suspended', 403);

    const { accessToken, refreshToken } = generateTokens(user);
    await query('UPDATE users SET refresh_token = $1, last_login_at = NOW() WHERE id = $2', [refreshToken, user.id]);

    await logAudit({ actorId: user.id, actorName: user.full_name, actorRole: user.role, action: 'login', ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user.id, employeeId: user.employee_id, fullName: user.full_name, email: user.email, role: user.role, status: user.status, profileImageUrl: user.profile_image_url, isFirstLogin: user.is_first_login, contactNumber: user.contact_number },
        accessToken, refreshToken
      }
    });
  } catch (error) { next(error); }
};

exports.registerTechnician = async (req, res, next) => {
  try {
    const { employeeId, fullName, email, password, pin, contactNumber, address, specialization, department } = req.body;

    if (!pin || !/^\d{4,6}$/.test(String(pin))) {
      throw createError('PIN must be 4 to 6 digits', 400);
    }

    const existing = await query('SELECT id FROM users WHERE email = $1 OR employee_id = $2', [email.toLowerCase(), employeeId]);
    if (existing.rows.length > 0) throw createError('Email or Employee ID already registered', 409);

    const pinIndex = getPinIndex(pin);
    const existingPin = await query('SELECT id FROM users WHERE pin_index = $1', [pinIndex]);
    if (existingPin.rows.length > 0) {
      throw createError('The selected PIN is already in use. Please choose a different unique PIN.', 409);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const pinHash = await bcrypt.hash(String(pin), salt);

    const result = await query(
      `INSERT INTO users (employee_id, full_name, email, password_hash, pin_hash, pin_index, role, status, contact_number, address, specialization, department)
       VALUES ($1, $2, $3, $4, $5, $6, 'technician', 'pending', $7, $8, $9, $10)
       RETURNING id, employee_id, full_name, email, role, status, created_at`,
      [employeeId, fullName, email.toLowerCase(), passwordHash, pinHash, pinIndex, contactNumber, address, specialization, department]
    );
    const newTech = result.rows[0];

    // Ensure technician record is created in technicians table
    await query(
      `INSERT INTO technicians (user_id, employee_id, approval_status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (user_id) DO NOTHING`,
      [newTech.id, employeeId]
    );

    emitToAdmins('technician:new_pending', { technicianId: newTech.id, fullName: newTech.full_name, employeeId: newTech.employee_id });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending administrator approval.',
      data: { id: newTech.id, employeeId: newTech.employee_id, fullName: newTech.full_name, email: newTech.email, status: newTech.status }
    });
  } catch (error) { next(error); }
};

exports.pinLogin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4,6}$/.test(String(pin))) {
      throw createError('Please enter a valid 4-6 digit PIN', 400);
    }

    const pinIndex = getPinIndex(pin);

    // Look up by pin_index first
    const result = await query(
      `SELECT id, employee_id, full_name, email, password_hash, pin_hash, pin_attempts, pin_locked_until, role, status, profile_image_url, is_first_login, contact_number
       FROM users WHERE pin_index = $1 AND role = 'technician'`,
      [pinIndex]
    );

    let user = result.rows[0];

    // Fallback: If pin_index mismatch or old record without pin_index, search all technicians with pin_hash
    if (!user) {
      const allTechs = await query(
        `SELECT id, employee_id, full_name, email, password_hash, pin_hash, pin_attempts, pin_locked_until, role, status, profile_image_url, is_first_login, contact_number
         FROM users WHERE role = 'technician' AND pin_hash IS NOT NULL`
      );
      for (const tech of allTechs.rows) {
        if (await bcrypt.compare(String(pin), tech.pin_hash)) {
          user = tech;
          // Update pin_index for future fast lookups
          await query('UPDATE users SET pin_index = $1 WHERE id = $2', [pinIndex, tech.id]);
          break;
        }
      }
    }

    if (!user) throw createError('Invalid PIN code', 401);

    // Lockout check
    if (user.pin_locked_until && new Date(user.pin_locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.pin_locked_until) - new Date()) / (1000 * 60));
      throw createError(`Account temporarily locked due to multiple incorrect PIN attempts. Please try again in ${remainingMinutes} minute(s).`, 403);
    }

    const isMatch = await bcrypt.compare(String(pin), user.pin_hash);
    if (!isMatch) {
      const attempts = (user.pin_attempts || 0) + 1;
      if (attempts >= 5) {
        await query(
          `UPDATE users SET pin_attempts = 0, pin_locked_until = NOW() + INTERVAL '15 minutes' WHERE id = $1`,
          [user.id]
        );
        throw createError('Too many incorrect PIN attempts. Account locked for 15 minutes.', 403);
      } else {
        await query(`UPDATE users SET pin_attempts = $1 WHERE id = $2`, [attempts, user.id]);
        throw createError(`Invalid PIN code. ${5 - attempts} attempt(s) remaining.`, 401);
      }
    }

    // Account status enforcement
    if (user.status === 'pending') {
      throw createError('Your account application is still pending administrator approval.', 403);
    }
    if (user.status === 'rejected') {
      throw createError('Your technician account application was rejected. Access denied.', 403);
    }
    if (user.status === 'inactive') {
      throw createError('Your technician account is currently suspended. Please contact your administrator.', 403);
    }
    if (user.status !== 'active') {
      throw createError('Account is not active.', 403);
    }

    // Reset attempts on successful PIN entry
    await query(`UPDATE users SET pin_attempts = 0, pin_locked_until = NULL, last_login_at = NOW() WHERE id = $1`, [user.id]);

    const { accessToken, refreshToken } = generateTokens(user);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

    await logAudit({ actorId: user.id, actorName: user.full_name, actorRole: user.role, action: 'login', ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    res.json({
      success: true,
      message: `Welcome back, ${user.full_name}!`,
      data: {
        user: { id: user.id, employeeId: user.employee_id, fullName: user.full_name, email: user.email, role: user.role, status: user.status, profileImageUrl: user.profile_image_url, isFirstLogin: user.is_first_login, contactNumber: user.contact_number },
        accessToken, refreshToken
      }
    });
  } catch (error) { next(error); }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createError('Refresh token required', 401);
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const result = await query('SELECT id, email, role, status, refresh_token FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];
    if (!user || user.refresh_token !== refreshToken) throw createError('Invalid refresh token', 401);
    if (user.status !== 'active') throw createError('Account not active', 403);
    const tokens = generateTokens(user);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);
    res.json({ success: true, data: tokens });
  } catch (error) { next(error); }
};

exports.logout = async (req, res, next) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
    await logAudit({ actorId: req.user.id, actorName: req.user.full_name, actorRole: req.user.role, action: 'logout', ipAddress: req.ip });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) { next(error); }
};

exports.getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, employee_id, full_name, email, role, status, contact_number, address,
       profile_image_url, specialization, department, is_first_login, last_login_at, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw createError('Both current and new password are required', 400);
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isMatch) throw createError('Current password is incorrect', 400);
    const newHash = await bcrypt.hash(newPassword, await bcrypt.genSalt(12));
    await query('UPDATE users SET password_hash = $1, is_first_login = FALSE WHERE id = $2', [newHash, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) { next(error); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, contactNumber, address, specialization, department } = req.body;
    const profileImageUrl = req.file ? `/uploads/profile-images/${req.file.filename}` : undefined;
    const updates = []; const values = []; let i = 1;
    if (fullName) { updates.push(`full_name = $${i++}`); values.push(fullName); }
    if (contactNumber) { updates.push(`contact_number = $${i++}`); values.push(contactNumber); }
    if (address) { updates.push(`address = $${i++}`); values.push(address); }
    if (specialization) { updates.push(`specialization = $${i++}`); values.push(specialization); }
    if (department) { updates.push(`department = $${i++}`); values.push(department); }
    if (profileImageUrl) { updates.push(`profile_image_url = $${i++}`); values.push(profileImageUrl); }
    if (updates.length === 0) throw createError('No fields to update', 400);
    values.push(req.user.id);
    const result = await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, full_name, email, role, contact_number, address, profile_image_url, specialization, department`, values);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};
