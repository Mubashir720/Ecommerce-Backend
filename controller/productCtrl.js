const Product = require("../models/productModel");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const validateMongoDbId = require("../utils/validateMongodbId");
const axios = require("axios");
const path = require("path");
const cloudinary = require("cloudinary").v2;

const {
  cloudinaryUploadImg,
  cloudinaryDeleteImg,
} = require("../utils/cloudinary");
const fs = require("fs");

//create product
const createProduct = asyncHandler(async (req, res) => {
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    const newProduct = await Product.create(req.body);
    res.json(newProduct);
  } catch (error) {
    throw new Error(error);
  }
});

//update product
const updateProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id; // Correctly access the id from req.params
  validateMongoDbId(productId); // Make sure this function is implemented and imported

  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }

    const updateProduct = await Product.findOneAndUpdate(
      { _id: productId }, // Use _id to query for the product
      req.body,
      { new: true }
    );

    res.json(updateProduct);
  } catch (error) {
    throw new Error(error);
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id; // Correctly access the id from req.params
  validateMongoDbId(productId); // Make sure this function is implemented and imported

  try {
    const deleteProduct = await Product.findOneAndDelete({ _id: productId }); // Use _id to find and delete the product
    res.json(deleteProduct);
  } catch (error) {
    throw new Error(error);
  }
});

//get a product
const getaProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const findProduct = await Product.findById(id).populate("color");
    res.json(findProduct);
  } catch (error) {
    throw new Error(error);
  }
});

//get all products
const getAllProduct = asyncHandler(async (req, res) => {
  try {
    // Filtering
    const queryObj = { ...req.query };
    const excludeFields = ["page", "sort", "limit", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let query = Product.find(JSON.parse(queryStr));

    // Sorting

    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    // limiting the fields

    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }

    // pagination

    const page = req.query.page;
    const limit = req.query.limit;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);
    if (req.query.page) {
      const productCount = await Product.countDocuments();
      if (skip >= productCount) throw new Error("This Page does not exists");
    }
    const product = await query;
    res.json(product);
  } catch (error) {
    throw new Error(error);
  }
});

//add to wishlist
const addToWishlist = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { prodId } = req.body;
  try {
    const user = await User.findById(_id);
    const alreadyadded = user.wishlist.find((id) => id.toString() === prodId);
    if (alreadyadded) {
      let user = await User.findByIdAndUpdate(
        _id,
        {
          $pull: { wishlist: prodId },
        },
        {
          new: true,
        }
      );
      res.json(user);
    } else {
      let user = await User.findByIdAndUpdate(
        _id,
        {
          $push: { wishlist: prodId },
        },
        {
          new: true,
        }
      );
      res.json(user);
    }
  } catch (error) {
    throw new Error(error);
  }
});

//rating
const rating = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { star, prodId, comment } = req.body;
  try {
    const product = await Product.findById(prodId);
    let alreadyRated = product.ratings.find(
      (userId) => userId.postedby.toString() === _id.toString()
    );
    if (alreadyRated) {
      const updateRating = await Product.updateOne(
        {
          ratings: { $elemMatch: alreadyRated },
        },
        {
          $set: { "ratings.$.star": star, "ratings.$.comment": comment },
        },
        {
          new: true,
        }
      );
    } else {
      const rateProduct = await Product.findByIdAndUpdate(
        prodId,
        {
          $push: {
            ratings: {
              star: star,
              comment: comment,
              postedby: _id,
            },
          },
        },
        {
          new: true,
        }
      );
    }
    //get all ratings
    const getallratings = await Product.findById(prodId);
    let totalRating = getallratings.ratings.length;
    let ratingsum = getallratings.ratings
      .map((item) => item.star)
      .reduce((prev, curr) => prev + curr, 0);
    let actualRating = Math.round(ratingsum / totalRating);
    let finalproduct = await Product.findByIdAndUpdate(
      prodId,
      {
        totalrating: actualRating,
      },
      { new: true }
    );
    res.json(finalproduct);
  } catch (error) {
    throw new Error(error);
  }
});

//upload images
const uploadImages = asyncHandler(async (req, res) => {
  try {
    const uploader = (path) => cloudinaryUploadImg(path, "images");
    const urls = [];
    const files = req.files;
    for (const file of files) {
      const { path } = file;
      const newpath = await uploader(path);
      urls.push(newpath);
      fs.unlinkSync(path);
    }
    const images = urls.map((file) => {
      return file;
    });
    res.json(images);
  } catch (error) {
    throw new Error(error);
  }
});

//delete images
const deleteImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const uploader = cloudinaryDeleteImg(id, "images");
    res.json({ message: "Deleted" });
  } catch (error) {
    throw new Error(error);
  }
});

// Configure Cloudinary with your API credentials
cloudinary.config({
  cloud_name: "dnq4v6eqd",
  api_key: "576843729953737",
  api_secret: "9kNUaYIgsK6F2FCd4D5kXeNu-RM",
});

const tryOnProduct = asyncHandler(async (req, res) => {
  try {
    const uploader = (path) => cloudinaryUploadImg(path, "tryon");
    const file = req.file;
    const { slug } = req.params;

    // Fetch the product by slug
    const product = await Product.findOne({ slug });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Get the URL of the first image of the product
    const garment_image_url = product.images[0].url;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { path } = file;
    const newpath = await uploader(path);
    fs.unlinkSync(path); // Remove the temporary file

    // Extract the HTTP URL from the Cloudinary response
    const imageUrl = newpath.url;

    // Use the HTTP URL as the background image URL
    // You can save this URL to your database or use it as needed
    const backgroundImageUrl = imageUrl;

    try {
      const response = await axios.post(
        "http://localhost:2000/predict",
        {
          background_image_url: backgroundImageUrl,
          garment_image_url: garment_image_url,
        },
        {
          timeout: 50000000, // Timeout in milliseconds
        }
      );

      const uploadedImageUrls = [];
      for (const imagePath of response.data) {
        const uploadedImage = await uploader(imagePath);
        uploadedImageUrls.push(uploadedImage.url);
        fs.unlinkSync(imagePath); // Remove the temporary file
      }

      // Return the URLs of the uploaded images as response
      res.status(200).json({ uploadedImageUrls });
    } catch (error) {
      // Handle errors
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const sentimentAnalysis = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;

    // Fetch the product by slug
    const product = await Product.findOne({ slug });

    // Ensure the product exists
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Extract comments from the product
    const comments = product.comments.map((comment) => comment.comment);

    // Send comments for sentiment analysis
    try {
      const response = await axios.post(
        "http://localhost:1000/sentiment-analysis",
        {
          comments,
        },
        {
          timeout: 50000000, // Timeout in milliseconds
        }
      );

      // Calculate average sentiment scores
      let totalPositive = 0;
      let totalNeutral = 0;
      let totalNegative = 0;

      const sentimentData = response.data;
      const commentCount = Object.keys(sentimentData).length;

      for (const comment in sentimentData) {
        totalPositive += sentimentData[comment].positive;
        totalNeutral += sentimentData[comment].neutral;
        totalNegative += sentimentData[comment].negative;
      }

      const averagePositive = totalPositive / commentCount;
      const averageNeutral = totalNeutral / commentCount;
      const averageNegative = totalNegative / commentCount;

      const averageSentiment = {
        positive: averagePositive,
        neutral: averageNeutral,
        negative: averageNegative,
      };

      // Return average sentiment analysis results
      res.json(averageSentiment);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const recommendProducts = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;

    // Fetch the target product by slug
    const targetProduct = await Product.findOne({ slug });
    if (!targetProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Fetch all products data including the target product
    const allProducts = await Product.find({}, "_id category brand comments");

    // Format the data according to model's expectations
    const target_product = {
      _id: targetProduct._id.toString(), // Keep the _id as the key
      category: targetProduct.category,
      brand: targetProduct.brand,
      comments: targetProduct.comments.map((comment) => comment.comment), // Extract comment strings
      // Add more fields as needed
    };

    const all_products_data = {};
    allProducts.forEach((product) => {
      all_products_data[product._id.toString()] = {
        category: product.category,
        brand: product.brand,
        comments: product.comments.map((comment) => comment.comment), // Extract comment strings
        // Add more fields as needed
      };
    });

    // Send data to Flask API for sentiment analysis and recommendation
    const response = await axios.post(
      "http://localhost:1001/recommend", // Update the URL with your Flask API endpoint
      { target_product, all_products_data },
      { timeout: 5000 } // Adjust the timeout as needed
    );

    // Extract recommended product IDs from Flask API response
    const recommendedProductIds = response.data;

    // Fetch details of recommended products using their IDs
    const recommendedProducts = await Product.find({
      _id: { $in: recommendedProductIds },
    });

    // Return recommended products with all details
    res.json(recommendedProducts);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
/*
const tryOnProduct = async (req, res) => {
  try {
    const { file: backgroundImage } = req; // Use req.file instead of req.body for the background image

    // Check if background image is present
    if (!backgroundImage) {
      console.log("Background image is missing");
      return res.status(400).json({ error: "Background image is missing" });
    }

    const { slug } = req.params;

    // Fetch the product by slug
    const product = await Product.findOne({ slug });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Get the URL of the first image of the product
    const garment_image_url = product.images[0].url; // Assuming images is an array of objects
    console.log(backgroundImage);
    // Send a POST request to the Flask server
    const response = await axios.post("http://localhost:2000/predict", {
      background_image: backgroundImage.path, // Use the file path of the uploaded image
      garment_image_url: garment_image_url,
    });

    // Log response data for debugging
    console.log("Response Data:", response.data);

    // Ensure response data is as expected
    if (
      !response.data ||
      typeof response.data !== "object" ||
      !response.data.outputImage1 ||
      !response.data.outputImage2
    ) {
      throw new Error("Invalid response data format");
    }

    // Extract the output images from the response
    const { outputImage1, outputImage2 } = response.data;

    // Send back the URLs of both output images
    res.json({
      outputImage1,
      outputImage2,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};*/

module.exports = {
  createProduct,
  recommendProducts,
  sentimentAnalysis,
  tryOnProduct,
  getaProduct,
  getAllProduct,
  updateProduct,
  deleteProduct,
  addToWishlist,
  rating,
  uploadImages,
  deleteImages,
};
