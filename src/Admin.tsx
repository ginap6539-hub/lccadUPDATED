import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  LayoutDashboard, 
  MessageSquare, 
  ShoppingBag, 
  Bell, 
  LogOut, 
  Plus, 
  ThumbsUp, 
  Share2, 
  Send,
  Camera,
  Search,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  Settings,
  MapPin,
  Globe,
  Info,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Home,
  Tv,
  Store,
  Users as UsersIcon,
  User as UserIcon,
  Edit,
  Upload,
  Cpu,
  Zap,
  Shield,
  Activity,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Member, Product } from './types';
import { getSupabase } from './supabaseClient';
import { subscribeToAdminNotifications } from './services/api';
import PromoteMemberModal from './components/PromoteMemberModal';

// Helper for image uploads to Supabase Storage
const uploadImage = async (file: File, bucket: string = 'lccad') => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client is not initialized");
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError, data } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
};

const Avatar = ({ src, name, size = "md", online = false }: { src?: string, name: string, size?: "sm" | "md" | "lg" | "xl", online?: boolean }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-24 h-24 text-2xl"
  };

  return (
    <div className="relative shrink-0">
      <div className={`${sizeClasses[size]} bg-zinc-200 rounded-full flex items-center justify-center font-bold text-zinc-600 overflow-hidden border border-zinc-100 robot-glow`}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      {online && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const supabase = getSupabase();

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [promotingMember, setPromotingMember] = useState<Member | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'products' | 'messages'>('map');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', stock: '' });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin/members') setActiveTab('list');
    else if (path === '/admin/products') setActiveTab('products');
    else if (path === '/admin/messages') setActiveTab('messages');
    else setActiveTab('map');
  }, [location]);

  useEffect(() => {
    if (!supabase) return;
    supabase.from('members').select('*').then(({ data }) => { if (data) setMembers(data); });
    supabase.from('products').select('*').then(({ data }) => { if (data) setProducts(data); });
    
    const cleanupNotif = subscribeToAdminNotifications((notif) => {
      setNotifications(prev => [notif, ...prev]);
      if (notif.type === 'NEW_REGISTRATION') {
        setMembers(prev => [notif.data, ...prev]);
      }
      if (notif.type === 'STOCK_ALERT') {
        // Play buzzer sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
        audio.play().catch(() => {});
      }
    });

    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'members' }, (payload) => {
        setMembers(prev => prev.map(m => m.id === payload.new.id ? payload.new as Member : m));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload) => {
        setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new as Product : p));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, (payload) => {
        setProducts(prev => [payload.new as Product, ...prev]);
      })
      .subscribe();

    return () => {
      cleanupNotif();
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    try {
      let image_url = null;
      if (productImage) {
        image_url = await uploadImage(productImage);
      }

      const { data: product, error } = await supabase
        .from('products')
        .insert([{ 
          name: newProduct.name, 
          description: newProduct.description, 
          price: Number(newProduct.price), 
          stock: Number(newProduct.stock), 
          image_url 
        }])
        .select()
        .single();

      if (error) throw error;

      if (product && product.stock === 0) {
        await supabase.channel('admin-notifications').send({
          type: 'broadcast',
          event: 'admin-notification',
          payload: {
            type: 'STOCK_ALERT',
            message: `CRITICAL: Product "${product.name}" is OUT OF STOCK!`,
            data: { productId: product.id, name: product.name }
          }
        });
      }

      setNewProduct({ name: '', description: '', price: '', stock: '' });
      setProductImage(null);
      alert('Product added successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !supabase) return;

    try {
      let image_url = editingProduct.image_url;
      if (productImage) {
        image_url = await uploadImage(productImage);
      }

      const { error } = await supabase
        .from('products')
        .update({
          name: editingProduct.name,
          description: editingProduct.description,
          price: Number(editingProduct.price),
          stock: Number(editingProduct.stock),
          image_url
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      setEditingProduct(null);
      setProductImage(null);
      alert('Product updated successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const updateStock = async (id: number, newStock: number) => {
    if (!supabase) return;
    const { data: product, error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', id)
      .select()
      .single();

    if (!error && product) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
      if (newStock === 0) {
        await supabase.channel('admin-notifications').send({
          type: 'broadcast',
          event: 'admin-notification',
          payload: {
            type: 'STOCK_ALERT',
            message: `CRITICAL: Product "${product.name}" is OUT OF STOCK!`,
            data: { productId: id, name: product.name }
          }
        });
      }
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg || !supabase) return;
    const { error } = await supabase
      .from('messages')
      .insert([{ sender_id: 0, receiver_id: 0, content: broadcastMsg }]);
    
    if (!error) {
      setBroadcastMsg('');
      alert('Broadcast sent to all members!');
    }
  };

  if (!supabase) return null;

  return (
    <div className="min-h-screen bg-[#f0f2f5] pt-14 flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative ml-[72px]">
        <div className="p-6 space-y-6">
          <header className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 robot-scan overflow-hidden">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
                <Activity className="text-[#1877F2]" />
                System Monitoring
              </h1>
              <p className="text-zinc-500 tech-font uppercase text-xs tracking-widest mt-1">Status: Operational // Real-time Sync Active</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-zinc-50 px-6 py-3 rounded-xl border border-zinc-100 flex items-center gap-4 robot-glow">
                <Users size={24} className="text-[#1877F2]" />
                <div>
                  <div className="text-2xl font-bold">{members.length}</div>
                  <div className="text-[10px] text-zinc-400 uppercase font-bold">Total Nodes</div>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex gap-2 p-1 bg-white w-fit rounded-xl shadow-sm border border-zinc-200">
                <button 
                  onClick={() => navigate('/admin')}
                  className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'map' ? 'bg-[#1877F2] text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  <Globe size={18} /> Map
                </button>
                <button 
                  onClick={() => navigate('/admin/members')}
                  className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-[#1877F2] text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  <Users size={18} /> Nodes
                </button>
                <button 
                  onClick={() => navigate('/admin/products')}
                  className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-[#1877F2] text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  <ShoppingBag size={18} /> Inventory
                </button>
                <button 
                  onClick={() => navigate('/admin/messages')}
                  className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'messages' ? 'bg-[#1877F2] text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  <MessageSquare size={18} /> Broadcast
                </button>
              </div>

              {activeTab === 'map' ? (
                <div className="h-[600px] rounded-3xl overflow-hidden border-4 border-white shadow-2xl robot-glow relative">
                  <MapContainer center={[12.8797, 121.7740]} zoom={6} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {members.filter(m => m.latitude && m.longitude).map(member => (
                      <Marker 
                        key={member.id} 
                        position={[member.latitude!, member.longitude!]}
                        eventHandlers={{ click: () => setSelectedMember(member) }}
                      >
                        <Popup>
                          <div className="p-1 text-center">
                            <Avatar src={member.photo_url} name={member.name} size="md" />
                            <div className="font-bold mt-2">{member.name}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold tech-font">{member.position}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              ) : activeTab === 'list' ? (
                <div className="bg-white rounded-3xl shadow-xl border border-zinc-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                      <tr>
                        <th className="p-4 font-bold text-xs uppercase tracking-widest tech-font">Node Identity</th>
                        <th className="p-4 font-bold text-xs uppercase tracking-widest tech-font">Designation</th>
                        <th className="p-4 font-bold text-xs uppercase tracking-widest tech-font">Status</th>
                        <th className="p-4 font-bold text-xs uppercase tracking-widest tech-font">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {members.map(member => (
                        <tr key={member.id} className="hover:bg-zinc-50 transition-colors group">
                          <td className="p-4 flex items-center gap-3">
                            <Avatar src={member.photo_url} name={member.name} size="md" online={!!member.latitude} />
                            <div className="font-bold">{member.name}</div>
                          </td>
                          <td className="p-4 text-sm text-zinc-600">{member.position}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${member.latitude ? 'bg-green-500 animate-pulse' : 'bg-zinc-300'}`}></div>
                              <span className="text-[10px] font-bold uppercase tech-font">{member.latitude ? 'Active' : 'Offline'}</span>
                            </div>
                          </td>
                          <td className="p-4 flex items-center gap-2">
                            <button onClick={() => setSelectedMember(member)} className="p-2 bg-zinc-100 rounded-lg hover:bg-[#1877F2] hover:text-white transition-all">
                              <Search size={16} />
                            </button>
                            <button onClick={() => setPromotingMember(member)} className="p-2 bg-zinc-100 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                              <Shield size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === 'products' ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xl robot-glow">
                    <h2 className="font-bold mb-4 flex items-center gap-2 text-[#1877F2] uppercase tracking-widest tech-font">
                      <Plus size={18} />
                      Add New Asset
                    </h2>
                    <form onSubmit={handleAddProduct} className="grid grid-cols-2 gap-4">
                      <input 
                        required placeholder="Asset Name"
                        className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      />
                      <input 
                        required placeholder="Description"
                        className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20 col-span-2"
                        value={newProduct.description}
                        onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      />
                      <input 
                        required placeholder="Price"
                        type="number"
                        className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
                        value={newProduct.price}
                        onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      />
                      <input 
                        required placeholder="Stock"
                        type="number"
                        className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
                        value={newProduct.stock}
                        onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                      />
                      <div className="col-span-2">
                        <label className="block text-sm font-bold text-zinc-600 mb-2">Asset Image</label>
                        <input 
                          type="file"
                          onChange={(e) => setProductImage(e.target.files ? e.target.files[0] : null)}
                          className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#1877F2] hover:file:bg-blue-100"
                        />
                      </div>
                      <button type="submit" className="col-span-2 bg-[#1877F2] text-white font-bold py-3 rounded-xl hover:bg-[#166fe5] transition-colors">Add Asset</button>
                    </form>
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xl">
                    <h2 className="font-bold mb-4 flex items-center gap-2 text-zinc-500 uppercase tracking-widest tech-font">
                      <Package size={18} />
                      Current Inventory
                    </h2>
                    <div className="space-y-4">
                      {products.map(product => (
                        <div key={product.id} className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                          <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                          <div className="flex-1">
                            <div className="font-bold">{product.name}</div>
                            <div className="text-sm text-zinc-600">${product.price}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={product.stock} 
                              onChange={(e) => updateStock(product.id, parseInt(e.target.value))}
                              className="w-20 bg-white border border-zinc-200 rounded-lg p-2 text-center"
                            />
                            <button onClick={() => setEditingProduct(product)} className="p-2 bg-white rounded-lg hover:bg-zinc-100 border border-zinc-200">
                              <Edit size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xl">
                  <h2 className="font-bold mb-4 flex items-center gap-2 text-[#1877F2] uppercase tracking-widest tech-font">
                    <MessageSquare size={18} />
                    Broadcast Message
                  </h2>
                  <textarea 
                    placeholder="Send a message to all nodes..."
                    className="w-full h-32 bg-zinc-50 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20 mb-4"
                    value={broadcastMsg}
                    onChange={e => setBroadcastMsg(e.target.value)}
                  />
                  <button onClick={sendBroadcast} className="bg-[#1877F2] text-white font-bold py-3 px-6 rounded-xl hover:bg-[#166fe5] transition-colors">Send Broadcast</button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xl robot-glow">
                <h2 className="font-bold mb-4 flex items-center gap-2 text-zinc-500 uppercase tracking-widest tech-font">
                  <Bell size={18} />
                  Real-time Alerts
                </h2>
                <div className="space-y-3 h-96 overflow-y-auto pr-2">
                  {notifications.map((notif, i) => (
                    <div key={i} className={`p-4 rounded-xl border flex gap-3 items-start ${notif.type === 'STOCK_ALERT' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 mt-1">
                        {notif.type === 'STOCK_ALERT' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{notif.message}</p>
                        <p className="text-xs opacity-70">{new Date(notif.timestamp || Date.now()).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {selectedMember && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/30 z-[1000] flex items-center justify-center p-4"
              onClick={() => setSelectedMember(null)}
            >
              <motion.div 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                exit={{ y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200 robot-glow"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar src={selectedMember.photo_url} name={selectedMember.name} size="lg" online={!!selectedMember.latitude} />
                    <div>
                      <h2 className="text-2xl font-bold">{selectedMember.name}</h2>
                      <p className="text-zinc-500">{selectedMember.position}</p>
                    </div>
                  </div>
                  <div className="mt-6 h-64 rounded-xl overflow-hidden border border-zinc-200">
                    {selectedMember.latitude && selectedMember.longitude ? (
                      <MapContainer center={[selectedMember.latitude, selectedMember.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[selectedMember.latitude, selectedMember.longitude]} />
                      </MapContainer>
                    ) : (
                      <div className="h-full bg-zinc-100 flex items-center justify-center text-zinc-500">No location data</div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {promotingMember && (
            <PromoteMemberModal member={promotingMember} onClose={() => setPromotingMember(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard;
