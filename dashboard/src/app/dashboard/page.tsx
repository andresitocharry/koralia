"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  Phone,
  Brain,
  AlertTriangle,
  ChevronRight,
  Plus,
  X,
  Heart,
} from "lucide-react";

interface Abuelito { id: string; name: string; phone: string; personality_notes: string | null; created_at: string; }
interface CallData { id: string; abuelito_id: string; started_at: string; summary: string | null; duration_seconds: number; }
interface KnowledgeData { id: string; abuelito_id: string; category: string; content: string; }

export default function DashboardPage() {
  const [abuelitos, setAbuelitos] = useState<Abuelito[]>([]);
  const [allCalls, setAllCalls] = useState<CallData[]>([]);
  const [allKnowledge, setAllKnowledge] = useState<KnowledgeData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [a, c, k] = await Promise.all([
      supabase.from("abuelitos").select("*").order("created_at", { ascending: false }),
      supabase.from("calls").select("id, abuelito_id, started_at, summary, duration_seconds").order("started_at", { ascending: false }).limit(50),
      supabase.from("knowledge_entries").select("id, abuelito_id, category, content").order("created_at", { ascending: false }),
    ]);
    if (a.data) setAbuelitos(a.data);
    if (c.data) setAllCalls(c.data);
    if (k.data) setAllKnowledge(k.data);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("abuelitos").insert({ nieto_id: user.id, name, phone, personality_notes: notes || null });
    setName(""); setPhone(""); setNotes(""); setShowForm(false);
    loadData();
  }

  const callsFor = (id: string) => allCalls.filter((c) => c.abuelito_id === id);
  const knowledgeFor = (id: string) => allKnowledge.filter((k) => k.abuelito_id === id);

  const healthAlerts = allKnowledge
    .filter((k) => k.category === "health" && k.content.toLowerCase().match(/duel|dolor|mal|enferm|medic|hospital/))
    .map((k) => ({ ...k, name: abuelitos.find((a) => a.id === k.abuelito_id)?.name || "" }))
    .slice(0, 3);

  function timeAgo(d: string) {
    const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
    if (h < 1) return "hace menos de 1h";
    if (h < 24) return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
  }

  return (
    <div className="space-y-5">
      {/* Alert strip */}
      {healthAlerts.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 truncate">
            <span className="font-medium">{healthAlerts[0].name}:</span> {healthAlerts[0].content}
            {healthAlerts.length > 1 && <span className="text-red-400"> (+{healthAlerts.length - 1} mas)</span>}
          </p>
        </div>
      )}

      {/* Quick numbers */}
      <div className="flex items-center gap-6 text-xs text-stone-400">
        <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-400" /> {abuelitos.length} abuelitos</span>
        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-teal-500" /> {allCalls.length} llamadas</span>
        <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-amber-500" /> {allKnowledge.length} datos</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800">Abuelitos</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition-colors"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? "Cancelar" : "Agregar"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-50" />
            <PhoneInput placeholder="300 123 4567" value={phone} onChange={(v) => setPhone(v || "")} defaultCountry="CO" international countryCallingCodeEditable={false} className="phone-input rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-50" />
          </div>
          <textarea placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-50" />
          <button type="submit" className="rounded-lg bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-700">Guardar</button>
        </form>
      )}

      {/* Cards */}
      {abuelitos.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-stone-200 p-12 text-center">
          <p className="text-sm text-stone-400">Agrega a tu primer abuelito</p>
        </div>
      ) : (
        <div className="space-y-2">
          {abuelitos.map((a) => {
            const calls = callsFor(a.id);
            const kn = knowledgeFor(a.id);
            const last = calls[0];
            const hasAlert = kn.some((k) => k.category === "health" && k.content.toLowerCase().match(/duel|dolor|mal|enferm/));

            return (
              <Link key={a.id} href={`/dashboard/${a.id}`} className="group flex items-center gap-4 rounded-xl bg-white border border-stone-200/60 px-5 py-4 hover:border-teal-200 transition-all">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-emerald-50 flex items-center justify-center text-sm font-bold text-teal-700">
                    {a.name.charAt(0)}
                  </div>
                  {hasAlert && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-stone-800 group-hover:text-teal-700 transition-colors truncate">{a.name}</h3>
                  <p className="text-xs text-stone-400 truncate mt-0.5">
                    {last?.summary || "Sin llamadas aun"}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{calls.length}</span>
                  <span className="flex items-center gap-1"><Brain className="w-3 h-3" />{kn.length}</span>
                  {last && <span>{timeAgo(last.started_at)}</span>}
                </div>

                <ChevronRight className="w-4 h-4 text-stone-300 shrink-0 group-hover:text-teal-500 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
