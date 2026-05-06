import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("access_token", token);
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/";
    }
  }, []);

  return <p>Iniciando sesión...</p>;
}