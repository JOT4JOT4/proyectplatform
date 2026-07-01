import { useEffect } from "react";
import { getApiUrl } from "../config";

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      console.error("No llegó code en la URL");
      window.location.href = "/";
      return;
    }

    (async () => {
      try {
        const response = await fetch(`${getApiUrl()}/auth/exchange`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        const payload = await response.json();

        if (!response.ok || !payload?.access_token || !payload?.user) {
          throw new Error(
            payload?.message ?? "No se pudo completar el inicio de sesión."
          );
        }

        sessionStorage.setItem("access_token", payload.access_token);
        localStorage.setItem("user_id", String(payload.user.id));
        localStorage.setItem("user_email", payload.user.email);
        localStorage.setItem("user_role", payload.user.role);

        window.location.href = "/dashboard";
        } catch (error) {
          console.error("Error en AuthCallback:", error);
        }
    })();
  }, []);

  return <p>Iniciando sesión...</p>;
}