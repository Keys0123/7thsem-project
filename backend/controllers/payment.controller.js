import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { stripe } from "../lib/stripe.js";
import axios from "axios";

export const createCheckoutSession = async (req, res) => {
	try {
		const { products, couponCode } = req.body;

		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Invalid or empty products array" });
		}

		let totalAmount = 0;

		const lineItems = products.map((product) => {
			const amount = Math.round(product.price * 100); // stripe wants u to send in the format of cents
			totalAmount += amount * product.quantity;

			return {
				price_data: {
					currency: "usd",
					product_data: {
						name: product.name,
						images: [product.image],
					},
					unit_amount: amount,
				},
				quantity: product.quantity || 1,
			};
		});

		let coupon = null;
		if (couponCode) {
			coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
			if (coupon) {
				totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
			}
		}

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items: lineItems,
			mode: "payment",
			success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
			discounts: coupon
				? [
						{
							coupon: await createStripeCoupon(coupon.discountPercentage),
						},
				  ]
				: [],
			metadata: {
				userId: req.user._id.toString(),
				couponCode: couponCode || "",
				products: JSON.stringify(
					products.map((p) => ({
						id: p._id,
						quantity: p.quantity,
						price: p.price,
					}))
				),
			},
		});

		if (totalAmount >= 20000) {
			await createNewCoupon(req.user._id);
		}
		res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 });
	} catch (error) {
		console.error("Error processing checkout:", error);
		res.status(500).json({ message: "Error processing checkout", error: error.message });
	}
};

export const checkoutSuccess = async (req, res) => {
	try {
		const { sessionId } = req.body;
		const session = await stripe.checkout.sessions.retrieve(sessionId);

		if (session.payment_status === "paid") {
			if (session.metadata.couponCode) {
				await Coupon.findOneAndUpdate(
					{
						code: session.metadata.couponCode,
						userId: session.metadata.userId,
					},
					{
						isActive: false,
					}
				);
			}

			// create a new Order
			const products = JSON.parse(session.metadata.products);
			const newOrder = new Order({
				user: session.metadata.userId,
				products: products.map((product) => ({
					product: product.id,
					quantity: product.quantity,
					price: product.price,
				})),
				totalAmount: session.amount_total / 100, // convert from cents to dollars,
				stripeSessionId: sessionId,
			});

			await newOrder.save();

			res.status(200).json({
				success: true,
				message: "Payment successful, order created, and coupon deactivated if used.",
				orderId: newOrder._id,
			});
		}
	} catch (error) {
		console.error("Error processing successful checkout:", error);
		res.status(500).json({ message: "Error processing successful checkout", error: error.message });
	}
};

export const createEsewaRequest = async (req, res) => {
	try {
		const { products, couponCode } = req.body;

		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Invalid or empty products array" });
		}

		let totalAmount = 0;
		products.forEach((product) => {
			totalAmount += (product.price || 0) * (product.quantity || 1);
		});

		let coupon = null;
		if (couponCode) {
			coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
			if (coupon) {
				totalAmount -= (totalAmount * coupon.discountPercentage) / 100;
			}
		}

		// eSewa expects amounts in the local currency (NPR). Ensure your prices are correct for eSewa.
		const pid = `ESW-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

		const successUrl = `${process.env.CLIENT_URL}/purchase-success?pid=${encodeURIComponent(pid)}&amt=${encodeURIComponent(totalAmount)}`;
		const failUrl = `${process.env.CLIENT_URL}/purchase-cancel`;

		const esewaPaymentUrl = process.env.ESEWA_PAYMENT_URL || "https://esewa.com.np/epay/main";

		res.status(200).json({
			esewaUrl: esewaPaymentUrl,
			form: {
				amt: totalAmount,
				psc: 0,
				pdc: 0,
				tAmt: totalAmount,
				pid,
				su: successUrl,
				fu: failUrl,
			},
		});
	} catch (error) {
		console.error("Error creating eSewa request:", error);
		res.status(500).json({ message: "Error creating eSewa request", error: error.message });
	}
};



export const verifyEsewaPayment = async (req, res) => {
	try {
		const { pid, amt, products, couponCode, refId } = req.body;

		if (!pid || !amt || !Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Missing pid, amt or products" });
		}

		const verifyUrl = process.env.ESEWA_VERIFY_URL || "https://esewa.com.np/epay/transrec";

		const payload = new URLSearchParams();
		payload.append("amt", amt);
		payload.append("pid", pid);
		payload.append("scd", process.env.ESEWA_MERCHANT_CODE || "");

		const response = await axios.post(verifyUrl, payload.toString(), {
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			timeout: 10000,
		});

		const body = String(response.data || "").toLowerCase();
		const success = body.includes("success") || body.includes("<response>success") || body.includes("<status>success");

		if (success) {
			if (couponCode) {
				await Coupon.findOneAndUpdate(
					{
						code: couponCode,
						userId: req.user ? req.user._id : null,
					},
					{
						isActive: false,
					}
				);
			}

			// create a new Order
			const newOrder = new Order({
				user: req.user ? req.user._id : null,
				products: products.map((product) => ({
					product: product._id || product.id,
					quantity: product.quantity,
					price: product.price,
				})),
				totalAmount: Number(amt),
				stripeSessionId: pid,
			});

			await newOrder.save();

			return res.status(200).json({ success: true, message: "eSewa payment verified and order created.", orderId: newOrder._id });
		}

		return res.status(400).json({ success: false, message: "eSewa verification failed", raw: response.data });
	} catch (error) {
		console.error("Error verifying eSewa payment:", error);
		res.status(500).json({ message: "Error verifying eSewa payment", error: error.message });
	}
};

export const createCODOrder = async (req, res) => {
	try {
		const { products, totalAmount, shippingInfo, couponCode } = req.body;

		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Invalid or empty products array" });
		}

		if (!shippingInfo || !shippingInfo.name || !shippingInfo.address || !shippingInfo.phone) {
			return res.status(400).json({ error: "Missing shipping information" });
		}

		let coupon = null;
		if (couponCode) {
			coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
			if (coupon) {
				// apply coupon to totalAmount if needed (frontend should already send computed totalAmount)
			}
		}

		const orderIdToken = `COD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

		const newOrder = new Order({
			user: req.user ? req.user._id : null,
			products: products.map((product) => ({
				product: product._id || product.id,
				quantity: product.quantity,
				price: product.price,
			})),
			totalAmount: totalAmount,
			stripeSessionId: orderIdToken,
			paymentMethod: "cod",
			shippingInfo: {
				name: shippingInfo.name,
				address: shippingInfo.address,
				phone: shippingInfo.phone,
			},
		});

		await newOrder.save();

		if (totalAmount >= 20000) {
			await createNewCoupon(req.user._id);
		}

		if (couponCode && coupon) {
			await Coupon.findOneAndUpdate({ code: couponCode, userId: req.user._id }, { isActive: false });
		}

		res.status(200).json({ success: true, orderId: newOrder._id });
	} catch (error) {
		console.error("Error creating COD order:", error);
		res.status(500).json({ message: "Error creating COD order", error: error.message });
	}
};

async function createStripeCoupon(discountPercentage) {
	const coupon = await stripe.coupons.create({
		percent_off: discountPercentage,
		duration: "once",
	});

	return coupon.id;
}

async function createNewCoupon(userId) {
	await Coupon.findOneAndDelete({ userId });

	const newCoupon = new Coupon({
		code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
		discountPercentage: 10,
		expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
		userId: userId,
	});

	await newCoupon.save();

	return newCoupon;
}
