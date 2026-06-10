import "../styles/globals.css";
import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "GrantGuard — Intelligence layer for ecosystem grants",
  description:
    "Review proposals, detect plagiarism, score feasibility, and rank applicants with GenLayer-powered consensus.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1">{children}</main>
        <footer className="border-t hairline border-t-bronze/40 mt-16">
          <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center text-xs text-muted font-mono">
            <span>GrantGuard · GenLayer Studionet</span>
            <span>v0.1 · MVP</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
