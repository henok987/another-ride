const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/staffController');
const auth = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');

router.post('/', auth(), requirePermissions('staff:create'), ctrl.create);
router.get('/', auth(), requirePermissions('staff:read'), ctrl.list);
router.get('/:id', auth(), requirePermissions('staff:read'), ctrl.get);
router.put('/:id', auth(), requirePermissions('staff:update'), ctrl.update);
router.delete('/:id', auth(), requirePermissions('staff:delete'), ctrl.remove);

module.exports = router;
