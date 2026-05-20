"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Abuelito {
  id: string;
  name: string;
  phone: string;
  personality_notes: string | null;
  created_at: string;
  call_count?: number;
  last_call?: string;
}

export default function DashboardPage() {
  const [abuelitos, setAbuelitos] = useState<Abuelito[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadAbuelitos();
  }, []);

  async function loadAbuelitos() {
    const { data } = await supabase
      .from("abuelitos")
      .select("*, calls(id, started_at)")
      .order("created_at", { ascending: false });

    if (data) {
      setAbuelitos(
        data.map((a: any) => ({
          ...a,
          call_count: a.calls?.length || 0,
          last_call: a.calls?.sort(
            (x: any, y: any) =>
              new Date(y.started_at).getTime() -
              new Date(x.started_at).getTime()
          )[0]?.started_at,
        }))
      );
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("abuelitos").insert({
      nieto_id: user.id,
      name,
      phone,
      personality_notes: notes || null,
    });

    setName("");
    setPhone("");
    setNotes("");
    setShowForm(false);
    loadAbuelitos();
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Hace menos de una hora";
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Mis Abuelitos</h1>
          <p className="text-sm text-stone-400 mt-1">
            {abuelitos.length === 0
              ? "Agrega a tu primer abuelito para empezar"
              : `${abuelitos.length} abuelito${abuelitos.length > 1 ? "s" : ""} registrado${abuelitos.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-teal-600 hover:to-emerald-600 transition-all"
        >
          {showForm ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Nombre
              </label>
              <input
                placeholder="Doña María"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Teléfono
              </label>
              <input
                placeholder="+573001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              placeholder="Le gusta hablar de sus nietos, tiene artritis en las manos..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-teal-600 hover:to-emerald-600 transition-all"
          >
            Guardar abuelito
          </button>
        </form>
      )}

      {abuelitos.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <p className="text-stone-400">
            Aún no tienes abuelitos registrados
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {abuelitos.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/${a.id}`}
              className="group rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold group-hover:text-teal-700 transition-colors">
                    {a.name}
                  </h2>
                  <p className="text-sm text-stone-400">{a.phone}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                    {a.call_count} llamada{a.call_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {a.personality_notes && (
                <p className="mt-3 text-sm text-stone-400 line-clamp-2">
                  {a.personality_notes}
                </p>
              )}
              {a.last_call && (
                <p className="mt-3 text-xs text-stone-300">
                  Última llamada: {timeAgo(a.last_call)}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
