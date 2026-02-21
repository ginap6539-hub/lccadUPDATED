export interface Member {
  id: number;
  name: string;
  address: string;
  position: string;
  agency_lgu: string;
  province_region: string;
  mobile_number: string;
  email: string;
  website?: string;
  photo_url?: string;
  training_climate_change: number;
  training_digitalization: number;
  training_creative_industries: number;
  latitude?: number;
  longitude?: number;
  last_seen?: string;
  created_at: string;
}

export interface Post {
  id: number;
  member_id: number;
  member_name: string;
  content: string;
  image_url?: string;
  created_at: string;
  reactions?: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  stock: number;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
}

export interface User {
  id: number;
  username?: string;
  name?: string;
  role: 'admin' | 'member';
}
