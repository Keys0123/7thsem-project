import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { checkoutSuccess, createCheckoutSession, createEsewaRequest, verifyEsewaPayment, createCODOrder } from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/create-checkout-session", protectRoute, createCheckoutSession);
router.post("/checkout-success", protectRoute, checkoutSuccess);
router.post("/esewa/create-request", protectRoute, createEsewaRequest);
router.post("/esewa/verify", protectRoute, verifyEsewaPayment);
router.post("/cod", protectRoute, createCODOrder);

export default router;
