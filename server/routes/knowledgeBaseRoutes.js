const express = require('express');
const router = express.Router();
const kbController = require('../controllers/knowledgeBaseController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', kbController.getArticles);
router.get('/:id', kbController.getArticleById);
router.post('/', authenticate, authorize('admin'), kbController.createArticle);
router.put('/:id', authenticate, authorize('admin'), kbController.updateArticle);
router.delete('/:id', authenticate, authorize('admin'), kbController.deleteArticle);
router.post('/:id/helpful', kbController.markHelpful);

module.exports = router;
