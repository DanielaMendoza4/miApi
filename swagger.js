const swaggerJsdoc = require('swagger-jsdoc');

// Construye la documentación de un CRUD a partir de su nombre y un ejemplo
const crud = (ruta, etiqueta, ejemplo) => {
  const cuerpo = {
    required: true,
    content: { 'application/json': { schema: { type: 'object', example: ejemplo } } },
  };
  const id = [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }];
  const ok = { 200: { description: 'OK' } };
  return {
    [`/${ruta}`]: {
      get: { tags: [etiqueta], summary: `Listar ${etiqueta}`, responses: ok },
      post: { tags: [etiqueta], summary: `Crear en ${etiqueta}`, requestBody: cuerpo, responses: ok },
    },
    [`/${ruta}/{id}`]: {
      put: { tags: [etiqueta], summary: `Actualizar en ${etiqueta}`, parameters: id, requestBody: cuerpo, responses: ok },
      delete: { tags: [etiqueta], summary: `Eliminar en ${etiqueta}`, parameters: id, responses: ok },
    },
  };
};

const paths = {
  ...crud('categorias', 'Categorías', { nombre: 'Periféricos', descripcion: 'Mouse, teclados y audífonos' }),
  ...crud('proveedores', 'Proveedores', {
    razon_social: 'Logitech Perú S.A.C.', contacto: 'Carlos Mendoza', telefono: '987654321', email: 'ventas@logitech.pe',
  }),
  ...crud('usuarios', 'Usuarios', {
    nombre: 'Daniela Mendoza', email: 'daniela@inventario.com', password: 'clave-segura', rol: 'Administrador',
  }),
  ...crud('productos', 'Productos', {
    nombre: 'Mouse Logitech G203', descripcion: 'Mouse gamer', precio: 85, stock: 0, categoria_id: 1, proveedor_id: 1,
  }),
  '/movimientos': {
    get: { tags: ['Kardex'], summary: 'Listar movimientos', responses: { 200: { description: 'OK' } } },
    post: {
      tags: ['Kardex'],
      summary: 'Registrar movimiento (actualiza el stock con una transacción)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              example: { producto_id: 1, usuario_id: 1, tipo_movimiento: 'Entrada', cantidad: 15, observaciones: 'Compra inicial' },
            },
          },
        },
      },
      responses: { 201: { description: 'Movimiento registrado' } },
    },
  },
  '/dashboard': {
    get: { tags: ['Dashboard'], summary: 'Indicadores del panel', responses: { 200: { description: 'OK' } } },
  },
};

module.exports = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'miApi - Panel de inventario', version: '2.0.0' },
    paths,
  },
  apis: [],
});