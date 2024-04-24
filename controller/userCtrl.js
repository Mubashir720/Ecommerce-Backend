const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Coupon = require("../models/couponModel");
const Order = require("../models/orderModel");
const uniqid = require("uniqid");
const stripe = require("stripe")(
  "sk_test_51P0dpsRqlx8vMRC3xPWii8Bnr7TmabWCXbnGrnKqtJuyynmEJ0ObGeHKarcKmVgkpJfvfonCnSiLnXPSTfriV56z00liTcHygB"
);
const asyncHandler = require("express-async-handler");
const { generateToken } = require("../config/jwtToken");
const validateMongodbId = require("../utils/validateMongodbId");
const { generateRefreshToken } = require("../config/refreshtoken");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sendEmail = require("./emailCtrl");

//create a user
const createUser = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const findUser = await User.findOne({ email: email });
  if (!findUser) {
    //create new user
    const newUser = User.create(req.body);
    res.json(newUser);
  } else {
    throw new Error("User Alreaday Exists");
  }
});
//login user
const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  //check user exists or not
  const findUser = await User.findOne({ email });
  if (findUser && (await findUser.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findUser?._id);
    const updateuser = await User.findByIdAndUpdate(
      findUser.id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 24 * 60 * 60 * 1000,
    });

    res.json({
      _id: findUser?._id,
      firstname: findUser?.firstname,
      lastname: findUser?.lastname,
      email: findUser?.email,
      mobile: findUser?.mobile,
      token: generateToken(findUser._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});

// create a seller
const createSeller = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const findUser = await User.findOne({ email: email });

  if (!findUser) {
    const newUser = await User.create({ ...req.body, role: "seller" });
    res.json(newUser);
  } else {
    throw new Error("User Already Exists");
  }
});

//loginseller user
const loginseller = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // check user exists or not
  const findUser = await User.findOne({ email });

  if (findUser && (await findUser.isPasswordMatched(password))) {
    // Check if the user is a seller
    if (findUser.role === "seller") {
      const refreshToken = await generateRefreshToken(findUser?._id);

      const updateuser = await User.findByIdAndUpdate(
        findUser.id,
        {
          refreshToken: refreshToken,
        },
        { new: true }
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 72 * 24 * 60 * 60 * 1000,
      });

      res.json({
        _id: findUser?._id,
        firstname: findUser?.firstname,
        lastname: findUser?.lastname,
        email: findUser?.email,
        mobile: findUser?.mobile,
        token: generateToken(findUser._id),
        role: findUser?.role, // Include the role in the response
      });
    } else {
      // If the user is not a seller, return an error
      throw new Error("Invalid User Role for Login");
    }
  } else {
    throw new Error("Invalid Credentials");
  }
});

// admin login

const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // check if user exists or not
  const findAdmin = await User.findOne({ email });
  if (findAdmin.role !== "admin") throw new Error("Not Authorised");
  if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findAdmin?._id);
    const updateuser = await User.findByIdAndUpdate(
      findAdmin.id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findAdmin?._id,
      firstname: findAdmin?.firstname,
      lastname: findAdmin?.lastname,
      email: findAdmin?.email,
      mobile: findAdmin?.mobile,
      token: generateToken(findAdmin?._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});

//handle refresh token
const handleRefreshToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No refresh token in cookies");
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user) throw new Error("No refresh token present in db or not matched");
  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err || user.id !== decoded.id) {
      throw new Error("There is something wrong with refresh Token");
    }
    const accessToken = generateToken(user?._id);
    res.json({ accessToken });
  });
});

// logout function
const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No refresh token in cookies");

  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });

  if (!user) {
    // If the user is not found, clear the refreshToken cookie and send a 204 response.
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });

    return res.sendStatus(204);
  }

  // If the user is found, update the refreshToken field to an empty string in the database.
  await User.findOneAndUpdate(
    { refreshToken },
    {
      refreshToken: "",
    }
  );

  // Clear the refreshToken cookie and send a 204 response.
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });

  // Remove user data from local storage
  res.json({ message: "Logout successful" });
});

//update a user
const updatedUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongodbId(_id);
  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        firstname: req?.body.firstname,
        lastname: req?.body.lastname,
        email: req?.body.email,
        mobile: req?.body.mobile,
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

// save user Address

const saveAddress = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;
  validateMongodbId(_id);

  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        address: req?.body?.address,
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

//get all users
const getallUser = asyncHandler(async (req, res) => {
  try {
    const getUsers = await User.find();
    res.json(getUsers);
  } catch (error) {
    throw new Error(error);
  }
});
//get a single user
const getaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);

  try {
    const getaUser = await User.findById(id);
    res.json({
      getaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});
//delete a user
const deleteaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);

  try {
    const deleteaUser = await User.findByIdAndDelete(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});
const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  try {
    const blockusr = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: true,
      },
      {
        new: true,
      }
    );
    res.json(blockusr);
  } catch (error) {
    throw new Error(error);
  }
});
const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  try {
    const unblock = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: false,
      },
      {
        new: true,
      }
    );
    res.json({
      message: "User Unblocked",
    });
  } catch (error) {
    throw new Error(error);
  }
});
// Update password
const updatePassword = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const password = req.body.password; // Corrected the variable name
  validateMongodbId(_id);
  const user = await User.findById(_id);

  if (password) {
    user.password = password;
    const updatedPassword = await user.save();
    res.json(updatedPassword);
  } else {
    res.json(user);
  }
});
//forgotpasswordtoken
const forgotPasswordToken = asyncHandler(async (req, res) => {
  const { email } = req.body; // Corrected line
  const user = await User.findOne({ email }); // Assuming your model is named "User"
  if (!user) throw new Error("User not found with this email");
  try {
    const token = await user.createPasswordResetToken();
    await user.save();
    const resetURL = `Hi, please follow this link to reset your password. This link is valid for 10 mins from now. <a href="http://localhost:5000/api/user/reset-password/${token}">Click Here</a>`;
    const data = {
      to: email,
      text: "Hey User",
      subject: "Forgot Password Link",
      html: resetURL, // Corrected field name
    };
    sendEmail(data);
    res.json(token);
  } catch (error) {
    throw new Error(error);
  }
});
//reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) throw new Error("Token expired,Please try again later");
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json(user);
});

//get wishlist
const getWishlist = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  try {
    const findUser = await User.findById(_id).populate("wishlist");
    res.json(findUser);
  } catch (error) {
    throw new Error(error);
  }
});
// userCart controller

const userCart = asyncHandler(async (req, res) => {
  try {
    const { productId, quantity, price, color } = req.body; // Assuming these fields are provided in the request body
    const userId = req.user._id; // Retrieve user ID from req.user
    validateMongodbId(userId);
    // Check if the product is already in the cart
    let existingCartItem = await Cart.findOne({ userId, productId });

    if (existingCartItem) {
      // If the product already exists in the cart, update its quantity
      existingCartItem.quantity += quantity || 1; // Increment quantity by 1 if not provided
      await existingCartItem.save();
      return res.status(200).json({
        message: "Product quantity updated in the cart",
        cartItem: existingCartItem,
      });
    } else {
      // If the product is not in the cart, create a new cart item
      const newCartItem = new Cart({
        userId,
        productId,
        quantity: quantity || 1,
        price,
        color,
      });
      await newCartItem.save();
      return res
        .status(201)
        .json({ message: "Product added to cart", cartItem: newCartItem });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

//get user cart
// Get user cart
const getUserCart = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id; // Retrieve user ID from req.user
    validateMongodbId(userId);
    // Assuming userId is passed as a parameter
    const cartItems = await Cart.find({ userId })
      .populate("productId")
      .populate("color"); // Populate productId and color details

    if (!cartItems || cartItems.length === 0) {
      return res.status(404).json({ message: "No items found in the cart" });
    }

    return res.status(200).json({ cartItems });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});
//empty cart
const emptyCart = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id; // Retrieve user ID from req.user
    validateMongodbId(userId);

    // Find the user based on userId
    const user = await User.findOne({ _id: userId });

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Remove the cart associated with the user
    const cart = await Cart.findOneAndRemove({ userId: user._id });

    // If there's no cart found, return a message indicating empty cart
    if (!cart) {
      return res.status(200).json({ message: "Cart is already empty." });
    }

    // Return the removed cart
    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Route

//apply coupon
const applyCoupon = asyncHandler(async (req, res) => {
  const { coupon } = req.body;
  const { _id } = req.user;
  validateMongodbId(_id);
  const validCoupon = await Coupon.findOne({ name: coupon });
  if (validCoupon === null) {
    throw new Error("Invalid Coupon");
  }
  const user = await User.findOne({ _id });
  let { cartTotal } = await Cart.findOne({
    orderby: user._id,
  }).populate("products.product");
  let totalAfterDiscount = (
    cartTotal -
    (cartTotal * validCoupon.discount) / 100
  ).toFixed(2);
  await Cart.findOneAndUpdate(
    { orderby: user._id },
    { totalAfterDiscount },
    { new: true }
  );
  res.json(totalAfterDiscount);
});

//create order
const createOrder = asyncHandler(async (req, res) => {
  const { COD, couponApplied, email, mobile, fullName, address } = req.body;
  const { _id } = req.user;
  validateMongodbId(_id);
  try {
    if (!COD) throw new Error("Create cash order failed");

    const user = await User.findById(_id);
    if (!user) {
      throw new Error("User not found");
    }

    let userCart = await Cart.find({ userId: user._id }).populate("productId");
    if (!userCart || userCart.length === 0) {
      throw new Error("Cart not found for the user");
    }

    let finalAmount = 0;
    userCart.forEach((item) => {
      finalAmount += item.price * item.quantity;
    });

    let newOrder = await new Order({
      products: userCart.map((item) => ({
        product: item.productId._id,
        count: item.quantity,
        color: item.color, // Assuming color is stored in cart
      })),
      paymentIntent: {
        id: uniqid(),
        method: "COD",
        amount: finalAmount,
        status: "Cash on Delivery",
        created: Date.now(),
        currency: "Pkr",
      },
      orderby: user._id,
      orderStatus: "Cash on Delivery",
      email: email,
      mobile: mobile,
      fullName: fullName,
      address: address,
    }).save();

    // Clear user's cart after order creation
    await Cart.deleteMany({ userId: user._id });

    res.json({ message: "success" });
  } catch (error) {
    throw new Error(error);
  }
});

// Get orders
const getOrders = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongodbId(_id);
  try {
    const userorders = await Order.find({ orderby: _id })
      .populate("products.product")
      .populate("orderby")
      .exec();
    res.json(userorders);
  } catch (error) {
    throw new Error(error);
  }
});

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    const allOrders = await Order.find({})
      .populate("productId")
      .populate("orderby")
      .exec();
    res.json(allOrders);
  } catch (error) {
    console.error(error); // Log the actual error for debugging purposes
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get order by user ID
const getOrderByUserId = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  try {
    const userorders = await Order.findOne({ orderby: id })
      .populate("products.product")
      .populate("orderby")
      .exec();
    res.json(userorders);
  } catch (error) {
    throw new Error(error);
  }
});

//update order status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  validateMongodbId(id);
  try {
    const updateOrderStatus = await Order.findByIdAndUpdate(
      id,
      {
        orderStatus: status,
        paymentIntent: {
          status: status,
        },
      },
      { new: true }
    );
    res.json(updateOrderStatus);
  } catch (error) {
    throw new Error(error);
  }
});
// checkoutController.js

const createCheckoutSession = async (req, res) => {
  try {
    const { products } = req.body;
    const { cartItems } = products;

    const lineItems = cartItems.map((item) => ({
      price_data: {
        currency: "pkr",
        product_data: {
          name: item.productId.title,
          images: [item.productId.images[0].url], // Assuming images is an array of image objects with a 'url' property
        },
        unit_amount: item.productId.price * 100,
      },
      quantity: item.quantity, // Use 'quantity' from the cart item directly
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating checkout session." });
  }
};

module.exports = {
  createUser,
  loginUserCtrl,
  getallUser,
  getaUser,
  deleteaUser,
  updatedUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout,
  updatePassword,
  forgotPasswordToken,
  resetPassword,
  loginAdmin,
  getWishlist,
  saveAddress,
  userCart,
  getUserCart,
  emptyCart,
  applyCoupon,
  createOrder,
  getOrders,
  updateOrderStatus,
  getAllOrders,
  getOrderByUserId,
  createSeller,
  loginseller,
  createCheckoutSession,
};
