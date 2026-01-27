const express = require("express");
const router = express.Router();

const controller = require("../controllers/measurement.contraller");
const {validateQuery} = require("../middlewares/measurements.validate");

router.get('/', validateQuery,controller.getSeries);
router.get('/metrics', validateQuery,controller.getMetrics);

module.exports = router;
