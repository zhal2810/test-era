const express = require('express');
const { getMarketItems, getMarketStats } = require('../controllers/marketController');
const router = express.Router();

router.get('/items', getMarketItems);
router.get('/stats', getMarketStats);

module.exports = router;