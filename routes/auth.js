const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { verificarToken } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password;

    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Ingresa tu correo y contraseña' });
    }

    // unscoped() trae la contraseña, que el defaultScope oculta
    const u = await Usuario.unscoped().findOne({ where: { email } });
    if (!u || !(await bcrypt.compare(password, u.password))) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    }

    if (u.estado !== 'Activo') {
      return res.status(403).json({ message: 'Tu usuario está inactivo' });
    }

    const token = jwt.sign({ id: u.id, rol: u.rol }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

    res.json({
      token,
      usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol },
    });
  } catch (e) {
    // Esto imprime el error real en Render -> Logs
    console.error('Error en login:', e);
    res.status(500).json({ message: 'No se pudo iniciar sesión' });
  }
});

router.get('/me', verificarToken, async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.usuario.id);
    if (!u || u.estado !== 'Activo') {
      return res.status(401).json({ message: 'Usuario no disponible' });
    }
    res.json(u);
  } catch (e) {
    console.error('Error en /me:', e);
    res.status(500).json({ message: 'Error interno' });
  }
});

module.exports = router;