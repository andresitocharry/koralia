"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-[#f7f7f7]">
        <div className="text-center space-y-6 px-12">
          <Image
            src="/logo.png"
            alt="Koralia"
            width={200}
            height={200}
            className="mx-auto"
          />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-amber-500 to-rose-500 bg-clip-text text-transparent">
            Koralia
          </h2>
          <p className="text-lg text-stone-500 max-w-md">
            Llamadas con IA que cuidan a tus abuelitos, recuerdan sus historias y los mantienen conectados.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-4">
              <Image src="/logo.png" alt="Koralia" width={80} height={80} />
            </div>
            <h1 className="text-3xl font-bold text-stone-800">
              {isSignUp ? "Crea tu cuenta" : "Bienvenido"}
            </h1>
            <p className="mt-1 text-stone-500">
              {isSignUp
                ? "Empieza a cuidar a tus abuelitos"
                : "Entra para ver cómo están tus abuelitos"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Correo
              </label>
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 transition-all"
            >
              {loading ? "..." : isSignUp ? "Crear cuenta" : "Entrar"}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500">
            {isSignUp ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="font-medium text-teal-600 hover:underline"
            >
              {isSignUp ? "Entra aquí" : "Regístrate gratis"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
