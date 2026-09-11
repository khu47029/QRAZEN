import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { QrazenLogo } from "@/components/brand/qrazen-logo";

export const metadata = {
  title: "Acceptable Use Policy",
  description: "Governance, hosting limits, and prohibited activities on QR Content Platform.",
};

const LAST_UPDATED = "September 2, 2026";

export default function AcceptableUsePage() {
  return (
    <LegalShell title="Acceptable Use Policy" updated={LAST_UPDATED}>
      <p>
        This Acceptable Use Policy governs all content, digital assets, and destination links published through QRAZEN (the “Service”). By creating or minting a dynamic QR code, you agree to these operating standards. We reserve the right to immediately disable access tokens that violate these terms.
      </p>

      <h2>Prohibited Content & Misuse</h2>
      <ul>
        <li>Illegal material under applicable regional and international jurisdictions.</li>
        <li>
          Malware, spyware, phishing kits, ransomware, or binaries engineered to compromise client hardware or networks.
        </li>
        <li>
          Credential harvesting gateways, deceptive bank impersonations, or fraud portals.
        </li>
        <li>
          Unauthorized distribution of copyright or proprietary intellectual property.
        </li>
        <li>
          Exploitative or abusive media involving minors.
        </li>
        <li>
          Content intended to harass, threaten, or incite physical violence.
        </li>
        <li>Unsolicited spam propagation or bot-driven traffic redirection.</li>
      </ul>

      <h2>Fair Usage & Infrastructure Boundaries</h2>
      <ul>
        <li>
          Do not attempt to circumvent rate limits, cryptographic gates, or tenant isolation barriers.
        </li>
        <li>
          Automated denial-of-service tests or vulnerability scanning without prior authorization is strictly prohibited.
        </li>
        <li>
          Respect the asset file size caps and active token quotas assigned to your subscription tier.
        </li>
      </ul>

      <h2>View-Only Modes & Sandboxing</h2>
      <p>
        “View-only” sandbox modes deter one-click binary downloads by suppressing download triggers in the browser shell. However, this does <strong>not</strong> prevent analog capture (e.g., screenshots or physical camera recording). Do not treat view-only mode as DRM against determined actors.
      </p>

      <h2>Trust, Safety & Abuse Reporting</h2>
      <p>
        Every public viewer endpoint provides a standardized abuse reporting workflow. Submissions are reviewed rapidly by our trust & safety team, and non-compliant tokens are revoked immediately. Read our{" "}
        <Link href="/legal/privacy" className="text-cyan-400 hover:underline">
          Privacy Policy
        </Link>{" "}
        for information on how reporting hashes are stored.
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
          <Shield className="h-3.5 w-3.5" />
          <span>LEGAL COMPLIANCE</span>
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
