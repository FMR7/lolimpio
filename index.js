require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


const db = new Database('db.sqlite');
db.prepare(`
  CREATE TABLE IF NOT EXISTS contactos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha TEXT NOT NULL
  )
`).run();

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para recibir los datos del formulario
app.post('/api/contacto', (req, res) => {
  const { nombre, telefono, email, mensaje } = req.body;

  if (!nombre || !telefono || !email || !mensaje) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const fecha = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO contactos (nombre, telefono, email, mensaje, fecha) VALUES (?, ?, ?, ?, ?)');
  stmt.run(nombre, telefono, email, mensaje, fecha);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: 'Nuevo mensaje de contacto',
    text: `
      Nombre: ${nombre}
      Teléfono: ${telefono}
      Email: ${email}
      Mensaje: ${mensaje}
    `
  };
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error al enviar el correo:', error);
      // No bloquees la respuesta al cliente por esto
    } else {
      console.log('Correo enviado:', info.response);
    }
  });

  res.json({ status: 'ok' });
});

const PORT = 80;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});
