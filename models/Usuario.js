const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');

const Usuario = sequelize.define('Usuario', {
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(120), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING(255), allowNull: false },
  rol: {
    type: DataTypes.ENUM('Administrador', 'Almacenero', 'Supervisor'),
    allowNull: false,
    defaultValue: 'Almacenero',
  },
  estado: {
    type: DataTypes.ENUM('Activo', 'Inactivo'),
    allowNull: false,
    defaultValue: 'Activo',
  },
}, {
  tableName: 'Usuarios',
  // la contraseña nunca se devuelve en las respuestas
  defaultScope: { attributes: { exclude: ['password'] } },
  hooks: {
    // se guarda cifrada, no en texto plano
    beforeSave: async (usuario) => {
      if (usuario.changed('password')) {
        usuario.password = await bcrypt.hash(usuario.password, 10);
      }
    },
  },
});

module.exports = Usuario;
