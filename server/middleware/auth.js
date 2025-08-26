//server/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log('Header Authorization:', authHeader); // Log para depuración
    
    // Verificar si el header existe
    if (!authHeader) {
        console.error('No se proporcionó el header Authorization');
        return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    // Extraer el token del header (formato: Bearer <token>)
    const token = authHeader.split(' ')[1];
    console.log('Token extraído:', token); // Log para depuración
    
    // Verificar si se extrajo el token correctamente
    if (!token) {
        console.error('No se pudo extraer el token del header Authorization');
        return res.status(401).json({ error: 'Formato de token inválido' });
    }
    
    // Verificar el token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('Error al verificar token:', err); // Log para depuración
            
            // Mensajes de error más específicos
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expirado' });
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: 'Token inválido' });
            } else if (err.name === 'NotBeforeError') {
                return res.status(401).json({ error: 'Token no activo' });
            } else {
                return res.status(401).json({ error: 'Error de autenticación' });
            }
        }
        
        console.log('Token válido:', decoded); // Log para depuración
        req.userId = decoded.id;
        next();
    });
};