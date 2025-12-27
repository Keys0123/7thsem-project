import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useCartStore = create((set, get) => ({
	cart: [],
	coupon: null,
	total: 0,
	subtotal: 0,
	isCouponApplied: false,

	getMyCoupon: async () => {
		try {
			const response = await axios.get("/coupons");
			set({ coupon: response.data });
		} catch (error) {
			console.error("Error fetching coupon:", error);
		}
	},
	applyCoupon: async (code) => {
		try {
			const response = await axios.post("/coupons/validate", { code });
			set({ coupon: response.data, isCouponApplied: true });
			get().calculateTotals();
			toast.success("Coupon applied successfully");
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to apply coupon");
		}
	},
	removeCoupon: () => {
		set({ coupon: null, isCouponApplied: false });
		get().calculateTotals();
		toast.success("Coupon removed");
	},

	getCartItems: async () => {
		try {
			const res = await axios.get("/cart");
			set({ cart: res.data });
			get().calculateTotals();
		} catch (error) {
			set({ cart: [] });
			toast.error(error.response.data.message || "An error occurred");
		}
	},
	clearCart: async () => {
		set({ cart: [], coupon: null, total: 0, subtotal: 0 });
	},
	addToCart: async (product) => {
		try {
			const payload = product.variant ? { productId: product._id, variant: product.variant } : { productId: product._id };
			await axios.post("/cart", payload);
			// refresh cart from server to ensure correct quantities / stock
			await get().getCartItems();
			toast.success("Product added to cart");
		} catch (error) {
			toast.error(error.response?.data?.message || "An error occurred");
		}
	},
	removeFromCart: async (productId, variant) => {
		try {
			await axios.delete(`/cart`, { data: { productId, variant } });
			await get().getCartItems();
			toast.success('Item removed from cart');
		} catch (error) {
			toast.error(error.response?.data?.message || 'Failed to remove item');
		}
	},
	updateQuantity: async (productId, quantity, variant) => {
		if (quantity === 0) {
			await get().removeFromCart(productId, variant);
			return;
		}

		try {
			await axios.put(`/cart/${productId}`, { quantity, variant });
			// refresh to reflect server-corrected values
			await get().getCartItems();
			toast.success('Cart updated');
		} catch (error) {
			toast.error(error.response?.data?.message || 'Failed to update quantity');
		}
	},
	calculateTotals: () => {
		const { cart, coupon } = get();
		const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
		let total = subtotal;

		if (coupon) {
			const discount = subtotal * (coupon.discountPercentage / 100);
			total = subtotal - discount;
		}

		set({ subtotal, total });
	},
}));
