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
        { model: Producto, attributes: ['id', 'nombre', 'stock', 'precio'] },
        { model: Usuario, attributes: ['id', 'nombre', 'email'] },
      ],
      order: [['fecha_hora', 'DESC'], ['id', 'DESC']],
    });
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id: detalle de un movimiento
router.get('/:id', async (req, res) => {
  try {
    const mov = await Movimiento.findByPk(req.params.id, {
      include: [
        { model: Producto, attributes: ['id', 'nombre', 'stock', 'precio'] },
        { model: Usuario, attributes: ['id', 'nombre', 'email'] },
      ],
    });
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json(mov);
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
      { producto_id, usuario_id, tipo_movimiento, cantidad: cant, observaciones, fecha_hora: new Date() },
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

// Anular movimiento (reversión de stock en transacción)
const anularMovimiento = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const movimiento = await Movimiento.findByPk(req.params.id, { transaction: t });
    if (!movimiento) throw errorHttp(404, 'Movimiento no encontrado');

    const producto = await Producto.findByPk(movimiento.producto_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!producto) throw errorHttp(404, 'Producto asociado no existe');

    // Revertir efecto del movimiento
    // Si fue Entrada (+cant), ahora restamos cant
    // Si fue Salida (-cant), ahora sumamos cant
    // Si fue Ajuste (+/-cant), restamos cant
    const deltaReverso = movimiento.tipo_movimiento === 'Salida' ? movimiento.cantidad : -movimiento.cantidad;
    if (producto.stock + deltaReverso < 0) {
      throw errorHttp(400, 'No se puede anular: el stock resultante sería negativo');
    }

    producto.stock += deltaReverso;
    await producto.save({ transaction: t });

    await movimiento.destroy({ transaction: t });

    await t.commit();
    res.json({ message: 'Movimiento anulado y stock revertido correctamente', stock_actual: producto.stock });
  } catch (error) {
    await t.rollback();
    res.status(error.status || 500).json({ error: error.message });
  }
};

router.put('/:id/anular', anularMovimiento);
router.delete('/:id', anularMovimiento);

module.exports = router;
