const express = require('express');
const { handleWareraRequest } = require('../controllers/playerController');
const router = express.Router();

// Rute ini menangani apa saja, contoh:
// POST /api/players/user.getUserById
// POST /api/players/search.searchAnything
// POST /api/players/company.getCompanies
router.post('/:procedure', handleWareraRequest);

module.exports = router;