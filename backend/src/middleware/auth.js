import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export const signToken = (user) => jwt.sign(
  { sub: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || "8h", issuer: "dokandesk-api", audience: "dokandesk-web" },
);

export const requireAuth = async (req, res, next) => {
  try {
    const header = String(req.headers.authorization || "");
    if (!header.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Authentication required" });
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { issuer: "dokandesk-api", audience: "dokandesk-web" });
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, email: true, role: true, active: true } });
    if (!user?.active) return res.status(401).json({ success: false, message: "Account is inactive" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
};

export const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ success: false, message: "You do not have permission for this action" });
  next();
};
