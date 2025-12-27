import { ShoppingCart, UserPlus, LogIn, LogOut, Lock, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import axios from "../lib/axios";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";
import { useState } from "react";

const Navbar = () => {
	const { user, logout } = useUserStore();
	const [searchQuery, setSearchQuery] = useState("");
	const navigate = useNavigate();
	const isAdmin = user?.role === "admin";
	const { cart } = useCartStore();
	const [suggestions, setSuggestions] = useState([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const formRef = useRef(null);

	useEffect(() => {
		if (!searchQuery || searchQuery.trim().length < 2) {
			setSuggestions([]);
			setShowSuggestions(false);
			return;
		}

		const t = setTimeout(async () => {
			try {
				const res = await axios.get(`/products/suggest?q=${encodeURIComponent(searchQuery.trim())}`);
				setSuggestions(res.data || []);
				setShowSuggestions(true);
				setActiveIndex(-1);
			} catch (e) {
				setSuggestions([]);
				setShowSuggestions(false);
			}
		}, 300);

		return () => clearTimeout(t);
	}, [searchQuery]);

	useEffect(() => {
		const onDocClick = (e) => {
			if (formRef.current && !formRef.current.contains(e.target)) {
				setShowSuggestions(false);
			}
		};
		document.addEventListener("click", onDocClick);
		return () => document.removeEventListener("click", onDocClick);
	}, []);

	const onKeyDown = (e) => {
		if (!showSuggestions || suggestions.length === 0) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex((i) => Math.max(i - 1, 0));
		} else if (e.key === "Enter") {
			if (activeIndex >= 0 && activeIndex < suggestions.length) {
				const s = suggestions[activeIndex];
				navigate(`/search?q=${encodeURIComponent(s.name)}`);
				setShowSuggestions(false);
			} else if (searchQuery.trim()) {
				navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
				setShowSuggestions(false);
			}
		} else if (e.key === "Escape") {
			setShowSuggestions(false);
		}
	};

	return (
		<header className='fixed top-0 left-0 w-full bg-gray-900 bg-opacity-90 backdrop-blur-md shadow-lg z-40 transition-all duration-300 border-b border-emerald-800'>
			<div className='container mx-auto px-4 py-3'>
				<div className='flex flex-wrap justify-between items-center'>
					<Link to='/' className='text-2xl font-bold text-emerald-400 items-center space-x-2 flex'>
						KEYS Store
					</Link>

					<form
						className='hidden sm:flex items-center gap-2 mr-4'
						onSubmit={(e) => {
							e.preventDefault();
							if (!searchQuery.trim()) return;
							navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
						}}
					>
						<div className='relative' ref={formRef}>
							<input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onKeyDown={onKeyDown}
								placeholder='Search products...'
								className='px-3 py-2 rounded-md bg-gray-800 text-sm text-white outline-none border border-emerald-700'
							/>

							{showSuggestions && suggestions.length > 0 && (
								<div className='absolute left-0 top-full mt-1 w-80 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50'>
									{suggestions.map((s, idx) => (
										<div
											key={s._id}
											onMouseDown={() => {
												navigate(`/search?q=${encodeURIComponent(s.name)}`);
												setShowSuggestions(false);
											}}
											className={`px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-3 ${idx === activeIndex ? 'bg-gray-700' : ''}`}
										>
											<img src={s.image} alt={s.name} className='w-10 h-10 object-cover rounded' />
											<div>
												<div className='text-sm font-medium'>
													{/* highlight matched portion */}
													{(() => {
														const q = searchQuery.trim();
														if (!q) return s.name;
														const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")})`, 'i');
														const parts = s.name.split(re);
														return parts.map((p, i) =>
															re.test(p) ? (
																<span key={i} className='bg-emerald-600 px-0.5 rounded'>
																	{p}
																</span>
															) : (
																<span key={i}>{p}</span>
															)
														);
													})()}
												</div>
												<div className='text-xs text-gray-400'>Rs.{s.price}</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
						<button
							type='submit'
							className='bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-md flex items-center'
						>
							<Search size={16} />
						</button>
					</form>

					<nav className='flex flex-wrap items-center gap-4'>
						{user && (
							<Link to={'/profile'} className='flex items-center gap-2 text-gray-300 hover:text-emerald-400'>
								<img src={user.avatar || '/placeholder-avatar.png'} alt='me' className='w-8 h-8 rounded-full object-cover border border-emerald-700' />
								<span className='hidden sm:inline'>{user.name}</span>
							</Link>
						)}
						<Link
							to={"/"}
							className='text-gray-300 hover:text-emerald-400 transition duration-300
					 ease-in-out'
						>
							Home
						</Link>
						{user && !isAdmin && (
							<Link
								to={"/cart"}
								className='relative group text-gray-300 hover:text-emerald-400 transition duration-300 
							ease-in-out'
							>
								<ShoppingCart className='inline-block mr-1 group-hover:text-emerald-400' size={20} />
								<span className='hidden sm:inline'>Cart</span>
								{cart.length > 0 && (
									<span
										className='absolute -top-2 -left-2 bg-emerald-500 text-white rounded-full px-2 py-0.5 
									text-xs group-hover:bg-emerald-400 transition duration-300 ease-in-out'
									>
										{cart.length}
									</span>
								)}
							</Link>
						)}
						{isAdmin && (
							<Link
								className='bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded-md font-medium
								 transition duration-300 ease-in-out flex items-center'
								to={"/secret-dashboard"}
							>
								<Lock className='inline-block mr-1' size={18} />
								<span className='hidden sm:inline'>Dashboard</span>
							</Link>
						)}

						{user ? (
							<button
								className='bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 
						rounded-md flex items-center transition duration-300 ease-in-out'
								onClick={logout}
							>
								<LogOut size={18} />
								<span className='hidden sm:inline ml-2'>Log Out</span>
							</button>
						) : (
							<>
								<Link
									to={"/signup"}
									className='bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 
									rounded-md flex items-center transition duration-300 ease-in-out'
								>
									<UserPlus className='mr-2' size={18} />
									Sign Up
								</Link>
								<Link
									to={"/login"}
									className='bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 
									rounded-md flex items-center transition duration-300 ease-in-out'
								>
									<LogIn className='mr-2' size={18} />
									Login
								</Link>
							</>
						)}
					</nav>
				</div>
			</div>
		</header>
	);
};
export default Navbar;
