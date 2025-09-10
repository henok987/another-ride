const { Admin } = require('../models/userModels');
const { crudController } = require('./basic.crud');
const { listAdmins, getAdminById } = require('../services/userDirectory');

const base = { ...crudController(Admin) };

base.list = async (req, res) => {
  try {
    const rows = await listAdmins(req.query);
    return res.json(rows);
  } catch (e) { return res.status(500).json({ message: `Failed to list admins: ${e.message}` }); }
};

base.get = async (req, res) => {
  try {
    const a = await getAdminById(req.params.id);
    if (!a) return res.status(404).json({ message: 'Admin not found' });
    return res.json(a);
  } catch (e) { return res.status(500).json({ message: `Failed to get admin: ${e.message}` }); }
};

module.exports = base;


