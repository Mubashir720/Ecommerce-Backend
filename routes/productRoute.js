const express = require("express");

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const upload = multer({ dest: "uploads/" });

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original filename
  },
});

const {
  createProduct,
  getaProduct,
  getAllProduct,
  updateProduct,
  addToWishlist,
  rating,
  deleteProduct,
  uploadImages,
  tryOnProduct,
  deleteImages,
  sentimentAnalysis,
  recommendProducts,
} = require("../controller/productCtrl");
//checks only admin can do that
const { isAdmin, authMiddleware } = require("../middlewares/authMiddleware");
const {
  uploadPhoto,
  productImgResize,
} = require("../middlewares/uploadImages");
const router = express.Router();

router.post("/", authMiddleware, isAdmin, createProduct);
router.put(
  "/upload/",
  authMiddleware,
  isAdmin,
  uploadPhoto.array("images", 10),
  productImgResize,
  uploadImages
);
router.get("/:id", getaProduct);
router.post("/sentiment/:slug", sentimentAnalysis);
router.post("/recommend/:slug", recommendProducts);
router.post("/:slug/try-on", upload.single("file"), tryOnProduct);

router.put("/wishlist", authMiddleware, addToWishlist);

router.put("/rating", authMiddleware, rating);
router.get("/", getAllProduct);
router.put("/:id", authMiddleware, isAdmin, updateProduct);
router.delete("/:id", authMiddleware, isAdmin, deleteProduct);
router.delete("/delete-img/:id", authMiddleware, isAdmin, deleteImages);
module.exports = router;
