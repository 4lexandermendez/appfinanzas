const jwt = require("jsonwebtoken");

function generarToken(usuario) {
  return jwt.sign({ sub: usuario.id, email: usuario.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

module.exports = { generarToken };
