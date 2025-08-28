//server/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const ensureSchema = require('./ensureSchema');

// Ruta al archivo de la base de datos
const dbPath = path.resolve(__dirname, '../rifa.db');

// Crear la conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al abrir la base de datos:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos SQLite.');
    ensureSchema(db); // Verifica y crea tablas + datos iniciales
    db.serialize(() => {
      populateNumbers();
      verifyAndAddColumns();
    });
  }
});

// Verificar y agregar columnas faltantes en "numbers"
function verifyAndAddColumns() {
  const requiredColumns = [
    { name: 'buyer_address', type: 'TEXT' },
    { name: 'winner_name', type: 'TEXT' },
    { name: 'draw_date', type: 'DATETIME' }
  ];

  db.all("PRAGMA table_info(numbers)", (err, columns) => {
    if (err) {
      console.error('❌ Error al obtener esquema de tabla numbers:', err.message);
      return;
    }

    const existing = columns.map(col => col.name);

    requiredColumns.forEach(col => {
      if (!existing.includes(col.name)) {
        db.run(`ALTER TABLE numbers ADD COLUMN ${col.name} ${col.type}`, (err) => {
          if (err) {
            console.error(`❌ Error al agregar columna ${col.name}:`, err.message);
          } else {
            console.log(`✅ Columna "${col.name}" agregada a tabla "numbers"`);
          }
        });
      } else {
        console.log(`ℹ️ Columna "${col.name}" ya existe en tabla "numbers"`);
      }
    });
  });
}

// Poblar los números del 00 al 99 si no existen
function populateNumbers() {
  db.get("SELECT COUNT(*) as count FROM numbers", (err, row) => {
    if (err) {
      console.error('❌ Error al contar números:', err.message);
      return;
    }

    console.log(`ℹ️ Hay ${row.count} números en la base de datos`);

    if (row.count === 0) {
      console.log('📥 Insertando números del 00 al 99...');
      const numbers = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
      const stmt = db.prepare("INSERT INTO numbers (number) VALUES (?)");

      numbers.forEach(num => {
        stmt.run(num, (err) => {
          if (err) console.error(`❌ Error al insertar número ${num}:`, err.message);
        });
      });

      stmt.finalize((err) => {
        if (err) console.error('❌ Error al finalizar inserción:', err.message);
        else console.log('✅ Números insertados correctamente');
      });
    }
  });
}

module.exports = db;