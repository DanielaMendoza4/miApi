const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Proveedor = sequelize.define('Proveedor', {
  razon_social: { type: DataTypes.STRING(150), allowNull: false },
  contacto: { type: DataTypes.STRING(100) },
  telefono: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(120), validate: { isEmail: true } },
}, { tableName: 'Proveedores' });

module.exports = Proveedor;