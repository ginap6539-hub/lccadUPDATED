import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Shield, CheckCircle2 } from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import * as bcrypt from 'bcryptjs';
import { Member } from '../types';

const PromoteMemberModal = ({ member, onClose }: { member: Member, onClose: () => void }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      const { data: existingAdmin } = await supabase
        .from('admins')
        .select('id')
        .eq('username', member.email)
        .maybeSingle();

      if (existingAdmin) {
        throw new Error('An admin with this email already exists.');
      }

      const hashedPassword = bcrypt.hashSync(password, 10);

      const { error: insertError } = await supabase
        .from('admins')
        .insert({ username: member.email, password: hashedPassword });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(onClose, 2000);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[3000] flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden robot-glow"
      >
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <h2 className="text-xl font-bold tech-font uppercase tracking-widest flex items-center gap-2"><Shield size={20} /> Promote to Admin</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {success ? (
            <div className="text-center p-8">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold">Promotion Successful!</h3>
              <p className="text-zinc-500">{member.name} is now an admin.</p>
            </div>
          ) : (
            <>
              <p>You are promoting <span className="font-bold">{member.name}</span> ({member.email}) to an admin role.</p>
              <p className="text-sm text-zinc-500">Please set a secure password for their new admin account. They can use this password to log in to the admin panel.</p>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest tech-font">New Admin Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-[#1877F2]/20 outline-none" 
                  placeholder="Enter a strong password"
                  required
                />
              </div>

              {error && <div className="text-red-500 text-sm font-medium text-center">{error}</div>}

              <button 
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl mt-6 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-xs tech-font"
              >
                {loading ? 'Processing...' : 'Confirm Promotion'}
              </button>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export default PromoteMemberModal;
