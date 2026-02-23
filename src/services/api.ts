import { supabase } from '../supabaseClient';

export const subscribeToAdminNotifications = (callback: (data: any) => void) => {
  const channel = supabase
    .channel('admin-notifications')
    .on('broadcast', { event: 'admin-notification' }, (payload) => callback(payload.payload))
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToPosts = (callback: (post: any) => void) => {
  const channel = supabase
    .channel('posts-channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
      // Fetch member name for the new post
      const { data: member } = await supabase
        .from('members')
        .select('name')
        .eq('id', payload.new.member_id)
        .single();
      
      callback({ ...payload.new, member_name: member?.name });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToMessages = (callback: (msg: any) => void) => {
  const channel = supabase
    .channel('messages-channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      callback(payload.new);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const joinUserRoom = (userId: number) => {
  // Supabase Realtime handles this differently
};

export default supabase;
