"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setLoading(false);
      } else {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Koralia" width={32} height={32} />
            <span className="text-lg font-bold bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent">
              Koralia
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-400">{user.email}</span>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-50"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
