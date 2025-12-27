import mongoose from "mongoose";

export const connectDB = async () => {
	try {
		const conn = await mongoose.connect(process.env.MONGO_URI);
		console.log(`MongoDB connected: ${conn.connection.host}`);
		// remove any lingering unique index on `userId` in coupons collection
		try {
			const coll = mongoose.connection.collection('coupons');
			if (coll) {
				await coll.dropIndex('userId_1').catch(() => {});
			}
		} catch (err) {
			// ignore errors related to index removal
		}
	} catch (error) {
		console.log("Error connecting to MONGODB", error.message);
		process.exit(1);
	}
};
