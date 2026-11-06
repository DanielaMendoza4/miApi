const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET debe estar configurado para iniciar el backend.');
}

const sequelize = require('./config/db');
const { Producto, Categoria, Proveedor, Usuario, Movimiento } = require('./models');
const crud = require('./routes/crud');
const swaggerSpec = require('./swagger');

const app = express();
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// --- MIDDLEWARES ---
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json());

// --- DOCUMENTACIÓN ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- RUTA DE PRUEBA ---
app.get('/', (req, res) => {
  res.send('¡API Backend funcionando exitosamente!');
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
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
const iniciarServidor = async () => {
  if (process.env.NODE_ENV !== 'production') {
    try {
    await sequelize.sync({ force: false, alter: true });
    console.log('Base de datos conectada y sincronizada.');
    await seedInicial();
    } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    }
  } else {
    console.log('Modo producción activo: Sincronización omitida.');
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
};

iniciarServidor();
