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
      .table("abuelitos")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAbuelitos(data);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.table("abuelitos").insert({
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Abuelitos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          {showForm ? "Cancelar" : "+ Agregar abuelito"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-stone-200 bg-white p-6 space-y-4"
        >
          <input
            placeholder="Nombre del abuelito"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none"
          />
          <input
            placeholder="Teléfono (+573001234567)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none"
          />
          <textarea
            placeholder="Notas de personalidad (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-600 px-6 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Guardar
          </button>
        </form>
      )}

      {abuelitos.length === 0 ? (
        <p className="text-center text-stone-400 py-12">
          Aún no tienes abuelitos registrados. ¡Agrega uno!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {abuelitos.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/${a.id}`}
              className="rounded-xl border border-stone-200 bg-white p-6 transition hover:border-amber-300 hover:shadow-sm"
            >
              <h2 className="text-lg font-semibold">{a.name}</h2>
              <p className="text-sm text-stone-500">{a.phone}</p>
              {a.personality_notes && (
                <p className="mt-2 text-sm text-stone-400">
                  {a.personality_notes}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
