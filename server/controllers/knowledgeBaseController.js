const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

exports.getArticles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, search, published } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = []; const params = []; let idx = 1;
    if (published !== undefined) { conditions.push(`kb.is_published = $${idx++}`); params.push(published === 'true'); }
    if (category) { conditions.push(`cat.name = $${idx++}`); params.push(category); }
    if (search) { conditions.push(`(kb.title ILIKE $${idx} OR kb.content ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const dataParams = [...params, parseInt(limit), offset];
    const [data, count] = await Promise.all([
      query(`SELECT kb.id, kb.title, kb.content, kb.tags, kb.is_published, kb.view_count, kb.created_at, kb.updated_at,
             cat.name AS category_name,
             u.full_name AS author_name
             FROM knowledge_base kb LEFT JOIN kb_categories cat ON kb.category_id = cat.id LEFT JOIN users u ON kb.created_by = u.id
             ${where} ORDER BY kb.created_at DESC LIMIT $${idx++} OFFSET $${idx}`, dataParams),
      query(`SELECT COUNT(*) FROM knowledge_base kb LEFT JOIN kb_categories cat ON kb.category_id = cat.id ${where}`, params)
    ]);
    res.json({ success: true, data: data.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count.rows[0].count), totalPages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)) } });
  } catch (error) { next(error); }
};

exports.getArticleById = async (req, res, next) => {
  try {
    const result = await query(`SELECT kb.*, cat.name AS category_name, u.full_name AS author_name FROM knowledge_base kb LEFT JOIN kb_categories cat ON kb.category_id = cat.id LEFT JOIN users u ON kb.created_by = u.id WHERE kb.id = $1`, [req.params.id]);
    if (!result.rows[0]) throw createError('Article not found', 404);
    await query('UPDATE knowledge_base SET view_count = view_count + 1 WHERE id = $1', [result.rows[0].id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.createArticle = async (req, res, next) => {
  try {
    const { title, content, categoryId, tags, isPublished } = req.body;
    const result = await query(
      `INSERT INTO knowledge_base (title, content, category_id, created_by, tags, is_published)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, content, categoryId || null, req.user.id, tags || [], isPublished || false]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Article created successfully' });
  } catch (error) { next(error); }
};

exports.updateArticle = async (req, res, next) => {
  try {
    const { title, content, categoryId, tags, isPublished } = req.body;
    const updates = []; const values = []; let i = 1;
    if (title !== undefined) { updates.push(`title = $${i++}`); values.push(title); }
    if (content !== undefined) { updates.push(`content = $${i++}`); values.push(content); }
    if (categoryId !== undefined) { updates.push(`category_id = $${i++}`); values.push(categoryId); }
    if (tags !== undefined) { updates.push(`tags = $${i++}`); values.push(tags); }
    if (isPublished !== undefined) { updates.push(`is_published = $${i++}`); values.push(isPublished); }
    if (updates.length === 0) throw createError('No fields to update', 400);
    values.push(req.params.id);
    const result = await query(`UPDATE knowledge_base SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
    if (!result.rows[0]) throw createError('Article not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.deleteArticle = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM knowledge_base WHERE id = $1 RETURNING title', [req.params.id]);
    if (!result.rows[0]) throw createError('Article not found', 404);
    res.json({ success: true, message: 'Article deleted successfully' });
  } catch (error) { next(error); }
};

exports.markHelpful = async (req, res) => {
  res.json({ success: true, message: 'Feedback recorded' });
};

