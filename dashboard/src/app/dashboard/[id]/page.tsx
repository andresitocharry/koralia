"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Phone,
  Brain,
  Clock,
  Heart,
  UtensilsCrossed,
  Users,
  Star,
  Smile,
  CalendarClock,
  FileText,
} from "lucide-react";

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

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Heart }
> = {
  health: { label: "Salud", color: "text-red-600", bg: "bg-red-50 border-red-100", icon: Heart },
  food: { label: "Alimentación", color: "text-orange-600", bg: "bg-orange-50 border-orange-100", icon: UtensilsCrossed },
  family: { label: "Familia", color: "text-blue-600", bg: "bg-blue-50 border-blue-100", icon: Users },
  interests: { label: "Intereses", color: "text-purple-600", bg: "bg-purple-50 border-purple-100", icon: Star },
  mood: { label: "Ánimo", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-100", icon: Smile },
  routine: { label: "Rutina", color: "text-green-600", bg: "bg-green-50 border-green-100", icon: CalendarClock },
  other: { label: "Otro", color: "text-stone-600", bg: "bg-stone-50 border-stone-100", icon: FileText },
};

export default function AbuelitoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [abuelito, setAbuelito] = useState<Abuelito | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);

  useEffect(() => {
    if (!id) return;

    supabase.from("abuelitos").select("*").eq("id", id).single()
      .then(({ data }) => setAbuelito(data));

    supabase.from("calls")
      .select("id, started_at, duration_seconds, summary, mood")
      .eq("abuelito_id", id).order("started_at", { ascending: false }).limit(20)
      .then(({ data }) => setCalls(data || []));

    supabase.from("knowledge_entries")
      .select("id, category, content, created_at")
      .eq("abuelito_id", id).order("created_at", { ascending: false }).limit(50)
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
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const knowledgeByCategory = knowledge.reduce(
    (acc, entry) => {
      const cat = entry.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(entry);
      return acc;
    },
    {} as Record<string, KnowledgeEntry[]>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-stone-200 text-stone-400 hover:text-stone-600 hover:border-stone-300 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-800">
            {abuelito.name}
          </h1>
          <p className="text-sm text-stone-400">{abuelito.phone}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-stone-200 p-4 text-center">
          <div className="flex justify-center mb-2">
            <Phone className="w-5 h-5 text-teal-500" />
          </div>
          <p className="text-2xl font-bold text-teal-600">{calls.length}</p>
          <p className="text-xs text-stone-400 mt-1">Llamadas</p>
        </div>
        <div className="rounded-2xl bg-white border border-stone-200 p-4 text-center">
          <div className="flex justify-center mb-2">
            <Brain className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {knowledge.length}
          </p>
          <p className="text-xs text-stone-400 mt-1">Datos aprendidos</p>
        </div>
        <div className="rounded-2xl bg-white border border-stone-200 p-4 text-center">
          <div className="flex justify-center mb-2">
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {calls.length > 0
              ? formatDuration(
                  Math.round(
                    calls.reduce((s, c) => s + c.duration_seconds, 0) /
                      calls.length
                  )
                )
              : "—"}
          </p>
          <p className="text-xs text-stone-400 mt-1">Duración promedio</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Calls */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-stone-800">
            Historial de llamadas
          </h2>
          {calls.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center">
              <Phone className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-400">Sin llamadas aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="rounded-2xl border border-stone-200 bg-white p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-stone-600">
                      {formatDate(call.started_at)}
                    </span>
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-500">
                      {formatDuration(call.duration_seconds)}
                    </span>
                  </div>
                  {call.summary && (
                    <p className="text-sm text-stone-600 leading-relaxed">
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
          <h2 className="text-lg font-semibold text-stone-800">
            Lo que Koralia sabe
          </h2>
          {knowledge.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center">
              <Brain className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-400">
                Koralia aún no ha aprendido nada
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(knowledgeByCategory).map(([cat, entries]) => {
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
                const Icon = config.icon;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className="text-sm font-medium text-stone-600">
                        {config.label}
                      </span>
                      <span className="text-xs text-stone-300">
                        ({entries.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className={`rounded-xl border px-4 py-3 ${config.bg}`}
                        >
                          <p className={`text-sm ${config.color}`}>
                            {entry.content}
                          </p>
                          <p className="text-xs opacity-40 mt-1">
                            {formatDate(entry.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
