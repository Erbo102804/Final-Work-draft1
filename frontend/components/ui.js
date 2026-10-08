"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { formatMoney } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function Loader({ text = "Загрузка..." }) {
  return <div className="empty">{text}</div>;
}

export function Alert({ type = "error", children }) {
  if (!children) return null;
  return <div className={`alert alert-${type}`}>{children}</div>;
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

/** Renders children only for an authenticated user (optionally with a given role). */
export function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <Loader />;
  if (roles && !roles.includes(user.role)) {
    return <Empty>Эта страница недоступна для вашей роли.</Empty>;
  }
  return typeof children === "function" ? children(user) : children;
}

const STATUS_TAG = {
  pending: "tag-amber",
  approved: "",
  rejected: "tag-danger",
  draft: "tag-muted",
  published: "",
  hidden: "tag-danger",
};

export function StatusTag({ status, label }) {
  return <span className={`tag ${STATUS_TAG[status] ?? "tag-muted"}`}>{label || status}</span>;
}

export function StartupCard({ startup, extra }) {
  return (
    <Link href={`/startups/${startup.id}`} className={`card startup-card ${startup.is_featured ? "featured" : ""}`}>
      <div className="row">
        <span className="tag">{startup.stage_display}</span>
        <span className="tag tag-muted">{startup.industry_display}</span>
      </div>
      <h3 style={{ margin: 0 }}>{startup.name}</h3>
      <div className="hook">{startup.hook}</div>
      <div className="meta small muted">
        <span>Нужно: <b style={{ color: "var(--text)" }}>{formatMoney(startup.funding_needed)}</b></span>
        <span>· Команда: {startup.team_size}</span>
        {startup.location ? <span>· {startup.location}</span> : null}
        {startup.demo_url ? <span>· ▶ Демо</span> : null}
      </div>
      {extra}
    </Link>
  );
}

export function Pipeline({ steps, current, amber = false }) {
  const index = steps.findIndex((s) => s.value === current);
  return (
    <div className={`pipeline ${amber ? "amber" : ""}`}>
      {steps.map((step, i) => (
        <div key={step.value} className={`step ${i < index ? "done" : ""} ${i === index ? "current" : ""}`}>
          {step.label}
        </div>
      ))}
    </div>
  );
}

export function ChipSelect({ options = [], value = [], onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="checks">
      {options.map((opt) => (
        <label key={opt.value} className={`check-chip ${value.includes(opt.value) ? "on" : ""}`}>
          <input type="checkbox" checked={value.includes(opt.value)} onChange={() => toggle(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
