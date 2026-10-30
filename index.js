const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const sequelize = require('./config/db');
const { Producto, Categoria, Proveedor, Usuario } = require('./models'); // registra modelos y relaciones
const crud = require('./routes/crud');
const swaggerSpec = require('./swagger');

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- DOCUMENTACIÓN ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- RUTA DE PRUEBA ---
app.get('/', (req, res) => {
  res.send('¡API Backend funcionando exitosamente!');
});

// --- RUTAS ---
app.use('/categorias', crud(Categoria, { required: ['nombre'] }));
app.use('/proveedores', crud(Proveedor, { required: ['razon_social'] }));
app.use('/usuarios', crud(Usuario, { required: ['nombre', 'email', 'password'] }));
// un producto no se puede crear sin una categoría
app.use('/productos', crud(Producto, {
  include: [Categoria, Proveedor],
  required: ['nombre', 'precio', 'categoria_id'],
}));
app.use('/movimientos', require('./routes/movimientos'));
app.use('/dashboard', require('./routes/dashboard'));

// --- SINCRONIZACIÓN Y ARRANQUE ---
const PORT = process.env.PORT || 3006;
// DB_ALTER=true en el .env agrega las columnas nuevas a tablas que ya existen
const alter = process.env.DB_ALTER === 'true';

sequelize.sync({ force: false, alter })
  .then(() => {
    console.log('Base de datos conectada y sincronizada.');
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar con la base de datos:', error);
  });