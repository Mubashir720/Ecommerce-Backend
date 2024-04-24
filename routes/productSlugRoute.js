const express = require("express");
const router = express.Router();
const { getProductBySlug } = require("../controller/productSlugCtrl");

router.get("/:slug", getProductBySlug);

module.exports = router;
