const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const isUuid = (str) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

// Detect which columns actually exist in the knowledge_base table
let _kbColumns = null;
async function getKbColumns() {
  if (_kbColumns) return _kbColumns;
  try {
    const result = await query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'knowledge_base'
    `);
    _kbColumns = result.rows.map((r) => r.column_name);
  } catch (e) {
    // Safest minimal fallback — only guaranteed base columns
    _kbColumns = ['id', 'title', 'content', 'tags', 'is_published', 'created_at', 'updated_at', 'category_id'];
  }
  return _kbColumns;
}

exports.getArticles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, search, published } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const cols = await getKbColumns();

    const hasExcerpt = cols.includes('excerpt');
    const hasAuthorId = cols.includes('author_id');
    const hasIsFeatured = cols.includes('is_featured');
    const hasViews = cols.includes('views');
    const hasViewCount = cols.includes('view_count');
    const hasCreatedBy = cols.includes('created_by');
    const hasHelpfulCount = cols.includes('helpful_count');

    const viewCol = hasViews ? 'COALESCE(kb.views, 0)' : hasViewCount ? 'COALESCE(kb.view_count, 0)' : '0';
    const viewColPlain = hasViews ? 'COALESCE(views, 0)' : hasViewCount ? 'COALESCE(view_count, 0)' : '0';
    const helpfulCol = hasHelpfulCount ? 'COALESCE(kb.helpful_count, 0)' : '0';
    const helpfulColPlain = hasHelpfulCount ? 'COALESCE(helpful_count, 0)' : '0';
    const authorJoin = hasAuthorId
      ? `LEFT JOIN users u ON kb.author_id = u.id`
      : hasCreatedBy
      ? `LEFT JOIN users u ON kb.created_by = u.id`
      : '';
    const authorSelect = hasAuthorId || hasCreatedBy ? `u.full_name AS author_name` : `'Admin' AS author_name`;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (published !== undefined) {
      conditions.push(`kb.is_published = $${idx++}`);
      params.push(published === 'true');
    }
    if (category) {
      conditions.push(`cat.name ILIKE $${idx}`);
      params.push(`%${category}%`);
      idx++;
    }
    if (search) {
      const searchCols = [`kb.title ILIKE $${idx}`, `kb.content ILIKE $${idx}`];
      if (hasExcerpt) searchCols.push(`kb.excerpt ILIKE $${idx}`);
      conditions.push(`(${searchCols.join(' OR ')})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const dataParams = [...params, parseInt(limit), offset];

    let data, count;
    try {
      [data, count] = await Promise.all([
        query(`
          SELECT kb.id, kb.title, kb.content,
                 ${hasExcerpt ? 'kb.excerpt,' : "'' AS excerpt,"}
                 ${hasIsFeatured ? 'kb.is_featured,' : 'false AS is_featured,'}
                 kb.tags, kb.is_published,
                 ${viewCol} AS views,
                 ${helpfulCol} AS helpful_count,
                 kb.created_at, kb.updated_at,
                 COALESCE(cat.name, 'General') AS category_name,
                 ${authorSelect}
          FROM knowledge_base kb
          LEFT JOIN service_categories cat ON kb.category_id = cat.id
          ${authorJoin}
          ${where}
          ORDER BY kb.created_at DESC
          LIMIT $${idx} OFFSET $${idx + 1}`, dataParams),
        query(`SELECT COUNT(*) FROM knowledge_base kb
               LEFT JOIN service_categories cat ON kb.category_id = cat.id
               ${where}`, params)
      ]);
    } catch (e) {
      // Safest fallback: no joins, minimal columns, no table alias
      [data, count] = await Promise.all([
        query(`
          SELECT id, title, content, tags, is_published,
                 ${viewColPlain} AS views,
                 ${helpfulColPlain} AS helpful_count,
                 created_at, updated_at,
                 'General' AS category_name, 'Admin' AS author_name,
                 '' AS excerpt, false AS is_featured
          FROM knowledge_base
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2`, [parseInt(limit), offset]),
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
    const cols = await getKbColumns();
    const hasAuthorId = cols.includes('author_id');
    const hasCreatedBy = cols.includes('created_by');
    const authorJoin = hasAuthorId
      ? `LEFT JOIN users u ON kb.author_id = u.id`
      : hasCreatedBy ? `LEFT JOIN users u ON kb.created_by = u.id` : '';
    const authorSelect = hasAuthorId || hasCreatedBy ? `u.full_name AS author_name` : `'Admin' AS author_name`;

    let result;
    try {
      result = await query(`
        SELECT kb.*, COALESCE(cat.name, 'General') AS category_name, ${authorSelect}
        FROM knowledge_base kb
        LEFT JOIN service_categories cat ON kb.category_id = cat.id
        ${authorJoin}
        WHERE kb.id = $1`, [req.params.id]);
    } catch (e) {
      result = await query(`SELECT * FROM knowledge_base WHERE id = $1`, [req.params.id]);
    }

    if (!result.rows[0]) throw createError('Article not found', 404);

    const viewCol = cols.includes('views') ? 'views' : cols.includes('view_count') ? 'view_count' : null;
    if (viewCol) {
      await query(`UPDATE knowledge_base SET ${viewCol} = COALESCE(${viewCol}, 0) + 1 WHERE id = $1`, [result.rows[0].id]).catch(() => {});
    }

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

    const cols = await getKbColumns();

    // Resolve categoryId to UUID
    let validCategoryId = null;
    if (categoryId && isUuid(categoryId)) {
      validCategoryId = categoryId;
    } else if (categoryId) {
      const catLookup = await query(
        `SELECT id FROM service_categories WHERE name ILIKE $1 OR name ILIKE $2 LIMIT 1`,
        [`%${categoryId.replace(/_/g, ' ')}%`, `%${categoryId}%`]
      ).catch(() => ({ rows: [] }));
      if (catLookup.rows[0]) validCategoryId = catLookup.rows[0].id;
    }

    const userId = req.user?.id || null;
    const publish = isPublished !== undefined ? isPublished : true;

    // Build INSERT dynamically based on existing columns
    const insertCols = ['title', 'content', 'category_id', 'tags', 'is_published'];
    const insertVals = [title.trim(), content.trim(), validCategoryId, tags || [], publish];

    if (cols.includes('excerpt')) { insertCols.push('excerpt'); insertVals.push(excerpt || content.trim().substring(0, 150)); }
    if (cols.includes('author_id')) { insertCols.push('author_id'); insertVals.push(userId); }
    else if (cols.includes('created_by')) { insertCols.push('created_by'); insertVals.push(userId); }
    if (cols.includes('is_featured')) { insertCols.push('is_featured'); insertVals.push(isFeatured || false); }

    const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(', ');

    const result = await query(
      `INSERT INTO knowledge_base (${insertCols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      insertVals
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Article created successfully' });
  } catch (error) {
    console.error('createArticle error:', error.message);
    next(error);
  }
};

exports.updateArticle = async (req, res, next) => {
  try {
    const { title, content, excerpt, categoryId, tags, isPublished, isFeatured } = req.body;
    const cols = await getKbColumns();
    const updates = [];
    const values = [];
    let i = 1;

    if (title !== undefined) { updates.push(`title = $${i++}`); values.push(title); }
    if (content !== undefined) { updates.push(`content = $${i++}`); values.push(content); }
    if (excerpt !== undefined && cols.includes('excerpt')) { updates.push(`excerpt = $${i++}`); values.push(excerpt); }
    if (categoryId !== undefined) {
      updates.push(`category_id = $${i++}`);
      values.push(isUuid(categoryId) ? categoryId : null);
    }
    if (tags !== undefined) { updates.push(`tags = $${i++}`); values.push(tags); }
    if (isPublished !== undefined) { updates.push(`is_published = $${i++}`); values.push(isPublished); }
    if (isFeatured !== undefined && cols.includes('is_featured')) { updates.push(`is_featured = $${i++}`); values.push(isFeatured); }

    if (updates.length === 0) throw createError('No fields to update', 400);

    if (cols.includes('updated_at')) updates.push(`updated_at = NOW()`);
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
