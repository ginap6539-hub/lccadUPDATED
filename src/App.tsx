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
import { getSupabase } from './supabaseClient';
import { subscribeToAdminNotifications, subscribeToPosts, subscribeToMessages, joinUserRoom } from './services/api';
import * as bcrypt from 'bcryptjs';
import AdminDashboard from './Admin';

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
  const supabase = getSupabase();
  if (!supabase) return;

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
  const supabase = getSupabase();
  if (!supabase) return null;

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

const MemberFeed = ({ user }: { user: User }) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<File | null>(null);

  useEffect(() => {
    supabase.from('posts').select('*, member:members(*)').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setPosts(data as any);
    });

    const cleanup = subscribeToPosts((post) => {
      setPosts(prev => [post, ...prev]);
    });

    return cleanup;
  }, []);

  const handlePost = async () => {
    if (!newPostContent) return;
    let image_url = null;
    if (newPostImage) {
      image_url = await uploadImage(newPostImage, 'posts');
    }
    const { data, error } = await supabase
      .from('posts')
      .insert([{ member_id: user.id, content: newPostContent, image_url }])
      .select('*, member:members(*)')
      .single();

    if (!error && data) {
      setPosts(prev => [data as any, ...prev]);
      setNewPostContent('');
      setNewPostImage(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] pt-14 flex justify-center">
      <div className="w-full max-w-4xl py-8 px-4 flex gap-8">
        {/* Left Sidebar (optional) */}
        <aside className="w-80 hidden lg:block">
          {/* You can add left sidebar content here */}
        </aside>

        {/* Main Feed */}
        <main className="flex-1 space-y-6">
          {/* Create Post */}
          <div className="bg-white p-4 rounded-xl shadow-md border border-zinc-200">
            <div className="flex items-start gap-3 border-b border-zinc-100 pb-4">
              <Avatar src={(user as any).photo_url} name={user.name || user.username || 'U'} size="md" />
              <textarea 
                placeholder={`What's on your mind, ${user.name || user.username}?`}
                className="w-full h-24 bg-zinc-100 rounded-lg p-3 text-sm focus:outline-none resize-none"
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center pt-3">
              <div className="flex gap-2">
                <label className="flex items-center gap-2 text-zinc-500 hover:text-[#1877F2] cursor-pointer p-2 rounded-lg hover:bg-zinc-100 transition-colors">
                  <Camera size={20} />
                  <span className="text-sm font-semibold">Photo/video</span>
                  <input type="file" className="hidden" onChange={e => setNewPostImage(e.target.files ? e.target.files[0] : null)} />
                </label>
              </div>
              <button 
                onClick={handlePost}
                className="bg-[#1877F2] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#166fe5] transition-colors disabled:bg-zinc-300"
                disabled={!newPostContent}
              >
                Post
              </button>
            </div>
            {newPostImage && <p className="text-xs text-zinc-500 mt-2">Image selected: {newPostImage.name}</p>}
          </div>

          {/* Posts */}
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl shadow-md border border-zinc-200">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar src={post.member.photo_url} name={post.member.name} size="md" />
                  <div>
                    <div className="font-bold">{post.member.name}</div>
                    <div className="text-xs text-zinc-500">{new Date(post.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <p className="my-4">{post.content}</p>
              </div>
              {post.image_url && (
                <img src={post.image_url} alt="Post image" className="w-full max-h-[500px] object-cover" />
              )}
              <div className="p-2 flex justify-around border-t border-zinc-100">
                <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 font-semibold transition-colors"><ThumbsUp size={20} /> Like</button>
                <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 font-semibold transition-colors"><MessageCircle size={20} /> Comment</button>
                <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 font-semibold transition-colors"><Share2 size={20} /> Share</button>
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        // Check if admin
        const { data: admin, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('email', data.user.email)
          .single();
        
        if (admin) {
          onLogin({ ...data.user, id: admin.id, role: 'admin', name: admin.name, username: admin.username });
          navigate('/admin');
        } else {
          const { data: member, error: memberError } = await supabase
            .from('members')
            .select('*')
            .eq('email', data.user.email)
            .single();
          
          if (member) {
            onLogin({ ...data.user, id: member.id, role: 'member', name: member.name, username: member.username });
            navigate('/');
          } else {
            throw new Error('User profile not found.');
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-xl shadow-2xl border border-zinc-200 space-y-6 robot-glow">
          <h1 className="text-center text-3xl font-bold text-[#1877F2]">Log In to LCCAD</h1>
          {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" 
              placeholder="Email address" 
              required
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-lg outline-none focus:ring-2 focus:ring-[#1877F2]/30 transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Password" 
              required
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-lg outline-none focus:ring-2 focus:ring-[#1877F2]/30 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="submit" className="w-full bg-[#1877F2] text-white py-3 rounded-lg font-bold text-xl hover:bg-[#166fe5] transition-colors">Log In</button>
          </form>
          <div className="text-center">
            <a href="#" className="text-[#1877F2] text-sm hover:underline">Forgotten password?</a>
          </div>
          <hr className="border-zinc-200" />
          <div className="text-center pt-2">
            <Link to="/register" className="inline-block bg-[#42b72a] text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-[#36a420] transition-colors">Create new account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const RegistrationPage = () => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [position, setPosition] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      const { data: { user }, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      if (!user) throw new Error('Registration failed, please try again.');

      let photo_url = null;
      if (photo) {
        photo_url = await uploadImage(photo);
      }

      const { error: insertError } = await supabase.from('members').insert([
        { name, username, email, position, photo_url, user_id: user.id }
      ]);

      if (insertError) throw insertError;

      await supabase.channel('admin-notifications').send({
        type: 'broadcast',
        event: 'admin-notification',
        payload: {
          type: 'NEW_REGISTRATION',
          message: `New member registered: ${name}`,
          data: { name, email, position }
        }
      });

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white p-8 rounded-xl shadow-2xl border border-zinc-200 space-y-6 robot-glow">
          <div>
            <h1 className="text-3xl font-bold">Sign Up</h1>
            <p className="text-zinc-500">It's quick and easy.</p>
          </div>
          <hr />
          {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</p>}
          {success && <p className="bg-green-100 text-green-700 p-3 rounded-lg text-sm">Registration successful! Redirecting to login...</p>}
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input required placeholder="Full Name" className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/30" value={name} onChange={e => setName(e.target.value)} />
              <input required placeholder="Username" className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/30" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <input required type="email" placeholder="Email address" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/30" value={email} onChange={e => setEmail(e.target.value)} />
            <input required type="password" placeholder="New password" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/30" value={password} onChange={e => setPassword(e.target.value)} />
            <input required placeholder="Position / Role" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1877F2]/30" value={position} onChange={e => setPosition(e.target.value)} />
            <div>
              <label className="block text-sm font-bold text-zinc-600 mb-2">Profile Photo</label>
              <input type="file" onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#1877F2] hover:file:bg-blue-100" />
            </div>
            <p className="text-xs text-zinc-500">By clicking Sign Up, you agree to our Terms, Privacy Policy and Cookies Policy.</p>
            <div className="text-center">
              <button type="submit" className="bg-[#42b72a] text-white font-bold py-3 px-16 rounded-lg text-lg hover:bg-[#36a420] transition-colors">Sign Up</button>
            </div>
          </form>
          <div className="text-center">
            <Link to="/login" className="text-[#1877F2] text-sm hover:underline">Already have an account?</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ user, role, children }: { user: User | null, role: 'admin' | 'member', children: JSX.Element }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabase();

  useEffect(() => {
    const checkUser = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if admin
        const { data: admin } = await supabase.from('admins').select('*').eq('email', session.user.email).single();
        if (admin) {
          setUser({ ...session.user, id: admin.id, role: 'admin', name: admin.name, username: admin.username });
        } else {
          const { data: member } = await supabase.from('members').select('*').eq('email', session.user.email).single();
          if (member) {
            setUser({ ...session.user, id: member.id, role: 'member', name: member.name, username: member.username });
          }
        }
      }
      setLoading(false);
    };
    checkUser();

    const { data: authListener } = supabase?.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user;
      if (currentUser) {
        // Refetch profile on auth change
        checkUser();
      } else {
        setUser(null);
      }
    }) || {};

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  useGeolocation(user?.role === 'member' ? user.id : undefined);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white font-bold text-xl">Initializing System...</div>;
  }

  return (
    <Router>
      {user && <FacebookNavbar user={user} onLogout={handleLogout} />}
      {user && <RoboticSidebar user={user} />}
      <div className={`transition-all duration-300 ${user ? 'pl-0 lg:pl-[72px]' : ''}`}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} /> : <LoginPage onLogin={setUser} />} />
          <Route path="/register" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} /> : <RegistrationPage />} />
          
          <Route path="/" element={
            user ? (
              user.role === 'member' ? <MemberFeed user={user} /> : <Navigate to="/admin" />
            ) : <LandingPage />
          } />

          <Route path="/messenger" element={<ProtectedRoute user={user} role="member"><MessengerPage user={user!} /></ProtectedRoute>} />

          <Route path="/admin/*" element={<ProtectedRoute user={user} role="admin"><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
