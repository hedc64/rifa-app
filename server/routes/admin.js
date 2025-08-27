//server/routes/admin.js
//server/routes/admin.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM admin WHERE username = ?", [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Credenciales inválidas' });
        
        const passwordIsValid = bcrypt.compareSync(password, row.password);
        if (!passwordIsValid) return res.status(401).json({ error: 'Credenciales inválidas' });
        
        const token = jwt.sign({ id: row.id }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    });
});

// Obtener números (admin)
router.get('/numbers', authMiddleware, (req, res) => {
    db.all("SELECT * FROM numbers ORDER BY number", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Ruta para ver datos de la base de datos (accesible por HTTP)
router.get('/view-data', authMiddleware, (req, res) => {
    db.all("SELECT * FROM numbers ORDER BY number", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Configurar fecha del sorteo
router.post('/configure-sorteo', authMiddleware, (req, res) => {
    const { sorteoDate } = req.body;
    
    if (!sorteoDate) {
        return res.status(400).json({ error: 'Debe proporcionar una fecha para el sorteo' });
    }
    
    // Guardar la fecha del sorteo en formato YYYY-MM-DD
    const date = new Date(sorteoDate);
    const formattedDate = date.toISOString().split('T')[0];
    
    db.run(
        "INSERT OR REPLACE INTO config (key, value) VALUES ('sorteo_date', ?)",
        [formattedDate],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Fecha del sorteo configurada correctamente' });
        }
    );
});

// Validar pago individual
router.post('/validate', authMiddleware, (req, res) => {
    const { 
        number, 
        buyer_name, 
        buyer_phone, 
        buyer_id,
        buyer_address
    } = req.body;
    
    db.run(
        `UPDATE numbers SET 
            status = 'comprado', 
            validated_at = ?,
            buyer_name = ?,
            buyer_phone = ?,
            buyer_id = ?,
            buyer_address = ?
        WHERE number = ? AND status = 'seleccionado'`,
        [
            new Date().toISOString(),
            buyer_name,
            buyer_phone,
            buyer_id,
            buyer_address,
            number
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(400).json({ error: 'Número no encontrado o no está en estado seleccionado' });
            res.json({ message: 'Número validado correctamente' });
        }
    );
});

// Validar múltiples pagos
router.post('/validate-multiple', authMiddleware, (req, res) => {
    const { 
        numbers, 
        buyer_name, 
        buyer_phone, 
        buyer_id,
        buyer_address
    } = req.body;
    
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ error: 'Debe seleccionar al menos un número' });
    }
    
    const validatedAt = new Date().toISOString();
    const placeholders = numbers.map(() => '?').join(',');
    
    // Verificar que todos los números estén en estado 'seleccionado'
    db.all(
        `SELECT number FROM numbers WHERE number IN (${placeholders}) AND status = 'seleccionado'`,
        numbers,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const availableNumbers = rows.map(row => row.number);
            const notAvailable = numbers.filter(num => !availableNumbers.includes(num));
            
            if (notAvailable.length > 0) {
                return res.status(400).json({ error: `Los siguientes números no están disponibles: ${notAvailable.join(', ')}` });
            }
            
            // Actualizar todos los números
            const stmt = db.prepare(
                `UPDATE numbers SET 
                    status = 'comprado', 
                    validated_at = ?,
                    buyer_name = ?,
                    buyer_phone = ?,
                    buyer_id = ?,
                    buyer_address = ?
                WHERE number = ?`
            );
            
            let hasError = false;
            numbers.forEach(num => {
                stmt.run(validatedAt, buyer_name, buyer_phone, buyer_id, buyer_address, num, (err) => {
                    if (err) {
                        console.error(`Error al validar número ${num}:`, err);
                        hasError = true;
                    }
                });
            });
            
            stmt.finalize((err) => {
                if (err || hasError) {
                    return res.status(500).json({ error: 'Error al validar los números' });
                }
                res.json({ message: `${numbers.length} números validados correctamente` });
            });
        }
    );
});

// Declarar ganador
router.post('/winner', authMiddleware, (req, res) => {
    const { 
        number, 
        winner_name,
        draw_date 
    } = req.body;
    
    db.run(
        `UPDATE numbers SET 
            status = 'ganador',
            winner_name = ?,
            draw_date = ?
        WHERE number = ? AND status = 'comprado'`,
        [
            winner_name,
            draw_date,
            number
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(400).json({ error: 'Número no encontrado o no está comprado' });
            
            db.get("SELECT * FROM numbers WHERE number = ?", [number], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ 
                    message: 'Ganador declarado correctamente', 
                    winner: row 
                });
            });
        }
    );
});

// Resetear rifa para nuevo sorteo
router.post('/reset', authMiddleware, (req, res) => {
    db.run(
        `UPDATE numbers SET 
            status = 'disponible',
            selected_at = NULL,
            buyer_name = NULL,
            buyer_phone = NULL,
            buyer_id = NULL,
            buyer_address = NULL,
            validated_at = NULL,
            winner_name = NULL,
            draw_date = NULL
        `,
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // También resetear la fecha del sorteo
            db.run(
                "DELETE FROM config WHERE key = 'sorteo_date'",
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Rifa reseteada correctamente para nuevo sorteo' });
                }
            );
        }
    );
});

module.exports = router;