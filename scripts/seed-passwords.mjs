import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import sql from "mssql";

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const passwords = [
  { username: "ifra consulting", password: "ifra@123" },
  { username: "sarah.manager", password: "Manager@123" },
  { username: "ali.sales", password: "Employee@123" },
  { username: "hina.sales", password: "Employee@123" },
  {
    username: "user",
    password: "user@123",
    createIfMissing: {
      name: "CRM User",
      email: "user@ifraconsulting.com",
      phone: "+92 300 5555555",
      role: "SALES_EMPLOYEE",
    },
  },
];

async function main() {
  loadEnv();
  const pool = await sql.connect({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_DATABASE,
    options: {
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },
  });

  for (const item of passwords) {
    const hash = await bcrypt.hash(item.password, 10);
    const request = pool.request().input("username", sql.NVarChar(80), item.username).input("hash", sql.NVarChar(255), hash);
    if (item.createIfMissing) {
      await request
        .input("name", sql.NVarChar(120), item.createIfMissing.name)
        .input("email", sql.NVarChar(150), item.createIfMissing.email)
        .input("phone", sql.NVarChar(20), item.createIfMissing.phone)
        .input("role", sql.NVarChar(30), item.createIfMissing.role)
        .query(`
          IF EXISTS (SELECT 1 FROM Users WHERE Username = @username)
            UPDATE Users SET PasswordHash = @hash, UpdatedAt = GETDATE() WHERE Username = @username
          ELSE
            INSERT INTO Users (Name, Username, Email, PasswordHash, Phone, Role, Status)
            VALUES (@name, @username, @email, @hash, @phone, @role, N'Active')
        `);
      console.log(`Ensured user ${item.username}`);
    } else {
      await request.query(`UPDATE Users SET PasswordHash = @hash, UpdatedAt = GETDATE() WHERE Username = @username`);
      console.log(`Updated password hash for ${item.username}`);
    }
  }

  await pool.close();
}

main().catch((error) => {
  console.error("Unable to seed passwords. Check SQL Server and .env.");
  console.error(error.message);
  process.exit(1);
});
