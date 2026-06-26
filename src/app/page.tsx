import Link from 'next/link'
import { Shield, Users, Calendar, Award } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">East Coast MMA</span>
        <Link
          href="/signup"
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          Start Free Trial
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
          Train Hard.<br />Track Everything.
        </h1>
        <p className="text-white/60 text-lg max-w-xl">
          MatFlow helps martial arts gyms manage members, classes, belts, and payments — all in one place.
        </p>
        <Link
          href="/signup"
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-xl text-lg transition"
        >
          Get Started Free
        </Link>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-6 pb-24 max-w-6xl mx-auto">
        {[
          { icon: Users, title: 'Member Management', desc: 'Track every student, belt rank, and attendance.' },
          { icon: Calendar, title: 'Class Scheduling', desc: 'Build weekly schedules and manage bookings.' },
          { icon: Award, title: 'Belt Tracking', desc: 'Log promotions and stripes automatically.' },
          { icon: Shield, title: 'Secure & Private', desc: 'Each gym\'s data is fully isolated and protected.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-3">
            <Icon className="text-red-500" size={28} />
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-white/50 text-sm">{desc}</p>
          </div>
        ))}
      </section>

    </main>
  )
}