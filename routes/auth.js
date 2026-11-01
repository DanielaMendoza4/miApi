   const router = require('express').Router();
   const bcrypt = require('bcryptjs');
   const jwt = require('jsonwebtoken');
   const Usuario = require('../models/Usuario');
   const { verificarToken } = require('../middleware/auth');

   router.post('/login', async (req, res) => {
     try {
       const { email, password } = req.body || {};
       if (!email || !password) {
         return res.status(400).json({ message: 'Ingresa tu correo y contraseña' });
       }
       // unscoped() trae la contraseña, que el defaultScope oculta
       const u = await Usuario.unscoped().findOne({ where: { email } });
       if (!u || !(await bcrypt.compare(password, u.password))) {
         return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
       }
       const token = jwt.sign({ id: u.id, rol: u.rol }, process.env.JWT_SECRET, {
         expiresIn: process.env.JWT_EXPIRES_IN,
       });
       res.json({ token, usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol } });
     } catch (e) {
       res.status(500).json({ message: 'No se pudo iniciar sesión' });
     }
   });

   router.get('/me', verificarToken, async (req, res) => {
     const u = await Usuario.findByPk(req.usuario.id);
     if (!u) return res.status(401).json({ message: 'Usuario no disponible' });
     res.json(u);
   });

   module.exports = router;