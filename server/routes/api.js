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

// Verificar si hay un ganador declarado
router.get('/has-winner', (req, res) => {
    db.get("SELECT * FROM numbers WHERE status = 'ganador' LIMIT 1", (err, row) => {
        if (err) {
            console.error('Error al verificar ganador:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ hasWinner: !!row });
    });
});

// Obtener fecha del sorteo configurada
router.get('/sorteo-date', (req, res) => {
    db.get("SELECT draw_date FROM numbers WHERE status = 'ganador' ORDER BY draw_date DESC LIMIT 1", (err, row) => {
        if (err) {
            console.error('Error al obtener fecha del sorteo:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (row && row.draw_date) {
            res.json({ date: row.draw_date });
        } else {
            // Si no hay ganador, buscar una fecha configurada para el próximo sorteo
            db.get("SELECT value FROM config WHERE key = 'sorteo_date'", (err, configRow) => {
                if (err) {
                    // Si hay un error (como que la tabla no existe), intentar crear la tabla
                    console.error('Error al obtener configuración:', err);
                    
                    // Crear la tabla config si no existe
                    db.run(`
                        CREATE TABLE IF NOT EXISTS config (
                            key TEXT PRIMARY KEY,
                            value TEXT
                        )
                    `, (createErr) => {
                        if (createErr) {
                            console.error('Error al crear la tabla config:', createErr);
                            return res.status(500).json({ error: createErr.message });
                        }
                        console.log('Tabla config creada automáticamente');
                        // Devolver fecha nula
                        res.json({ date: null });
                    });
                } else {
                    if (configRow && configRow.value) {
                        res.json({ date: configRow.value });
                    } else {
                        res.json({ date: null });
                    }
                }
            });
        }
    });
});

// Seleccionar números
router.post('/select', (req, res) => {
    console.log('Petición de selección recibida:');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const { numbers, buyerName, buyerPhone, buyerId } = req.body;
    
    console.log('Datos extraídos:');
    console.log('Números:', numbers);
    console.log('Nombre del comprador:', buyerName);
    console.log('Teléfono del comprador:', buyerPhone);
    console.log('ID del comprador:', buyerId);
    
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        console.error('Error: No se seleccionaron números');
        return res.status(400).json({ error: 'Debe seleccionar al menos un número' });
    }

    // Verificar disponibilidad
    console.log('Verificando disponibilidad de números...');
    const placeholders = numbers.map(() => '?').join(',');
    const query = `SELECT number FROM numbers WHERE number IN (${placeholders}) AND status = 'disponible'`;
    console.log('Query:', query);
    console.log('Parámetros:', numbers);
    
    db.all(query, numbers, (err, rows) => {
        if (err) {
            console.error('Error al verificar disponibilidad:', err);
            return res.status(500).json({ error: err.message });
        }
        
        console.log('Números disponibles:', rows);
        const availableNumbers = rows.map(row => row.number);
        const notAvailable = numbers.filter(num => !availableNumbers.includes(num));
        
        console.log('Números no disponibles:', notAvailable);
        
        if (notAvailable.length > 0) {
            console.error('Números no disponibles:', notAvailable);
            return res.status(400).json({ error: `Números no disponibles: ${notAvailable.join(', ')}` });
        }

        // Actualizar números a 'seleccionado'
        console.log('Actualizando números a seleccionado...');
        const selectedAt = new Date().toISOString();
        const updateQuery = "UPDATE numbers SET status = 'seleccionado', selected_at = ?, buyer_name = ?, buyer_phone = ?, buyer_id = ? WHERE number = ?";
        console.log('Update query:', updateQuery);
        
        const stmt = db.prepare(updateQuery);
        
        let hasError = false;
        numbers.forEach(num => {
            console.log(`Actualizando número ${num} con datos:`, selectedAt, buyerName, buyerPhone, buyerId);
            stmt.run(selectedAt, buyerName, buyerPhone, buyerId, num, (err) => {
                if (err) {
                    console.error(`Error al actualizar número ${num}:`, err);
                    hasError = true;
                } else {
                    console.log(`Número ${num} actualizado correctamente`);
                }
            });
        });
        
        stmt.finalize((err) => {
            if (err || hasError) {
                console.error('Error al finalizar actualización:', err);
                return res.status(500).json({ error: 'Error al actualizar los números' });
            }
            console.log('Números actualizados correctamente');
            res.json({ message: 'Números seleccionados. Tiene 1 hora para enviar el comprobante.' });
        });
    });
});

module.exports = router;