import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const adminEmail = String(process.env.SEED_ADMIN_EMAIL || "admin@dokandesk.local").toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "DokanDesk@123!";
if (adminPassword.length < 8) throw new Error("SEED_ADMIN_PASSWORD must contain at least 8 characters");

const products = [
  ["Premium Miniket Rice 5kg", "RICE-5KG", "894110050001", "Groceries", "pack", 430, 480, 48, 8],
  ["Soybean Oil 1L", "OIL-1L", "894110050002", "Groceries", "bottle", 158, 175, 36, 8],
  ["Full Cream Milk 1L", "MILK-1L", "894110050003", "Dairy", "pack", 88, 105, 28, 6],
  ["Brown Eggs 12pcs", "EGG-12", "894110050004", "Dairy", "tray", 132, 150, 24, 5],
  ["Tea Biscuits 300g", "BISCUIT-300", "894110050005", "Snacks", "pack", 52, 65, 72, 10],
  ["Mango Juice 1L", "JUICE-1L", "894110050006", "Beverages", "bottle", 125, 150, 32, 6],
  ["Mineral Water 1L", "WATER-1L", "894110050007", "Beverages", "bottle", 18, 25, 96, 12],
  ["Bath Soap 100g", "SOAP-100", "894110050008", "Household", "piece", 48, 60, 42, 8],
  ["Facial Tissue Box", "TISSUE-BOX", "894110050009", "Household", "box", 72, 90, 18, 5],
  ["Iodized Salt 1kg", "SALT-1KG", "894110050010", "Groceries", "pack", 34, 42, 40, 8],
];

async function main() {
  const [adminHash, cashierHash] = await Promise.all([
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash("Cashier@123!", 12),
  ]);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: "DokanDesk Admin", password: adminHash, role: "ADMIN", active: true },
    create: { name: "DokanDesk Admin", email: adminEmail, password: adminHash, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "cashier@dokandesk.local" },
    update: { name: "Nusrat Jahan", password: cashierHash, role: "CASHIER", active: true },
    create: { name: "Nusrat Jahan", email: "cashier@dokandesk.local", password: cashierHash, role: "CASHIER" },
  });

  const categoryColors = { Groceries: "#4f46e5", Dairy: "#0ea5e9", Snacks: "#f59e0b", Beverages: "#059669", Household: "#8b5cf6" };
  const categories = {};
  for (const [name, color] of Object.entries(categoryColors)) {
    categories[name] = await prisma.category.upsert({ where: { name }, update: { color }, create: { name, color } });
  }

  for (const [name, sku, barcode, category, unit, costPrice, sellingPrice, stock, lowStock] of products) {
    const data = { name, barcode, categoryId: categories[category].id, unit, costPrice, sellingPrice, lowStock, active: true };
    await prisma.product.upsert({ where: { sku }, update: data, create: { sku, stock, ...data } });
  }

  await prisma.customer.upsert({ where: { phone: "01711000000" }, update: {}, create: { name: "Rahim Uddin", phone: "01711000000", address: "Dhanmondi, Dhaka" } });
  await prisma.customer.upsert({ where: { phone: "01811000000" }, update: {}, create: { name: "Farzana Akter", phone: "01811000000", address: "Mohammadpur, Dhaka" } });
  await prisma.supplier.upsert({ where: { phone: "01911000000" }, update: {}, create: { name: "Dhaka Grocery Supply", phone: "01911000000", email: "orders@example.com" } });
  await prisma.supplier.upsert({ where: { phone: "01611000000" }, update: {}, create: { name: "Fresh Distribution", phone: "01611000000" } });

  const settings = {
    shopName: "DokanDesk Demo Store",
    shopAddress: "Dhanmondi, Dhaka",
    shopPhone: "+880 1712-345678",
    currency: "৳",
    taxRate: "0",
    receiptFooter: "Thank you for shopping with us!",
  };
  for (const [key, value] of Object.entries(settings)) await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });

  console.log("DokanDesk seed complete");
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log("Cashier: cashier@dokandesk.local / Cashier@123!");
}

main().finally(() => prisma.$disconnect());
