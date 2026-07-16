const express = require('express');
const { handleWareraRequest } = require('../controllers/playerController');
const router = express.Router();

// Rute ini menangani apa saja, contoh:
// GET /api/players/user.getUserById
// GET /api/players/search.searchAnything
// GET /api/players/company.getCompanies
router.get('/:procedure', handleWareraRequest);
router.post('/:procedure', handleWareraRequest);

module.exports = router;