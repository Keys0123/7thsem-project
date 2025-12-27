import { useState, useEffect } from "react";
import { useUserStore } from "../stores/useUserStore";
import axios from "../lib/axios";
import LoadingSpinner from "../components/LoadingSpinner";
import { toast } from "react-hot-toast";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function ProfilePage() {
  const { user, updateProfile } = useUserStore();
  const [form, setForm] = useState({ name: "", phone: "", address: "", avatarPreview: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.name || "", phone: user.phone || "", address: user.address || "", avatarPreview: user.avatar || "" });
  }, [user]);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const res = await axios.get('/orders/my');
        setOrders(res.data || []);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load orders');
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, []);

  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    const b = await fileToBase64(f);
    setForm((s) => ({ ...s, avatarPreview: b }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const avatarBase64 = avatarFile ? await fileToBase64(avatarFile) : form.avatarPreview || null;
      await updateProfile({ name: form.name, phone: form.phone, address: form.address, avatarBase64 });
      toast.success('Profile updated');
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    }
  };

  if (!user) return <div className='p-6'>Please log in to view profile.</div>;

  return (
    <div className='container mx-auto p-6'>
      <h2 className='text-2xl font-semibold mb-4'>Your Profile</h2>
      <form onSubmit={onSubmit} className='max-w-xl bg-gray-800 p-4 rounded shadow'>
        <div className='flex items-center gap-4 mb-4'>
          <img src={form.avatarPreview || '/placeholder-avatar.png'} alt='avatar' className='w-20 h-20 object-cover rounded-full' />
          <div>
            <label className='block text-sm text-gray-300'>Change avatar</label>
            <input type='file' accept='image/*' onChange={onFileChange} className='mt-2 text-sm' />
          </div>
        </div>

        <label className='block text-sm text-gray-300'>Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className='w-full mb-3 mt-1 p-2 rounded bg-gray-900' />

        <label className='block text-sm text-gray-300'>Phone</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className='w-full mb-3 mt-1 p-2 rounded bg-gray-900' />

        <label className='block text-sm text-gray-300'>Delivery Address</label>
        <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className='w-full mb-3 mt-1 p-2 rounded bg-gray-900' rows={3} />

        <div className='flex gap-3'>
          <button className='bg-emerald-600 px-4 py-2 rounded'>Save</button>
        </div>
      </form>

      <h3 className='text-xl font-semibold mt-8 mb-4'>Order History</h3>
      {loadingOrders ? (
        <LoadingSpinner />
      ) : (
        <div className='space-y-3'>
          {orders.length === 0 && <div className='text-gray-400'>No orders yet.</div>}
          {orders.map((o) => (
            <div key={o._id} className='bg-gray-800 p-3 rounded'>
              <div className='flex justify-between'>
                <div>
                  <div className='font-medium'>Order #{o._id}</div>
                  <div className='text-sm text-gray-400'>Status: {o.status || 'N/A'}</div>
                </div>
                <div className='text-right'>
                  <div className='font-semibold'>Rs.{o.totalPrice}</div>
                  <div className='text-sm text-gray-400'>{new Date(o.createdAt).toLocaleString()}</div>
                </div>
              </div>

              <div className='mt-3 space-y-2'>
                {o.products && o.products.length > 0 ? (
                  o.products.map((p) => (
                    <div key={p._id || (p.product && p.product._id)} className='flex items-center gap-3 bg-gray-900 p-2 rounded'>
                      <img src={(p.product && p.product.image) || '/placeholder-product.png'} alt={(p.product && p.product.name) || 'product'} className='w-14 h-14 object-cover rounded' />
                      <div className='flex-1'>
                        <div className='font-medium'>{(p.product && p.product.name) || 'Product'}</div>
                        <div className='text-sm text-gray-400'>Qty: {p.quantity} × Rs.{p.price}</div>
                      </div>
                      <div className='font-semibold'>Rs.{p.quantity * p.price}</div>
                    </div>
                  ))
                ) : (
                  <div className='text-gray-400'>No items recorded for this order.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
