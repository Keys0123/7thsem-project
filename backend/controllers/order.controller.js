import Order from "../models/order.model.js";

export const getMyOrders = async (req, res) => {
  try {
    // populate product details for each order
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'products.product', select: 'name image' })
      .lean();

    // normalize response: include totalPrice key for frontend compatibility
    const normalized = orders.map((o) => ({
      ...o,
      totalPrice: o.totalAmount,
    }));

    res.json(normalized);
  } catch (error) {
    console.log("Error fetching orders", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export default {
  getMyOrders,
};
