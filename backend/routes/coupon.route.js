import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { getCoupon, validateCoupon, createCoupon, listCoupons, deleteCoupon } from "../controllers/coupon.controller.js";

const router = express.Router();

// user endpoints
router.get("/", protectRoute, getCoupon);
router.post("/validate", protectRoute, validateCoupon);

// admin endpoints
router.post("/", protectRoute, adminRoute, createCoupon);
router.get("/all", protectRoute, adminRoute, listCoupons);
router.delete("/:id", protectRoute, adminRoute, deleteCoupon);

export default router;
