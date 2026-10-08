import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <h2>Страница не найдена</h2>
      <Link href="/">На главную</Link>
    </div>
  );
}
