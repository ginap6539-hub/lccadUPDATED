import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
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
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Member, Post, Product, Message, User } from './types';
import { getSupabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';
const supabase = getSupabase();
import SupabaseSetupInstructions from './components/SupabaseSetupInstructions';
import { subscribeToAdminNotifications, subscribeToPosts, subscribeToMessages, joinUserRoom } from './services/api';
import bcrypt from 'bcryptjs';

// Helper for image uploads to Supabase Storage
const uploadImage = async (file: File, bucket: string = 'lccad') => {
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

// Fix Leaflet default icon
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const LCCAD_FULL_NAME = "Local Climate Change Adaptation for Development";

// --- Hooks ---

const useGeolocation = (memberId?: number) => {
  useEffect(() => {
    if (!memberId) return;

    const updateLocation = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      try {
        await supabase
          .from('members')
          .update({ latitude, longitude, last_seen: new Date().toISOString() })
          .eq('id', memberId);
      } catch (err) {
        console.error('Failed to update location:', err);
      }
    };

    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(updateLocation, (err) => console.error(err), { enableHighAccuracy: true });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [memberId]);
};

// --- Components ---

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

const RoboticSidebar = ({ user }: { user: User }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const location = useLocation();

  const links = user.role === 'admin' ? [
    { to: '/admin', icon: LayoutDashboard, label: 'Monitoring' },
    { to: '/admin/members', icon: Users, label: 'Members' },
    { to: '/admin/messages', icon: MessageSquare, label: 'Broadcast' },
    { to: '/admin/products', icon: Package, label: 'E-commerce' },
  ] : [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/messenger', icon: MessageCircle, label: 'Messenger' },
    { to: '/shop', icon: ShoppingBag, label: 'Shop' },
    { to: '/groups', icon: UsersIcon, label: 'Groups' },
  ];

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 72 : 280 }}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
      className="fixed left-0 top-14 bottom-0 bg-white border-r border-zinc-200 z-[900] overflow-hidden shadow-xl transition-all duration-300 ease-in-out"
    >
      <div className="p-4 flex flex-col h-full">
        <div className="space-y-2 flex-1">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link 
                key={link.to} 
                to={link.to}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all group relative ${isActive ? 'bg-[#1877F2] text-white shadow-lg shadow-[#1877F2]/30' : 'text-zinc-600 hover:bg-zinc-100'}`}
              >
                <link.icon size={24} className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="font-bold whitespace-nowrap"
                    >
                      {link.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-4 p-2">
            <Avatar src={(user as any).photo_url} name={user.name || user.username || 'U'} size="sm" online />
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <div className="font-bold text-sm truncate">{user.name || user.username}</div>
                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest tech-font">{user.role}</div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

const FacebookNavbar = ({ user, onLogout }: { user: User | null, onLogout: () => void }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-zinc-200 z-[1000] flex items-center justify-between px-4 shadow-sm robot-scan">
      <div className="flex items-center gap-2">
        <Link to="/" className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg robot-glow glitch-hover">
          L
        </Link>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Search LCCAD..." 
            className="bg-zinc-100 rounded-full py-2 pl-10 pr-4 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 transition-all"
          />
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 h-full">
        {[
          { icon: Home, to: '/' },
          { icon: Tv, to: '/watch' },
          { icon: Store, to: '/shop' },
          { icon: Users, to: '/groups' },
          { icon: LayoutDashboard, to: '/admin', adminOnly: true },
        ].filter(item => !item.adminOnly || user?.role === 'admin').map((item, i) => {
          const isActive = location.pathname === item.to;
          return (
            <Link 
              key={i} 
              to={item.to} 
              className={`h-full px-10 flex items-center border-b-4 transition-all ${isActive ? 'border-[#1877F2] text-[#1877F2]' : 'border-transparent text-zinc-500 hover:bg-zinc-100 hover:rounded-lg'}`}
            >
              <item.icon size={24} className={isActive ? 'scale-110' : ''} />
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <div className="flex gap-2">
              <button className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900 hover:bg-zinc-200 transition-colors relative">
                <Menu size={20} />
              </button>
              <Link to="/messenger" className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900 hover:bg-zinc-200 transition-colors relative">
                <MessageCircle size={20} />
              </Link>
              <button className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900 hover:bg-zinc-200 transition-colors relative">
                <Bell size={20} />
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-[#1877F2] transition-all"
                >
                  <Avatar src={(user as any).photo_url} name={user.name || user.username || 'U'} size="md" />
                </button>
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-zinc-200 p-2 z-[1001] robot-glow"
                    >
                      <div className="p-3 flex items-center gap-3 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                        <Avatar src={(user as any).photo_url} name={user.name || user.username || 'U'} size="lg" />
                        <div>
                          <div className="font-bold">{user.name || user.username}</div>
                          <div className="text-xs text-zinc-500">See your profile</div>
                        </div>
                      </div>
                      <hr className="my-2 border-zinc-100" />
                      <button 
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 rounded-lg text-red-600 font-semibold transition-colors"
                      >
                        <div className="w-9 h-9 bg-zinc-100 rounded-full flex items-center justify-center">
                          <LogOut size={20} />
                        </div>
                        Log Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          <Link to="/login" className="bg-[#1877F2] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#166fe5] transition-colors">Log In</Link>
        )}
      </div>
    </nav>
  );
};

// --- Pages ---

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col lg:flex-row items-center justify-center p-6 lg:p-20 gap-12 lg:gap-32">
      <div className="max-w-md lg:max-w-lg text-center lg:text-left">
        <h1 className="text-[#1877F2] text-6xl font-bold mb-4 tracking-tight glitch-hover">LCCAD</h1>
        <h2 className="text-2xl font-medium text-zinc-800 leading-tight mb-4 uppercase tracking-widest text-xs tech-font">
          {LCCAD_FULL_NAME}
        </h2>
        <p className="text-xl text-zinc-700">
          Connect with members and monitor climate adaptation initiatives in real-time.
        </p>
      </div>

      <div className="w-full max-w-[400px] space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-xl border border-zinc-200 space-y-4 robot-glow">
          <Link to="/login" className="block w-full bg-[#1877F2] text-white text-center py-3 rounded-lg font-bold text-xl hover:bg-[#166fe5] transition-colors">
            Log In
          </Link>
          <div className="text-center">
            <a href="#" className="text-[#1877F2] text-sm hover:underline">Forgotten password?</a>
          </div>
          <hr className="border-zinc-200" />
          <div className="text-center pt-2">
            <Link to="/register" className="inline-block bg-[#42b72a] text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-[#36a420] transition-colors">
              Create new account
            </Link>
          </div>
        </div>
        <p className="text-sm text-center text-zinc-600">
          <span className="font-bold">Create a Page</span> for a celebrity, brand or business.
        </p>
      </div>
    </div>
  );
};

const MessengerPage = ({ user }: { user: User }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('members').select('*').then(({ data }) => {
      if (data) setMembers(data.filter((mem: Member) => mem.id !== user.id));
    });

    const cleanup = subscribeToMessages((msg) => {
      if (selectedMember && (msg.sender_id === selectedMember.id || msg.receiver_id === selectedMember.id)) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return cleanup;
  }, [user.id, selectedMember]);

  useEffect(() => {
    if (selectedMember) {
      supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedMember.id}),and(sender_id.eq.${selectedMember.id},receiver_id.eq.${user.id}),receiver_id.eq.0`)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data) setMessages(data);
        });
    }
  }, [selectedMember, user.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage || !selectedMember) return;
    const { data: msg, error } = await supabase
      .from('messages')
      .insert([{ sender_id: user.id, receiver_id: selectedMember.id, content: newMessage }])
      .select()
      .single();
    
    if (!error && msg) {
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] pt-14 flex">
      {/* Contact List */}
      <div className="w-80 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-4 border-b border-zinc-100">
          <h2 className="text-2xl font-bold">Chats</h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Messenger" 
              className="w-full bg-zinc-100 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {members.map(member => (
            <button 
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${selectedMember?.id === member.id ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}
            >
              <Avatar src={member.photo_url} name={member.name} size="lg" online={!!member.latitude} />
              <div className="flex-1 text-left min-w-0">
                <div className="font-bold truncate">{member.name}</div>
                <div className="text-xs text-zinc-500 truncate">{member.position}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedMember ? (
          <>
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar src={selectedMember.photo_url} name={selectedMember.name} size="md" online={!!selectedMember.latitude} />
                <div>
                  <div className="font-bold">{selectedMember.name}</div>
                  <div className="text-xs text-green-500 font-bold uppercase tech-font">Active Now</div>
                </div>
              </div>
              <div className="flex gap-4 text-[#1877F2]">
                <Tv size={20} className="cursor-pointer" />
                <Info size={20} className="cursor-pointer" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
              {messages.map((msg, i) => {
                const isMe = msg.sender_id === user.id;
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-[#1877F2] text-white rounded-br-none' : 'bg-white text-zinc-800 rounded-bl-none border border-zinc-100'}`}>
                      {msg.content}
                      <div className={`text-[10px] mt-1 opacity-70 ${isMe ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <div className="p-4 border-t border-zinc-100 flex items-center gap-3">
              <Plus className="text-[#1877F2] cursor-pointer" size={24} />
              <Camera className="text-[#1877F2] cursor-pointer" size={24} />
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="Aa" 
                  className="w-full bg-zinc-100 rounded-full py-2 px-4 focus:outline-none"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                />
              </div>
              <button onClick={sendMessage} className="text-[#1877F2] hover:scale-110 transition-transform">
                <Send size={24} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
            <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle size={48} />
            </div>
            <p className="font-bold">Select a member to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
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
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (!editingProduct) return;

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
    if (!broadcastMsg) return;
    const { error } = await supabase
      .from('messages')
      .insert([{ sender_id: 0, receiver_id: 0, content: broadcastMsg }]);
    
    if (!error) {
      setBroadcastMsg('');
      alert('Broadcast sent to all members!');
    }
  };

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
                          <td className="p-4">
                            <button onClick={() => setSelectedMember(member)} className="p-2 bg-zinc-100 rounded-lg hover:bg-[#1877F2] hover:text-white transition-all">
                              <Search size={16} />
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
                        required type="number" placeholder="Price"
                        className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
                        value={newProduct.price}
                        onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      />
                      <input 
                        required type="number" placeholder="Initial Stock"
                        className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
                        value={newProduct.stock}
                        onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                      />
                      <input 
                        type="file" accept="image/*"
                        className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs"
                        onChange={e => setProductImage(e.target.files?.[0] || null)}
                      />
                      <textarea 
                        required placeholder="Description"
                        className="col-span-2 bg-zinc-50 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20 h-24"
                        value={newProduct.description}
                        onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      />
                      <button className="col-span-2 bg-[#1877F2] text-white font-bold py-3 rounded-xl hover:bg-[#166fe5] transition-all uppercase tracking-widest text-xs tech-font">
                        Initialize Asset
                      </button>
                    </form>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map(product => (
                      <div key={product.id} className={`bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm flex gap-4 ${product.stock === 0 ? 'border-red-500 bg-red-50' : ''}`}>
                        <div className="w-24 h-24 bg-zinc-100 rounded-xl overflow-hidden shrink-0">
                          {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-6 text-zinc-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="font-bold truncate">{product.name}</div>
                            <button onClick={() => setEditingProduct(product)} className="text-zinc-400 hover:text-[#1877F2]">
                              <Edit size={16} />
                            </button>
                          </div>
                          <div className="text-xs text-zinc-500 mb-2">₱{product.price}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tech-font">Stock:</span>
                            <input 
                              type="number" 
                              className={`w-16 bg-zinc-50 border rounded p-1 text-xs ${product.stock === 0 ? 'border-red-500 text-red-600 font-bold' : 'border-zinc-200'}`}
                              value={product.stock}
                              onChange={e => updateStock(product.id, parseInt(e.target.value))}
                            />
                            {product.stock === 0 && <AlertCircle size={16} className="text-red-500 animate-bounce" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900 rounded-3xl p-6 text-white shadow-2xl robot-scan relative overflow-hidden h-[600px] flex flex-col">
                  <h2 className="font-bold mb-4 flex items-center gap-2 text-emerald-400 uppercase tracking-widest tech-font">
                    <Zap size={18} />
                    Global Broadcast
                  </h2>
                  <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6">
                    <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center animate-pulse">
                      <Send size={48} className="text-emerald-400" />
                    </div>
                    <p className="text-zinc-400 max-w-md">
                      Send a high-priority message to all connected nodes. This will trigger an immediate alert on all member devices.
                    </p>
                    <div className="w-full max-w-lg space-y-4">
                      <textarea 
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none tech-font"
                        rows={4}
                        placeholder="Enter system-wide transmission..."
                        value={broadcastMsg}
                        onChange={e => setBroadcastMsg(e.target.value)}
                      />
                      <button 
                        onClick={sendBroadcast}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Send size={18} />
                        Transmit to All Nodes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xl">
                <h2 className="font-bold mb-4 flex items-center gap-2 text-[#1877F2] uppercase tracking-widest tech-font">
                  <Shield size={18} />
                  Security Logs
                </h2>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {notifications.map((n, i) => (
                    <div key={i} className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-[10px] tech-font">
                      <span className="text-[#1877F2] font-bold">[{new Date().toLocaleTimeString()}]</span> {n.message}
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="text-center py-8 text-zinc-400 italic text-xs">Awaiting system events...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Member Details Modal */}
        <AnimatePresence>
          {selectedMember && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm"
              onClick={() => setSelectedMember(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden robot-glow"
                onClick={e => e.stopPropagation()}
              >
                <div className="h-32 bg-zinc-900 relative robot-scan">
                  <button 
                    onClick={() => setSelectedMember(null)}
                    className="absolute top-4 right-4 w-8 h-8 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white p-1 rounded-full shadow-lg">
                    <Avatar src={selectedMember.photo_url} name={selectedMember.name} size="xl" />
                  </div>
                </div>
                <div className="pt-16 p-8 space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-zinc-900">{selectedMember.name}</h2>
                    <p className="text-zinc-500 font-medium tech-font uppercase text-xs tracking-widest">{selectedMember.position} // {selectedMember.agency_lgu}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-zinc-700">
                        <MapPin size={18} className="text-[#1877F2]" />
                        <span className="text-sm">{selectedMember.address}</span>
                      </div>
                      <div className="flex items-center gap-3 text-zinc-700">
                        <Globe size={18} className="text-[#1877F2]" />
                        <span className="text-sm">{selectedMember.province_region}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-zinc-700">
                        <Search size={18} className="text-[#1877F2]" />
                        <span className="text-sm">{selectedMember.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-zinc-700">
                        <Globe size={18} className="text-[#1877F2]" />
                        <a href={selectedMember.website} target="_blank" className="text-sm text-[#1877F2] hover:underline">{selectedMember.website || 'No website'}</a>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button className="flex-1 bg-[#1877F2] text-white font-bold py-4 rounded-xl hover:bg-[#166fe5] transition-all shadow-lg shadow-[#1877F2]/20 uppercase tracking-widest text-xs tech-font">Initialize Comms</button>
                    <button className="flex-1 bg-zinc-100 text-zinc-700 font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all uppercase tracking-widest text-xs tech-font">Access Logs</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const ProfileModal = ({ member, onClose, onUpdate }: { member: Member, onClose: () => void, onUpdate: (m: Member) => void }) => {
  const [formData, setFormData] = useState({ ...member });
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let photo_url = formData.photo_url;
      if (photo) {
        photo_url = await uploadImage(photo);
      }

      const { data: updated, error } = await supabase
        .from('members')
        .update({
          name: formData.name,
          address: formData.address,
          position: formData.position,
          agency_lgu: formData.agency_lgu,
          province_region: formData.province_region,
          mobile_number: formData.mobile_number,
          website: formData.website,
          photo_url
        })
        .eq('id', member.id)
        .select()
        .single();

      if (error) throw error;
      if (updated) {
        onUpdate(updated);
        onClose();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[3000] flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden robot-glow"
      >
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <h2 className="text-xl font-bold tech-font uppercase tracking-widest">Update Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative group">
              <Avatar src={photo ? URL.createObjectURL(photo) : member.photo_url} name={member.name} size="xl" />
              <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="text-white" size={24} />
                <input type="file" hidden accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} />
              </label>
            </div>
            <span className="text-xs font-bold text-[#1877F2] uppercase tracking-widest tech-font">Sync New Avatar</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest tech-font">Full Identity</label>
              <input className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-[#1877F2]/20 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest tech-font">Designation</label>
              <input className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-[#1877F2]/20 outline-none" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest tech-font">Agency / LGU</label>
              <input className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-[#1877F2]/20 outline-none" value={formData.agency_lgu} onChange={e => setFormData({...formData, agency_lgu: e.target.value})} />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-[#1877F2] text-white font-bold py-4 rounded-xl mt-6 hover:bg-[#166fe5] transition-all shadow-lg shadow-[#1877F2]/20 uppercase tracking-widest text-xs tech-font"
          >
            {loading ? 'Processing Sync...' : 'Commit Changes'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const MemberFeed = ({ member, onUpdate }: { member: Member, onUpdate: (m: Member) => void }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useGeolocation(member.id);

  useEffect(() => {
    supabase
      .from('posts')
      .select('*, members(name, photo_url)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          const formatted = data.map(p => ({ 
            ...p, 
            member_name: (p as any).members?.name,
            photo_url: (p as any).members?.photo_url 
          }));
          setPosts(formatted);
        }
      });

    joinUserRoom(member.id);

    const cleanupPosts = subscribeToPosts((post) => {
      setPosts(prev => [post, ...prev]);
    });

    return () => {
      cleanupPosts();
    };
  }, [member.id]);

  const handlePost = async () => {
    if (!newPostContent && !selectedImage) return;
    
    try {
      let image_url = null;
      if (selectedImage) {
        image_url = await uploadImage(selectedImage);
      }

      const { data: post, error } = await supabase
        .from('posts')
        .insert([{ member_id: member.id, content: newPostContent, image_url }])
        .select('*, members(name, photo_url)')
        .single();

      if (error) throw error;

      if (post) {
        const formatted = { 
          ...post, 
          member_name: (post as any).members?.name,
          photo_url: (post as any).members?.photo_url 
        };
        // The subscription will handle adding it to the feed for others, 
        // but we can add it locally for immediate feedback
        setPosts(prev => [formatted, ...prev]);
        setNewPostContent('');
        setSelectedImage(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] pt-14 flex justify-center">
      {/* Feed */}
      <div className="w-full max-w-[600px] py-8 px-4 space-y-6 ml-[72px]">
        {/* Create Post */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 space-y-4 robot-glow">
          <div className="flex gap-3">
            <Avatar src={member.photo_url} name={member.name} size="md" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-zinc-100 hover:bg-zinc-200 rounded-full px-4 text-left text-zinc-500 transition-colors"
            >
              What's on your mind, {member.name.split(' ')[0]}?
            </button>
          </div>
          <hr className="border-zinc-100" />
          <div className="flex items-center justify-around">
            <button className="flex items-center gap-2 text-zinc-500 hover:bg-zinc-100 flex-1 py-2 rounded-lg justify-center font-semibold transition-colors">
              <Tv size={20} className="text-red-500" /> Live
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-zinc-500 hover:bg-zinc-100 flex-1 py-2 rounded-lg justify-center font-semibold transition-colors"
            >
              <Camera size={20} className="text-green-500" /> Photo
            </button>
            <button className="flex items-center gap-2 text-zinc-500 hover:bg-zinc-100 flex-1 py-2 rounded-lg justify-center font-semibold transition-colors">
              <Plus size={20} className="text-yellow-500" /> Activity
            </button>
          </div>
          <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={e => setSelectedImage(e.target.files?.[0] || null)} />
          
          {selectedImage && (
            <div className="relative rounded-xl overflow-hidden border border-zinc-200">
              <img src={URL.createObjectURL(selectedImage)} className="w-full h-64 object-cover" alt="Preview" />
              <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"><X size={16} /></button>
              <button onClick={handlePost} className="absolute bottom-4 right-4 bg-[#1877F2] text-white px-6 py-2 rounded-lg font-bold shadow-lg">Post</button>
            </div>
          )}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden robot-glow-hover transition-all">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={(post as any).photo_url} name={post.member_name} size="md" />
                  <div>
                    <div className="font-bold hover:underline cursor-pointer">{post.member_name}</div>
                    <div className="text-[10px] text-zinc-400 uppercase font-bold tech-font flex items-center gap-1">
                      {new Date(post.created_at).toLocaleDateString()} • <Globe size={10} />
                    </div>
                  </div>
                </div>
                <button className="text-zinc-500 hover:bg-zinc-100 p-2 rounded-full transition-colors"><MoreHorizontal size={20} /></button>
              </div>
              <div className="px-4 pb-3 text-zinc-800 whitespace-pre-wrap">{post.content}</div>
              {post.image_url && (
                <img src={post.image_url} className="w-full border-y border-zinc-100" alt="Post" />
              )}
              <div className="p-1 flex items-center border-t border-zinc-50">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-zinc-100 rounded-lg text-zinc-600 font-semibold transition-colors">
                  <ThumbsUp size={20} /> Like
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-zinc-100 rounded-lg text-zinc-600 font-semibold transition-colors">
                  <MessageCircle size={20} /> Comment
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-zinc-100 rounded-lg text-zinc-600 font-semibold transition-colors">
                  <Share2 size={20} /> Share
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:flex w-80 fixed right-0 top-14 bottom-0 p-4 flex-col gap-4 overflow-y-auto">
        <div className="flex items-center justify-between text-zinc-500 font-bold text-xs uppercase tracking-widest tech-font">
          <span>Active Nodes</span>
          <div className="flex gap-2">
            <Search size={14} />
            <MoreHorizontal size={14} />
          </div>
        </div>
        <div className="space-y-1">
          {['Alice Smith', 'Bob Johnson', 'Charlie Brown'].map((name, i) => (
            <div key={i} className="flex items-center gap-3 p-2 hover:bg-zinc-200 rounded-lg cursor-pointer transition-colors group">
              <Avatar name={name} size="md" online />
              <span className="font-semibold text-sm group-hover:text-[#1877F2] transition-colors">{name}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showProfileModal && (
          <ProfileModal member={member} onClose={() => setShowProfileModal(false)} onUpdate={onUpdate} />
        )}
      </AnimatePresence>
    </div>
  );
};

const RegistrationPage = () => {
  const [formData, setFormData] = useState({
    name: '', address: '', position: '', agency_lgu: '', province_region: '',
    mobile_number: '', email: '', website: '',
    training_climate_change: false, training_digitalization: false, training_creative_industries: false,
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      let photo_url = null;
      if (photo) {
        photo_url = await uploadImage(photo);
      }

      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingMember) {
        setStatus('error');
        alert('Email already registered');
        return;
      }

      const { data: member, error } = await supabase
        .from('members')
        .insert([{
          ...formData,
          photo_url,
          training_climate_change: formData.training_climate_change ? 1 : 0,
          training_digitalization: formData.training_digitalization ? 1 : 0,
          training_creative_industries: formData.training_creative_industries ? 1 : 0
        }])
        .select()
        .single();

      if (error) throw error;

      if (member) {
        // Broadcast new registration
        await supabase.channel('admin-notifications').send({
          type: 'broadcast',
          event: 'admin-notification',
          payload: {
            type: 'NEW_REGISTRATION',
            message: `New member registered: ${member.name}`,
            data: member
          }
        });
      }

      setStatus('success');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setStatus('error');
      alert(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-6 robot-glow"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-[#1877F2] rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-lg mx-auto robot-glow glitch-hover">
            L
          </div>
          <h1 className="text-3xl font-bold text-zinc-900">Registration</h1>
          <p className="text-zinc-500 text-xs tech-font uppercase tracking-widest">{LCCAD_FULL_NAME}</p>
        </div>
        <hr className="border-zinc-200" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="relative group">
              <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center border-2 border-dashed border-zinc-300 overflow-hidden robot-glow">
                {photo ? <img src={URL.createObjectURL(photo)} className="w-full h-full object-cover" /> : <Camera className="text-zinc-400" size={32} />}
              </div>
              <label className="absolute inset-0 cursor-pointer">
                <input type="file" hidden accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} />
              </label>
            </div>
            <span className="text-[10px] font-bold text-[#1877F2] uppercase tracking-widest tech-font">Upload Avatar</span>
          </div>

          <input 
            required placeholder="Name"
            className="w-full bg-zinc-100 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          <input 
            required placeholder="Address"
            className="w-full bg-zinc-100 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
          />
          <input 
            required placeholder="Position"
            className="w-full bg-zinc-100 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            value={formData.position}
            onChange={e => setFormData({...formData, position: e.target.value})}
          />
          <input 
            required placeholder="Agency / LGU"
            className="w-full bg-zinc-100 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            value={formData.agency_lgu}
            onChange={e => setFormData({...formData, agency_lgu: e.target.value})}
          />
          <input 
            required placeholder="Province | Region"
            className="w-full bg-zinc-100 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            value={formData.province_region}
            onChange={e => setFormData({...formData, province_region: e.target.value})}
          />
          <input 
            required type="tel" placeholder="Mobile Number"
            className="w-full bg-zinc-100 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            value={formData.mobile_number}
            onChange={e => setFormData({...formData, mobile_number: e.target.value})}
          />
          <input 
            required type="email" placeholder="Email"
            className="w-full bg-zinc-100 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          <input 
            placeholder="Website (Optional)"
            className="w-full bg-zinc-100 border border-zinc-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            value={formData.website}
            onChange={e => setFormData({...formData, website: e.target.value})}
          />
          
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest tech-font">To attend Training -Workshop on the following:</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 cursor-pointer hover:bg-zinc-100 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-zinc-300 text-[#1877F2] focus:ring-[#1877F2]"
                  checked={formData.training_climate_change}
                  onChange={e => setFormData({...formData, training_climate_change: e.target.checked})}
                />
                <span className="text-sm font-semibold text-zinc-700">Climate Change and Disaster Resilience</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 cursor-pointer hover:bg-zinc-100 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-zinc-300 text-[#1877F2] focus:ring-[#1877F2]"
                  checked={formData.training_digitalization}
                  onChange={e => setFormData({...formData, training_digitalization: e.target.checked})}
                />
                <span className="text-sm font-semibold text-zinc-700">Digitalization / E-commerce</span>
              </label>
            </div>
          </div>

          <button 
            disabled={status === 'loading'}
            className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold py-4 rounded-xl text-xl transition-all shadow-lg shadow-[#1877F2]/20 uppercase tracking-widest tech-font"
          >
            {status === 'loading' ? 'Processing...' : 'Sign Up'}
          </button>
        </form>
        <div className="text-center">
          <Link to="/login" className="text-[#1877F2] font-medium hover:underline">Already have an account?</Link>
        </div>
      </motion.div>
    </div>
  );
};

const LoginPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const trimmedEmail = email.trim();
      
      // Try Admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('username', trimmedEmail)
        .maybeSingle();

      if (admin && admin.password) {
        const match = bcrypt.compareSync(password, admin.password);
        if (match) {
          const user = { id: admin.id, username: admin.username, name: 'Admin', role: 'admin' as const };
          onLogin(user);
          navigate('/admin');
          return;
        }
      }

      // Try Member
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (member) {
        const user = { ...member, role: 'member' as const };
        onLogin(user);
        navigate('/');
        return;
      }

      setError('Invalid email or password');
    } catch (err: any) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-6 robot-glow">
        <div className="text-center">
          <h1 className="text-[#1877F2] text-4xl font-bold mb-2 glitch-hover">LCCAD</h1>
          <p className="text-zinc-600 font-medium leading-tight uppercase tracking-widest text-xs tech-font">
            {LCCAD_FULL_NAME}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            required type="text" 
            placeholder="Email address or username"
            className="w-full border border-zinc-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#1877F2]/20 text-lg"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password"
            className="w-full border border-zinc-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#1877F2]/20 text-lg"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <div className="text-red-500 text-sm font-medium text-center">{error}</div>}
          <button 
            disabled={loading}
            className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold py-4 rounded-xl text-xl transition-all shadow-lg shadow-[#1877F2]/20 uppercase tracking-widest tech-font"
          >
            {loading ? 'Authenticating...' : 'Log In'}
          </button>
          <div className="text-center">
            <a href="#" className="text-[#1877F2] text-sm hover:underline">Forgotten password?</a>
          </div>
          <hr className="border-zinc-200" />
          <div className="text-center pt-2">
            <Link to="/register" className="inline-block bg-[#42b72a] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#36a420] transition-colors uppercase tracking-widest tech-font">
              Create new account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const handleUpdateUser = (u: Member) => {
    const updatedUser = { ...u, role: 'member' as const };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    return <SupabaseSetupInstructions />;
  }

  if (loading) return null;

  return (
    <Router>
      <div className="min-h-screen bg-[#f0f2f5] font-sans text-zinc-900">
        {user && <FacebookNavbar user={user} onLogout={handleLogout} />}
        {user && <RoboticSidebar user={user} />}
        
        <Routes>
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          
          <Route path="/admin/*" element={
            user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />
          } />

          <Route path="/messenger" element={
            user ? <MessengerPage user={user} /> : <Navigate to="/login" />
          } />

          <Route path="/watch" element={
            <div className="pt-20 p-8 text-center ml-[72px]">
              <Tv size={48} className="mx-auto text-zinc-300 mb-4" />
              <h2 className="text-xl font-bold">LCCAD TV</h2>
              <p className="text-zinc-500">Live streams and educational videos on climate change.</p>
            </div>
          } />

          <Route path="/groups" element={
            <div className="pt-20 p-8 text-center ml-[72px]">
              <Users size={48} className="mx-auto text-zinc-300 mb-4" />
              <h2 className="text-xl font-bold">LCCAD Groups</h2>
              <p className="text-zinc-500">Join local community groups for climate action.</p>
            </div>
          } />
          
          <Route path="/" element={
            user ? (
              user.role === 'admin' ? <Navigate to="/admin" /> : <MemberFeed member={user as any} onUpdate={handleUpdateUser} />
            ) : <LandingPage />
          } />

          <Route path="/shop" element={
            <div className="pt-20 p-8 text-center ml-[72px]">
              <ShoppingBag size={48} className="mx-auto text-zinc-300 mb-4" />
              <h2 className="text-xl font-bold">LCCAD Marketplace</h2>
              <p className="text-zinc-500">Coming soon! Support local adaptation initiatives.</p>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}
