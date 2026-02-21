
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('lccad.db');

const email = 'admin@lccad.com';
const password = 'admin123';

console.log(`Attempting login with email: ${email}, password: ${password}`);

let admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(email);
console.log('Search by username (email):', admin);

if (!admin && email === 'admin@lccad.com') {
    console.log('Email matches admin@lccad.com, searching for username "admin"');
    admin = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');
}

console.log('Found admin record:', admin);

if (admin) {
    const match = bcrypt.compareSync(password, admin.password);
    console.log('Password match:', match);
    
    // Test hashing
    const newHash = bcrypt.hashSync(password, 10);
    console.log('New hash for comparison:', newHash);
    console.log('Stored hash:', admin.password);
    console.log('Match with new hash:', bcrypt.compareSync(password, newHash));
} else {
    console.log('Admin not found');
}
