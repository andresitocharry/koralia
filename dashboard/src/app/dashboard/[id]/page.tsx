"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Phone, Brain, Clock, Heart, UtensilsCrossed, Users, Star,
  Link2, Smile, CalendarClock, FileText, AlertTriangle, Activity,
  TrendingUp, Settings, Check,
} from "lucide-react";

interface Abuelito {
  id: string; name: string; phone: string; personality_notes: string | null;
  call_frequency: string | null; preferred_time: string | null; tone: string | null; topics: string[] | null;
}
interface Call { id: string; started_at: string; duration_seconds: number; summary: string | null; mood: string | null; }
interface KnowledgeEntry { id: string; category: string; content: string; created_at: string; }
interface Connection { abuelito_id: string; abuelito_name: string; shared_interests: string[]; }

const TABS = [
  { key: "resumen", label: "Resumen", icon: Activity },
  { key: "llamadas", label: "Llamadas", icon: Phone },
  { key: "perfil", label: "Perfil", icon: Brain },
  { key: "ajustes", label: "Ajustes", icon: Settings },
] as const;

type Tab = typeof TABS[number]["key"];

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; accent: string; icon: typeof Heart }> = {
  health: { label: "Salud", color: "text-red-700", bg: "bg-red-50", accent: "border-red-200", icon: Heart },
  food: { label: "Alimentacion", color: "text-amber-700", bg: "bg-amber-50", accent: "border-amber-200", icon: UtensilsCrossed },
  family: { label: "Familia", color: "text-blue-700", bg: "bg-blue-50", accent: "border-blue-200", icon: Users },
  interests: { label: "Intereses", color: "text-purple-700", bg: "bg-purple-50", accent: "border-purple-200", icon: Star },
  mood: { label: "Animo", color: "text-yellow-700", bg: "bg-yellow-50", accent: "border-yellow-200", icon: Smile },
  routine: { label: "Rutina", color: "text-emerald-700", bg: "bg-emerald-50", accent: "border-emerald-200", icon: CalendarClock },
  other: { label: "Otro", color: "text-stone-600", bg: "bg-stone-50", accent: "border-stone-200", icon: FileText },
};

const FREQ_OPTIONS = [
  { value: "daily", label: "Diaria" },
  { value: "every_other_day", label: "Cada 2 dias" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
];
const TIME_OPTIONS = [
  { value: "morning", label: "Manana (9-12)" },
  { value: "afternoon", label: "Tarde (2-5)" },
  { value: "evening", label: "Noche (6-8)" },
];
const TONE_OPTIONS = [
  { value: "warm", label: "Calida", desc: "Cercana, como una nieta" },
  { value: "cheerful", label: "Alegre", desc: "Energica y animada" },
  { value: "calm", label: "Tranquila", desc: "Pausada y serena" },
  { value: "playful", label: "Juguetona", desc: "Con humor suave" },
];
const TOPIC_OPTIONS = ["Comida", "Salud", "Familia", "Historias del pasado", "Clima", "Noticias", "Musica", "Paseos"];

export default function AbuelitoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("resumen");
  const [abuelito, setAbuelito] = useState<Abuelito | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [pastConnections, setPastConnections] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Settings state
  const [freq, setFreq] = useState("weekly");
  const [time, setTime] = useState("morning");
  const [tone, setTone] = useState("warm");
  const [topics, setTopics] = useState<string[]>([]);
  const [personalityNotes, setPersonalityNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    supabase.from("abuelitos").select("*").eq("id", id).single().then(({ data }) => {
      if (data) {
        setAbuelito(data);
        setFreq(data.call_frequency || "weekly");
        setTime(data.preferred_time || "morning");
        setTone(data.tone || "warm");
        setTopics(data.topics || []);
        setPersonalityNotes(data.personality_notes || "");
      }
    });
    supabase.from("calls").select("id, started_at, duration_seconds, summary, mood").eq("abuelito_id", id).order("started_at", { ascending: false }).limit(20).then(({ data }) => setCalls(data || []));
    supabase.from("knowledge_entries").select("id, category, content, created_at").eq("abuelito_id", id).order("created_at", { ascending: false }).limit(50).then(({ data }) => setKnowledge(data || []));
    setLoadingConnections(true);
    fetch(`http://localhost:5050/api/connections/${id}`).then((r) => r.json()).then((d) => setConnections(d)).catch(() => setConnections([])).finally(() => setLoadingConnections(false));

    // Load past connections from DB
    Promise.all([
      supabase.from("connections").select("*, abuelitos!connections_abuelito_b_id_fkey(name)").eq("abuelito_a_id", id).order("created_at", { ascending: false }),
      supabase.from("connections").select("*, abuelitos!connections_abuelito_a_id_fkey(name)").eq("abuelito_b_id", id).order("created_at", { ascending: false }),
    ]).then(([asA, asB]) => {
      const all = [
        ...(asA.data || []).map((c: any) => ({ ...c, friend_name: c.abuelitos?.name || "?" })),
        ...(asB.data || []).map((c: any) => ({ ...c, friend_name: c.abuelitos?.name || "?" })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPastConnections(all);
    });
  }, [id]);

  if (!abuelito) return null;

  async function saveSettings() {
    setSaving(true);
    await supabase.from("abuelitos").update({
      call_frequency: freq, preferred_time: time, tone, topics, personality_notes: personalityNotes || null,
    }).eq("id", id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleTopic(t: string) {
    setTopics((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  const healthEntries = knowledge.filter((k) => k.category === "health");
  const latestMood = knowledge.find((k) => k.category === "mood");
  const hasHealthConcern = healthEntries.some((k) => k.content.toLowerCase().match(/duel|dolor|mal|enferm|medic|hospital/));
  const totalMinutes = Math.round(calls.reduce((s, c) => s + c.duration_seconds, 0) / 60);

  const knowledgeByCategory = knowledge.reduce((acc, entry) => {
    const cat = entry.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {} as Record<string, KnowledgeEntry[]>);

  const sortedCategories = ["health", "mood", "food", "routine", "family", "interests", "other"].filter((c) => knowledgeByCategory[c]);

  function fmtDur(s: number) { return `${Math.floor(s / 60)}m ${s % 60}s`; }
  function fmtDate(d: string) { return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-stone-200 text-stone-400 hover:text-stone-600 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-stone-800">{abuelito.name}</h1>
          <p className="text-xs text-stone-400">{abuelito.phone}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-400">
          <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-teal-500" />{calls.length}</span>
          <span className="flex items-center gap-1"><Brain className="w-3 h-3 text-amber-500" />{knowledge.length}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-purple-500" />{totalMinutes}min</span>
        </div>
      </div>

      {/* Alert */}
      {hasHealthConcern && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{healthEntries[0].content}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                tab === t.key
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* === RESUMEN === */}
      {tab === "resumen" && (
        <div className="space-y-4">
          {latestMood && (
            <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 px-4 py-3 flex items-center gap-3">
              <Smile className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-800">{latestMood.content}</p>
            </div>
          )}

          {calls[0] && (
            <div className="rounded-xl bg-white border border-stone-200/60 p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400 mb-2">Ultima llamada</p>
              <p className="text-sm text-stone-600 leading-relaxed">{calls[0].summary}</p>
              <p className="text-xs text-stone-300 mt-2">{fmtDate(calls[0].started_at)} — {fmtDur(calls[0].duration_seconds)}</p>
            </div>
          )}

          {connections.length > 0 && (
            <div className="rounded-xl bg-white border border-stone-200/60 p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Conexiones
              </p>
              <div className="space-y-2.5">
                {connections.map((conn) => (
                  <div key={conn.abuelito_id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-xs font-bold text-emerald-700">
                      {conn.abuelito_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700">{conn.abuelito_name}</p>
                      <p className="text-xs text-stone-400 truncate">{conn.shared_interests.join(", ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past connections */}
          {pastConnections.length > 0 && (
            <div className="rounded-xl bg-white border border-stone-200/60 p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400 mb-3 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-500" /> Llamadas con amigos
              </p>
              <div className="space-y-3">
                {pastConnections.map((c: any) => (
                  <div key={c.id} className="rounded-lg bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5 text-teal-600" />
                        <span className="text-sm font-medium text-teal-800">
                          Conectado con {c.friend_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-teal-500">
                        {new Date(c.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {c.shared_interests?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.shared_interests.map((interest: string, i: number) => (
                          <span key={i} className="rounded bg-teal-100 px-2 py-0.5 text-[10px] text-teal-700">{interest}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {calls.length === 0 && !latestMood && pastConnections.length === 0 && (
            <div className="rounded-xl border border-dashed border-stone-200 p-10 text-center">
              <Phone className="w-6 h-6 text-stone-200 mx-auto mb-2" />
              <p className="text-xs text-stone-400">Aun no hay actividad. Haz la primera llamada.</p>
            </div>
          )}
        </div>
      )}

      {/* === LLAMADAS === */}
      {tab === "llamadas" && (
        <div>
          {calls.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 p-10 text-center">
              <Phone className="w-6 h-6 text-stone-200 mx-auto mb-2" />
              <p className="text-xs text-stone-400">Sin llamadas aun</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[17px] top-6 bottom-6 w-px bg-stone-200" />
              <div className="space-y-0">
                {calls.map((call, i) => (
                  <div key={call.id} className="relative flex gap-4 pb-4">
                    <div className="relative z-10 shrink-0">
                      <div className={`w-[9px] h-[9px] rounded-full mt-[7px] ml-[13px] ${i === 0 ? "bg-teal-500 ring-4 ring-teal-50" : "bg-stone-300"}`} />
                    </div>
                    <div className={`flex-1 rounded-xl border px-4 py-3.5 ${i === 0 ? "bg-white border-teal-100 shadow-sm" : "bg-white/60 border-stone-100"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-medium ${i === 0 ? "text-teal-700" : "text-stone-500"}`}>{fmtDate(call.started_at)}</span>
                        <span className="text-[10px] text-stone-400 bg-stone-50 rounded px-1.5 py-0.5">{fmtDur(call.duration_seconds)}</span>
                      </div>
                      {call.summary && <p className="text-sm text-stone-600 leading-relaxed">{call.summary}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === PERFIL === */}
      {tab === "perfil" && (
        <div>
          {knowledge.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 p-10 text-center">
              <Brain className="w-6 h-6 text-stone-200 mx-auto mb-2" />
              <p className="text-xs text-stone-400">Sin datos aun</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map((cat) => {
                const entries = knowledgeByCategory[cat];
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
                const Icon = config.icon;
                return (
                  <div key={cat} className={`rounded-xl border ${config.accent} ${config.bg} p-4`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${config.color}`}>{config.label}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {entries.map((entry) => (
                        <li key={entry.id} className="flex items-start gap-2">
                          <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${config.color.replace("text-", "bg-")}`} />
                          <p className={`text-sm leading-snug ${config.color} opacity-80`}>{entry.content}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === AJUSTES === */}
      {tab === "ajustes" && (
        <div className="space-y-6">
          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">Frecuencia de llamadas</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FREQ_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setFreq(o.value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm transition-all ${
                    freq === o.value
                      ? "border-teal-300 bg-teal-50 text-teal-700 font-medium"
                      : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">Horario preferido</label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setTime(o.value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm transition-all ${
                    time === o.value
                      ? "border-teal-300 bg-teal-50 text-teal-700 font-medium"
                      : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">Tono de Koralia</label>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setTone(o.value)}
                  className={`rounded-lg border px-3 py-3 text-left transition-all ${
                    tone === o.value
                      ? "border-teal-300 bg-teal-50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <p className={`text-sm font-medium ${tone === o.value ? "text-teal-700" : "text-stone-600"}`}>{o.label}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{o.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">Temas preferidos</label>
            <div className="flex flex-wrap gap-2">
              {TOPIC_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTopic(t)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                    topics.includes(t)
                      ? "border-teal-300 bg-teal-50 text-teal-700 font-medium"
                      : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">Notas personales</label>
            <textarea
              value={personalityNotes}
              onChange={(e) => setPersonalityNotes(e.target.value)}
              rows={3}
              placeholder="Cosas que Koralia deberia saber: tiene artritis, no le gusta hablar de politica..."
              className="w-full rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-50"
            />
          </div>

          {/* Save */}
          <button
            onClick={saveSettings}
            disabled={saving}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
              saved
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-teal-600 text-white hover:bg-teal-700"
            }`}
          >
            {saved ? <><Check className="w-4 h-4" /> Guardado</> : saving ? "Guardando..." : "Guardar ajustes"}
          </button>
        </div>
      )}
    </div>
  );
}
