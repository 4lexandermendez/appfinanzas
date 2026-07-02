const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

// El pool del driver `mariadb` usa por defecto un timeout de socket muy
// corto (~1s) para crear conexiones nuevas. Contra el proxy de Railway eso
// no alcanza y el pool falla con "Connection timeout: failed to create
// socket after ~1000ms" aunque la base esté sana y accesible. Se sube el
// timeout explícitamente vía la connection string.
const url = new URL(process.env.DATABASE_URL);
if (!url.searchParams.has("connectTimeout")) {
  url.searchParams.set("connectTimeout", "20000");
}
if (!url.searchParams.has("acquireTimeout")) {
  url.searchParams.set("acquireTimeout", "20000");
}

const adapter = new PrismaMariaDb(url.toString());
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
