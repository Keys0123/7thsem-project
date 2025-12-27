import toast from "react-hot-toast";
import { ShoppingCart } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";
import { useState } from "react";

const ProductCard = ({ product }) => {
	const { user } = useUserStore();
	const { addToCart } = useCartStore();
	const [selectedVariant, setSelectedVariant] = useState(null);

	const handleAddToCart = () => {
		if (!user) {
			toast.error("Please login to add products to cart", { id: "login" });
			return;
		}

		if (product.variants && product.variants.length > 0 && !selectedVariant) {
			toast.error("Please select a variant before adding to cart");
			return;
		}

		addToCart({ _id: product._id, variant: selectedVariant });
	};

	return (
		<div className='flex w-full relative flex-col overflow-hidden rounded-lg border border-gray-700 shadow-lg'>
			<div className='relative mx-3 mt-3 flex h-60 overflow-hidden rounded-xl'>
				<img className='object-cover w-full' src={product.image} alt='product image' />
				<div className='absolute inset-0 bg-black bg-opacity-20' />
			</div>

			<div className='mt-4 px-5 pb-5'>
				<h5 className='text-xl font-semibold tracking-tight text-white'>{product.name}</h5>
				<div className='mt-2 mb-5 flex items-center justify-between'>
					<p>
						<span className='text-3xl font-bold text-emerald-400'>Rs.{product.price}</span>
					</p>
				</div>

				{product.variants && product.variants.length > 0 && (
					<div className='mb-4'>
						<div className='text-sm text-gray-300 mb-2'>Select variant</div>
						<div className='flex gap-2 flex-wrap'>
							{product.variants.map((v) => (
								<button
									key={v.sku || `${v.color}-${v.size}`}
									onClick={() => setSelectedVariant(v.sku ?? v._id)}
									className={`px-3 py-1 rounded-md border ${
										(selectedVariant === v.sku || selectedVariant === String(v._id))
											? "border-emerald-400 bg-gray-700"
											: "border-gray-700"
									}`}
								>
									<div className='text-sm'>{v.color || v.size}</div>
									<div className='text-xs text-gray-400'>Rs.{v.price ?? product.price}</div>
								</button>
							))}
						</div>
					</div>
				)}
				<button
					className='flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-center text-sm font-medium
					 text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300'
					onClick={handleAddToCart}
				>
					<ShoppingCart size={22} className='mr-2' />
					Add to cart
				</button>
			</div>
		</div>
	);
};
export default ProductCard;
