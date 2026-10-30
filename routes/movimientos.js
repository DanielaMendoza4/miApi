const express = require('express');
const sequelize = require('../config/db');
const { Producto, Usuario, Movimiento } = require('../models');

const router = express.Router();

const errorHttp = (status, message) => Object.assign(new Error(message), { status });

// GET: historial (kardex), del más reciente al más antiguo
router.get('/', async (req, res) => {
  try {
    const movimientos = await Movimiento.findAll({
      include: [
        { model: Producto, attributes: ['id', 'nombre'] },
        { model: Usuario, attributes: ['id', 'nombre'] },
      ],
      order: [['fecha_hora', 'DESC']],
    });
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: registra el movimiento y actualiza el stock dentro de UNA transacción
router.post('/', async (req, res) => {
  const { producto_id, usuario_id, tipo_movimiento, cantidad, observaciones } = req.body;
  const t = await sequelize.transaction();
  try {
    const cant = Number(cantidad);
    if (!producto_id || !usuario_id || !tipo_movimiento || !Number.isInteger(cant) || cant === 0) {
      throw errorHttp(400, 'Datos incompletos o cantidad inválida');
    }
    if (tipo_movimiento !== 'Ajuste' && cant < 0) {
      throw errorHttp(400, 'La cantidad debe ser positiva para Entrada y Salida');
    }

    const producto = await Producto.findByPk(producto_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!producto) throw errorHttp(404, 'El producto no existe');

    // Entrada suma, Salida resta, Ajuste suma o resta según el signo
    const delta = tipo_movimiento === 'Salida' ? -cant : cant;
    if (producto.stock + delta < 0) throw errorHttp(400, 'Stock insuficiente para esta operación');

    producto.stock += delta;
    await producto.save({ transaction: t });

    const movimiento = await Movimiento.create(
      { producto_id, usuario_id, tipo_movimiento, cantidad: cant, observaciones },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({ movimiento, stock_actual: producto.stock });
  } catch (error) {
    await t.rollback();
    const conflicto = error.name === 'SequelizeForeignKeyConstraintError';
    res.status(conflicto ? 400 : error.status || 500).json({
      error: conflicto ? 'El producto o el usuario no existe' : error.message,
    });
  }
});

module.exports = router;