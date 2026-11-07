const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET debe estar configurado para iniciar el backend.');
}

const sequelize = require('./config/db');
const { Producto, Categoria, Proveedor, Usuario } = require('./models');
const crud = require('./routes/crud');
const swaggerSpec = require('./swagger');

const esProduccion = process.env.NODE_ENV === 'production';
const app = express();

// Render está detrás de un proxy
app.set('trust proxy', 1);

// --- CORS ---
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Previews de Vercel de tu proyecto (cada deploy puede generar una URL nueva)
const previewVercel = /^https:\/\/app-inventario-[a-z0-9-]+-danielamendoza4s-projects\.vercel\.app$/;

app.use(cors({
  origin: (origin, cb) => {
    // Peticiones sin Origin (Postman, curl, health checks)
    if (!origin) return cb(null, true);
    if (corsOrigins.includes(origin) || previewVercel.test(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
}));
app.use(express.json());

// --- DOCUMENTACIÓN ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- RUTAS DE PRUEBA ---
app.get('/', (req, res) => {
  res.send('¡API Backend funcionando exitosamente!');
});

// Comprueba también que la base de datos responde
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ ok: true });
  } catch (error) {
    console.error('Health check falló:', error.message);
    res.status(503).json({ ok: false });
  }
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

// --- Manejo global de errores ---
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// --- SEED INICIAL ---
// Solo crea el admin si defines ADMIN_EMAIL y ADMIN_PASSWORD. No imprime contraseñas.
const seedInicial = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPass) {
      const existe = await Usuario.unscoped().findOne({ where: { email: adminEmail } });
      if (!existe) {
        await Usuario.create({
          nombre: process.env.ADMIN_NOMBRE || 'Administrador',
          email: adminEmail,
          password: adminPass,
          rol: 'Administrador',
          estado: 'Activo',
        });
        console.log(`Usuario administrador creado: ${adminEmail}`);
      } else {
        console.log(`El usuario ${adminEmail} ya existe, no se modifica.`);
      }
    }

    if ((await Categoria.count()) === 0) {
      await Categoria.bulkCreate([
        { nombre: 'Periféricos', descripcion: 'Mouse, teclados y accesorios' },
        { nombre: 'Monitores', descripcion: 'Pantallas y monitores LED' },
        { nombre: 'Almacenamiento', descripcion: 'Discos duros y memorias' },
      ]);
      console.log('Categorías iniciales creadas.');
    }

    if ((await Proveedor.count()) === 0) {
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
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos OK.');

    if (!esProduccion) {
      await sequelize.sync({ force: false, alter: true });
      console.log('Base de datos sincronizada.');
      await seedInicial();
    } else if (process.env.DB_SYNC === 'true') {
      // Solo crea las tablas que faltan, no modifica las existentes
      await sequelize.sync({ alter: false });
      console.log('Tablas creadas (DB_SYNC=true).');
      await seedInicial();
    } else {
      console.log('Modo producción: sincronización omitida.');
    }
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
};

iniciarServidor();