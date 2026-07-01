const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { generarToken } = require("../utils/jwt");

function usuarioPublico(usuario) {
  const { passwordHash, ...resto } = usuario;
  return resto;
}

async function registrar(req, res) {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: "nombre, email y password son requeridos" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "password debe tener al menos 8 caracteres" });
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: { nombre, email, passwordHash },
  });

  const token = generarToken(usuario);
  res.status(201).json({ usuario: usuarioPublico(usuario), token });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email y password son requeridos" });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordValida) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = generarToken(usuario);
  res.json({ usuario: usuarioPublico(usuario), token });
}

async function perfil(req, res) {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } });
  if (!usuario) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }
  res.json({ usuario: usuarioPublico(usuario) });
}

module.exports = { registrar, login, perfil };
