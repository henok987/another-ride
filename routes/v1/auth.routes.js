const express = require('express');
const router = express.Router();
router.get('/', (req, res) => res.status(410).json({ message: 'Auth endpoints removed. Use external user service for authentication.' }));

module.exports = router;

