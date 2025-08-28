//server/ensureSchema.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../rifa.db');
const db = new sqlite3.Database(dbPath);

// Verificar y crear tablas
function ensureTables() {
  const tables = [
    {
      name: 'numbers',
      create: `
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
      `
    },
    {
      name: 'admin',
      create: `
        CREATE TABLE IF NOT EXISTS admin (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT
        )
      `
    },
    {
      name: 'config',
      create: `
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `
    }
  ];

  tables.forEach(table => {
    db.run(table.create, (err) => {
      if (err) {
        console.error(`❌ Error al crear tabla ${table.name}:`, err.message);
      } else {
        console.log(`✅ Tabla "${table.name}" verificada/creada`);
      }
    });
  });
}

// Insertar datos iniciales
function seedDefaults() {
  db.run(`
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

  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 8);

  db.run(`
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
}

// Exportar función principal
function ensureSchema() {
  ensureTables();
  seedDefaults();
}

module.exports = ensureSchema;