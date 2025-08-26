//server/routes/api.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todos los números ordenados
router.get('/numbers', (req, res) => {
    console.log('Petición recibida para obtener números');
    db.all("SELECT * FROM numbers ORDER BY number", (err, rows) => {
        if (err) {
            console.error('Error al obtener números:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`Enviando ${rows.length} números al cliente`);
        res.json(rows);
    });
});

// Obtener fecha del sorteo configurada
router.get('/sorteo-date', (req, res) => {
    db.get("SELECT value FROM config WHERE key = 'sorteo_date'", (err, row) => {
        if (err) {
            console.error('Error al obtener configuración:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (row && row.value) {
            // Devolver la fecha en formato YYYY-MM-DD
            res.json({ date: row.value });
        } else {
            res.json({ date: null });
        }
    });
});

// Seleccionar números
router.post('/select', (req, res) => {
    console.log('Petición de selección recibida:', req.body);
    const { numbers, buyerName, buyerPhone, buyerId } = req.body;
    
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ error: 'Debe seleccionar al menos un número' });
    }

    const placeholders = numbers.map(() => '?').join(',');
    db.all(
        `SELECT number FROM numbers WHERE number IN (${placeholders}) AND status = 'disponible'`,
        numbers,
        (err, rows) => {
            if (err) {
                console.error('Error al verificar disponibilidad:', err);
                return res.status(500).json({ error: err.message });
            }
            
            const availableNumbers = rows.map(row => row.number);
            const notAvailable = numbers.filter(num => !availableNumbers.includes(num));
            
            if (notAvailable.length > 0) {
                return res.status(400).json({ error: `Números no disponibles: ${notAvailable.join(', ')}` });
            }

            const selectedAt = new Date().toISOString();
            const stmt = db.prepare(
                "UPDATE numbers SET status = 'seleccionado', selected_at = ?, buyer_name = ?, buyer_phone = ?, buyer_id = ? WHERE number = ?"
            );
            
            numbers.forEach(num => {
                stmt.run(selectedAt, buyerName, buyerPhone, buyerId, num, (err) => {
                    if (err) console.error(`Error al actualizar número ${num}:`, err);
                });
            });
            
            stmt.finalize((err) => {
                if (err) {
                    console.error('Error al finalizar actualización:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Números actualizados correctamente');
                res.json({ message: 'Números seleccionados. Tiene 1 hora para enviar el comprobante.' });
            });
        }
    );
});

module.exports = router;