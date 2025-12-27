import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useProductStore } from "../stores/useProductStore";
import ProductCard from "../components/ProductCard";

const SearchResults = () => {
    const location = useLocation();
    const { searchProducts } = useProductStore();
    const [loading, setLoading] = useState(false);
    const [resultsMeta, setResultsMeta] = useState(null);
    const [category, setCategory] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sort, setSort] = useState("");
    const [page, setPage] = useState(1);

    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";

    useEffect(() => {
        if (!q) return;

        let mounted = true;
        const fetch = async () => {
            setLoading(true);
            const data = await searchProducts(q, { page, limit: 12, category: category || undefined, minPrice: minPrice || undefined, maxPrice: maxPrice || undefined, sort: sort || undefined });
            if (!mounted) return;
            setResultsMeta(data);
            setLoading(false);
        };
        fetch();
        return () => (mounted = false);
    }, [q, searchProducts, page, category, minPrice, maxPrice, sort]);

    return (
        <div className='relative min-h-screen text-white overflow-hidden pt-24'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
                <h2 className='text-2xl font-semibold text-emerald-400 mb-4'>Search results for "{q}"</h2>

                <div className='mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3'>
                    <input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder='Category'
                        className='px-3 py-2 rounded-md bg-gray-800 text-sm text-white outline-none border border-emerald-700'
                    />
                    <input
                        value={minPrice}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") return setMinPrice("");
                            const n = Number(v);
                            if (!Number.isNaN(n) && n >= 0) setMinPrice(String(n));
                        }}
                        placeholder='Min price'
                        type='number'
                        min='0'
                        className='px-3 py-2 rounded-md bg-gray-800 text-sm text-white outline-none border border-emerald-700'
                    />
                    <input
                        value={maxPrice}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") return setMaxPrice("");
                            const n = Number(v);
                            if (!Number.isNaN(n) && n >= 0) setMaxPrice(String(n));
                        }}
                        placeholder='Max price'
                        type='number'
                        min='0'
                        className='px-3 py-2 rounded-md bg-gray-800 text-sm text-white outline-none border border-emerald-700'
                    />
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className='px-3 py-2 rounded-md bg-gray-800 text-sm text-white outline-none border border-emerald-700'
                    >
                        <option value=''>Sort: Relevance</option>
                        <option value='price_asc'>Price: Low to High</option>
                        <option value='price_desc'>Price: High to Low</option>
                    </select>
                </div>

                <div className='mb-6 flex gap-2'>
                    <button
                        className='bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-md'
                        onClick={() => {
                            setPage(1);
                            // trigger useEffect by updating a key (page changed already)
                        }}
                    >
                        Apply
                    </button>
                    <button
                        className='bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md'
                        onClick={() => {
                            setCategory("");
                            setMinPrice("");
                            setMaxPrice("");
                            setSort("");
                            setPage(1);
                        }}
                    >
                        Reset
                    </button>
                </div>

                {loading && <div>Loading...</div>}

                {!loading && resultsMeta?.products?.length === 0 && (
                    <div className='text-gray-300'>No products found.</div>
                )}

                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {resultsMeta?.products?.map((product) => (
                        <ProductCard key={product._id} product={product} />
                    ))}
                </div>

                {resultsMeta?.pages > 1 && (
                    <div className='mt-8 flex items-center justify-center gap-3'>
                        <button
                            disabled={page <= 1}
                            onClick={async () => {
                                const newPage = Math.max(1, page - 1);
                                setPage(newPage);
                                setLoading(true);
                                const data = await searchProducts(q, { page: newPage, limit: 12, category: category || undefined, minPrice: minPrice || undefined, maxPrice: maxPrice || undefined, sort: sort || undefined });
                                setResultsMeta(data);
                                setLoading(false);
                            }}
                            className='px-3 py-1 rounded-md bg-gray-700'
                        >
                            Prev
                        </button>
                        <div className='text-gray-300'>Page {resultsMeta?.page} of {resultsMeta?.pages}</div>
                        <button
                            disabled={page >= resultsMeta?.pages}
                            onClick={async () => {
                                const newPage = Math.min(resultsMeta.pages, page + 1);
                                setPage(newPage);
                                setLoading(true);
                                const data = await searchProducts(q, { page: newPage, limit: 12, category: category || undefined, minPrice: minPrice || undefined, maxPrice: maxPrice || undefined, sort: sort || undefined });
                                setResultsMeta(data);
                                setLoading(false);
                            }}
                            className='px-3 py-1 rounded-md bg-gray-700'
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchResults;
