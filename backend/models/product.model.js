import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		price: {
			type: Number,
			min: 0,
			required: true,
		},
		image: {
			type: String,
			required: [true, "Image is required"],
		},
		category: {
			type: String,
			required: true,
		},
		isFeatured: {
			type: Boolean,
			default: false,
		},
		variants: [
			{
				sku: { type: String },
				color: { type: String },
				size: { type: String },
				price: { type: Number, min: 0 },
				stock: { type: Number, default: 0, min: 0 },
				image: { type: String },
			},
		],
	},
	{ timestamps: true }
);

// create text index for name and description to support full-text search
productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model("Product", productSchema);

export default Product;
