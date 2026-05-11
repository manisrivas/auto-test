import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Try it — no credit card",
    features: ["50 pushes/month", "AI included", "Dashboard reporting", "Quality gate"],
    cta: "Get started free",
    href: "/login?register=true",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    description: "For developers who ship daily",
    features: ["500 pushes/month", "AI included", "Team dashboard", "Priority support"],
    cta: "Start free trial",
    href: "/login?register=true&plan=pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams at scale",
    features: ["Unlimited pushes", "Your own API key", "SSO + audit logs", "Dedicated support"],
    cta: "Contact sales",
    href: "mailto:sales@autotest.dev",
    highlight: false,
  },
];

const steps = [
  { step: "01", title: "Install", code: "pip install autotest-hook" },
  { step: "02", title: "Login", code: "autotest login" },
  { step: "03", title: "Hook", code: "autotest --install" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-brand-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-semibold text-zinc-100 tracking-tight">AutoTest</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#pricing" className="text-sm text-zinc-400 hover:text-zinc-100 transition">
            Pricing
          </a>
          <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-100 transition">
            Log in
          </Link>
          <Link
            href="/login?register=true"
            className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-4 py-1.5 rounded-md font-medium transition"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative text-center pt-28 pb-24 px-8 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-xs text-zinc-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Now in public beta
        </div>

        <h1 className="text-6xl font-bold tracking-tight text-zinc-50 leading-[1.08]">
          AI-generated tests<br />
          <span className="text-zinc-500">before every push</span>
        </h1>

        <p className="mt-6 text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
          AutoTest hooks into git, scans your changed functions, and generates
          unit tests with AI — automatically, on every push.
        </p>

        <div className="mt-10 flex gap-3 justify-center">
          <Link
            href="/login?register=true"
            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg font-semibold transition text-sm"
          >
            Get started free
          </Link>
          <a
            href="#pricing"
            className="border border-zinc-700 hover:border-zinc-600 text-zinc-300 px-6 py-2.5 rounded-lg font-semibold transition text-sm"
          >
            See pricing
          </a>
        </div>
      </section>

      {/* 3 steps */}
      <section className="max-w-3xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((s) => (
            <div key={s.step} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <span className="text-xs font-mono text-zinc-600">{s.step}</span>
              <p className="text-sm font-semibold text-zinc-200 mt-2 mb-3">{s.title}</p>
              <code className="text-xs font-mono text-brand-400 bg-zinc-950 px-3 py-2 rounded-md block">
                {s.code}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* Terminal strip */}
      <section className="bg-zinc-900 border-y border-zinc-800 py-6 px-8 font-mono text-sm overflow-x-auto">
        <div className="max-w-3xl mx-auto space-y-1">
          <p><span className="text-zinc-600">$</span> <span className="text-zinc-300">git push origin main</span></p>
          <p className="text-zinc-500">AutoTest: scanning changed functions...</p>
          <p className="text-zinc-500">Found 3 function(s). Generating tests via AI...</p>
          <p><span className="text-green-400">✓</span> <span className="text-zinc-300">calculate_discount</span> <span className="text-zinc-600">3/3 passed</span></p>
          <p><span className="text-green-400">✓</span> <span className="text-zinc-300">validate_email</span> <span className="text-zinc-600">4/4 passed</span></p>
          <p><span className="text-red-400">✗</span> <span className="text-zinc-300">parse_date</span> <span className="text-zinc-600">1/3 passed — push blocked</span></p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-8 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-zinc-50 mb-3">Simple pricing</h2>
        <p className="text-center text-zinc-500 mb-12 text-sm">No API key needed. AI is included in every plan.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-7 border flex flex-col ${
                plan.highlight
                  ? "border-brand-500/50 bg-zinc-900 shadow-[0_0_40px_-10px_rgba(59,130,246,0.2)]"
                  : "border-zinc-800 bg-zinc-900"
              }`}
            >
              {plan.highlight && (
                <span className="text-xs font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full self-start mb-4">
                  Most popular
                </span>
              )}
              <h3 className="font-semibold text-zinc-100">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zinc-50">{plan.price}</span>
                {plan.period && <span className="text-zinc-500 text-sm">{plan.period}</span>}
              </div>
              <p className="text-xs text-zinc-500 mt-1">{plan.description}</p>

              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-400">
                    <svg className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-8 block text-center py-2.5 rounded-lg text-sm font-semibold transition ${
                  plan.highlight
                    ? "bg-brand-600 hover:bg-brand-700 text-white"
                    : "border border-zinc-700 hover:border-zinc-600 text-zinc-300"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-8 text-center text-xs text-zinc-600">
        © 2025 AutoTest · Built for developers who ship
      </footer>
    </main>
  );
}
