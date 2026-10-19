"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          alignItems: "center",
          background:
            "linear-gradient(145deg, #f8fbff 0%, #eff8ff 48%, #f8fafc 100%)",
          boxSizing: "border-box",
          color: "#0f172a",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100vh",
          padding: 24,
        }}
      >
        <main
          style={{
            background: "#ffffff",
            border: "1px solid #dbeafe",
            borderRadius: 32,
            boxShadow: "0 24px 70px rgb(30 64 175 / 14%)",
            maxWidth: 560,
            padding: 40,
            width: "100%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#f0f9ff",
              border: "1px solid #dbeafe",
              borderRadius: 24,
              display: "flex",
              height: 80,
              justifyContent: "center",
              width: 80,
            }}
          >
            <img
              src="/brand/virtus-playcast-mark.png"
              alt="vPlayCast"
              style={{ height: 56, objectFit: "contain", width: 56 }}
            />
          </div>
          <p
            style={{
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.18em",
              margin: "40px 0 0",
              textTransform: "uppercase",
            }}
          >
            Erro inesperado
          </p>
          <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: "12px 0" }}>
            Não foi possível iniciar a página.
          </h1>
          <p style={{ color: "#475569", lineHeight: 1.6, margin: 0 }}>
            Atualize ou tente novamente em alguns instantes.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#2563eb",
              border: 0,
              borderRadius: 10,
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 700,
              marginTop: 28,
              padding: "12px 18px",
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
