import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('lccad.db');
const JWT_SECRET = process.env.JWT_SECRET || 'lccad-secret-key';

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    address TEXT,
    position TEXT,
    agency_lgu TEXT,
    province_region TEXT,
    mobile_number TEXT,
    email TEXT UNIQUE,
    website TEXT,
    photo_url TEXT,
    training_climate_change INTEGER DEFAULT 0,
    training_digitalization INTEGER DEFAULT 0,
    training_creative_industries INTEGER DEFAULT 0,
    latitude REAL,
    longitude REAL,
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    content TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    member_id INTEGER,
    type TEXT,
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    price REAL,
    image_url TEXT,
    stock INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER, -- 0 for admin
    receiver_id INTEGER, -- 0 for all
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Admin if not exists or update password
const hashedPassword = bcrypt.hashSync('admin123', 10);

// Ensure 'admin' user exists
const adminUser = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');
if (!adminUser) {
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', hashedPassword);
} else {
  db.prepare('UPDATE admins SET password = ? WHERE username = ?').run(hashedPassword, 'admin');
}

// Ensure 'admin@lccad.com' user exists (as a backup username)
const adminEmailUser = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin@lccad.com');
if (!adminEmailUser) {
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin@lccad.com', hashedPassword);
} else {
  db.prepare('UPDATE admins SET password = ? WHERE username = ?').run(hashedPassword, 'admin@lccad.com');
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Enable CORS for Express
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
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Socket.io logic
io.on('connection', (socket) => {
  console.log('A user connected');
  
  socket.on('join', (userId) => {
    socket.join(`user-${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// API Routes
app.post('/api/login', (req, res) => {
  let { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  email = email.trim();
  
  console.log(`Login attempt for: ${email}`);
  
  // Try Admin first
  let admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(email);
  
  // Fallback for admin@lccad.com or admin username
  if (!admin && (email === 'admin@lccad.com' || email === 'admin')) {
     admin = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');
  }

  if (admin) {
    console.log('Admin found:', admin.username);
    const match = bcrypt.compareSync(password, admin.password);
    console.log('Password match:', match);
    if (match) {
      const token = jwt.sign({ id: admin.id, role: 'admin' }, JWT_SECRET);
      return res.json({ token, user: { id: admin.id, username: admin.username, name: 'Admin', role: 'admin' } });
    } else {
      console.log('Admin password incorrect');
    }
  } else {
    console.log('Admin not found');
  }

  // Try Member
  const member = db.prepare('SELECT * FROM members WHERE email = ?').get(email);
  if (member) {
    console.log('Member found:', member.email);
    return res.json({ user: { ...member, role: 'member' } });
  }

  console.log('Login failed: No matching user found');
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/register', upload.single('photo'), (req, res) => {
  console.log('Registration attempt:', req.body);
  const {
    name, address, position, agency_lgu, province_region,
    mobile_number, email, website,
    training_climate_change, training_digitalization, training_creative_industries
  } = req.body;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

  // Check if email already exists
  const existingMember = db.prepare('SELECT id FROM members WHERE email = ?').get(email);
  if (existingMember) {
    console.log('Registration failed: Email already exists', email);
    return res.status(400).json({ error: 'Email already registered. Please login.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO members (
        name, address, position, agency_lgu, province_region,
        mobile_number, email, website, photo_url,
        training_climate_change, training_digitalization, training_creative_industries
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, address, position, agency_lgu, province_region,
      mobile_number, email, website, photo_url,
      training_climate_change === 'true' ? 1 : 0,
      training_digitalization === 'true' ? 1 : 0,
      training_creative_industries === 'true' ? 1 : 0
    );

    const memberId = result.lastInsertRowid;
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);

    console.log('Registration successful:', member.name);

    io.emit('admin-notification', {
      type: 'NEW_REGISTRATION',
      message: `New member registered: ${name}`,
      data: member
    });

    res.json({ success: true, member });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/members/:id/profile', upload.single('photo'), (req, res) => {
  const { id } = req.params;
  const { name, address, position, agency_lgu, province_region, mobile_number, website } = req.body;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (photo_url) {
    db.prepare(`
      UPDATE members SET name = ?, address = ?, position = ?, agency_lgu = ?, province_region = ?, mobile_number = ?, website = ?, photo_url = ?
      WHERE id = ?
    `).run(name, address, position, agency_lgu, province_region, mobile_number, website, photo_url, id);
  } else {
    db.prepare(`
      UPDATE members SET name = ?, address = ?, position = ?, agency_lgu = ?, province_region = ?, mobile_number = ?, website = ?
      WHERE id = ?
    `).run(name, address, position, agency_lgu, province_region, mobile_number, website, id);
  }

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  res.json(member);
});

app.get('/api/members', (req, res) => {
  const members = db.prepare('SELECT * FROM members ORDER BY created_at DESC').all();
  res.json(members);
});

app.post('/api/members/:id/location', (req, res) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;
  
  db.prepare('UPDATE members SET latitude = ?, longitude = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(latitude, longitude, id);
  
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  io.emit('location-update', member);
  
  res.json({ success: true });
});

// Social Routes
app.post('/api/posts', upload.single('image'), (req, res) => {
  const { member_id, content } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db.prepare('INSERT INTO posts (member_id, content, image_url) VALUES (?, ?, ?)').run(member_id, content, image_url);
  const post = db.prepare(`
    SELECT p.*, m.name as member_name 
    FROM posts p 
    JOIN members m ON p.member_id = m.id 
    WHERE p.id = ?
  `).get(result.lastInsertRowid);

  io.emit('new-post', post);
  res.json(post);
});

app.get('/api/posts', (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, m.name as member_name 
    FROM posts p 
    JOIN members m ON p.member_id = m.id 
    ORDER BY p.created_at DESC
  `).all();
  res.json(posts);
});

app.post('/api/posts/:id/react', (req, res) => {
  const { id } = req.params;
  const { member_id, type } = req.body;

  db.prepare('INSERT INTO reactions (post_id, member_id, type) VALUES (?, ?, ?)').run(id, member_id, type);
  
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);

  // Notify post owner
  if (post.member_id !== member_id) {
    io.to(`user-${post.member_id}`).emit('notification', {
      type: 'POST_REACTION',
      message: `${member.name} reacted to your post`,
      post_id: id
    });
  }

  res.json({ success: true });
});

// E-commerce Routes
app.get('/api/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  res.json(products);
});

app.post('/api/admin/products', upload.single('image'), (req, res) => {
  const { name, description, price, stock } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db.prepare('INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)').run(name, description, price, stock, image_url);
  const productId = result.lastInsertRowid;

  if (parseInt(stock) === 0) {
    io.emit('admin-notification', {
      type: 'STOCK_ALERT',
      message: `CRITICAL: Product "${name}" is OUT OF STOCK!`,
      data: { productId, name }
    });
  }

  res.json({ id: productId });
});

app.put('/api/admin/products/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  if (image_url) {
    db.prepare('UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image_url = ? WHERE id = ?')
      .run(name, description, price, stock, image_url, id);
  } else {
    db.prepare('UPDATE products SET name = ?, description = ?, price = ?, stock = ? WHERE id = ?')
      .run(name, description, price, stock, id);
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  io.emit('product-update', product);
  res.json(product);
});

app.post('/api/admin/products/:id/stock', (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stock, id);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

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

// Messaging
app.get('/api/messages/:userId/:otherId', (req, res) => {
  const { userId, otherId } = req.params;
  const messages = db.prepare(`
    SELECT * FROM messages 
    WHERE (sender_id = ? AND receiver_id = ?) 
       OR (sender_id = ? AND receiver_id = ?)
       OR (receiver_id = 0)
    ORDER BY created_at ASC
  `).all(userId, otherId, otherId, userId);
  res.json(messages);
});

app.post('/api/messages', (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  const result = db.prepare('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)').run(sender_id, receiver_id, content);
  
  const message = { id: result.lastInsertRowid, sender_id, receiver_id, content, created_at: new Date() };

  if (receiver_id === 0) {
    io.emit('broadcast-message', message);
  } else {
    io.to(`user-${receiver_id}`).emit('private-message', message);
  }

  res.json(message);
});

// Vite Middleware
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
