import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

const uploadFile = async (file: File): Promise<string | null> => {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return null;
  }

  const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
  return data.publicUrl;
};

export const api = {
  login: async (email: string, password: string) => {
    // Try Admin
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('username', email)
      .maybeSingle();

    if (admin) {
      const match = bcrypt.compareSync(password, admin.password);
      if (match) {
        return { user: { id: admin.id, username: admin.username, name: 'Admin', role: 'admin' } };
      }
    }

    // Try Member
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (member) {
      return { user: { ...member, role: 'member' } };
    }

    throw new Error('Invalid credentials');
  },

  register: async (formData: any, photoFile: File | null) => {
    const photo_url = photoFile ? await uploadFile(photoFile) : null;
    
    // Check existing
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('email', formData.email)
      .maybeSingle();
      
    if (existing) throw new Error('Email already registered');

    const { data, error } = await supabase
      .from('members')
      .insert([{
        ...formData,
        photo_url,
        training_climate_change: formData.training_climate_change === 'true' ? 1 : 0,
        training_digitalization: formData.training_digitalization === 'true' ? 1 : 0,
        training_creative_industries: formData.training_creative_industries === 'true' ? 1 : 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getMembers: async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  getPosts: async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, members(name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map((p: any) => ({ ...p, member_name: p.members?.name }));
  },

  createPost: async (memberId: number, content: string, imageFile: File | null) => {
    const image_url = imageFile ? await uploadFile(imageFile) : null;
    const { data, error } = await supabase
      .from('posts')
      .insert([{ member_id: memberId, content, image_url }])
      .select('*, members(name)')
      .single();
      
    if (error) throw error;
    return { ...data, member_name: (data as any).members?.name };
  },

  getMessages: async (userId: number, otherId: number) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId}),receiver_id.eq.0`)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    return data;
  },

  sendMessage: async (senderId: number, receiverId: number, content: string) => {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id: senderId, receiver_id: receiverId, content }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  getProducts: async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    return data;
  },

  addProduct: async (productData: any, imageFile: File | null) => {
    const image_url = imageFile ? await uploadFile(imageFile) : null;
    const { data, error } = await supabase
      .from('products')
      .insert([{ ...productData, image_url }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  updateProduct: async (id: number, productData: any, imageFile: File | null) => {
    const updates: any = { ...productData };
    if (imageFile) {
      updates.image_url = await uploadFile(imageFile);
    }
    
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  updateStock: async (id: number, stock: number) => {
    const { data, error } = await supabase
      .from('products')
      .update({ stock })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  updateLocation: async (memberId: number, latitude: number, longitude: number) => {
    const { error } = await supabase
      .from('members')
      .update({ latitude, longitude, last_seen: new Date().toISOString() })
      .eq('id', memberId);
      
    if (error) throw error;
  },

  updateProfile: async (memberId: number, profileData: any, photoFile: File | null) => {
    const updates: any = { ...profileData };
    if (photoFile) {
      updates.photo_url = await uploadFile(photoFile);
    }
    
    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  
  reactToPost: async (postId: number, memberId: number, type: string) => {
    const { error } = await supabase
      .from('reactions')
      .insert([{ post_id: postId, member_id: memberId, type }]);
    if (error) throw error;
  }
};
