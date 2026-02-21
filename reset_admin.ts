
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('lccad.db');

// 1. Delete existing admin
console.log('Deleting existing admin...');
db.prepare('DELETE FROM admins WHERE username = ?').run('admin');

// 2. Create new hash
const password = 'admin123';
const hashedPassword = bcrypt.hashSync(password, 10);
console.log('Generated new hash:', hashedPassword);

// 3. Insert new admin
console.log('Inserting new admin...');
db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', hashedPassword);

// 4. Verify
const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');
console.log('Admin record:', admin);

const match = bcrypt.compareSync(password, admin.password);
console.log('Verification match:', match);
