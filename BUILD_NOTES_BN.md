# DokanDesk POS — কীভাবে তৈরি করা হয়েছে

1. Reference ZIP-এর feature flow বিশ্লেষণ করা হয়েছে; কোনো source file copy করা হয়নি।
2. “DokanDesk POS” নাম এবং modern indigo/emerald responsive design system নির্বাচন করা হয়েছে।
3. Login, role-aware sidebar, dashboard এবং mobile navigation তৈরি করা হয়েছে।
4. POS cart, tax, discount, customer, payment, checkout ও printable receipt তৈরি করা হয়েছে।
5. Products/categories, transactions, inventory, purchases, customers, suppliers, reports, settings ও users screen তৈরি করা হয়েছে।
6. Express REST API, JWT auth, role middleware, validation, rate limit এবং error handling তৈরি করা হয়েছে।
7. PostgreSQL/Prisma schema, initial migration এবং demo seed data লেখা হয়েছে।
8. Atomic sale/purchase stock update, stock movements এবং void-sale stock return যোগ করা হয়েছে।
9. Docker Compose, environment examples, one-command setup এবং combined dev runner যোগ করা হয়েছে।
10. Lint, TypeScript, production build, render smoke test, backend syntax এবং Prisma validation দিয়ে যাচাই করা হয়েছে।

## Short description (~300 characters)

DokanDesk POS is a responsive full-stack retail system for small shops and supershops. It combines fast checkout, product and stock control, purchases, customers, suppliers, reports, receipts, secure JWT login and role-based access in one clean dashboard, powered by PostgreSQL.
