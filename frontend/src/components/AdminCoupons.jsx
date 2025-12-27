import { useEffect, useState } from "react";
import axios from "../lib/axios";

const AdminCoupons = () => {
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(10);
  const [expires, setExpires] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/coupons/all");
      setCoupons(res.data);
    } catch (err) {
      console.error("Failed to fetch coupons", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/coupons", { code, discountPercentage: discount, expirationDate: expires });
      setCode("");
      setDiscount(10);
      setExpires("");
      fetchCoupons();
    } catch (err) {
      console.error("Create coupon failed", err);
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      await axios.delete(`/coupons/${id}`);
      fetchCoupons();
    } catch (err) {
      console.error("Delete coupon failed", err);
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Manage Coupons</h2>

      <form className="space-y-2 mb-6" onSubmit={handleCreate}>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="flex-1 px-3 py-2 rounded bg-gray-900 text-white" required />
          <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} min={0} max={100} className="w-28 px-3 py-2 rounded bg-gray-900 text-white" required />
          <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="px-3 py-2 rounded bg-gray-900 text-white" required />
          <button type="submit" className="px-4 py-2 bg-emerald-500 rounded text-black">Create</button>
        </div>
      </form>

      <div>
        <h3 className="text-lg font-medium mb-2">Existing Coupons</h3>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c._id} className="border-t border-gray-700">
                  <td className="py-2">{c.code}</td>
                  <td>{c.discountPercentage}%</td>
                  <td>{new Date(c.expirationDate).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleDelete(c._id)} className="px-2 py-1 bg-red-600 rounded text-white">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminCoupons;
