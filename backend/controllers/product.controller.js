import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";

export const getAllProducts = async (req, res) => {
	try {
		const products = await Product.find({}); // find all products
		res.json({ products });
	} catch (error) {
		console.log("Error in getAllProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

async function clearSearchCaches() {
	try {
		const searchKeys = await redis.keys("search:*");
		const suggestKeys = await redis.keys("suggest:*");
		const keys = [...searchKeys, ...suggestKeys];
		if (keys.length) await redis.del(...keys);
	} catch (error) {
		console.log("error clearing search caches", error.message || error);
	}
}

export const getFeaturedProducts = async (req, res) => {
	try {
		let featuredProducts = await redis.get("featured_products");
		if (featuredProducts) {
			return res.json(JSON.parse(featuredProducts));
		}

		// if not in redis, fetch from mongodb
		// .lean() is gonna return a plain javascript object instead of a mongodb document
		// which is good for performance
		featuredProducts = await Product.find({ isFeatured: true }).lean();

		if (!featuredProducts) {
			return res.status(404).json({ message: "No featured products found" });
		}

		// store in redis for future quick access

		await redis.set("featured_products", JSON.stringify(featuredProducts));

		res.json(featuredProducts);
	} catch (error) {
		console.log("Error in getFeaturedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const createProduct = async (req, res) => {
	try {
		const { name, description, price, image, category, variants } = req.body;

		let cloudinaryResponse = null;

		if (image) {
			cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" });
		}

		const product = await Product.create({
			name,
			description,
			price,
			image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
			category,
			variants: Array.isArray(variants)
				? variants.map((v) => ({
					  sku: v.sku,
					  color: v.color,
					  size: v.size,
					  price: v.price ?? price,
					  stock: v.stock ?? 0,
					  image: v.image ?? (cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : ""),
				  }))
				: [],
		});

		// clear search/suggest caches when products change
		await clearSearchCaches();

		res.status(201).json(product);
	} catch (error) {
		console.log("Error in createProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const deleteProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);

		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		if (product.image) {
			const publicId = product.image.split("/").pop().split(".")[0];
			try {
				await cloudinary.uploader.destroy(`products/${publicId}`);
				console.log("deleted image from cloduinary");
			} catch (error) {
				console.log("error deleting image from cloduinary", error);
			}
		}

		await Product.findByIdAndDelete(req.params.id);

		// clear search/suggest caches when products change
		await clearSearchCaches();

		res.json({ message: "Product deleted successfully" });
	} catch (error) {
		console.log("Error in deleteProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getRecommendedProducts = async (req, res) => {
	try {
		const products = await Product.aggregate([
			{
				$sample: { size: 4 },
			},
			{
				$project: {
					_id: 1,
					name: 1,
					description: 1,
					image: 1,
					price: 1,
				},
			},
		]);

		res.json(products);
	} catch (error) {
		console.log("Error in getRecommendedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getProductsByCategory = async (req, res) => {
	const { category } = req.params;
	try {
		const products = await Product.find({ category });
		res.json({ products });
	} catch (error) {
		console.log("Error in getProductsByCategory controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const searchProducts = async (req, res) => {
	try {
		const { q, page = 1, limit = 20, category, minPrice: minPriceRaw, maxPrice: maxPriceRaw, sort } = req.query;

		if (!q || q.trim().length === 0) {
			return res.status(400).json({ message: "Missing search query" });
		}

		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

		// Base filter: text search
		const textFilter = { $text: { $search: q } };
		// Additional filters (sanitize prices to non-negative numbers)
		const additionalFilter = {};
		if (category) additionalFilter.category = category;

		const parseNonNeg = (v) => {
			if (v === undefined || v === null || String(v).trim() === "") return undefined;
			const n = parseFloat(v);
			if (Number.isNaN(n)) return undefined;
			return n < 0 ? 0 : n;
		};

		const minPrice = parseNonNeg(minPriceRaw);
		const maxPrice = parseNonNeg(maxPriceRaw);

		if (minPrice !== undefined || maxPrice !== undefined) {
			additionalFilter.price = {};
			if (minPrice !== undefined) additionalFilter.price.$gte = minPrice;
			if (maxPrice !== undefined) additionalFilter.price.$lte = maxPrice;
			// ensure max >= min
			if (minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice) {
				additionalFilter.price.$lte = minPrice;
			}
		}

		const filter = { ...textFilter, ...additionalFilter };

		let total = await Product.countDocuments(filter);

		let query = Product.find(filter, { score: { $meta: "textScore" } }).select(
			"name description price image category"
		);

		// sorting
		if (sort === "price_asc") query = query.sort({ price: 1 });
		else if (sort === "price_desc") query = query.sort({ price: -1 });
		else query = query.sort({ score: { $meta: "textScore" } });

		let products = await query.skip((pageNum - 1) * pageSize).limit(pageSize);

		// try reading from cache first
		const cacheKey = `search:${q}:${pageNum}:${pageSize}:${category || ''}:${minPrice || ''}:${maxPrice || ''}:${sort || ''}`;
		const cached = await redis.get(cacheKey);
		if (cached) {
			const parsed = JSON.parse(cached);
			return res.json(parsed);
		}

		// if no results from text search, fall back to a case-insensitive partial regex search
		if ((!products || products.length === 0) && q && q.trim().length > 0) {
			const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = new RegExp(escaped, "i");
			const regexFilter = { $or: [{ name: regex }, { description: regex }] };
			// merge additional filters (category/price) into regexFilter
			if (category) regexFilter.category = category;
			if (minPrice !== undefined || maxPrice !== undefined) {
				regexFilter.price = {};
				if (minPrice !== undefined) regexFilter.price.$gte = minPrice;
				if (maxPrice !== undefined) regexFilter.price.$lte = maxPrice;
				if (minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice) {
					regexFilter.price.$lte = minPrice;
				}
			}

			total = await Product.countDocuments(regexFilter);
			products = await Product.find(regexFilter)
				.select("name description price image category")
				.skip((pageNum - 1) * pageSize)
				.limit(pageSize)
				.sort(sort === "price_asc" ? { price: 1 } : sort === "price_desc" ? { price: -1 } : { createdAt: -1 });
		}

		const result = { products, total, page: pageNum, pages: Math.ceil(total / pageSize) };
		// cache short-lived
		try {
			await redis.set(cacheKey, JSON.stringify(result), "EX", 60);
		} catch (e) {
			console.log("failed to set search cache", e.message || e);
		}

		res.json(result);
	} catch (error) {
		console.log("Error in searchProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const suggestProducts = async (req, res) => {
	try {
		const { q, limit = 6 } = req.query;
		if (!q || q.trim().length === 0) return res.json([]);

		const cacheKey = `suggest:${q}:${limit}`;
		try {
			const cached = await redis.get(cacheKey);
			if (cached) return res.json(JSON.parse(cached));
		} catch (e) {
			console.log("failed to read suggest cache", e.message || e);
		}

		// simple prefix regex search on name for quick suggestions
		const escaped = q.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
		const regex = new RegExp("^" + escaped, "i");
		const suggestions = await Product.find({ name: regex })
			.select("name image price")
			.limit(parseInt(limit, 10));

		try {
			await redis.set(cacheKey, JSON.stringify(suggestions), "EX", 30);
		} catch (e) {
			console.log("failed to set suggest cache", e.message || e);
		}

		res.json(suggestions);
	} catch (error) {
		console.log("Error in suggestProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const toggleFeaturedProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);
		if (product) {
			product.isFeatured = !product.isFeatured;
			const updatedProduct = await product.save();
			await updateFeaturedProductsCache();
			res.json(updatedProduct);
		} else {
			res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		console.log("Error in toggleFeaturedProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

async function updateFeaturedProductsCache() {
	try {
		// The lean() method  is used to return plain JavaScript objects instead of full Mongoose documents. This can significantly improve performance

		const featuredProducts = await Product.find({ isFeatured: true }).lean();
		await redis.set("featured_products", JSON.stringify(featuredProducts));
	} catch (error) {
		console.log("error in update cache function");
	}
}
