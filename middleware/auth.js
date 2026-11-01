   const jwt = require('jsonwebtoken');

   const verificarToken = (req, res, next) => {
     const [tipo, token] = (req.headers.authorization || '').split(' ');
     if (tipo !== 'Bearer' || !token) {
       return res.status(401).json({ message: 'Debes iniciar sesión' });
     }
     try {
       req.usuario = jwt.verify(token, process.env.JWT_SECRET); // { id, rol }
       next();
     } catch {
       res.status(401).json({ message: 'Tu sesión venció. Inicia sesión otra vez' });
     }
   };

   const requerirRol = (...roles) => (req, res, next) =>
     roles.includes(req.usuario?.rol)
       ? next()
       : res.status(403).json({ message: 'No tienes permiso para esta acción' });

   module.exports = { verificarToken, requerirRol };