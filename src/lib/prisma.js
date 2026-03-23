"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var client_1 = require("@prisma/client");
var adapter_pg_1 = require("@prisma/adapter-pg");
var globalForPrisma = globalThis;
function createPrismaClient() {
    var adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
    return new client_1.PrismaClient({
        adapter: adapter,
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
}
exports.prisma = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : createPrismaClient();
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.prisma;
