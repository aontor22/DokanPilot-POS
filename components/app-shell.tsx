"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Bell, Boxes, ChevronDown, Home, LogOut, Menu, Package, ReceiptText, Search, Settings, ShoppingBag, ShoppingCart, Truck, UserCog, Users, Warehouse, X } from "lucide-react";
import { api, authStore } from "@/lib/api";
import type { User } from "@/lib/types";
import { Spinner } from "@/components/ui";
import DashboardView from "@/components/views/dashboard-view";
import PosView from "@/components/views/pos-view";
import ProductsView from "@/components/views/products-view";
import TransactionsView from "@/components/views/transactions-view";
import InventoryView from "@/components/views/inventory-view";
import PeopleView from "@/components/views/people-view";
import PurchasesView from "@/components/views/purchases-view";
import ReportsView from "@/components/views/reports-view";
import SettingsView from "@/components/views/settings-view";

export type ViewName = "dashboard" | "pos" | "transactions" | "products" | "inventory" | "customers" | "suppliers" | "purchases" | "reports" | "settings" | "users";
const nav = [
  ["dashboard", "Dashboard", Home], ["pos", "New Sale", ShoppingCart], ["transactions", "Transactions", ReceiptText],
  ["products", "Products", Package], ["inventory", "Inventory", Warehouse], ["customers", "Customers", Users],
  ["purchases", "Purchases", Boxes], ["suppliers", "Suppliers", Truck], ["reports", "Reports", BarChart3],
  ["settings", "Settings", Settings], ["users", "Users", UserCog],
] as const;

const allowedForCashier = new Set(["dashboard", "pos", "transactions", "products", "inventory", "customers"]);

function Sidebar({ items, activeView, onNavigate, onLogout }: {
  items: ReadonlyArray<(typeof nav)[number]>;
  activeView: ViewName;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return <aside className="flex h-full w-[232px] flex-col bg-gradient-to-b from-indigo-950 via-blue-900 to-indigo-800 text-white">
    <div className="flex h-18 items-center gap-3 px-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25"><ShoppingBag size={21} /></span><div><p className="font-bold tracking-tight">DokanDesk POS</p><p className="text-[10px] font-medium tracking-wider text-blue-200">SMART RETAIL</p></div></div>
    <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-3">{items.map(([key, label, Icon]) => <Link key={key} href={`/${key}`} onClick={onNavigate} className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition ${activeView === key ? "bg-indigo-500 text-white shadow-lg shadow-indigo-950/25" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}><Icon size={19} /><span>{label}</span></Link>)}</nav>
    <div className="border-t border-white/10 p-3"><button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white"><LogOut size={18} />Sign out</button><p className="px-3.5 pt-2 text-[10px] text-blue-300">Version 1.0.0</p></div>
  </aside>;
}

export default function AppShell({ view }: { view: ViewName }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => authStore.getUser());
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!authStore.getToken()) { router.replace("/login"); return; }
    api.get<{ user: User }>("/auth/me").then((data) => setUser(data.user)).catch(() => null).finally(() => setReady(true));
  }, [router]);

  const visibleNav = useMemo(() => nav.filter(([key]) => user?.role !== "CASHIER" || allowedForCashier.has(key)), [user?.role]);
  const logout = () => { authStore.clear(); router.replace("/login"); };
  const globalSearch = (event: React.FormEvent) => { event.preventDefault(); if (query.trim()) router.push(`/products?search=${encodeURIComponent(query.trim())}`); };
  const content = {
    dashboard: <DashboardView />, pos: <PosView />, transactions: <TransactionsView />, products: <ProductsView />,
    inventory: <InventoryView />, customers: <PeopleView kind="customers" />, suppliers: <PeopleView kind="suppliers" />,
    purchases: <PurchasesView />, reports: <ReportsView />, settings: <SettingsView mode="settings" />,
    users: <SettingsView mode="users" />,
  }[view];

  if (!ready) return <main className="grid min-h-screen place-items-center bg-slate-50"><Spinner label="Opening your store" /></main>;
  if (!user) return null;

  return <div className="min-h-screen bg-[#f5f7fb]">
    <div className="fixed inset-y-0 left-0 z-40 hidden lg:block"><Sidebar items={visibleNav} activeView={view} onNavigate={() => setMenuOpen(false)} onLogout={logout} /></div>
    {menuOpen && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setMenuOpen(false)} aria-label="Close menu" /><div className="relative h-full w-[260px] max-w-[86vw]"><Sidebar items={visibleNav} activeView={view} onNavigate={() => setMenuOpen(false)} onLogout={logout} /><button className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button></div></div>}
    <div className="lg:pl-[232px]">
      <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-5">
        <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Menu size={21} /></button>
        <form onSubmit={globalSearch} className="relative hidden max-w-sm flex-1 md:block"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products, SKU or barcode..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white" /></form>
        <div className="ml-auto flex items-center gap-2"><button className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 sm:flex"><ShoppingBag size={16} />Dhanmondi Branch<ChevronDown size={15} /></button><button className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Notifications"><Bell size={18} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" /></button><button className="flex h-10 items-center gap-2 rounded-xl px-1.5 hover:bg-slate-50"><span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-700">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><span className="hidden text-left sm:block"><span className="block max-w-32 truncate text-xs font-semibold text-slate-800">{user.name}</span><span className="block text-[10px] capitalize text-slate-500">{user.role.toLowerCase()}</span></span></button></div>
      </header>
      <main className="p-3 sm:p-5 lg:p-6">{content}</main>
    </div>
  </div>;
}
