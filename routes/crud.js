const express = require('express');

// Genera un CRUD completo (GET, POST, PUT, DELETE) para cualquier modelo.
// required: campos obligatorios al crear. include: relaciones a incluir al listar.
module.exports = (Model, { include = [], required = [] } = {}) => {
  const router = express.Router();

  const fallo = (res, error) => {
    const conflicto = error.name === 'SequelizeForeignKeyConstraintError';
    const validacion = ['SequelizeValidationError', 'SequelizeUniqueConstraintError'].includes(error.name);
    const status = conflicto ? 409 : validacion ? 400 : 500;
    const mensaje = conflicto ? 'No se puede completar: hay registros relacionados' : error.message;
    res.status(status).json({ error: mensaje });
  };

  router.get('/', async (req, res) => {
    try {
      res.json(await Model.findAll({ include }));
    } catch (error) { fallo(res, error); }
  });

  router.post('/', async (req, res) => {
    try {
      const faltan = required.filter((c) => [undefined, null, ''].includes(req.body[c]));
      if (faltan.length) {
        return res.status(400).json({ error: `Faltan campos obligatorios: ${faltan.join(', ')}` });
      }
      res.status(201).json(await Model.create(req.body));
    } catch (error) { fallo(res, error); }
  });

  router.put('/:id', async (req, res) => {
    try {
      const registro = await Model.findByPk(req.params.id);
      if (!registro) return res.status(404).json({ error: 'No encontrado' });
      await registro.update(req.body);
      res.json(registro);
    } catch (error) { fallo(res, error); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const borrados = await Model.destroy({ where: { id: req.params.id } });
      if (!borrados) return res.status(404).json({ error: 'No encontrado' });
      res.json({ message: 'Eliminado correctamente' });
    } catch (error) { fallo(res, error); }
  });

  return router;
};