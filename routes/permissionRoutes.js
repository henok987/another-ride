const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/permissionController');
const auth = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');

router.post('/', auth(), requirePermissions('permission:create'), ctrl.create);
router.get('/', auth(), requirePermissions('permission:read'), ctrl.list);
router.get('/:id', auth(), requirePermissions('permission:read'), ctrl.get);
router.put('/:id', auth(), requirePermissions('permission:update'), ctrl.update);
router.delete('/:id', auth(), requirePermissions('permission:delete'), ctrl.remove);

module.exports = router;
