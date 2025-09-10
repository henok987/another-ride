const express = require('express');
const router = express.Router();
const { listPassengers, getPassengerById } = require('../../services/userDirectory');

// Read-only proxy to external User Service
router.get('/', async (req, res) => {
  try {
    const results = await listPassengers(req.query || {});
    return res.json(results);
  } catch (e) {
    return res.status(500).json({ message: `Failed to list passengers from user service: ${e.message}` });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const info = await getPassengerById(req.params.id);
    if (!info) return res.status(404).json({ message: 'Passenger not found' });
    return res.json(info);
  } catch (e) {
    return res.status(500).json({ message: `Failed to get passenger from user service: ${e.message}` });
  }
});

module.exports = router;

