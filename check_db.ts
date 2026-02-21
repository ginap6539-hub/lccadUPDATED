
import Database from 'better-sqlite3';
const db = new Database('lccad.db');

const admins = db.prepare('SELECT * FROM admins').all();
console.log('Admins:', admins);

const members = db.prepare('SELECT * FROM members').all();
console.log('Members:', members.length);
