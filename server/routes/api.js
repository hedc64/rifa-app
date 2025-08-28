//server/routes/api.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 📊 Obtener todos los números ordenados
router.get('/numbers', (req, res) => {
  console.log('📥 Petición recibida para obtener números');
  db.all("SELECT * FROM numbers ORDER BY number", (err, rows) => {
    if (err) {
      console.error('❌ Error al obtener números:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Enviando ${rows.length} números al cliente`);
    res.json(rows);
  });
});

// 🏆 Verificar si hay un ganador declarado
router.get('/has-winner', (req, res) => {
  db.get("SELECT * FROM numbers WHERE status = 'ganador' LIMIT 1", (err, row) => {
    if (err) {
      console.error('❌ Error al verificar ganador:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ hasWinner: !!row });
  });
});

// 📅 Obtener fecha del sorteo configurada
router.get('/sorteo-date', (req, res) => {
  db.get("SELECT draw_date FROM numbers WHERE status = 'ganador' ORDER BY draw_date DESC LIMIT 1", (err, row) => {
    if (err) {
      console.error('❌ Error al obtener fecha del sorteo:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (row?.draw_date) {
      return res.json({ date: row.draw_date });
    }

    // Si no hay ganador, buscar fecha configurada
    db.get("SELECT value FROM config WHERE key = 'sorteo_date'", (err, configRow) => {
      if (err) {
        console.error('❌ Error al obtener configuración:', err.message);
        return res.status(500).json({ error: err.message });
      }

      res.json({ date: configRow?.value || null });
    });
  });
});

// 🛒 Seleccionar números
router.post('/select', (req, res) => {
  console.log('📥 Petición de selección recibida:', req.body);
  const { numbers, buyerName, buyerPhone, buyerId } = req.body;

  if (
    !Array.isArray(numbers) || numbers.length === 0 ||
    !buyerName || !buyerPhone || !buyerId
  ) {
    return res.status(400).json({ error: 'Datos incompletos para la selección' });
  }

  const placeholders = numbers.map(() => '?').join(',');
  db.all(
    `SELECT number FROM numbers WHERE number IN (${placeholders}) AND status = 'disponible'`,
    numbers,
    (err, rows) => {
      if (err) {
        console.error('❌ Error al verificar disponibilidad:', err.message);
        return res.status(500).json({ error: err.message });
      }

      const availableNumbers = rows.map(row => row.number);
      const notAvailable = numbers.filter(num => !availableNumbers.includes(num));

      if (notAvailable.length > 0) {
        return res.status(400).json({
          error: `Números no disponibles: ${notAvailable.join(', ')}`
        });
      }

      const selectedAt = new Date().toISOString();
      const stmt = db.prepare(
        `UPDATE numbers SET 
          status = 'seleccionado', 
          selected_at = ?, 
          buyer_name = ?, 
          buyer_phone = ?, 
          buyer_id = ? 
         WHERE number = ?`
      );

      let hasError = false;
      numbers.forEach(num => {
        stmt.run(selectedAt, buyerName, buyerPhone, buyerId, num, (err) => {
          if (err) {
            console.error(`❌ Error al actualizar número ${num}:`, err.message);
            hasError = true;
          }
        });
      });

      stmt.finalize((err) => {
        if (err || hasError) {
          console.error('❌ Error al finalizar actualización:', err?.message || 'Error interno');
          return res.status(500).json({ error: 'Error al seleccionar los números' });
        }

        console.log(`✅ ${numbers.length} números seleccionados correctamente`);
        res.json({
          message: 'Números seleccionados. Tiene 1 hora para enviar el comprobante.',
          selected: numbers
        });
      });
    }
  );
});

module.exports = router;