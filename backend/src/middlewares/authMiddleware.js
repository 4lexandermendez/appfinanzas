const jwt = require("jsonwebtoken");

function requiereAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [tipo, token] = header.split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

module.exports = { requiereAuth };
