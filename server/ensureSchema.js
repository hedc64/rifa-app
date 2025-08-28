//server/ensureSchema.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../rifa.db');
const db = new sqlite3.Database(dbPath);

// Función principal que garantiza el esquema completo
function ensureSchema(dbInstance) {
  dbInstance.serialize(() => {
    // Crear tabla numbers
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS numbers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT UNIQUE,
        status TEXT DEFAULT 'disponible',
        selected_at DATETIME,
        buyer_name TEXT,
        buyer_phone TEXT,
        buyer_id TEXT,
        buyer_address TEXT,
        validated_at DATETIME,
        winner_name TEXT,
        draw_date DATETIME
      )
    `, (err) => {
      if (err) console.error('❌ Error al crear tabla numbers:', err.message);
      else console.log('✅ Tabla "numbers" verificada/creada');
    });

    // Crear tabla config
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `, (err) => {
      if (err) console.error('❌ Error al crear tabla config:', err.message);
      else console.log('✅ Tabla "config" verificada/creada');
    });

    // Crear tabla admin
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      )
    `, (err) => {
      if (err) console.error('❌ Error al crear tabla admin:', err.message);
      else console.log('✅ Tabla "admin" verificada/creada');
    });

    // Insertar valor inicial en config
    dbInstance.run(`
      INSERT OR IGNORE INTO config (key, value)
      VALUES ('sorteo_date', '2025-09-01')
    `, function(err) {
      if (err) {
        console.error('❌ Error al insertar sorteo_date:', err.message);
      } else if (this.changes > 0) {
        console.log('✅ Valor "sorteo_date" insertado en config');
      } else {
        console.log('ℹ️ Valor "sorteo_date" ya existía en config');
      }
    });

    // Insertar usuario admin por defecto
    const hashedPassword = bcrypt.hashSync('admin123', 8);
    dbInstance.run(`
      INSERT OR IGNORE INTO admin (username, password)
      VALUES ('admin', ?)
    `, [hashedPassword], function(err) {
      if (err) {
        console.error('❌ Error al insertar usuario admin:', err.message);
      } else if (this.changes > 0) {
        console.log('✅ Usuario admin creado: admin / admin123');
      } else {
        console.log('ℹ️ Usuario admin ya existía');
      }
    });
  });
}

module.exports = ensureSchema;