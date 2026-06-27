const express = require('express');
const { getMarketItems } = require('../controllers/marketController');
const router = express.Router();

router.get('/items', getMarketItems);

module.exports = router;