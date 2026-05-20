"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        router.push("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  return null;
}
