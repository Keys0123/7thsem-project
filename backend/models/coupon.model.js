import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
		},
		discountPercentage: {
			type: Number,
			required: true,
			min: 0,
			max: 100,
		},
		expirationDate: {
			type: Date,
			required: true,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			// optional: admin-created coupons will have no userId
			required: false,
		},
	},
	{
		timestamps: true,
	}
);

// create TTL index so coupons are removed automatically when `expirationDate` passes
couponSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 });

const Coupon = mongoose.model("Coupon", couponSchema);

// attempt to drop any old unique index on userId that might exist from earlier schema
// (leftover indexes in the database can cause duplicate-key errors when creating multiple coupons)
try {
	// index name is typically 'userId_1' when created automatically
	Coupon.collection.dropIndex("userId_1").catch(() => {});
} catch (err) {
	// ignore errors here - if index doesn't exist or DB not connected yet
}

export default Coupon;
