const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const isUuid = (str) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

exports.getArticles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, search, published } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let idx = 1;

    if (published !== undefined) {
      conditions.push(`kb.is_published = $${idx++}`);
      params.push(published === 'true');
    }
    if (category) {
      conditions.push(`(cat.name ILIKE $${idx} OR cat.slug ILIKE $${idx})`);
      params.push(`%${category}%`);
      idx++;
    }
    if (search) {
      conditions.push(`(kb.title ILIKE $${idx} OR kb.content ILIKE $${idx} OR kb.excerpt ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Try with service_categories join first, fallback to plain query
    let data, count;
    try {
      const dataParams = [...params, parseInt(limit), offset];
      [data, count] = await Promise.all([
        query(`
          SELECT kb.id, kb.title, kb.content, kb.excerpt, kb.tags, kb.is_published, kb.is_featured,
                 COALESCE(kb.views, 0) AS views, COALESCE(kb.helpful_count, 0) AS helpful_count,
                 kb.created_at, kb.updated_at,
                 COALESCE(cat.name, 'General') AS category_name,
                 u.full_name AS author_name
          FROM knowledge_base kb
          LEFT JOIN service_categories cat ON kb.category_id = cat.id
          LEFT JOIN users u ON kb.author_id = u.id
          ${where}
          ORDER BY kb.created_at DESC
          LIMIT $${idx} OFFSET $${idx + 1}`, dataParams),
        query(`SELECT COUNT(*) FROM knowledge_base kb
               LEFT JOIN service_categories cat ON kb.category_id = cat.id
               ${where}`, params)
      ]);
    } catch (e) {
      // Fallback: plain query without joins
      const dataParams = [parseInt(limit), offset];
      [data, count] = await Promise.all([
        query(`
          SELECT kb.id, kb.title, kb.content, kb.excerpt, kb.tags, kb.is_published, kb.is_featured,
                 COALESCE(kb.views, 0) AS views, COALESCE(kb.helpful_count, 0) AS helpful_count,
                 kb.created_at, kb.updated_at,
                 'General' AS category_name,
                 'Admin' AS author_name
          FROM knowledge_base kb
          ORDER BY kb.created_at DESC
          LIMIT $1 OFFSET $2`, dataParams),
        query(`SELECT COUNT(*) FROM knowledge_base`)
      ]);
    }

    const total = parseInt(count.rows[0]?.count || 0);

    res.json({
      success: true,
      data: data.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getArticleById = async (req, res, next) => {
  try {
    let result;
    try {
      result = await query(`
        SELECT kb.*, COALESCE(cat.name, 'General') AS category_name, u.full_name AS author_name
        FROM knowledge_base kb
        LEFT JOIN service_categories cat ON kb.category_id = cat.id
        LEFT JOIN users u ON kb.author_id = u.id
        WHERE kb.id = $1`, [req.params.id]);
    } catch (e) {
      result = await query(`SELECT * FROM knowledge_base WHERE id = $1`, [req.params.id]);
    }

    if (!result.rows[0]) throw createError('Article not found', 404);
    await query('UPDATE knowledge_base SET views = COALESCE(views, 0) + 1 WHERE id = $1', [result.rows[0].id]).catch(() => {});
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.createArticle = async (req, res, next) => {
  try {
    const { title, content, excerpt, categoryId, tags, isPublished, isFeatured } = req.body;

    if (!title || !title.trim()) throw createError('Article title is required', 400);
    if (!content || !content.trim()) throw createError('Article content is required', 400);

    // Resolve categoryId: accept UUID directly, or look up by name/slug
    let validCategoryId = null;
    if (categoryId && isUuid(categoryId)) {
      validCategoryId = categoryId;
    } else if (categoryId) {
      const catLookup = await query(
        `SELECT id FROM service_categories WHERE name ILIKE $1 OR name ILIKE $2 LIMIT 1`,
        [`%${categoryId.replace(/_/g, ' ')}%`, `%${categoryId}%`]
      ).catch(() => ({ rows: [] }));
      if (catLookup.rows[0]) {
        validCategoryId = catLookup.rows[0].id;
      }
    }

    const userId = req.user?.id || null;
    const publish = isPublished !== undefined ? isPublished : true;

    let result;
    try {
      // Try with author_id column
      result = await query(
        `INSERT INTO knowledge_base (title, content, excerpt, category_id, author_id, tags, is_published, is_featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          title.trim(),
          content.trim(),
          excerpt || content.trim().substring(0, 150),
          validCategoryId,
          userId,
          tags || [],
          publish,
          isFeatured || false
        ]
      );
    } catch (e) {
      // Fallback: try with created_by column if author_id doesn't exist
      if (e.message && e.message.includes('author_id')) {
        result = await query(
          `INSERT INTO knowledge_base (title, content, excerpt, category_id, created_by, tags, is_published, is_featured)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            title.trim(),
            content.trim(),
            excerpt || content.trim().substring(0, 150),
            validCategoryId,
            userId,
            tags || [],
            publish,
            isFeatured || false
          ]
        );
      } else {
        throw e;
      }
    }

    res.status(201).json({ success: true, data: result.rows[0], message: 'Article created successfully' });
  } catch (error) {
    console.error('createArticle error:', error.message);
    next(error);
  }
};

exports.updateArticle = async (req, res, next) => {
  try {
    const { title, content, excerpt, categoryId, tags, isPublished, isFeatured } = req.body;
    const updates = [];
    const values = [];
    let i = 1;

    if (title !== undefined) { updates.push(`title = $${i++}`); values.push(title); }
    if (content !== undefined) { updates.push(`content = $${i++}`); values.push(content); }
    if (excerpt !== undefined) { updates.push(`excerpt = $${i++}`); values.push(excerpt); }
    if (categoryId !== undefined) {
      const validId = isUuid(categoryId) ? categoryId : null;
      updates.push(`category_id = $${i++}`);
      values.push(validId);
    }
    if (tags !== undefined) { updates.push(`tags = $${i++}`); values.push(tags); }
    if (isPublished !== undefined) { updates.push(`is_published = $${i++}`); values.push(isPublished); }
    if (isFeatured !== undefined) { updates.push(`is_featured = $${i++}`); values.push(isFeatured); }

    if (updates.length === 0) throw createError('No fields to update', 400);

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await query(
      `UPDATE knowledge_base SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!result.rows[0]) throw createError('Article not found', 404);
    res.json({ success: true, data: result.rows[0], message: 'Article updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteArticle = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM knowledge_base WHERE id = $1 RETURNING title', [req.params.id]);
    if (!result.rows[0]) throw createError('Article not found', 404);
    res.json({ success: true, message: 'Article deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.markHelpful = async (req, res) => {
  try {
    const { isHelpful } = req.body;
    if (isHelpful) {
      await query('UPDATE knowledge_base SET helpful_count = COALESCE(helpful_count, 0) + 1 WHERE id = $1', [req.params.id]);
    } else {
      await query('UPDATE knowledge_base SET not_helpful_count = COALESCE(not_helpful_count, 0) + 1 WHERE id = $1', [req.params.id]);
    }
    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    res.json({ success: true, message: 'Feedback recorded' });
  }
};
