import { getApiUrl } from "../config";
import logoUcn from "../../assets/logo-ucn.png";
import googleLogo from "../../assets/google.png";
import "../css/login.css";

export default function Login() {
  const handleLogin = () => {
    window.location.href = `${getApiUrl()}/auth/google/web`;
  };

  return (
    <div className="login-container">
      <img src={logoUcn} className="logo-ucn" alt="Logo Universidad Católica del Norte" />

      <div className="login-box">
        <h1 className="login-title">Login</h1>

        <div className="divider">
          <span className="divider-text">Iniciar sesión</span>
        </div>

        <button className="google-btn" onClick={handleLogin}>
          <img src={googleLogo} className="logo-google" alt="Logo Google" />
          Iniciar sesión con Google
        </button>

        <p className="login-warning">
          * Acceso exclusivo para correos institucionales de la UCN.*
        </p>
      </div>
    </div>
  );
}
