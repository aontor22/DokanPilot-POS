"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Banknote, Box, CircleAlert, ReceiptText, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { api, formatDate, formatMoney } from "@/lib/api";
import type { DashboardData } from "@/lib/types";
import { Empty, ErrorNotice, Panel, Spinner, StatusPill } from "@/components/ui";

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get<DashboardData>("/dashboard").then(setData).catch((e) => setError(e.message)); }, []);
  if (!data && !error) return <Spinner label="Loading dashboard" />;
  if (!data) return <ErrorNotice message={error} />;
  const stats = [
    ["Today’s sales", formatMoney(data.todaySales), TrendingUp, "bg-emerald-50 text-emerald-600"],
    ["Transactions", data.transactionCount.toLocaleString(), ReceiptText, "bg-blue-50 text-blue-600"],
    ["Average basket", formatMoney(data.averageBasket), ShoppingCart, "bg-violet-50 text-violet-600"],
    ["Active products", data.productCount.toLocaleString(), Box, "bg-amber-50 text-amber-600"],
  ] as const;
  const bars = [35, 52, 68, 74, 82, 96, 88, 72, 76, 58, 44, 28];
  return <div>
    <section className="mb-4 flex flex-col gap-5 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-semibold text-indigo-600">STORE OVERVIEW</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Good afternoon! Your store is active.</h1><p className="mt-1 text-sm text-slate-500">Track sales, stock and customers from one place.</p></div>
      <a href="/pos" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-bold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700"><ShoppingCart size={20} />New Sale</a>
    </section>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, Icon, color]) => <Panel key={label} className="p-4"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="metric-number mt-2 text-2xl font-bold text-slate-950">{value}</p><p className="mt-2 text-xs font-semibold text-emerald-600">Live from database</p></div><span className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}><Icon size={21} /></span></div></Panel>)}</div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
      <Panel><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">Recent transactions</h2><p className="text-xs text-slate-500">Latest checkout activity</p></div><a href="/transactions" className="flex items-center gap-1 text-xs font-semibold text-indigo-600">View all <ArrowRight size={14} /></a></div>{data.recentSales.length ? <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recentSales.map((sale) => <tr key={sale.id} className="hover:bg-slate-50"><td className="px-5 py-3.5"><b className="text-slate-800">{sale.invoiceNo}</b><span className="block text-xs text-slate-400">{formatDate(sale.createdAt, true)}</span></td><td className="px-4 py-3.5 text-slate-600">{sale.customer?.name || "Walk-in customer"}</td><td className="px-4 py-3.5 text-slate-600">{sale.items.length}</td><td className="px-4 py-3.5 text-slate-600">{sale.paymentMethod}</td><td className="px-4 py-3.5 font-bold">{formatMoney(sale.total)}</td><td className="px-4 py-3.5"><StatusPill value={sale.status} /></td></tr>)}</tbody></table></div> : <Empty title="No sales yet" text="Your completed sales will appear here." />}</Panel>
      <Panel><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><CircleAlert className="text-amber-500" size={19} /><h2 className="font-bold text-slate-900">Low stock</h2></div><a href="/inventory" className="text-xs font-semibold text-indigo-600">View inventory</a></div>{data.lowStock.length ? <div className="divide-y divide-slate-100">{data.lowStock.map((product) => <div key={product.id} className="flex items-center gap-3 px-5 py-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600"><Box size={18} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{product.name}</p><p className="text-xs text-slate-400">{product.sku}</p></div><span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{product.stock} left</span></div>)}</div> : <Empty title="Stock looks healthy" text="No products are below their alert level." />}</Panel>
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]"><Panel className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Sales by hour</h2><p className="text-xs text-slate-500">Illustrative trading rhythm</p></div><Banknote className="text-indigo-500" size={20} /></div><div className="mt-6 flex h-40 items-end gap-2 sm:gap-3">{bars.map((height, i) => <div key={i} className="group flex h-full flex-1 items-end"><div className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-blue-400 transition group-hover:from-emerald-600 group-hover:to-emerald-400" style={{ height: `${height}%` }} title={`${i + 9}:00`} /></div>)}</div><div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>9 AM</span><span>2 PM</span><span>8 PM</span></div></Panel><Panel className="p-5"><h2 className="font-bold">Store pulse</h2><div className="mt-5 space-y-4"><div className="flex items-center justify-between rounded-xl bg-indigo-50 p-4"><div className="flex items-center gap-3"><Users className="text-indigo-600" size={21} /><span className="text-sm font-semibold">Customers</span></div><b>{data.customerCount}</b></div><div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4"><div className="flex items-center gap-3"><ShoppingCart className="text-emerald-600" size={21} /><span className="text-sm font-semibold">Sales today</span></div><b>{data.transactionCount}</b></div></div></Panel></div>
  </div>;
}
