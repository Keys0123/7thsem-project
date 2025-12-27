import Product from "../models/product.model.js";

export const getCartProducts = async (req, res) => {
	try {
		// populate product info for cart items
		const cartItems = await Promise.all(
			req.user.cartItems.map(async (ci) => {
				const product = await Product.findById(ci.product).lean();
				if (!product) return null;
				// find variant details if provided
				const variant = ci.variant ? product.variants.find((v) => v.sku === ci.variant || String(v._id) === String(ci.variant)) : null;
				return {
					_id: product._id,
					name: product.name,
					image: (variant && variant.image) || product.image,
					price: (variant && variant.price) || product.price,
					quantity: ci.quantity,
					variant: variant
						? { sku: variant.sku, color: variant.color, size: variant.size }
						: null,
				};
			})
		);

		res.json(cartItems.filter(Boolean));
	} catch (error) {
		console.log("Error in getCartProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const addToCart = async (req, res) => {
	try {
		const { productId, variant } = req.body;
		const user = req.user;

		// fetch product to validate stock
		const product = await Product.findById(productId).lean();
		if (!product) return res.status(404).json({ message: "Product not found" });

		let available = null;
		let variantObj = null;
		const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
		if (hasVariants) {
			if (!variant) {
				// no variant specified but product has variants -> cannot proceed
				return res.status(400).json({ message: "Variant must be specified for this product" });
			}
			variantObj = product.variants.find((v) => v.sku === variant || String(v._id) === String(variant));
			if (!variantObj) return res.status(404).json({ message: "Variant not found" });
			available = variantObj.stock != null ? variantObj.stock : 0;
		} else {
			// product has no variants - if product.stock is defined use it, otherwise treat as available
			available = product.stock != null ? product.stock : Number.POSITIVE_INFINITY;
		}

		const existingItem = user.cartItems.find((item) => String(item.product) === String(productId) && (item.variant || null) === (variant || null));
		if (existingItem) {
			if (existingItem.quantity + 1 > available) {
				return res.status(400).json({ message: "Cannot add more than available stock" });
			}
			existingItem.quantity += 1;
		} else {
			if (1 > available) {
				return res.status(400).json({ message: "Product is out of stock" });
			}
			user.cartItems.push({ product: productId, quantity: 1, variant: variant || null });
		}

		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		console.log("Error in addToCart controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const removeAllFromCart = async (req, res) => {
	try {
		const { productId, variant } = req.body;
		const user = req.user;
		if (!productId) {
			user.cartItems = [];
		} else if (variant) {
			user.cartItems = user.cartItems.filter((item) => !(String(item.product) === String(productId) && item.variant === variant));
		} else {
			user.cartItems = user.cartItems.filter((item) => String(item.product) !== String(productId));
		}
		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateQuantity = async (req, res) => {
	try {
		const { id: productId } = req.params;
		const { quantity, variant } = req.body;
		const user = req.user;

		const existingItem = user.cartItems.find((item) => String(item.product) === String(productId) && (variant ? item.variant === variant : !item.variant));

		if (!existingItem) return res.status(404).json({ message: "Product not found in cart" });

		// If quantity is zero, remove the item
		if (quantity === 0) {
			user.cartItems = user.cartItems.filter((item) => !(String(item.product) === String(productId) && (variant ? item.variant === variant : !item.variant)));
			await user.save();
			return res.json(user.cartItems);
		}

		// validate against stock
		const product = await Product.findById(productId).lean();
		if (!product) return res.status(404).json({ message: "Product not found" });

		let available = null;
		const hasVariants2 = Array.isArray(product.variants) && product.variants.length > 0;
		if (hasVariants2) {
			if (!variant) return res.status(400).json({ message: "Variant must be specified for this product" });
			const variantObj = product.variants.find((v) => v.sku === variant || String(v._id) === String(variant));
			if (!variantObj) return res.status(404).json({ message: "Variant not found" });
			available = variantObj.stock != null ? variantObj.stock : 0;
		} else {
			available = product.stock != null ? product.stock : Number.POSITIVE_INFINITY;
		}

		if (Number.isFinite(available) && quantity > available) {
			return res.status(400).json({ message: "Requested quantity exceeds available stock" });
		}

		existingItem.quantity = quantity;
		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		console.log("Error in updateQuantity controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
