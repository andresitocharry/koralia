"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-amber-700">
            Koralia
          </h1>
          <p className="mt-2 text-stone-500">
            Cuida a tus abuelitos con llamadas de IA
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Tu correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? "..." : isSignUp ? "Crear cuenta" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500">
          {isSignUp ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-amber-600 hover:underline"
          >
            {isSignUp ? "Entra aquí" : "Regístrate"}
          </button>
        </p>
      </div>
    </div>
  );
}
