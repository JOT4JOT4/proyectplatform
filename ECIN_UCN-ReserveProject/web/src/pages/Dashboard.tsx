import { useState, type ChangeEvent } from "react";
import logo from "../../assets/logo-ucn.png";
import sala1 from "../../assets/sala indi.jpg";
import sala2 from "../../assets/sala multi.jpg";
import "../css/dashboard.css";

type Reserva = {
  id: number;
  sala: string;
  nombre: string;
  tipo: string;
  area: string;
  ubicacion: string;
  descripcion: string;
  capacidad: number;
  equipamiento: string[];
  reglas: string[];
  horariosDisponibles: string[];
  fecha: string;
  horario: string;
  imagen?: string;
};

type ReservaGuardada = Reserva & {
  fechaReservada: string;
  horarioReservado: string;
};

const reservas: Reserva[] = [
  {
    id: 1,
    sala: "EIC 101",
    nombre: "Sala de estudio individual",
    tipo: "Individual",
    area: "Escuela",
    ubicacion: "Edificio de Ingeniería Civil, piso 1",
    descripcion:
      "Espacio silencioso para estudio individual, lectura y trabajo concentrado. Ideal para sesiones cortas o largas de preparación.",
    capacidad: 2,
    equipamiento: ["Escritorio individual", "Iluminación cálida", "Toma eléctrica"],
    reglas: ["Mantener silencio", "No ingresar alimentos", "Respetar el tiempo reservado"],
    horariosDisponibles: ["Bloque A", "Bloque C", "Bloque E"],
    fecha: "2026-04-09",
    horario: "Bloque E",
    imagen: sala1,
  },
  {
    id: 2,
    sala: "EIC 102",
    nombre: "Sala colaborativa multimodal",
    tipo: "Multiple",
    area: "Escuela",
    ubicacion: "Edificio de Ingeniería Civil, piso 1",
    descripcion:
      "Sala amplia para grupos, presentaciones y sesiones colaborativas con mesas reconfigurables y apoyo visual.",
    capacidad: 8,
    equipamiento: ["Pizarra", "Mesas móviles", "Pantalla compartida", "Conectividad Wi-Fi"],
    reglas: ["Máximo 8 personas", "No mover equipamiento fijo", "Dejar el espacio ordenado"],
    horariosDisponibles: ["Bloque A", "Bloque B", "Bloque D", "Bloque F"],
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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [misReservas, setMisReservas] = useState<ReservaGuardada[]>([]);
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
    if (!selectedReserva || !selectedTimeSlot) return;

    setMisReservas((prev: ReservaGuardada[]) => {
      const yaExiste = prev.some(
        (reserva) =>
          reserva.id === selectedReserva.id &&
          reserva.horarioReservado === selectedTimeSlot,
      );

      if (yaExiste) return prev;

      return [
        ...prev,
        {
          ...selectedReserva,
          fechaReservada: fecha || selectedReserva.fecha,
          horarioReservado: selectedTimeSlot,
        },
      ];
    });

    setSelectedReserva(null);
    setSelectedTimeSlot("");
  };

  const openReservationDetail = (reserva: Reserva) => {
    setSelectedReserva(reserva);
    setSelectedTimeSlot(reserva.horariosDisponibles[0] ?? reserva.horario);
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFecha(e.target.value)}
            />
          </div>

          <select
            className="filter-box"
            value={horario}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setHorario(e.target.value)}
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
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setArea(e.target.value)}
            >
              <option value="">Área</option>
              <option value="Escuela">Escuela</option>
            </select>

            <select
              className="side-filter"
              value={tipo}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setTipo(e.target.value)}
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
                  onClick={() => openReservationDetail(reserva)}
                >
                  <img
                    src={reserva.imagen}
                    alt={reserva.sala}
                    className="room-image"
                  />

                  <div className="room-info">
                    <h3>{reserva.sala}</h3>
                    <p>{reserva.nombre}</p>
                    <span>{reserva.ubicacion}</span>
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
                <button className="room-card" key={`${reserva.id}-${reserva.horarioReservado}`}>
                  <img
                    src={reserva.imagen}
                    alt={reserva.sala}
                    className="room-image"
                  />

                  <div className="room-info">
                    <h3>{reserva.sala}</h3>
                    <p>{reserva.nombre}</p>
                    <span>
                      {reserva.fechaReservada} · {reserva.horarioReservado}
                    </span>
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
                  Detalle del espacio
                </h1>

                <div className="modal-content">

                  <div className="modal-main">

                    <div className="modal-header">

                      <img
                        src={selectedReserva.imagen}
                        alt={selectedReserva.sala}
                        className="modal-image"
                      />

                      <div className="modal-copy">
                        <h2>{selectedReserva.sala}</h2>
                        <p>{selectedReserva.nombre}</p>
                        <span>{selectedReserva.ubicacion}</span>
                      </div>

                    </div>

                    <div className="detail-blocks">
                      <section className="detail-card detail-card--wide">
                        <h3>Descripción</h3>
                        <p>{selectedReserva.descripcion}</p>
                      </section>

                      <section className="detail-card">
                        <h3>Datos del espacio</h3>
                        <ul>
                          <li><strong>Tipo:</strong> {selectedReserva.tipo}</li>
                          <li><strong>Área:</strong> {selectedReserva.area}</li>
                          <li><strong>Capacidad:</strong> {selectedReserva.capacidad} personas</li>
                        </ul>
                      </section>

                      <section className="detail-card">
                        <h3>Equipamiento</h3>
                        <div className="chip-row">
                          {selectedReserva.equipamiento.map((item) => (
                            <span key={item} className="chip">
                              {item}
                            </span>
                          ))}
                        </div>
                      </section>

                      <section className="detail-card detail-card--wide">
                        <h3>Reglas de uso</h3>
                        <ul className="rules-list">
                          {selectedReserva.reglas.map((rule) => (
                            <li key={rule}>{rule}</li>
                          ))}
                        </ul>
                      </section>

                      <section className="detail-card detail-card--wide">
                        <h3>Horarios disponibles</h3>
                        <div className="slots-grid">
                          {selectedReserva.horariosDisponibles.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              className={`slot-btn ${selectedTimeSlot === slot ? "selected" : ""}`}
                              onClick={() => setSelectedTimeSlot(slot)}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </section>
                    </div>

                  </div>

                  <div className="summary-box">

                    <h3>Resumen</h3>

                    <div className="summary-item">
                      {selectedReserva.sala}
                    </div>

                    <div className="summary-item">
                      {selectedTimeSlot || "Selecciona un bloque"}
                    </div>

                    <div className="summary-item">
                      {fecha || selectedReserva.fecha}
                    </div>

                    <div className="summary-item summary-item--small">
                      {selectedReserva.nombre}
                    </div>

                    <button
                      className="reserve-btn"
                      onClick={handleReservar}
                      disabled={!selectedTimeSlot}
                    >
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