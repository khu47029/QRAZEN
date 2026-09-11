import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { QrazenLogo } from "@/components/brand/qrazen-logo";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy-by-design standards: zero raw IP logging, rotating salted hashes, and strict encryption.",
};

const LAST_UPDATED = "September 2, 2026";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated={LAST_UPDATED}>
      <p>
        This policy explains how QRAZEN (the “Service”) processes and protects information. The Service is architected under strict <strong>Privacy-by-Design</strong> principles: we collect only what is strictly required to route access tokens, and our scan analytics cannot be used to identify or track individual human beings.
      </p>

      <h2>Account Security & Authentication</h2>
      <p>
        When you create an account, we store your email address, name, and a one-way cryptographic hash of your password using Scrypt / Argon2id. Plaintext passwords are never stored or logged in our memory or disk.
      </p>

      <h2>Hosted Content & Encryption</h2>
      <p>
        Files, documents, images, and notes attached to a dynamic code are stored securely in isolated storage containers. You maintain full ownership and can mutate, replace, or permanently delete assets at any time from your workstation.
      </p>

      <h2>Zero Raw IP Logging — Scan Telemetry</h2>
      <p>
        When a viewer scans one of your dynamic QR codes, our resolver computes privacy-preserving aggregated signals only:
      </p>
      <ul>
        <li>Coarse device family (Mobile, Tablet, Desktop) and browser engine.</li>
        <li>Coarse geographic region derived at request time.</li>
        <li>Timestamp of resolution.</li>
      </ul>
      <p>
        We do <strong>not</strong> log or store raw IP addresses. Session tracking utilizes a cryptographic daily-rotating salt, preventing cross-day tracking or reverse de-anonymization. We do not use third-party analytics trackers, pixel tags, or data brokers.
      </p>

      <h2>Cookies & Session Tokens</h2>
      <p>
        We use essential cookies solely for authenticated sessions (HTTP-only, Secure) and short-lived password gate unlocks for protected QR portals.
      </p>

      <h2>Data Retention & Deletion Rights</h2>
      <p>
        When you delete a QR code, the public token immediately ceases resolution and all associated database records and binary assets are permanently purged.
      </p>
    </LegalShell>
  );
}

function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-200">
      <nav className="border-b border-slate-900 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <QrazenLogo variant="compact" />
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
        </div>
      </nav>

      <article className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase mb-2">
          <Lock className="h-3.5 w-3.5" />
          <span>DATA PROTECTION GUARANTEE</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">{title}</h1>
        <p className="mt-1 text-xs font-mono text-slate-500">Last updated: {updated}</p>
        <div className="legal-prose mt-8 space-y-4 text-sm leading-relaxed text-slate-300 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </article>

      <footer className="border-t border-slate-900 px-6 py-8 text-center text-xs font-mono text-slate-500">
        <Link href="/legal/aup" className="hover:text-slate-300">
          Acceptable Use Policy
        </Link>
        <span className="mx-2">·</span>
        <Link href="/legal/privacy" className="hover:text-slate-300">
          Privacy Notice
        </Link>
      </footer>
    </main>
  );
}
