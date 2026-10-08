import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "FOUNDEX — платформа для стартапов и инвесторов",
  description: "Найди свою следующую возможность. FOUNDEX соединяет стартапы и инвесторов.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="container page">{children}</main>
          <footer className="footer">
            <div className="container row between">
              <span>
                <b>FOUND<span className="accent">EX</span></b> · Hook → Интерес → Доступ → Контакт
              </span>
              <span>Команда Cntrl-V · МУЦА · 2026</span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
