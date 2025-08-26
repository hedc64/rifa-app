//server/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta al archivo de la base de datos
const dbPath = path.resolve(__dirname, '../rifa.db');

// Crear la conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        initializeDatabase();
    }
});

// Función para inicializar la base de datos
function initializeDatabase() {
    // Crear tabla de números con todas las columnas necesarias
    db.run(`
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
        if (err) {
            console.error('Error al crear la tabla numbers', err.message);
        } else {
            console.log('Tabla "numbers" verificada/creada');
            populateNumbers();
            addNewColumns();
        }
    });

    // Crear tabla de admin
    db.run(`
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear la tabla admin', err.message);
        } else {
            console.log('Tabla "admin" verificada/creada');
            createAdminUser();
        }
    });
}

// Función para agregar nuevas columnas si no existen
function addNewColumns() {
    const columns = [
        { name: 'buyer_address', type: 'TEXT' },
        { name: 'winner_name', type: 'TEXT' },
        { name: 'draw_date', type: 'DATETIME' }
    ];

    columns.forEach(col => {
        db.run(`ALTER TABLE numbers ADD COLUMN ${col.name} ${col.type}`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error(`Error al agregar columna ${col.name}:`, err.message);
            } else if (!err) {
                console.log(`Columna ${col.name} agregada correctamente`);
            }
        });
    });
}

// Función para poblar los números del 00 al 99
function populateNumbers() {
    // Verificar si ya existen números
    db.get("SELECT COUNT(*) as count FROM numbers", (err, row) => {
        if (err) {
            console.error('Error al contar números:', err);
            return;
        }
        
        console.log(`Hay ${row.count} números en la base de datos`);
        
        if (row.count === 0) {
            console.log('Insertando números del 00 al 99...');
            const numbers = Array.from({length: 100}, (_, i) => i.toString().padStart(2, '0'));
            const stmt = db.prepare("INSERT INTO numbers (number) VALUES (?)");
            numbers.forEach(num => {
                stmt.run(num, (err) => {
                    if (err) console.error(`Error al insertar número ${num}:`, err);
                });
            });
            stmt.finalize((err) => {
                if (err) console.error('Error al finalizar inserción:', err);
                else console.log('Números insertados correctamente');
            });
        }
    });
}

// Función para crear usuario admin por defecto
function createAdminUser() {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 8);
    
    db.run(
        "INSERT OR IGNORE INTO admin (username, password) VALUES (?, ?)",
        ['admin', hashedPassword],
        function(err) {
            if (err) {
                console.error('Error al crear usuario admin:', err.message);
            } else if (this.changes > 0) {
                console.log('Usuario admin creado: admin / admin123');
            } else {
                console.log('Usuario admin ya existe');
            }
        }
    );
}

module.exports = db;