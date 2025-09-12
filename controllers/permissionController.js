const { models } = require('../models');

exports.create = async (req, res) => { try { const row = await models.Permission.create({ name: req.body.name }); return res.status(201).json(row); } catch (e) { return res.status(500).json({ message: e.message }); } };
exports.list = async (req, res) => { try { const rows = await models.Permission.findAll(); return res.json(rows); } catch (e) { return res.status(500).json({ message: e.message }); } };
exports.get = async (req, res) => { try { const row = await models.Permission.findByPk(req.params.id); if (!row) return res.status(404).json({ message: 'Not found' }); return res.json(row); } catch (e) { return res.status(500).json({ message: e.message }); } };
exports.update = async (req, res) => { try { const [count] = await models.Permission.update({ name: req.body.name }, { where: { id: req.params.id } }); if (!count) return res.status(404).json({ message: 'Not found' }); const updated = await models.Permission.findByPk(req.params.id); return res.json(updated); } catch (e) { return res.status(500).json({ message: e.message }); } };
exports.remove = async (req, res) => { try { const count = await models.Permission.destroy({ where: { id: req.params.id } }); if (!count) return res.status(404).json({ message: 'Not found' }); return res.status(204).send(); } catch (e) { return res.status(500).json({ message: e.message }); } };
