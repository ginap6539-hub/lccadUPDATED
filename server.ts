import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Supabase environment variables are missing!');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'lccad-secret-key';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    return res.status(200).json({});
  }
  next();
});

app.use(express.json());

// Vercel compatibility for uploads
const isVercel = process.env.VERCEL === '1';
const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create upload directory:', err);
  }
}

app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(`user-${userId}`);
  });
});

// API Routes
app.post('/api/login', async (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  email = email.trim();
  
  try {
    // Try Admin
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('username', email)
      .maybeSingle();

    if (adminError) {
      console.error('Supabase Admin Query Error:', adminError);
    }

    if (admin) {
      console.log('Admin match found for:', email);
      const match = bcrypt.compareSync(password, admin.password);
      if (match) {
        console.log('Admin login successful');
        const token = jwt.sign({ id: admin.id, role: 'admin' }, JWT_SECRET);
        return res.json({ token, user: { id: admin.id, username: admin.username, name: 'Admin', role: 'admin' } });
      } else {
        console.log('Admin password mismatch');
      }
    }

    // Try Member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (memberError) {
      console.error('Supabase Member Query Error:', memberError);
    }

    if (member) {
      // Members in this app don't have passwords in the schema, they just login via email
      return res.json({ user: { ...member, role: 'member' } });
    }

    res.status(401).json({ error: 'Invalid credentials' });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/register', upload.single('photo'), async (req, res) => {
  const {
    name, address, position, agency_lgu, province_region,
    mobile_number, email, website,
    training_climate_change, training_digitalization, training_creative_industries
  } = req.body;
  
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingMember) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const { data: member, error } = await supabase
      .from('members')
      .insert([{
        name, address, position, agency_lgu, province_region,
        mobile_number, email, website, photo_url,
        training_climate_change: training_climate_change === 'true' ? 1 : 0,
        training_digitalization: training_digitalization === 'true' ? 1 : 0,
        training_creative_industries: training_creative_industries === 'true' ? 1 : 0
      }])
      .select()
      .single();

    if (error) throw error;

    io.emit('admin-notification', {
      type: 'NEW_REGISTRATION',
      message: `New member registered: ${name}`,
      data: member
    });

    res.json({ success: true, member });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

app.post('/api/members/:id/profile', upload.single('photo'), async (req, res) => {
  const { id } = req.params;
  const { name, address, position, agency_lgu, province_region, mobile_number, website } = req.body;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  const updateData: any = { name, address, position, agency_lgu, province_region, mobile_number, website };
  if (photo_url) updateData.photo_url = photo_url;

  const { data: member, error } = await supabase
    .from('members')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(member);
});

app.get('/api/members', async (req, res) => {
  const { data: members, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(members);
});

app.post('/api/members/:id/location', async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;
  const { data: member, error } = await supabase
    .from('members')
    .update({ latitude, longitude, last_seen: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  io.emit('location-update', member);
  res.json({ success: true });
});

app.post('/api/posts', upload.single('image'), async (req, res) => {
  const { member_id, content } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const { data: post, error } = await supabase
    .from('posts')
    .insert([{ member_id, content, image_url }])
    .select('*, members(name)')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  const formattedPost = { ...post, member_name: (post as any).members?.name };
  io.emit('new-post', formattedPost);
  res.json(formattedPost);
});

app.get('/api/posts', async (req, res) => {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, members(name)')
    .order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  const formattedPosts = posts.map(p => ({ ...p, member_name: (p as any).members?.name }));
  res.json(formattedPosts);
});

app.post('/api/posts/:id/react', async (req, res) => {
  const { id } = req.params;
  const { member_id, type } = req.body;
  await supabase.from('reactions').insert([{ post_id: id, member_id, type }]);
  const { data: post } = await supabase.from('posts').select('*').eq('id', id).single();
  const { data: member } = await supabase.from('members').select('*').eq('id', member_id).single();
  if (post && member && post.member_id !== member_id) {
    io.to(`user-${post.member_id}`).emit('notification', {
      type: 'POST_REACTION',
      message: `${member.name} reacted to your post`,
      post_id: id
    });
  }
  res.json({ success: true });
});

app.get('/api/products', async (req, res) => {
  const { data: products, error } = await supabase.from('products').select('*');
  if (error) return res.status(400).json({ error: error.message });
  res.json(products);
});

app.post('/api/admin/products', upload.single('image'), async (req, res) => {
  const { name, description, price, stock } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const { data: product, error } = await supabase
    .from('products')
    .insert([{ name, description, price, stock, image_url }])
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  if (parseInt(stock) === 0) {
    io.emit('admin-notification', {
      type: 'STOCK_ALERT',
      message: `CRITICAL: Product "${name}" is OUT OF STOCK!`,
      data: { productId: product.id, name }
    });
  }
  res.json({ id: product.id });
});

app.put('/api/admin/products/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;
  const updateData: any = { name, description, price, stock };
  if (image_url) updateData.image_url = image_url;
  const { data: product, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  io.emit('product-update', product);
  res.json(product);
});

app.post('/api/admin/products/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;
  const { data: product, error } = await supabase
    .from('products')
    .update({ stock })
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  io.emit('product-update', product);
  if (parseInt(stock) === 0) {
    io.emit('admin-notification', {
      type: 'STOCK_ALERT',
      message: `CRITICAL: Product "${product.name}" is OUT OF STOCK!`,
      data: { productId: id, name: product.name }
    });
  }
  res.json({ success: true, product });
});

app.get('/api/messages/:userId/:otherId', async (req, res) => {
  const { userId, otherId } = req.params;
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId}),receiver_id.eq.0`)
    .order('created_at', { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json(messages);
});

app.post('/api/messages', async (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  const { data: message, error } = await supabase
    .from('messages')
    .insert([{ sender_id, receiver_id, content }])
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  if (receiver_id === 0) {
    io.emit('broadcast-message', message);
  } else {
    io.to(`user-${receiver_id}`).emit('private-message', message);
  }
  res.json(message);
});

if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static('dist'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
