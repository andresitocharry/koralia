import Image from "next/image";
import Link from "next/link";
import {
  Phone,
  UserPlus,
  BarChart3,
  Brain,
  MessageCircle,
  LayoutDashboard,
  Shield,
  ArrowRight,
  Heart,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-stone-100 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Koralia" width={36} height={36} />
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 via-emerald-500 to-amber-500 bg-clip-text text-transparent">
              Koralia
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#como-funciona" className="hidden sm:block text-sm text-stone-500 hover:text-stone-800 transition-colors">
              Cómo funciona
            </a>
            <a href="#features" className="hidden sm:block text-sm text-stone-500 hover:text-stone-800 transition-colors">
              Características
            </a>
            <Link
              href="/login"
              className="rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-teal-200 transition-all duration-300"
            >
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-24 px-6 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-teal-50 via-emerald-50/50 to-amber-50/30 blur-3xl opacity-60 -z-10" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-rose-50 to-purple-50/30 blur-3xl opacity-40 -z-10" />

        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-100 px-4 py-1.5 mb-6">
                <Heart className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-xs font-medium text-teal-700">Cuidado con inteligencia artificial</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-stone-900 leading-[1.1]">
                Tu abuelito
                <br />
                nunca{" "}
                <span className="bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-500 bg-clip-text text-transparent">
                  se sentirá solo
                </span>
              </h1>
              <p className="mt-6 text-lg text-stone-500 max-w-lg leading-relaxed">
                Koralia llama a tus abuelitos, charla con ellos como una nieta
                cariñosa, recuerda sus historias y te cuenta cómo están.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-200/50 hover:shadow-xl hover:shadow-teal-200/70 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Empieza gratis
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-7 py-3.5 text-sm font-semibold text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-all duration-300"
                >
                  ¿Cómo funciona?
                </a>
              </div>
            </div>

            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-teal-200 via-amber-200 to-rose-200 opacity-20 blur-2xl scale-110" />
                <div className="relative rounded-3xl bg-[#f5f5f5] p-8 shadow-sm border border-stone-100">
                  <Image
                    src="/logo.png"
                    alt="Koralia"
                    width={220}
                    height={220}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent" />

      {/* How it works */}
      <section id="como-funciona" className="py-24 px-6 bg-stone-50/50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-teal-600 tracking-wide uppercase mb-3">
              Proceso simple
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-800">
              ¿Cómo funciona?
            </h2>
            <p className="mt-4 text-stone-500 max-w-xl mx-auto">
              En tres pasos, tus abuelitos tendrán una compañera que los llama,
              los escucha y los recuerda.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="relative group rounded-2xl bg-white border border-stone-100 p-8 text-center hover:shadow-lg hover:border-teal-100 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-4 left-4 text-5xl font-black text-stone-100 select-none">1</div>
              <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mb-5 shadow-lg shadow-teal-200/40 group-hover:scale-110 transition-transform duration-300">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-semibold text-stone-800 mb-2">
                Registra a tu abuelito
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Agrega su nombre y número. No necesita smartphone — solo su
                teléfono de siempre.
              </p>
            </div>

            <div className="relative group rounded-2xl bg-white border border-stone-100 p-8 text-center hover:shadow-lg hover:border-amber-100 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-4 left-4 text-5xl font-black text-stone-100 select-none">2</div>
              <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-5 shadow-lg shadow-amber-200/40 group-hover:scale-110 transition-transform duration-300">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-semibold text-stone-800 mb-2">
                Koralia lo llama
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Lo llama con voz cálida y natural. Charla como una nieta
                cariñosa, con calma y sin prisa.
              </p>
            </div>

            <div className="relative group rounded-2xl bg-white border border-stone-100 p-8 text-center hover:shadow-lg hover:border-rose-100 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-4 left-4 text-5xl font-black text-stone-100 select-none">3</div>
              <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center mb-5 shadow-lg shadow-rose-200/40 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-semibold text-stone-800 mb-2">
                Tú recibes insights
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Resumen de cada llamada: cómo se sintió, qué contó, si mencionó
                algo de salud. Tu tranquilidad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-amber-600 tracking-wide uppercase mb-3">
              Características
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-800">
              Lo que Koralia hace por tu familia
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="group rounded-2xl border border-stone-100 bg-white p-7 hover:shadow-lg hover:border-teal-100 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mb-4 shadow-md shadow-teal-200/30 group-hover:scale-110 transition-transform duration-300">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-stone-800 mb-2">
                Memoria que crece
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Koralia recuerda cada conversación. Si tu abuelita le contó que
                le duele la rodilla, la próxima vez le preguntará cómo sigue.
              </p>
            </div>

            <div className="group rounded-2xl border border-stone-100 bg-white p-7 hover:shadow-lg hover:border-amber-100 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-md shadow-amber-200/30 group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-stone-800 mb-2">
                Conversación natural
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                No suena a robot. Koralia habla con calidez, usa expresiones
                colombianas y se adapta al ritmo de cada abuelito.
              </p>
            </div>

            <div className="group rounded-2xl border border-stone-100 bg-white p-7 hover:shadow-lg hover:border-purple-100 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-4 shadow-md shadow-purple-200/30 group-hover:scale-110 transition-transform duration-300">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-stone-800 mb-2">
                Dashboard para la familia
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Como nieto ves resúmenes de llamadas, estado de ánimo y alertas
                de salud. Sin molestar al abuelito con tecnología.
              </p>
            </div>

            <div className="group rounded-2xl border border-stone-100 bg-white p-7 hover:shadow-lg hover:border-emerald-100 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4 shadow-md shadow-emerald-200/30 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-stone-800 mb-2">
                Privacidad primero
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Solo tú puedes ver la información de tus abuelitos. Los datos
                están encriptados y nunca se comparten.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_50%)]" />

        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Dale a tu abuelito una llamada
            <br />que le alegre el día
          </h2>
          <p className="text-teal-100 mb-10 text-lg max-w-xl mx-auto">
            Empieza gratis. Sin tarjeta de crédito. Solo agrega a tu abuelito y
            Koralia se encarga del resto.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-teal-600 shadow-xl hover:bg-teal-50 hover:-translate-y-0.5 transition-all duration-300"
          >
            Crear cuenta gratis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-stone-100">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Koralia" width={24} height={24} />
            <span className="text-sm font-semibold bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent">
              Koralia
            </span>
          </div>
          <p className="text-xs text-stone-400">
            Hecho con cariño para los abuelitos de Colombia
          </p>
        </div>
      </footer>
    </div>
  );
}
