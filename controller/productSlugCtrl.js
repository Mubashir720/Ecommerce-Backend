const Product = require("../models/productModel");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const fs = require("fs");

const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  try {
    const findProduct = await Product.findOne({ slug: slug });
    if (!findProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(findProduct);
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = { getProductBySlug };
