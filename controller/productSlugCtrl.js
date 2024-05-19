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

const getComments = asyncHandler(async (req, res) => {
  const { slug } = req.params; // Assuming slug is passed as a URL parameter

  if (!slug) {
    console.log("Slug is undefined");
    return res.status(400).json({ message: "Slug is undefined" });
  }
  try {
    // Find the product by slug
    const product = await Product.findOne({ slug });

    if (!product) {
      throw new Error("Product not found.");
    }

    // Get all comments of the product with user names
    const commentsWithUserNames = await Promise.all(
      product.comments.map(async (comment) => {
        const user = await User.findById(comment.userId);
        return {
          userName: user ? user.name : "Unknown User", // Assuming User model has a 'name' field
          ...comment.toObject(), // Spread other comment fields
        };
      })
    );

    res.status(200).json({ comments: commentsWithUserNames });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = { getProductBySlug, getComments };
