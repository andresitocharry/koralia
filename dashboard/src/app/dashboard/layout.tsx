"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/");
      } else {
        setUser(data.user);
      }
    });
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold text-amber-700">
            Koralia
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-500">{user.email}</span>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push("/"))}
              className="text-sm text-stone-400 hover:text-stone-600"
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
