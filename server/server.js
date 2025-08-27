//server/server.js
// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs'); // Módulo para manejo de archivos
const db = require('./db');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para redirigir HTTP a HTTPS (excepto para /admin/view-data)
app.use((req, res, next) => {
  // Permitir HTTP para la ruta específica /admin/view-data
  if (req.path === '/admin/view-data') {
    return next();
  }
  
  // Para todas las demás rutas, redirigir a HTTPS
  if (req.protocol === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Crear directorio para copias de seguridad si no existe
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('Directorio de copias de seguridad creado:', backupDir);
}

// Función para crear copia de seguridad
function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sourcePath = path.resolve(__dirname, '../rifa.db');
    const backupPath = path.join(backupDir, `rifa-backup-${timestamp}.db`);
    
    fs.copyFile(sourcePath, backupPath, (err) => {
        if (err) {
            console.error('Error al crear copia de seguridad:', err);
        } else {
            console.log(`Copia de seguridad creada: ${backupPath}`);
            
            // Opcional: Eliminar copias de seguridad antiguas (mantener solo las últimas 7)
            fs.readdir(backupDir, (err, files) => {
                if (err) {
                    console.error('Error al leer directorio de backups:', err);
                    return;
                }
                
                // Ordenar archivos por fecha (más antiguos primero)
                const backupFiles = files
                    .filter(file => file.startsWith('rifa-backup-') && file.endsWith('.db'))
                    .sort();
                
                // Eliminar backups antiguos (mantener solo los 7 más recientes)
                if (backupFiles.length > 7) {
                    const filesToDelete = backupFiles.slice(0, backupFiles.length - 7);
                    filesToDelete.forEach(file => {
                        const filePath = path.join(backupDir, file);
                        fs.unlink(filePath, err => {
                            if (err) console.error(`Error al eliminar backup antiguo ${file}:`, err);
                            else console.log(`Backup antiguo eliminado: ${file}`);
                        });
                    });
                }
            });
        }
    });
}

// Crear la primera copia de seguridad al iniciar
createBackup();

// Programar copias de seguridad diarias (cada 24 horas)
setInterval(createBackup, 24 * 60 * 60 * 1000);

// Job para liberar números después de 1 hora
setInterval(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    db.run(
        `UPDATE numbers SET status = 'disponible', selected_at = NULL, buyer_name = NULL, buyer_phone = NULL, buyer_id = NULL 
         WHERE status = 'seleccionado' AND selected_at < ?`,
        [oneHourAgo.toISOString()],
        (err) => {
            if (err) console.error('Error liberando números:', err);
        }
    );
}, 60000); // Cada minuto

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
    console.log(`Base de datos en: ${path.resolve(__dirname, '../rifa.db')}`);
    console.log(`Copias de seguridad en: ${backupDir}`);
});