const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roleController');
const auth = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');

router.post('/', auth(), requirePermissions('role:create'), ctrl.create);
router.get('/', auth(), requirePermissions('role:read'), ctrl.list);
router.get('/:id', auth(), requirePermissions('role:read'), ctrl.get);
router.put('/:id', auth(), requirePermissions('role:update'), ctrl.update);
router.delete('/:id', auth(), requirePermissions('role:delete'), ctrl.remove);

module.exports = router;
