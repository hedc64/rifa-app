// create-config-table.js
const db = require('./server/db');

db.run(`
    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    )
`, (err) => {
    if (err) {
        console.error('Error al crear la tabla config:', err.message);
    } else {
        console.log('Tabla config creada correctamente');
    }
    process.exit();
});