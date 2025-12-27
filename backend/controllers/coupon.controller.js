import Coupon from "../models/coupon.model.js";

export const getCoupon = async (req, res) => {
	try {
		// return any active coupon assigned to the user, or a global active coupon
		const coupon = await Coupon.findOne({ isActive: true, $or: [{ userId: req.user._id }, { userId: null }, { userId: { $exists: false } }] });
		res.json(coupon || null);
	} catch (error) {
		console.log("Error in getCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const validateCoupon = async (req, res) => {
	try {
		const { code } = req.body;
		// allow validating user-specific coupons or global coupons (no userId)
		const coupon = await Coupon.findOne({ code: code, isActive: true, $or: [{ userId: req.user._id }, { userId: null }, { userId: { $exists: false } }] });

		if (!coupon) {
			return res.status(404).json({ message: "Coupon not found" });
		}

		if (coupon.expirationDate < new Date()) {
			coupon.isActive = false;
			await coupon.save();
			return res.status(404).json({ message: "Coupon expired" });
		}

		res.json({
			message: "Coupon is valid",
			code: coupon.code,
			discountPercentage: coupon.discountPercentage,
		});
	} catch (error) {
		console.log("Error in validateCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const createCoupon = async (req, res) => {
	try {
		const { code, discountPercentage, expirationDate, assignToUserId } = req.body;

		if (!code || !discountPercentage || !expirationDate) {
			return res.status(400).json({ message: "Missing required fields" });
		}

		const existing = await Coupon.findOne({ code });
		if (existing) {
			return res.status(400).json({ message: "Coupon code already exists" });
		}

		const couponData = {
			code,
			discountPercentage,
			expirationDate: new Date(expirationDate),
			isActive: true,
		};

		if (assignToUserId) couponData.userId = assignToUserId;

		const coupon = new Coupon(couponData);
		await coupon.save();

		res.status(201).json({ message: "Coupon created", coupon });
	} catch (error) {
		console.log("Error in createCoupon", error);
		// handle duplicate key (unique index) errors gracefully
		if (error && error.code === 11000) {
			return res.status(400).json({ message: "Duplicate key error", error: error.keyValue });
		}
		res.status(500).json({ message: "Server error", error: error.message || String(error) });
	}
};

export const listCoupons = async (req, res) => {
	try {
		const coupons = await Coupon.find().sort({ createdAt: -1 });
		res.json(coupons);
	} catch (error) {
		console.log("Error in listCoupons", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const deleteCoupon = async (req, res) => {
	try {
		const { id } = req.params;
		const coupon = await Coupon.findByIdAndDelete(id);
		if (!coupon) return res.status(404).json({ message: "Coupon not found" });
		res.json({ message: "Coupon deleted" });
	} catch (error) {
		console.log("Error in deleteCoupon", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
