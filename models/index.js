// Carga todos los modelos y define las relaciones (llaves foráneas)
const Producto = require('./Producto');
const Categoria = require('./Categoria');
const Proveedor = require('./Proveedor');
const Usuario = require('./Usuario');
const Movimiento = require('./Movimiento');

// Categoria 1 -> N Productos
Categoria.hasMany(Producto, { foreignKey: 'categoria_id' });
Producto.belongsTo(Categoria, { foreignKey: 'categoria_id' });

// Proveedor 1 -> N Productos
Proveedor.hasMany(Producto, { foreignKey: 'proveedor_id' });
Producto.belongsTo(Proveedor, { foreignKey: 'proveedor_id' });

// Producto 1 -> N Movimientos
Producto.hasMany(Movimiento, { foreignKey: { name: 'producto_id', allowNull: false } });
Movimiento.belongsTo(Producto, { foreignKey: { name: 'producto_id', allowNull: false } });

// Usuario 1 -> N Movimientos
Usuario.hasMany(Movimiento, { foreignKey: { name: 'usuario_id', allowNull: false } });
Movimiento.belongsTo(Usuario, { foreignKey: { name: 'usuario_id', allowNull: false } });

module.exports = { Producto, Categoria, Proveedor, Usuario, Movimiento };