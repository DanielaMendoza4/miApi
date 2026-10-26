# miApi

API REST creada con Node.js, Express, MySQL y Sequelize. Será consumida por un frontend en React.

## Requisitos

- Node.js
- MySQL en ejecución (XAMPP o Laragon)
- Una base de datos creada en MySQL

## Instalación

1. Clona el repositorio e instala las dependencias:

```bash
npm install
```

2. Crea un archivo `.env` en la raíz del proyecto con tus propios datos:

```env
DB_NAME=nombre_de_tu_base
DB_USER=tu_usuario
DB_PASS=tu_contraseña
DB_HOST=127.0.0.1
DB_PORT=3306
PORT=3006
```

3. Inicia el servidor en modo desarrollo:

```bash
npm run dev
```

## Uso

Abre http://localhost:3006 en el navegador. Si todo está bien, verás el mensaje:

"¡API Backend funcionando exitosamente!"

## Estructura del proyecto

- `config/`: conexión a la base de datos con Sequelize
- `models/`: modelos de las tablas (Producto)
- `controllers/`: lógica de la API
- `routes/`: rutas de la API
- `index.js`: servidor Express

## Tecnologías

Express, Sequelize, mysql2, cors, dotenv y nodemon.

## Nota de seguridad

El archivo `.env` no se sube al repositorio porque contiene credenciales. Cada persona debe crear el suyo.