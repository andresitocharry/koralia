"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Abuelito {
  id: string;
  name: string;
  phone: string;
  personality_notes: string | null;
}

interface Call {
  id: string;
  started_at: string;
  duration_seconds: number;
  summary: string | null;
  mood: string | null;
}

interface KnowledgeEntry {
  id: string;
  category: string;
  content: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  health: "Salud",
  food: "Alimentación",
  family: "Familia",
  interests: "Intereses",
  mood: "Ánimo",
  routine: "Rutina",
  other: "Otro",
};

const CATEGORY_COLORS: Record<string, string> = {
  health: "bg-red-100 text-red-700",
  food: "bg-orange-100 text-orange-700",
  family: "bg-blue-100 text-blue-700",
  interests: "bg-purple-100 text-purple-700",
  mood: "bg-yellow-100 text-yellow-700",
  routine: "bg-green-100 text-green-700",
  other: "bg-stone-100 text-stone-700",
};

export default function AbuelitoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [abuelito, setAbuelito] = useState<Abuelito | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);

  useEffect(() => {
    if (!id) return;

    supabase
      .from("abuelitos")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setAbuelito(data));

    supabase
      .from("calls")
      .select("id, started_at, duration_seconds, summary, mood")
      .eq("abuelito_id", id)
      .order("started_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setCalls(data || []));

    supabase
      .from("knowledge_entries")
      .select("id, category, content, created_at")
      .eq("abuelito_id", id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setKnowledge(data || []));
  }, [id]);

  if (!abuelito) return null;

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-stone-400 hover:text-stone-600"
        >
          &larr;
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{abuelito.name}</h1>
          <p className="text-sm text-stone-500">{abuelito.phone}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Calls */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Llamadas ({calls.length})
          </h2>
          {calls.length === 0 ? (
            <p className="text-sm text-stone-400">Sin llamadas aún</p>
          ) : (
            <div className="space-y-3">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="rounded-xl border border-stone-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-500">
                      {formatDate(call.started_at)}
                    </span>
                    <span className="text-xs text-stone-400">
                      {formatDuration(call.duration_seconds)}
                    </span>
                  </div>
                  {call.summary && (
                    <p className="mt-2 text-sm leading-relaxed">
                      {call.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Knowledge */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Lo que Koralia sabe ({knowledge.length})
          </h2>
          {knowledge.length === 0 ? (
            <p className="text-sm text-stone-400">
              Koralia aún no ha aprendido nada. Haz una llamada primero.
            </p>
          ) : (
            <div className="space-y-2">
              {knowledge.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other}`}
                    >
                      {CATEGORY_LABELS[entry.category] || entry.category}
                    </span>
                    <span className="text-xs text-stone-400">
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{entry.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
