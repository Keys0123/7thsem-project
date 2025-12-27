import { motion } from "framer-motion";
import { useState } from "react";
import { useCartStore } from "../stores/useCartStore";
import { Link } from "react-router-dom";
import { MoveRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";

const OrderSummary = () => {
	const { total, subtotal, coupon, isCouponApplied, cart, clearCart } = useCartStore();
	const navigate = useNavigate();

	const savings = subtotal - total;
	const formattedSubtotal = subtotal.toFixed(2);
	const formattedTotal = total.toFixed(2);
	const formattedSavings = savings.toFixed(2);



	const handleEsewaPayment = async () => {
		try {
			console.log("Starting eSewa payment with cart:", cart);
			const res = await axios.post("/payments/esewa/create-request", {
				products: cart,
				couponCode: coupon ? coupon.code : null,
			});

			console.log("eSewa response:", res.data);
			const { esewaUrl, form } = res.data;

			if (!esewaUrl || !form) {
				console.error("Missing esewaUrl or form in response");
				alert("Error: Could not get eSewa form data");
				return;
			}

			// create a form and submit to eSewa
			const el = document.createElement("form");
			el.method = "POST";
			el.action = esewaUrl;
			el.style.display = "none";

			Object.keys(form).forEach((key) => {
				const input = document.createElement("input");
				input.type = "hidden";
				input.name = key;
				input.value = form[key];
				el.appendChild(input);
			});

			document.body.appendChild(el);
			console.log("Submitting form to:", esewaUrl);
			el.submit();
		} catch (error) {
			console.error("eSewa checkout error:", error);
			alert("Error processing eSewa payment: " + (error.response?.data?.message || error.message));
		}
	};

	const [showCODForm, setShowCODForm] = useState(false);
	const [codName, setCodName] = useState("");
	const [codAddress, setCodAddress] = useState("");
	const [codPhone, setCodPhone] = useState("");

	const handleCODSubmit = async (e) => {
		e.preventDefault();
		try {
			const res = await axios.post("/payments/cod", {
				products: cart,
				totalAmount: total,
				shippingInfo: { name: codName, address: codAddress, phone: codPhone },
				couponCode: coupon ? coupon.code : null,
			});

			const { orderId } = res.data;
			clearCart();
			navigate(`/purchase-success?orderId=${orderId}`);
		} catch (err) {
			console.error("COD error:", err);
		}
	};

	return (
		<motion.div
			className='space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-sm sm:p-6'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
		>
			<p className='text-xl font-semibold text-emerald-400'>Order summary</p>

			<div className='space-y-4'>
				<div className='space-y-2'>
					<dl className='flex items-center justify-between gap-4'>
						<dt className='text-base font-normal text-gray-300'>Original price</dt>
						<dd className='text-base font-medium text-white'>Rs.{formattedSubtotal}</dd>
					</dl>

					{savings > 0 && (
						<dl className='flex items-center justify-between gap-4'>
							<dt className='text-base font-normal text-gray-300'>Savings</dt>
							<dd className='text-base font-medium text-emerald-400'>-Rs.{formattedSavings}</dd>
						</dl>
					)}

					{coupon && isCouponApplied && (
						<dl className='flex items-center justify-between gap-4'>
							<dt className='text-base font-normal text-gray-300'>Coupon ({coupon.code})</dt>
							<dd className='text-base font-medium text-emerald-400'>-{coupon.discountPercentage}%</dd>
						</dl>
					)}
					<dl className='flex items-center justify-between gap-4 border-t border-gray-600 pt-2'>
						<dt className='text-base font-bold text-white'>Total</dt>
						<dd className='text-base font-bold text-emerald-400'>Rs.{formattedTotal}</dd>
					</dl>
				</div>



				<motion.button
				className='flex w-full items-center justify-center rounded-lg border border-emerald-600 px-5 py-2.5 text-sm font-medium text-white bg-transparent focus:outline-none'
				initial={{ backgroundColor: 'transparent' }}
				whileHover={{ scale: 1.02, backgroundColor: 'rgb(5, 150, 105)' }}
				whileTap={{ scale: 0.98, backgroundColor: 'transparent' }}
				onClick={handleEsewaPayment}
			>
				Pay with eSewa
			</motion.button>

			<div className='mt-2'>
				<motion.button
					className='w-full mt-2 rounded-lg border border-amber-500 text-white px-4 py-2 text-sm bg-transparent'
					initial={{ backgroundColor: 'transparent' }}
						whileHover={{ scale: 1.02, backgroundColor: 'rgb(217, 119, 6)' }}
						whileTap={{ scale: 0.98, backgroundColor: 'transparent' }}
						onClick={() => setShowCODForm((s) => !s)}
					>
						Cash on Delivery
					</motion.button>
					{showCODForm && (
						<form className='mt-3 space-y-2' onSubmit={handleCODSubmit}>
							<input required value={codName} onChange={(e) => setCodName(e.target.value)} placeholder='Full name' className='w-full px-3 py-2 rounded bg-gray-900 text-white' />
							<input required value={codAddress} onChange={(e) => setCodAddress(e.target.value)} placeholder='Delivery address' className='w-full px-3 py-2 rounded bg-gray-900 text-white' />
							<input required value={codPhone} onChange={(e) => setCodPhone(e.target.value)} placeholder='Phone number' className='w-full px-3 py-2 rounded bg-gray-900 text-white' />
							<button type='submit' className='w-full mt-1 rounded-lg bg-amber-500 px-4 py-2 text-sm text-black'>Place COD Order</button>
						</form>
					)}
				</div>

				<div className='flex items-center justify-center gap-2'>
					<span className='text-sm font-normal text-gray-400'>or</span>
					<Link
						to='/'
						className='inline-flex items-center gap-2 text-sm font-medium text-emerald-400 underline hover:text-emerald-300 hover:no-underline'
					>
						Continue Shopping
						<MoveRight size={16} />
					</Link>
				</div>
			</div>
		</motion.div>
	);
};
export default OrderSummary;
