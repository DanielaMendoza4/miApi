const express = require('express');
const { Op } = require('sequelize');
const { Producto, Categoria, Proveedor, Usuario, Movimiento } = require('../models');

const router = express.Router();
const STOCK_MINIMO = Number(process.env.STOCK_MINIMO) || 5;

// GET: indicadores (KPI) para el Dashboard
router.get('/', async (req, res) => {
  try {
    const [totalProductos, totalCategorias, totalProveedores, bajoStock, recientes] = await Promise.all([
      Producto.count(),
      Categoria.count(),
      Proveedor.count(),
      Producto.count({ where: { stock: { [Op.lte]: STOCK_MINIMO } } }),
      Movimiento.findAll({
        include: [
          { model: Producto, attributes: ['nombre'] },
          { model: Usuario, attributes: ['nombre'] },
        ],
        order: [['fecha_hora', 'DESC']],
        limit: 5,
      }),
    ]);
    res.json({ totalProductos, totalCategorias, totalProveedores, bajoStock, stockMinimo: STOCK_MINIMO, recientes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;