# DokanDesk POS

**Simple sales. Smarter stock.**

DokanDesk POS একটি একদম নতুন, responsive full-stack point-of-sale system। Supershop, mini-mart ও ছোট retail দোকানের checkout, products, stock, purchases, customers, suppliers, users এবং reports এক জায়গা থেকে পরিচালনা করার জন্য এটি তৈরি।

> Reference projectটি শুধু feature flow বোঝার জন্য দেখা হয়েছে। এই repository-র source code, design system, API, database schema এবং authentication নতুন করে তৈরি।

## কী কী আছে

- Fast POS checkout, search, category filter, cart, discount, tax ও multiple payment method
- Printable sale receipt, transaction history এবং admin/manager sale void
- Products, categories, barcode, SKU, stock এবং low-stock alerts
- Supplier purchase receiving ও automatic inventory update
- Customers, suppliers এবং due balance tracking
- Dashboard, sales reports, profit, payment mix এবং top products
- JWT authentication, password hashing এবং Admin/Manager/Cashier role access
- Responsive desktop, tablet ও mobile interface
- PostgreSQL database, Prisma migration ও demo seed data
- Input validation, CORS allowlist, Helmet security headers ও login rate limiting

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vinext/Next App Router, Tailwind CSS, Lucide icons |
| Backend | Node.js, Express 5, Zod, JWT, bcryptjs |
| Database | PostgreSQL 16, Prisma ORM |
| Local DB | Docker Compose |

## দ্রুত চালু করার নিয়ম

Prerequisite: Node.js 22.13+ এবং Docker Desktop।

```bash
unzip DokanDesk-POS-Full-Stack.zip
cd DokanDesk-POS
npm run setup:all
npm run db:up
npm run db:migrate:local
npm run db:seed
npm run dev:all
```

তারপর browser-এ frontend-এর terminal-এ দেখানো local URL খুলুন। API চলে `http://localhost:5050`-এ।

### Demo login

| Role | Email | Password |
|---|---|---|
| Admin | `admin@dokandesk.local` | `DokanDesk@123!` |
| Cashier | `cashier@dokandesk.local` | `Cashier@123!` |

Production ব্যবহারের আগে `backend/.env`-এর `JWT_SECRET` এবং seed credentials অবশ্যই পরিবর্তন করুন।

## Docker ছাড়া PostgreSQL ব্যবহার

নিজের PostgreSQL database তৈরি করুন, এরপর `backend/.env`-এ connection string দিন:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/dokandesk?schema=public
```

তারপর চালান:

```bash
npm run db:migrate:local
npm run db:seed
npm run dev:all
```

## Environment files

`npm run setup:all` স্বয়ংক্রিয়ভাবে `.env.example` থেকে `.env` এবং `backend/.env.example` থেকে `backend/.env` তৈরি করে।

- Frontend API URL: `.env`
- Database, JWT, port ও CORS: `backend/.env`
- একাধিক frontend origin comma দিয়ে লিখুন: `FRONTEND_URL=http://localhost:3000,http://localhost:5173`

## Useful commands

```bash
npm run setup:all        # env তৈরি ও দুই অংশের dependencies install
npm run dev:all          # frontend + backend একসাথে চালু
npm run db:up            # PostgreSQL container চালু
npm run db:down          # PostgreSQL container বন্ধ
npm run db:migrate:local # committed migration apply
npm run db:seed          # demo users/products/data যোগ
npm run verify:all       # lint, typecheck, build, render test ও backend verify
```

## Project structure

```text
DokanDesk-POS/
├── app/                    # frontend routes
├── components/             # shell, UI primitives ও feature views
├── lib/                    # typed API client ও shared types
├── backend/
│   ├── prisma/             # schema, migration ও seed
│   └── src/                # Express API, auth ও business logic
├── scripts/                # setup/dev/build helpers
├── tests/                  # rendered output smoke test
├── docker-compose.yml      # local PostgreSQL
└── BUILD_NOTES_BN.md       # implementation summary
```

## Database entities

User, Category, Product, Customer, Supplier, Sale, SaleItem, Purchase, PurchaseItem, StockMovement এবং Setting। Sale ও purchase transaction database transaction-এর মধ্যে হয়; stock update server-side price এবং available quantity যাচাই করে।

## Important production notes

- HTTPS reverse proxy ব্যবহার করুন এবং strong `JWT_SECRET` দিন।
- Default demo password পরিবর্তন করুন।
- PostgreSQL backup schedule রাখুন।
- `NODE_ENV=production` এবং exact `FRONTEND_URL` দিন।
- একই product নিয়ে খুব বেশি concurrent checkout হলে database-level monitoring রাখুন।

## Verification

এই package-এ frontend lint, TypeScript check, production build, rendered HTML smoke test, backend syntax check, Prisma schema validation এবং Prisma client generation চালানো হয়েছে। Current build environment-এ Docker না থাকায় live PostgreSQL container integration test চালানো সম্ভব হয়নি; local setup commands প্রস্তুত আছে।

## License

Private shop project. আপনার প্রয়োজন অনুযায়ী modify ও deploy করতে পারবেন।
