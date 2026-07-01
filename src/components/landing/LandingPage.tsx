'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  Award,
  Calendar,
  ClipboardCheck,
  CreditCard,
  FileText,
  Monitor,
  Shield,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useRef } from 'react'
import Logo from '@/components/Logo'
import { SpringButton } from '@/components/SpringButton'
import { homeFaqs } from '@/lib/seo/faq'
import { featureLinks, loginHrefForFeature, portalLoginHrefForFeature } from '@/lib/features'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: ClipboardCheck,
    title: 'Training Log',
    desc: 'Every session tracked. Attendance, partners, and hours on the mat — your real Jiu Jitsu journal.',
  },
  {
    icon: Calendar,
    title: 'Training Schedule',
    desc: 'Plan your week. Build class schedules, manage bookings, and see who is training that day.',
  },
  {
    icon: Users,
    title: 'Gym Community',
    desc: 'Manage every student, belt rank, and membership. A private hub for your academy.',
  },
  {
    icon: Award,
    title: 'Belt Tracking',
    desc: 'Belts, stripes, and promotion history with notes. A lifelong record of time on the mat.',
  },
  {
    icon: Trophy,
    title: 'Competitions',
    desc: 'Log tournaments, divisions, and results. Track competition history for every athlete.',
  },
  {
    icon: Calendar,
    title: 'Events & Open Mats',
    desc: 'Organize seminars, in-house tournaments, belt ceremonies, and open mats at your gym.',
  },
  {
    icon: Monitor,
    title: 'Kiosk Check-In',
    desc: 'Fast front-desk check-in with a dedicated kiosk. Members walk in and tap — done.',
  },
  {
    icon: CreditCard,
    title: 'Gym Management',
    desc: 'Scheduling, attendance, member portal, subscriptions, analytics, and waivers in one platform.',
  },
  {
    icon: FileText,
    title: 'Digital Waivers',
    desc: 'Create, send, and collect signed waivers digitally. Stay compliant without the paperwork.',
  },
]

function FeatureCard({
  icon: Icon,
  title,
  desc,
  index,
}: {
  icon: LucideIcon
  title: string
  desc: string
  index: number
}) {
  const link = featureLinks[title]

  return (
    <motion.article
      custom={index}
      variants={fadeUp}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-6 backdrop-blur-sm transition-colors hover:border-blue-500/20 hover:bg-white/[0.05]"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
        <Icon className="text-blue-400" size={22} />
      </div>
      <h3 className="mb-2 text-lg font-bold tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-white/50 flex-1">{desc}</p>
      {link && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/8 pt-4">
          <Link
            href={loginHrefForFeature(title)}
            className="text-sm font-semibold text-blue-400 transition hover:text-blue-300"
          >
            Gym sign in →
          </Link>
          {link.portalPath && (
            <Link
              href={portalLoginHrefForFeature(title)}
              className="text-sm text-white/45 transition hover:text-white/70"
            >
              Member portal
            </Link>
          )}
        </div>
      )}
    </motion.article>
  )
}

function FeaturesSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="features" ref={ref} className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
            Everything BJJ
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            One platform for the whole sport
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/50">
            From your first white belt class to running a championship academy, MatFlow is built
            for every part of the Jiu Jitsu journey.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 h-[420px] w-[420px] rounded-full bg-indigo-600/8 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/5 blur-[80px]" />
      </div>

      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-white/8 bg-[#050505]/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-lg font-bold tracking-tight">MatFlow</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#faq" className="text-sm text-white/60 transition hover:text-white">
              FAQ
            </a>
            <a href="#features" className="text-sm text-white/60 transition hover:text-white">
              Features
            </a>
            <Link href="/signup" className="text-sm text-white/60 transition hover:text-white">
              For Gym Owners
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <SpringButton href="/login" variant="secondary" size="sm">
              Sign In
            </SpringButton>
            <SpringButton href="/signup" size="sm">
              Join Free
            </SpringButton>
          </div>
        </div>
      </motion.nav>

      <section className="relative px-6 pb-20 pt-20 md:pt-28">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <motion.p
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 backdrop-blur-sm"
          >
            <Shield size={14} className="text-blue-400" />
            Built for students, instructors, and gym owners
          </motion.p>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl lg:text-7xl"
          >
            The Home of{' '}
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              Brazilian Jiu Jitsu
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            data-speakable="hero"
            className="mt-6 max-w-2xl text-lg leading-relaxed text-white/55 md:text-xl"
          >
            One place for everything BJJ. Train. Track. Connect. Compete. Run your academy.
            Built by people who train.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <SpringButton href="/signup" size="lg">
              Join Free
            </SpringButton>
            <SpringButton href="/login" variant="secondary" size="lg">
              Sign In
            </SpringButton>
          </motion.div>

          <motion.p
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-4 text-sm text-white/50"
          >
            Run an academy?{' '}
            <Link href="/signup" className="text-blue-400 transition hover:text-blue-300">
              Get started free →
            </Link>
          </motion.p>

          <motion.div
            custom={5}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            {['Free for students', 'Free for small academies', 'Train anywhere'].map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-medium text-white/70"
              >
                {badge}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      <FeaturesSection />

      <section id="faq" aria-labelledby="faq-heading" className="relative px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              FAQ
            </p>
            <h2 id="faq-heading" className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Common questions about MatFlow
            </h2>
            <p data-speakable="summary" className="mx-auto mt-4 max-w-2xl text-white/50">
              Clear answers for students, instructors, and gym owners evaluating Brazilian Jiu-Jitsu
              software built by people who train.
            </p>
          </div>

          <div className="space-y-4">
            {homeFaqs.map((item) => (
              <article
                key={item.question}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <h3 className="text-lg font-bold tracking-tight" itemProp="name">
                  {item.question}
                </h3>
                <div
                  className="mt-3 text-sm leading-relaxed text-white/55"
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                >
                  <p itemProp="text">{item.answer}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="cta-heading" className="relative px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-white/[0.03] to-transparent p-10 text-center md:p-16"
        >
          <h2 id="cta-heading" className="text-3xl font-extrabold tracking-tight md:text-4xl">
            All of BJJ, in one place.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/55">
            Join the platform built by Jiu Jitsu people for Jiu Jitsu people.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <SpringButton href="/signup" size="lg">
              Join Free
            </SpringButton>
            <SpringButton href="/login" variant="secondary" size="lg">
              Sign In
            </SpringButton>
          </div>
          <p className="mx-auto mt-6 max-w-xl text-sm text-white/45">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 transition hover:text-blue-300">
              Sign in to your dashboard
            </Link>
            {' · '}
            <Link href="/portal/login" className="text-blue-400 transition hover:text-blue-300">
              Member portal
            </Link>
          </p>
        </motion.div>
      </section>

      <footer className="border-t border-white/8 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <Logo size={24} />
            <span className="font-bold">MatFlow</span>
            <span className="text-white/30">·</span>
            <span className="text-sm text-white/40">Built by people who train.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/45">
            <Link href="/login" className="transition hover:text-white">
              Sign In
            </Link>
            <Link href="/signup" className="transition hover:text-white">
              Join Free
            </Link>
            <Link href="/portal/login" className="transition hover:text-white">
              Member Portal
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-center text-xs text-white/25" suppressHydrationWarning>
          © {new Date().getFullYear()} MatFlow. All rights reserved.
        </p>
      </footer>
    </main>
  )
}
