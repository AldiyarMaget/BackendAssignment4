const express = require('express');
const controller = require('../controllers/page.controller')
const router = express.Router();

router.get('/', controller.renderHome);

module.exports = router;