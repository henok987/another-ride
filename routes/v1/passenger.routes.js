
const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/passenger.controller');
const { authenticate, authorize } = require('../../middleware/auth');

// Admin/staff manage passengers
router.get('/', authorize('admin','staff'), ctrl.list);
router.post('/', authorize('admin','staff'), ctrl.create);
router.get('/:id', authorize('admin','staff'), ctrl.get);
router.put('/:id', authorize('admin','staff'), ctrl.update);
router.delete('/:id', authorize('admin','staff'), ctrl.remove);

module.exports = router;

