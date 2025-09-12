const { Pricing } = require('../models/pricing');
const { crudController } = require('./basic.crud');
const { broadcast } = require('../sockets');

const base = crudController(Pricing);

// Override create to prevent duplicates
base.create = async (req, res) => {
  try {
    const { vehicleType, baseFare, perKm, perMinute, waitingPerMinute, surgeMultiplier } = req.body || {};
    if (!vehicleType) return res.status(400).json({ message: 'vehicleType is required' });
    const exists = await Pricing.findOne({ vehicleType, baseFare, perKm, perMinute, waitingPerMinute, surgeMultiplier });
    if (exists) return res.status(409).json({ message: 'Pricing with identical values already exists' });
    const item = await Pricing.create(req.body);
    return res.status(201).json(item);
  } catch (e) { return res.status(500).json({ message: e.message }); }
};

async function updateAndBroadcast(req, res) {
  try {
    const item = await Pricing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Not found' });
    broadcast('pricing:update', item);
    return res.json(item);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { ...base, updateAndBroadcast };

