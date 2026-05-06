import { useState, useEffect } from "react";
import logo from "../../assets/logo-ucn.png";
import sala1 from "../../assets/sala indi.jpg";
import sala2 from "../../assets/sala multi.jpg";
import "../css/dashboard.css";
import apiService from "../services/apiService";

type Reserva = {
  id: string;
  spaceTitle: string;
  tipo?: string;
  area?: string;
  reservationDate: string;
  reservationSlot: string;
  imagen?: string;
  description?: string;
};

type BackendReservation = {
  id: string;
  spaceTitle: string;
  tipo?: string;
  area?: string;
  reservationDate: string;
  reservationSlot: string;
  space?: {
    title: string;
    description?: string;
  };
};

const SAMPLE_ROOMS: Reserva[] = [
  {
    id: "1",
    spaceTitle: "EIC 101",
    tipo: "Individual",
    area: "Escuela",
    reservationDate: "2026-04-09",
    reservationSlot: "E",
    imagen: sala1,
  },
  {
    id: "2",
    spaceTitle: "EIC 102",
    tipo: "Multiple",
    area: "Escuela",
    reservationDate: "2026-04-10",
    reservationSlot: "A",
    imagen: sala2,
  },
];

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [area, setArea] = useState("");
  const [tipo, setTipo] = useState("");

  const [reservas, setReservas] = useState<Reserva[]>(SAMPLE_ROOMS);
  const [misReservas, setMisReservas] = useState<Reserva[]>([]);
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [vista, setVista] = useState<"salas" | "misReservas">("salas");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReservas = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.get<BackendReservation[]>("/reservas");

        if (Array.isArray(data)) {
          const formattedReservas: Reserva[] = data.map((r) => ({
            id: r.id,
            spaceTitle: r.spaceTitle,
            tipo: r.tipo,
            area: r.area,
            reservationDate: r.reservationDate,
            reservationSlot: r.reservationSlot,
            description: r.space?.description,
          }));
          setReservas(formattedReservas);
        }
      } catch (err) {
        console.error("Error loading reservations:", err);
        setError("No se pudieron cargar las reservas del servidor");
      } finally {
        setLoading(false);
      }
    };

    loadReservas();
  }, []);

  useEffect(() => {
    const loadMyReservas = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        apiService.setToken(token);
        const data = await apiService.get<BackendReservation[]>("/reservas/mine");

        if (Array.isArray(data)) {
          const formattedReservas: Reserva[] = data.map((r) => ({
            id: r.id,
            spaceTitle: r.spaceTitle,
            tipo: r.tipo,
            area: r.area,
            reservationDate: r.reservationDate,
            reservationSlot: r.reservationSlot,
            description: r.space?.description,
          }));
          setMisReservas(formattedReservas);
        }
      } catch (err) {
        console.error("Error loading my reservations:", err);
      }
    };

    if (vista === "misReservas") {
      loadMyReservas();
    }
  }, [vista]);

  const reservasFiltradas = reservas.filter((reserva) => {
    return (
      (!fecha || reserva.reservationDate === fecha) &&
      (!horario || reserva.reservationSlot === horario) &&
      (!area || reserva.area === area) &&
      (!tipo || reserva.tipo === tipo)
    );
  });

  const handleReservar = async () => {
    if (!selectedReserva) return;

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        alert("Debes estar autenticado para reservar");
        return;
      }

      apiService.setToken(token);

      const payload = {
        reservationDate: selectedReserva.reservationDate,
        reservationSlot: selectedReserva.reservationSlot,
        space: {
          id: selectedReserva.id,
          title: selectedReserva.spaceTitle,
          description: selectedReserva.description,
          area: selectedReserva.area,
          tipo: selectedReserva.tipo,
        },
      };

      await apiService.post("/reservas", payload);
      alert("Reserva creada exitosamente");
      setSelectedReserva(null);
      
      const data = await apiService.get<BackendReservation[]>("/reservas/mine");
      if (Array.isArray(data)) {
        const formattedReservas: Reserva[] = data.map((r) => ({
          id: r.id,
          spaceTitle: r.spaceTitle,
          tipo: r.tipo,
          area: r.area,
          reservationDate: r.reservationDate,
          reservationSlot: r.reservationSlot,
          description: r.space?.description,
        }));
        setMisReservas(formattedReservas);
      }
    } catch (err) {
      console.error("Error creating reservation:", err);
      alert("Error al crear la reserva");
    }
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
          Mis Reservas
        </button>
        <button className="menu-option" onClick={() => setVista("salas")}>
          Disponibles
        </button>
      </aside>

      <main className={`dashboard-content ${menuOpen ? "menu-active" : ""}`}>
        {loading && <p className="loading-text">Cargando reservas...</p>}
        {error && <p className="error-text">{error}</p>}

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
            <option value="A">Bloque A</option>
            <option value="B">Bloque B</option>
            <option value="C">Bloque C</option>
            <option value="C2">Bloque C2</option>
            <option value="D">Bloque D</option>
            <option value="E">Bloque E</option>
            <option value="F">Bloque F</option>
            <option value="G">Bloque G</option>
            <option value="H">Bloque H</option>
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
              <option value="Edificio 1">Edificio 1</option>
              <option value="Edificio 2">Edificio 2</option>
              <option value="Biblioteca">Biblioteca</option>
            </select>

            <select
              className="side-filter"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="">Tipo</option>
              <option value="Individual">Individual</option>
              <option value="Multiple">Multiple</option>
              <option value="Sala">Sala</option>
              <option value="Laboratorio">Laboratorio</option>
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
                    src={reserva.imagen || sala1}
                    alt={reserva.spaceTitle}
                    className="room-image"
                  />
                  <div className="room-info">
                    <h3>{reserva.spaceTitle}</h3>
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
                    src={reserva.imagen || sala1}
                    alt={reserva.spaceTitle}
                    className="room-image"
                  />
                  <div className="room-info">
                    <h3>{reserva.spaceTitle}</h3>
                    <p>{reserva.reservationDate} - {reserva.reservationSlot}</p>
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
                        src={selectedReserva.imagen || sala1}
                        className="modal-image"
                      />
                      <div>
                        <h2>{selectedReserva.spaceTitle}</h2>
                        <p>{selectedReserva.description || "Sala de reunión"}</p>
                      </div>
                    </div>

                    <div className="description-box">
                      <strong>Información:</strong>
                    </div>

                    <div className="details-box">
                      <p>Tipo: {selectedReserva.tipo || "N/A"}</p>
                      <p>Área: {selectedReserva.area || "N/A"}</p>
                      <p>Fecha: {selectedReserva.reservationDate}</p>
                      <p>Horario: Bloque {selectedReserva.reservationSlot}</p>
                    </div>

                    {selectedReserva.tipo === "Multiple" && (
                      <div className="mesa-grid">
                        <button className="mesa-btn">1</button>
                        <button className="mesa-btn">2</button>
                        <button className="mesa-btn selected">3</button>
                        <button className="mesa-btn">5</button>
                        <button className="mesa-btn">6</button>
                        <button className="mesa-btn">7</button>
                      </div>
                    )}
                  </div>

                  <div className="summary-box">
                    <h3>Resumen</h3>
                    <div className="summary-item">
                      {selectedReserva.spaceTitle}
                    </div>
                    <div className="summary-item">
                      Bloque {selectedReserva.reservationSlot}
                    </div>
                    <div className="summary-item">
                      {selectedReserva.reservationDate}
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