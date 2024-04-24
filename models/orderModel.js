const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var orderSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    count: Number,
    color: String,

    paymentIntent: {
      id: String,
      method: {
        type: String,
        enum: ["COD", "EasyPaisa"],
      },
      amount: Number,
      status: {
        type: String,
        enum: [
          "Cash on Delivery",
          "Paid",
          "Cancelled",
          "Refunded",
          "Awaiting Payment",
        ],
        default: "Awaiting Payment",
      },
      created: Date,
      currency: String,
    },
    orderStatus: {
      type: String,
      default: "Not Processed",
      enum: [
        "Not Processed",
        "Cash on Delivery",
        "Processing",
        "Dispatched",
        "Cancelled",
        "Delivered",
      ],
    },
    orderby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    email: String,
    mobile: String,
    fullName: String,
    address: String,
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("Order", orderSchema);
