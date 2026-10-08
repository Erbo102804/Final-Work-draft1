"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { StartupCard } from "@/components/ui";

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api("/stats").then(setStats).catch(() => {});
    api("/startups", { params: { page_size: 3 } }).then((d) => setFeatured(d.results.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <h1>FOUND<span>EX</span></h1>
        <p className="tagline">Найди свою следующую возможность</p>
        <p className="muted">Платформа, соединяющая стартапы и инвесторов</p>
        <div className="flow">
          <div className="node">Founder</div>
          <div className="arrow">↔</div>
          <div className="node center">FOUNDEX</div>
          <div className="arrow">↔</div>
          <div className="node">Investor</div>
        </div>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary">Перейти в кабинет</Link>
          ) : (
            <>
              <Link href="/register?role=founder" className="btn btn-primary">Я Founder — разместить стартап</Link>
              <Link href="/register?role=investor" className="btn btn-amber">Я Investor — найти стартап</Link>
            </>
          )}
          <Link href="/startups" className="btn">Смотреть стартапы</Link>
        </div>
      </section>

      {stats && (
        <section className="grid grid-4">
          <div className="card stat"><div className="value">{stats.startups}</div><div className="label">стартапов опубликовано</div></div>
          <div className="card stat"><div className="value">{stats.founders}</div><div className="label">founders</div></div>
          <div className="card stat"><div className="value">{stats.investors}</div><div className="label">инвесторов</div></div>
          <div className="card stat"><div className="value">{stats.connections}</div><div className="label">установленных контактов</div></div>
        </section>
      )}

      <section className="section grid grid-2">
        <div className="card">
          <h3 className="accent">Founder</h3>
          <p>Есть идея → <span className="accent">нужен капитал</span></p>
        </div>
        <div className="card">
          <h3 className="amber">Investor</h3>
          <p>Есть капитал → <span className="accent">нужны возможности</span></p>
        </div>
      </section>
      <div className="card card-accent section" style={{ textAlign: "center" }}>
        <b>Проблема не в нехватке возможностей.</b><br />
        <span className="accent"><b>Проблема — найти нужное соединение.</b></span>
        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
          LinkedIn, Telegram, ивенты, комьюнити, личные контакты — FOUNDEX собирает всё в одном месте.
        </p>
      </div>

      <section className="section">
        <h2 className="section-title">Как работает FOUNDEX</h2>
        <div className="grid grid-2">
          <div className="card card-accent">
            <h3 className="accent">Для Founder</h3>
            <ol className="steps">
              <li>Регистрация</li><li>Создать профиль стартапа</li><li>Добавить Hook + Демо</li>
              <li>Опубликовать</li><li>Получить интерес инвестора</li><li>Связаться</li>
            </ol>
          </div>
          <div className="card card-amber">
            <h3 className="amber">Для Investor</h3>
            <ol className="steps amber">
              <li>Регистрация</li><li>Указать интересы</li><li>Искать стартапы</li>
              <li>Смотреть Hook + Демо</li><li>Запросить доступ</li><li>Связаться с Founder</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="card">
          <h3>Ключевая фича — Hook</h3>
          <p className="muted">Founder не раскрывает всё публично. Вместо этого — короткий цепляющий Hook, который вызывает интерес инвестора.</p>
          <p className="small"><b className="accent">ПУБЛИЧНО:</b> название, Hook, проблема, решение, демо, команда, стадия, потребность в инвестициях.</p>
          <p className="small"><b className="amber">ПРИВАТНО (по запросу):</b> бизнес-модель, финансы, дорожная карта, техдетали, полный питч, условия.</p>
          <p className="accent"><b>Hook → Интерес → Доступ → Контакт</b></p>
        </div>
        <div className="grid">
          <div className="card card-accent">
            <h3 className="accent">⚡ DIRECT — самостоятельно</h3>
            <p className="muted small">Инвестор действует сам: поиск, фильтры, запрос доступа и чат с Founder без посредников.</p>
          </div>
          <div className="card card-amber">
            <h3 className="amber">⭐ SUPPORTED — с поддержкой</h3>
            <p className="muted small">Команда FOUNDEX помогает: поиск → подбор → знакомство → встреча → сделка.</p>
            <Link href={user ? "/support" : "/register"} className="btn btn-sm btn-amber">Оставить заявку</Link>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="row between">
            <h2 className="section-title">Свежие стартапы</h2>
            <Link href="/startups">Все стартапы →</Link>
          </div>
          <div className="grid grid-3">
            {featured.map((s) => <StartupCard key={s.id} startup={s} />)}
          </div>
        </section>
      )}
    </>
  );
}
