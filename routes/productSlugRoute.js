const express = require("express");
const router = express.Router();
const {
  getProductBySlug,
  getComments,
} = require("../controller/productSlugCtrl");

router.get("/:slug", getProductBySlug);
router.get("/comment/:slug", getComments);

module.exports = router;
