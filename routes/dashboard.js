const express = require('express');
const { Op } = require('sequelize');
const { Producto, Categoria, Proveedor, Usuario, Movimiento } = require('../models');

const router = express.Router();
const STOCK_MINIMO = Number(process.env.STOCK_MINIMO) || 5;

// GET: indicadores (KPI) para el Dashboard
router.get('/', async (req, res) => {
  try {
    const [totalProductos, totalCategorias, totalProveedores, bajoStock, recientes, categoriasConStock] = await Promise.all([
      Producto.count(),
      Categoria.count(),
      Proveedor.count(),
      Producto.count({ where: { stock: { [Op.lte]: STOCK_MINIMO } } }),
      Movimiento.findAll({
        include: [
          { model: Producto, attributes: ['id', 'nombre'] },
          { model: Usuario, attributes: ['id', 'nombre'] },
        ],
        order: [['fecha_hora', 'DESC'], ['id', 'DESC']],
        limit: 5,
      }),
      Categoria.findAll({
        attributes: ['id', 'nombre'],
        include: [{ model: Producto, attributes: ['id', 'stock'] }],
      }),
    ]);

    const stockPorCategoria = categoriasConStock.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      totalStock: (c.Productos || []).reduce((acc, p) => acc + (Number(p.stock) || 0), 0),
      totalProductos: (c.Productos || []).length,
    }));

    res.json({
      totalProductos,
      totalCategorias,
      totalProveedores,
      bajoStock,
      stockMinimo: STOCK_MINIMO,
      recientes,
      stockPorCategoria,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
