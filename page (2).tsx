import Link from "next/link";
import { HeroSynthesisEngine } from "@/components/home/hero-synthesis-engine";
import {
import { QrazenLogo } from "@/components/brand/qrazen-logo";
  Layers,
  RefreshCw,
  Lock,
  Clock,
  Eye,
  BarChart3,
  FileText,
  Image as ImageIcon,
  Link2,
  FolderArchive,
  CheckCircle2,
  Check,
  ArrowRight,
  Shield,
  Zap,
  Server,
  Fingerprint,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Building2,
  Utensils,
  Briefcase,
  Megaphone
} from "lucide-react";

export const metadata = {
  title: "QRAZEN — Dynamic QR Code File & Document Sharing Platform",
  description:
    "Enterprise-grade dynamic QR code platform. Share PDFs, images, URLs, notes, and multi-file bundles behind immutable, password-protected, and editable QR gateways.",
  keywords: [
    "QR code file sharing",
    "dynamic QR codes",
    "share PDF with QR code",
    "password protected QR code",
    "QR content platform",
    "digital asset QR gateway",
  ],
  openGraph: {
    title: "QRAZEN — Any Content Behind One Dynamic QR",
    description:
      "Transform PDFs, images, archives, and confidential documents into a single dynamic QR gateway with instant content rotation and password gating.",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "QRAZEN",
      "operatingSystem": "Web, iOS, Android",
      "applicationCategory": "BusinessApplication, Productivity",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "description":
        "Enterprise-grade dynamic QR code platform for hosting and sharing files, PDFs, notes, URLs, and multi-file bundles.",
    },
    {
      "@type": "Organization",
      "name": "QRAZEN",
      "url": "https://qrcontent.io",
      "logo": "https://qrcontent.io/icon.png",
      "sameAs": [],
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does dynamic QR content replacement work without reprinting?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Every dynamic QR code encodes an immutable, unguessable public token pointing to our high-speed resolver. When you replace a PDF, image, or link in your workstation, our server updates the internal pointer to the new content version. The printed QR matrix remains 100% identical and continues resolving instantly.",
          },
        },
        {
          "@type": "Question",
          "name": "Is viewer privacy protected during scans?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. We adhere to a strict privacy-by-design architecture. We never store raw IP addresses. Repeat visitor analytics and rate-limiting utilize a cryptographic daily-rotating salt hash that cannot be reversed or tracked across days.",
          },
        },
        {
          "@type": "Question",
          "name": "What file types and sizes are supported?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We natively support PDF documents, images (PNG, JPG, WebP, GIF), plain text notes, destination URLs, ZIP archives, and multi-file bundles with sandboxed browser previews.",
          },
        },
        {
          "@type": "Question",
          "name": "How does password protection work on QR codes?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "When password protection is enabled, access is gated on the server side using Argon2id cryptographic password hashing. Content is withheld until the viewer successfully enters the unlock key.",
          },
        },
      ],
    },
  ],
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Inject Structured Data (JSON-LD) for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-cyan-500/10 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <QrazenLogo />

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-xs font-mono text-slate-400">
            <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-cyan-400 transition-colors">
              Features
            </a>
            <a href="#use-cases" className="hover:text-cyan-400 transition-colors">
              Use Cases
            </a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-mono font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-all active:scale-[0.98]"
            >
              Mint Free QR <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Header Section */}
      <section className="relative pt-20 pb-16 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-mono font-medium text-cyan-300 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            NEXT-GEN DYNAMIC ACCESS INFRASTRUCTURE
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.1]">
            Content Becomes <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
              Instant Access
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Transform PDFs, images, archives, and confidential documents into a single dynamic QR gateway.
            Swap content anytime, enforce password gates, and control lifespans — without reprinting a single code.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/signup"
              className="w-full sm:w-auto rounded-xl bg-cyan-500 px-8 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-500/25 hover:bg-cyan-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Create Free Dynamic QR <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900/80 px-6 py-3.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              See Architecture
            </a>
          </div>
        </div>

        {/* Signature Interactive 4-Stage Synthesis Engine */}
        <div className="mt-14">
          <HeroSynthesisEngine />
        </div>
      </section>

      {/* Storytelling 01: The Problem & Solution */}
      <section id="how-it-works" className="relative border-t border-slate-900 bg-slate-950/60 py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400 mb-2">
              ARCHITECTURAL FOUNDATION
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Why Static QR Codes Fail in Production
            </h3>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Traditional QR codes permanently encode raw text into physical ink. When URLs change or files update, all printed collateral becomes instant waste.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Static Trap */}
            <div className="rounded-3xl border border-red-950/60 bg-red-950/10 p-8 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400 font-bold">
                  ✕
                </div>
                <h4 className="text-lg font-bold text-red-200">The Static QR Trap</h4>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span><strong>Permanent Link Lock:</strong> Broken links require physical re-printing of packaging and signage.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span><strong>Zero Access Governance:</strong> Anyone with the image can access forever with no password or expiration.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span><strong>No Telemetry:</strong> Zero visibility into scan volume, device trends, or engagement.</span>
                </li>
              </ul>
            </div>

            {/* The Dynamic Resolver Advantage */}
            <div className="rounded-3xl border border-cyan-500/30 bg-cyan-950/20 p-8 relative overflow-hidden shadow-xl shadow-cyan-950/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 font-bold">
                  ✓
                </div>
                <h4 className="text-lg font-bold text-cyan-200">The QR Content Gateway</h4>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Live Pointer Mutation:</strong> Rotate PDFs, images, notes, or links instantly while preserving the printed QR.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Server-Side Access Control:</strong> Enforce Argon2id password gates and scheduled expiry dates.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Privacy-Preserving Telemetry:</strong> Count scans and monitor device analytics without logging raw IP addresses.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="border-t border-slate-900 bg-slate-900/40 py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400 mb-2">
              COMPREHENSIVE CAPABILITIES
            </h2>
            <h3 className="text-3xl font-bold text-white tracking-tight">
              Engineered for Real-World Access
            </h3>
            <p className="mt-2 text-slate-400 text-sm">
              Every detail is calibrated for performance, zero-friction mobile viewing, and strict data security.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition-all duration-200 hover:border-slate-700 hover:bg-slate-800/80"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-white mb-1.5 text-base">{f.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Real-World Use Cases */}
      <section id="use-cases" className="border-t border-slate-900 bg-slate-950 py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400 mb-2">
              REAL-WORLD IMPACT
            </h2>
            <h3 className="text-3xl font-bold text-white tracking-tight">
              Built for Fast-Paced Businesses
            </h3>
            <p className="mt-2 text-slate-400 text-sm">
              From physical menus to boardroom memos, see how dynamic access tokens streamline distribution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((uc) => {
              const Icon = uc.icon;
              return (
                <div
                  key={uc.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-cyan-400 border border-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-white text-base">{uc.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{uc.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="border-t border-slate-900 bg-slate-900/30 py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400 mb-2">
              TRANSPARENT TIERS
            </h2>
            <h3 className="text-3xl font-bold text-white tracking-tight">
              Simple, Predictable Plans
            </h3>
            <p className="mt-2 text-slate-400 text-sm">
              Start free forever, upgrade as your team and asset requirements scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Tier */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 space-y-6">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">FREE FOREVER</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white font-mono">$0</span>
                  <span className="text-xs text-slate-500 font-mono">/ month</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Ideal for personal projects, simple menus, and one-off asset sharing.
                </p>
              </div>

              <ul className="space-y-3 text-xs text-slate-300 font-mono">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <span>2 Active Dynamic QR Gateways</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <span>100 MB Cloud Asset Storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <span>Instant Content Replacement</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <span>Privacy-First Scan Analytics</span>
                </li>
              </ul>

              <Link
                href="/signup"
                className="block w-full rounded-xl border border-slate-700 bg-slate-800 py-3 text-center text-xs font-bold text-white hover:bg-slate-700 transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="rounded-3xl border border-cyan-500/40 bg-cyan-950/20 p-8 space-y-6 relative shadow-2xl shadow-cyan-950/40">
              <div className="absolute top-4 right-4">
                <span className="rounded-full border border-cyan-500/40 bg-cyan-500/20 px-3 py-1 text-[10px] font-mono text-cyan-300 font-bold uppercase">
                  POPULAR
                </span>
              </div>
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase">PRO GATEWAY</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white font-mono">$19</span>
                  <span className="text-xs text-slate-500 font-mono">/ month</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  For businesses, agencies, and teams requiring high volume and password protection.
                </p>
              </div>

              <ul className="space-y-3 text-xs text-slate-300 font-mono">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <span>Unlimited Dynamic QR Gateways</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <span>50 GB Cloud Asset Storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <span>Argon2id Password Protection</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <span>Custom Expiration Timers & View-Only</span>
                </li>
              </ul>

              <Link
                href="/signup"
                className="block w-full rounded-xl bg-cyan-500 py-3 text-center text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/25"
              >
                Upgrade to Pro Gateway
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="border-t border-slate-900 bg-slate-950 py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400 mb-2">
              FREQUENTLY ASKED QUESTIONS
            </h2>
            <h3 className="text-3xl font-bold text-white tracking-tight">
              Everything You Need to Know
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer"
              >
                <summary className="flex items-center justify-between text-sm sm:text-base font-bold text-white">
                  <span>{faq.q}</span>
                  <ChevronDown className="h-4 w-4 text-cyan-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Security Guarantee Banner */}
      <section id="security" className="border-t border-slate-900 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20 px-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Fingerprint className="h-10 w-10" />
            </div>
            <div>
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
                PRIVACY-BY-DESIGN GUARANTEE
              </span>
              <h3 className="text-2xl font-bold text-white mt-1">
                Zero Raw IP Logging. Enterprise Cryptography.
              </h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Scan telemetry is aggregated using cryptographic daily salted hashes. Viewer passwords are never stored in plaintext, and our server-side resolver prevents token enumeration and automated scraping.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="border-t border-slate-900 bg-gradient-to-b from-slate-950 to-cyan-950/30 py-24 px-6 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Start Delivering Content Smarter
          </h2>
          <p className="text-slate-300 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Free tier includes 2 active dynamic codes with 100MB cloud storage. Mint your first portal in under 30 seconds.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-4 text-base font-bold text-slate-950 hover:bg-cyan-400 shadow-xl shadow-cyan-500/20 transition-all active:scale-[0.98]"
          >
            Create Your First Dynamic QR <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-10 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs">
              QR
            </div>
            <QrazenLogo variant="compact" className="text-slate-400" />
          </div>
          <p>© {new Date().getFullYear()} QR Content Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/legal/aup" className="hover:text-slate-300 transition-colors">
              Acceptable Use
            </Link>
            <span>·</span>
            <Link href="/legal/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Notice
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

const features = [
  {
    icon: RefreshCw,
    title: "Instant Dynamic Content Swap",
    description:
      "Update destination URLs, re-upload new PDF revisions, or change notes at any moment without re-printing.",
  },
  {
    icon: Layers,
    title: "Multi-File Digital Bundles",
    description:
      "Consolidate PDFs, images, and ZIP archives behind a single token. Recipients experience a unified gallery.",
  },
  {
    icon: Lock,
    title: "Argon2id Password Protection",
    description:
      "Lock sensitive materials behind cryptographic password authentication with automated rate-limiting protection.",
  },
  {
    icon: Clock,
    title: "Precision Expiration Engine",
    description:
      "Set time-locked access windows. Expired tokens cleanly withhold server-side content immediately upon expiry.",
  },
  {
    icon: Eye,
    title: "View-Only Content Mode",
    description:
      "Render inline text and documents without direct one-click download buttons to deter easy redistribution.",
  },
  {
    icon: BarChart3,
    title: "Privacy-First Telemetry",
    description:
      "Inspect scan volume, device breakdown, and browser distribution without violating visitor privacy.",
  },
];

const useCases = [
  {
    icon: Utensils,
    title: "Hospitality & Menus",
    description:
      "Update seasonal dishes, daily specials, and cocktail lists instantly without reprinting table stands.",
  },
  {
    icon: Building2,
    title: "Architecture & Blueprints",
    description:
      "Distribute multi-megabyte CAD and engineering schematics to on-site contractors with view-only sandboxing.",
  },
  {
    icon: Briefcase,
    title: "Boardrooms & Pitch Decks",
    description:
      "Distribute password-gated pitch decks and investor memos with time-locked expiration timers.",
  },
  {
    icon: Megaphone,
    title: "Media Kits & PR Bundles",
    description:
      "Consolidate high-res brand photography, vectors, and press releases under a single scannable badge.",
  },
];

const faqs = [
  {
    q: "How does dynamic QR content replacement work without reprinting?",
    a: "Every dynamic QR code encodes an immutable, unguessable public token pointing to our high-speed resolver. When you replace a PDF, image, or link in your workstation, our server updates the internal pointer to the new content version. The printed QR matrix remains 100% identical and continues resolving instantly.",
  },
  {
    q: "Is viewer privacy protected during scans?",
    a: "Yes. We adhere to a strict privacy-by-design architecture. We never store raw IP addresses. Repeat visitor analytics and rate-limiting utilize a cryptographic daily-rotating salt hash that cannot be reversed or tracked across days.",
  },
  {
    q: "What file types and sizes are supported?",
    a: "We natively support PDF documents, images (PNG, JPG, WebP, GIF), plain text notes, destination URLs, ZIP archives, and multi-file bundles with sandboxed browser previews.",
  },
  {
    q: "How does password protection work on QR codes?",
    a: "When password protection is enabled, access is gated on the server side using Argon2id cryptographic password hashing. Content is withheld until the viewer successfully enters the unlock key.",
  },
  {
    q: "Do viewers need to install any app to scan or view content?",
    a: "Never. Any native iOS or Android camera app immediately scans the QR and opens the content cleanly in the default mobile browser.",
  },
];
