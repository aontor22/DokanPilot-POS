import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { allowRoles, requireAuth, signToken } from "../middleware/auth.js";
import { loginRateLimit } from "../middleware/rate-limit.js";

const router = Router();
const ok = (res, data, message = "OK", status = 200) => res.status(status).json({ success: true, message, data });
const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const parse = (schema, input) => {
  const result = schema.safeParse(input);
  if (!result.success) throw fail(400, result.error.issues[0]?.message || "Invalid request data");
  return result.data;
};
const money = (value) => Number(value || 0);
const userView = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt });
const paymentMethods = ["CASH", "CARD", "BKASH", "NAGAD", "BANK"];

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

router.post("/auth/login", loginRateLimit, async (req, res) => {
  const input = parse(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await bcrypt.compare(input.password, user.password))) throw fail(401, "Invalid email or password");
  if (!user.active) throw fail(403, "Your account is inactive");
  const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return ok(res, { token: signToken(updated), user: userView(updated) }, "Login successful");
});

router.get("/auth/me", requireAuth, async (req, res) => ok(res, { user: req.user }));
router.use(requireAuth);

router.get("/dashboard", async (_req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [sales, transactionCount, products, customerCount, recentSales] = await prisma.$transaction([
    prisma.sale.aggregate({ where: { createdAt: { gte: start }, status: "COMPLETED" }, _sum: { total: true }, _avg: { total: true } }),
    prisma.sale.count({ where: { createdAt: { gte: start }, status: "COMPLETED" } }),
    prisma.product.findMany({ where: { active: true }, include: { category: true }, orderBy: { stock: "asc" } }),
    prisma.customer.count(),
    prisma.sale.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { customer: true, cashier: { select: { name: true } }, items: true } }),
  ]);
  const lowStock = products.filter((item) => item.stock <= item.lowStock).slice(0, 6);
  return ok(res, {
    todaySales: money(sales._sum.total),
    transactionCount,
    averageBasket: money(sales._avg.total),
    productCount: products.length,
    customerCount,
    lowStock,
    recentSales,
  });
});

router.get("/categories", async (_req, res) => ok(res, { categories: await prisma.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } }) }));
router.post("/categories", allowRoles("ADMIN", "MANAGER"), async (req, res) => {
  const input = parse(z.object({ name: z.string().trim().min(2).max(60), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#4f46e5") }), req.body);
  return ok(res, { category: await prisma.category.create({ data: input }) }, "Category created", 201);
});

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().min(2).max(40).transform((v) => v.toUpperCase()),
  barcode: z.string().trim().max(80).optional().nullable(),
  categoryId: z.string().min(1),
  unit: z.string().trim().min(1).max(20).default("piece"),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0).default(0),
  lowStock: z.coerce.number().int().min(0).default(5),
  active: z.boolean().default(true),
});

router.get("/products", async (req, res) => {
  const search = String(req.query.search || "").trim();
  const categoryId = String(req.query.categoryId || "").trim();
  const products = await prisma.product.findMany({
    where: {
      ...(req.query.all === "true" ? {} : { active: true }),
      ...(categoryId ? { categoryId } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ] } : {}),
    },
    include: { category: true },
    orderBy: { name: "asc" },
    take: 500,
  });
  const filtered = req.query.lowStock === "true" ? products.filter((item) => item.stock <= item.lowStock) : products;
  return ok(res, { products: filtered });
});

router.post("/products", allowRoles("ADMIN", "MANAGER"), async (req, res) => {
  const input = parse(productSchema, req.body);
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({ data: { ...input, barcode: input.barcode || null }, include: { category: true } });
    if (created.stock > 0) await tx.stockMovement.create({ data: { productId: created.id, userId: req.user.id, type: "ADJUSTMENT", quantity: created.stock, reference: "OPENING", note: "Opening stock" } });
    return created;
  });
  return ok(res, { product }, "Product created", 201);
});

router.put("/products/:id", allowRoles("ADMIN", "MANAGER"), async (req, res) => {
  const input = parse(productSchema.partial(), req.body);
  const current = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!current) throw fail(404, "Product not found");
  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({ where: { id: current.id }, data: { ...input, barcode: input.barcode || null }, include: { category: true } });
    if (input.stock !== undefined && input.stock !== current.stock) await tx.stockMovement.create({ data: { productId: current.id, userId: req.user.id, type: "ADJUSTMENT", quantity: input.stock - current.stock, reference: "MANUAL", note: "Manual stock adjustment" } });
    return updated;
  });
  return ok(res, { product }, "Product updated");
});

router.delete("/products/:id", allowRoles("ADMIN"), async (req, res) => {
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
  return ok(res, { product }, "Product archived");
});

const personSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.union([z.string().trim().email(), z.literal("")]).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
});

const peopleRoutes = (path, modelName, pluralName) => {
  router.get(`/${path}`, async (_req, res) => ok(res, { [pluralName]: await prisma[modelName].findMany({ orderBy: { createdAt: "desc" }, take: 500 }) }));
  router.post(`/${path}`, allowRoles("ADMIN", "MANAGER", "CASHIER"), async (req, res) => {
    const input = parse(personSchema, req.body);
    const item = await prisma[modelName].create({ data: { ...input, phone: input.phone || null, email: input.email || null, address: input.address || null } });
    return ok(res, { item }, `${path.slice(0, -1)} created`, 201);
  });
  router.put(`/${path}/:id`, allowRoles("ADMIN", "MANAGER"), async (req, res) => {
    const input = parse(personSchema.partial(), req.body);
    const item = await prisma[modelName].update({ where: { id: req.params.id }, data: input });
    return ok(res, { item }, `${path.slice(0, -1)} updated`);
  });
};
peopleRoutes("customers", "customer", "customers");
peopleRoutes("suppliers", "supplier", "suppliers");

const saleSchema = z.object({
  customerId: z.string().optional().nullable(),
  paymentMethod: z.enum(paymentMethods).default("CASH"),
  paidAmount: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  note: z.string().trim().max(300).optional().nullable(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(10000) })).min(1).max(200),
});

router.get("/sales", async (req, res) => {
  const search = String(req.query.search || "").trim();
  const sales = await prisma.sale.findMany({
    where: search ? { OR: [
      { invoiceNo: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ] } : {},
    include: { customer: true, cashier: { select: { name: true } }, items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return ok(res, { sales });
});

router.post("/sales", async (req, res) => {
  const input = parse(saleSchema, req.body);
  const ids = [...new Set(input.items.map((item) => item.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: ids }, active: true } });
  if (products.length !== ids.length) throw fail(404, "One or more products are unavailable");
  const map = new Map(products.map((product) => [product.id, product]));
  const lines = input.items.map((item) => {
    const product = map.get(item.productId);
    const unitPrice = money(product.sellingPrice);
    return { productId: product.id, quantity: item.quantity, unitPrice, costPrice: money(product.costPrice), total: unitPrice * item.quantity };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
  const tax = subtotal * input.taxRate / 100;
  if (input.discount > subtotal + tax) throw fail(400, "Discount cannot exceed the sale amount");
  const total = subtotal + tax - input.discount;
  const paid = Math.min(input.paidAmount ?? total, total);
  const due = Math.max(total - paid, 0);
  const invoiceNo = `INV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`;

  const sale = await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const update = await tx.product.updateMany({ where: { id: line.productId, active: true, stock: { gte: line.quantity } }, data: { stock: { decrement: line.quantity } } });
      if (update.count !== 1) throw fail(409, `${map.get(line.productId).name} does not have enough stock`);
    }
    const created = await tx.sale.create({
      data: {
        invoiceNo, customerId: input.customerId || null, cashierId: req.user.id,
        subtotal, tax, discount: input.discount, total, paid, due,
        paymentMethod: input.paymentMethod, note: input.note || null,
        items: { create: lines },
      },
      include: { customer: true, cashier: { select: { name: true } }, items: { include: { product: true } } },
    });
    await tx.stockMovement.createMany({ data: lines.map((line) => ({ productId: line.productId, userId: req.user.id, type: "SALE", quantity: -line.quantity, reference: invoiceNo, note: "POS sale" })) });
    if (created.customerId && due > 0) await tx.customer.update({ where: { id: created.customerId }, data: { dueBalance: { increment: due } } });
    return created;
  });
  return ok(res, { sale }, "Sale completed", 201);
});

router.patch("/sales/:id/void", allowRoles("ADMIN", "MANAGER"), async (req, res) => {
  const sale = await prisma.sale.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!sale) throw fail(404, "Sale not found");
  if (sale.status !== "COMPLETED") throw fail(409, "Only completed sales can be voided");
  const updated = await prisma.$transaction(async (tx) => {
    for (const item of sale.items) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    await tx.stockMovement.createMany({ data: sale.items.map((item) => ({ productId: item.productId, userId: req.user.id, type: "ADJUSTMENT", quantity: item.quantity, reference: sale.invoiceNo, note: "Voided sale stock return" })) });
    if (sale.customerId && money(sale.due) > 0) await tx.customer.update({ where: { id: sale.customerId }, data: { dueBalance: { decrement: sale.due } } });
    return tx.sale.update({ where: { id: sale.id }, data: { status: "VOID" } });
  });
  return ok(res, { sale: updated }, "Sale voided");
});

const purchaseSchema = z.object({
  supplierId: z.string().optional().nullable(),
  paidAmount: z.coerce.number().min(0).default(0),
  note: z.string().trim().max(300).optional().nullable(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(100000), costPrice: z.coerce.number().min(0) })).min(1).max(200),
});

router.get("/purchases", allowRoles("ADMIN", "MANAGER"), async (_req, res) => ok(res, { purchases: await prisma.purchase.findMany({ include: { supplier: true, createdBy: { select: { name: true } }, items: { include: { product: true } } }, orderBy: { createdAt: "desc" }, take: 300 }) }));
router.post("/purchases", allowRoles("ADMIN", "MANAGER"), async (req, res) => {
  const input = parse(purchaseSchema, req.body);
  const total = input.items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
  const paid = Math.min(input.paidAmount, total);
  const due = total - paid;
  const referenceNo = `PUR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const purchase = await prisma.$transaction(async (tx) => {
    const found = await tx.product.count({ where: { id: { in: input.items.map((item) => item.productId) }, active: true } });
    if (found !== new Set(input.items.map((item) => item.productId)).size) throw fail(404, "One or more products are unavailable");
    for (const item of input.items) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity }, costPrice: item.costPrice } });
    const created = await tx.purchase.create({ data: { referenceNo, supplierId: input.supplierId || null, createdById: req.user.id, total, paid, due, note: input.note || null, items: { create: input.items.map((item) => ({ ...item, total: item.quantity * item.costPrice })) } }, include: { supplier: true, items: { include: { product: true } } } });
    await tx.stockMovement.createMany({ data: input.items.map((item) => ({ productId: item.productId, userId: req.user.id, type: "PURCHASE", quantity: item.quantity, reference: referenceNo, note: "Purchase received" })) });
    if (created.supplierId && due > 0) await tx.supplier.update({ where: { id: created.supplierId }, data: { dueBalance: { increment: due } } });
    return created;
  });
  return ok(res, { purchase }, "Purchase received", 201);
});

router.get("/inventory", async (_req, res) => {
  const [products, movements] = await prisma.$transaction([
    prisma.product.findMany({ where: { active: true }, include: { category: true }, orderBy: { stock: "asc" } }),
    prisma.stockMovement.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { product: { select: { name: true, sku: true } }, user: { select: { name: true } } } }),
  ]);
  return ok(res, { products, lowStock: products.filter((item) => item.stock <= item.lowStock), movements });
});

router.get("/reports/summary", allowRoles("ADMIN", "MANAGER"), async (req, res) => {
  const end = req.query.end ? new Date(String(req.query.end)) : new Date();
  const start = req.query.start ? new Date(String(req.query.start)) : new Date(end.getTime() - 29 * 86400000);
  start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
  const [sales, purchases, saleItems] = await prisma.$transaction([
    prisma.sale.findMany({ where: { createdAt: { gte: start, lte: end }, status: "COMPLETED" }, orderBy: { createdAt: "asc" } }),
    prisma.purchase.findMany({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.saleItem.findMany({ where: { sale: { createdAt: { gte: start, lte: end }, status: "COMPLETED" } }, include: { product: true } }),
  ]);
  const daily = new Map();
  for (const sale of sales) {
    const day = sale.createdAt.toISOString().slice(0, 10);
    daily.set(day, (daily.get(day) || 0) + money(sale.total));
  }
  const topMap = new Map();
  for (const item of saleItems) topMap.set(item.product.name, (topMap.get(item.product.name) || 0) + item.quantity);
  const revenue = sales.reduce((sum, item) => sum + money(item.total), 0);
  const costOfGoods = saleItems.reduce((sum, item) => sum + money(item.costPrice) * item.quantity, 0);
  const purchaseTotal = purchases.reduce((sum, item) => sum + money(item.total), 0);
  return ok(res, {
    revenue, costOfGoods, grossProfit: revenue - costOfGoods, purchaseTotal,
    transactionCount: sales.length,
    dailySales: [...daily].map(([date, total]) => ({ date, total })),
    topProducts: [...topMap].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 8),
    paymentMix: paymentMethods.map((method) => ({ method, total: sales.filter((sale) => sale.paymentMethod === method).reduce((sum, sale) => sum + money(sale.total), 0) })),
  });
});

router.get("/settings", async (_req, res) => {
  const rows = await prisma.setting.findMany();
  return ok(res, { settings: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
});
router.put("/settings", allowRoles("ADMIN", "MANAGER"), async (req, res) => {
  const allowed = ["shopName", "shopAddress", "shopPhone", "currency", "taxRate", "receiptFooter"];
  const values = Object.entries(req.body || {}).filter(([key]) => allowed.includes(key));
  if (!values.length) throw fail(400, "No valid settings supplied");
  await prisma.$transaction(values.map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value: String(value).slice(0, 500) }, create: { key, value: String(value).slice(0, 500) } })));
  return ok(res, { settings: Object.fromEntries(values) }, "Settings saved");
});

router.get("/users", allowRoles("ADMIN"), async (_req, res) => ok(res, { users: (await prisma.user.findMany({ orderBy: { createdAt: "desc" } })).map(userView) }));
router.post("/users", allowRoles("ADMIN"), async (req, res) => {
  const input = parse(z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(128), role: z.enum(["ADMIN", "MANAGER", "CASHIER"]).default("CASHIER") }), req.body);
  const user = await prisma.user.create({ data: { ...input, password: await bcrypt.hash(input.password, 12) } });
  return ok(res, { user: userView(user) }, "User created", 201);
});

export default router;
