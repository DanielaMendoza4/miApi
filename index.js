const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const sequelize = require('./config/db');
const { Producto, Categoria, Proveedor, Usuario, Movimiento } = require('./models');
const crud = require('./routes/crud');
const swaggerSpec = require('./swagger');

const app = express();

// --- MIDDLEWARES ---
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// --- DOCUMENTACIÓN ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- RUTA DE PRUEBA ---
app.get('/', (req, res) => {
  res.send('¡API Backend funcionando exitosamente!');
});

// --- RUTAS Y ALIAS /api ---
const rutas = {
  '/auth': require('./routes/auth'),
  '/categorias': crud(Categoria, { include: [{ model: Producto, attributes: ['id'] }], required: ['nombre'] }),
  '/proveedores': crud(Proveedor, { required: ['razon_social'] }),
  '/usuarios': crud(Usuario, { required: ['nombre', 'email', 'password'] }),
  '/productos': crud(Producto, {
    include: [
      { model: Categoria, attributes: ['id', 'nombre'] },
      { model: Proveedor, attributes: ['id', 'razon_social'] },
    ],
    required: ['nombre', 'precio', 'categoria_id'],
  }),
  '/movimientos': require('./routes/movimientos'),
  '/dashboard': require('./routes/dashboard'),
};

for (const [ruta, handler] of Object.entries(rutas)) {
  app.use(ruta, handler);
  app.use(`/api${ruta}`, handler);
}

// --- SEED INICIAL AUTOMÁTICO ---
const seedInicial = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const adminUser = await Usuario.unscoped().findOne({ where: { email: adminEmail } });
    if (!adminUser) {
      await Usuario.create({
        nombre: process.env.ADMIN_NOMBRE || 'Daniela Mendoza',
        email: adminEmail,
        password: adminPass,
        rol: 'Administrador',
        estado: 'Activo',
      });
      console.log(`Usuario administrador creado: ${adminEmail} / ${adminPass}`);
    }

    // Si existe daniela@inventario.com, aseguramos su contraseña conocida admin123
    const daniela = await Usuario.unscoped().findOne({ where: { email: 'daniela@inventario.com' } });
    if (daniela) {
      daniela.password = adminPass;
      await daniela.save();
    }

    const catCount = await Categoria.count();
    if (catCount === 0) {
      await Categoria.bulkCreate([
        { nombre: 'Periféricos', descripcion: 'Mouse, teclados y accesorios' },
        { nombre: 'Monitores', descripcion: 'Pantallas y monitores LED' },
        { nombre: 'Almacenamiento', descripcion: 'Discos duros y memorias' },
      ]);
      console.log('Categorías iniciales creadas.');
    }

    const provCount = await Proveedor.count();
    if (provCount === 0) {
      await Proveedor.create({
        razon_social: 'Logitech Perú S.A.C.',
        contacto: 'Carlos Mendoza',
        telefono: '987654321',
        email: 'ventas@logitech.pe',
      });
      console.log('Proveedor inicial creado.');
    }
  } catch (err) {
    console.warn('Aviso en seedInicial:', err.message);
  }
};

// --- SINCRONIZACIÓN Y ARRANQUE ---
const PORT = process.env.PORT || 3006;
const alter = true; // Sincroniza columnas nuevas como 'estado' en usuarios

sequelize.sync({ force: false, alter })
  .then(async () => {
    console.log('Base de datos conectada y sincronizada.');
    await seedInicial();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar con la base de datos:', error);
  });
