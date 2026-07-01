import "../css/login.css";

export default function Login() {
    
    const handleLogin = () => {
        window.location.href = "https://proyectplatform-production.up.railway.app/auth/google/web";
    };

    return (
        <div className = "login-container">

            <img src="../../assets/logo-ucn.png" className="logo-ucn" />
            <div className = "login-box">
                <h1 className = "login-title">Login</h1>

                <div className = "divider">
                    <span className = "divider-text">Iniciar sesión</span>
                </div>

                <button className="google-btn" onClick={handleLogin}>
                    <img src="../../assets/google.png" className="logo-google" />
                    Iniciar sesión con Google
                </button>

                <p className="forgot-password">Recuperar contraseña</p>

            </div>
        </div>    
    )
}