import { useState } from "react";
import logo from "../../assets/logo-ucn.png";
import sala1 from "../../assets/sala indi.jpg";
import sala2 from "../../assets/sala multi.jpg";
import "../css/dashboard.css";

type Reserva = {
  id: number;
  sala: string;
  tipo: string;
  area: string;
  fecha: string;
  horario: string;
  imagen?: string;
};

const reservas: Reserva[] = [
  {
    id: 1,
    sala: "EIC 101",
    tipo: "Individual",
    area: "Escuela",
    fecha: "2026-04-09",
    horario: "Bloque E",
    imagen: sala1,
  },
  {
    id: 2,
    sala: "EIC 102",
    tipo: "Multiple",
    area: "Escuela",
    fecha: "2026-04-10",
    horario: "Bloque A",
    imagen: sala2,
  },
];

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [area, setArea] = useState("");
  const [tipo, setTipo] = useState("");

  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [misReservas, setMisReservas] = useState<Reserva[]>([]);
  const [vista, setVista] = useState<"salas" | "misReservas">("salas");

  const reservasFiltradas = reservas.filter((reserva) => {
    return (
      (!fecha || reserva.fecha === fecha) &&
      (!horario || reserva.horario === horario) &&
      (!area || reserva.area === area) &&
      (!tipo || reserva.tipo === tipo)
    );
  });

  const handleReservar = () => {
    if (!selectedReserva) return;

    setMisReservas((prev) => {
      const yaExiste = prev.some((reserva) => reserva.id === selectedReserva.id);

      if (yaExiste) return prev;

      return [...prev, selectedReserva];
    });

    setSelectedReserva(null);
  };

  const userEmail =
    localStorage.getItem("user_email") || "usuario@alumnos.ucn.cl";

  return (
    <div className="dashboard-page">
      <nav className="top-navbar">
        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </button>

        <img src={logo} alt="Logo institución" className="navbar-logo" />
      </nav>

      <aside className={`side-menu ${menuOpen ? "open" : ""}`}>
        <p className="menu-user-email">{userEmail}</p>
        <button className="menu-option" onClick={() => setVista("misReservas")}>
          Reservas
        </button>
      </aside>

      <main className={`dashboard-content ${menuOpen ? "menu-active" : ""}`}>
        <section className="filters-row">
          <div className="filter-box date-filter">
            <label>{fecha || "Fecha"}</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <select
            className="filter-box"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
          >
            <option value="">Horario</option>
            <option value="Bloque A">Bloque A</option>
            <option value="Bloque B">Bloque B</option>
            <option value="Bloque C">Bloque C</option>
            <option value="Bloque D">Bloque D</option>
            <option value="Bloque E">Bloque E</option>
            <option value="Bloque F">Bloque F</option>
          </select>
        </section>

        <section className="reservas-layout">
          <aside className="filters-sidebar">
            <select
              className="side-filter"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              <option value="">Área</option>
              <option value="Escuela">Escuela</option>
            </select>

            <select
              className="side-filter"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="">Tipo</option>
              <option value="Individual">Individual</option>
              <option value="Multiple">Multiple</option>
            </select>
          </aside>

          <section className="reservas-panel">

            {vista === "salas" &&
              reservasFiltradas.map((reserva) => (
                <button
                  className="room-card"
                  key={reserva.id}
                  onClick={() => setSelectedReserva(reserva)}
                >
                  <img
                    src={reserva.imagen}
                    alt={reserva.sala}
                    className="room-image"
                  />

                  <div className="room-info">
                    <h3>{reserva.sala}</h3>
                    <p>{reserva.tipo}</p>
                  </div>
                </button>
              ))}

            {vista === "salas" && reservasFiltradas.length === 0 && (
              <div className="empty-card">
                No hay reservas con los filtros seleccionados.
              </div>
            )}

            {vista === "misReservas" &&
              misReservas.map((reserva) => (
                <button className="room-card" key={reserva.id}>
                  <img
                    src={reserva.imagen}
                    alt={reserva.sala}
                    className="room-image"
                  />

                  <div className="room-info">
                    <h3>{reserva.sala}</h3>
                    <p>{reserva.tipo}</p>
                  </div>
                </button>
              ))}

            {vista === "misReservas" && misReservas.length === 0 && (
              <div className="empty-card">
                No tienes reservas registradas.
              </div>
            )}

          </section>
          {selectedReserva && (
            <div className="reservation-modal-overlay">

              <div className="reservation-modal">

                <button
                  className="close-modal"
                  onClick={() => setSelectedReserva(null)}
                >
                  ✕
                </button>

                <h1 className="modal-title">
                  {selectedReserva.tipo === "Individual"
                    ? "Sala Individual"
                    : "Sala Compartida"}
                </h1>

                <div className="modal-content">

                  <div className="modal-main">

                    <div className="modal-header">

                      <img
                        src={selectedReserva.imagen}
                        className="modal-image"
                      />

                      <div>
                        <h2>{selectedReserva.sala}</h2>
                        <p>Sala reunion</p>
                      </div>

                    </div>

                    <div className="description-box">
                      <strong>Descripción:</strong>
                    </div>

                    <div className="details-box">
                      <p>Tipo: {selectedReserva.tipo}</p>
                      <p>Area: Escuela piso 1</p>
                      <p>Max: 5 personas por mesa</p>
                    </div>

                    {selectedReserva.tipo === "Multiple" && (
                      <div className="mesa-grid">

                        <button className="mesa-btn">1</button>
                        <button className="mesa-btn">2</button>
                        <button className="mesa-btn selected">
                          3
                        </button>

                        <button className="mesa-btn">5</button>
                        <button className="mesa-btn">6</button>
                        <button className="mesa-btn">7</button>

                      </div>
                    )}

                  </div>

                  <div className="summary-box">

                    <h3>Resumen</h3>

                    <div className="summary-item">
                      Mesa 3
                    </div>

                    <div className="summary-item">
                      Bloque B
                    </div>

                    <div className="summary-item">
                      20 abril
                    </div>

                    <button className="reserve-btn" onClick={handleReservar}>
                      Reservar
                    </button>

                  </div>

                </div>

              </div>

            </div>
          )}
        </section>
      </main>
    </div>
  );
}