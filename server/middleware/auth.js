//server/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // Verificar si el header existe y tiene formato correcto
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ Header Authorization ausente o mal formado');
    return res.status(401).json({ error: 'Token no proporcionado o mal formado' });
  }

  // Extraer el token
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.error('❌ Token no extraído correctamente');
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  // Verificar el token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('❌ Error al verificar token:', err);

      switch (err.name) {
        case 'TokenExpiredError':
          return res.status(401).json({ error: 'Token expirado' });
        case 'JsonWebTokenError':
          return res.status(401).json({ error: 'Token inválido' });
        case 'NotBeforeError':
          return res.status(401).json({ error: 'Token no activo aún' });
        default:
          return res.status(401).json({ error: 'Error de autenticación' });
      }
    }

    // Token válido
    req.userId = decoded.id;
    next();
  });
};