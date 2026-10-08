"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return undefined;
    const load = () => api("/dashboard").then((d) => setUnread(d.unread_messages)).catch(() => {});
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [user, pathname]);

  const links = [{ href: "/startups", label: "Стартапы" }];
  if (user) {
    links.push({ href: "/dashboard", label: "Кабинет" });
    links.push({ href: "/connections", label: "Контакты", badge: unread });
    links.push({ href: "/support", label: user.role === "admin" ? "Заявки SUPPORTED" : "Supported" });
  }

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="logo">FOUND<span>EX</span></Link>
        <nav className="nav-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={pathname.startsWith(link.href) ? "active" : ""}>
              {link.label}
              {link.badge ? <span className="badge-count">{link.badge}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="nav-right">
          {user ? (
            <>
              <Link href="/profile" className="small muted">
                {user.full_name || user.email}{" "}
                <span className={user.role === "investor" ? "tag tag-amber" : "tag"}>{user.role}</span>
              </Link>
              <button className="btn btn-sm" onClick={() => { logout(); router.push("/"); }}>Выйти</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm">Войти</Link>
              <Link href="/register" className="btn btn-sm btn-primary">Регистрация</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
