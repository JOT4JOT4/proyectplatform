import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      window.location.href = "/";
      return;
    }

    (async () => {
      try {
        const response = await fetch("http://localhost:3000/auth/exchange", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        const payload = await response.json();

        if (!response.ok || !payload?.access_token || !payload?.user) {
          throw new Error(payload?.message ?? "No se pudo completar el inicio de sesión.");
        }

        sessionStorage.setItem("access_token", payload.access_token);
        localStorage.setItem("user_email", payload.user.email);
        window.location.href = "/dashboard";
      } catch {
        window.location.href = "/";
      }
    })();
  }, []);

  return <p>Iniciando sesión...</p>;
}