import { useEffect, useState, type ChangeEvent } from "react";
import { apiRequest, createReservation } from "../services/Api";
import logo from "../../assets/logo-ucn.png";
import sala1 from "../../assets/sala indi.jpg";
import sala2 from "../../assets/sala multi.jpg";
import "../css/dashboard.css";

type Reserva = {
  id: string | number;
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

type Space = {
  id: string;
  name: string;
  type: string;
  zone: string;
  description: string;
  capacity: number;
  imageUrl?: string;
};

type AdminReservation = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  space?: {
    id?: string;
    name?: string;
    zone?: string;
  };
  user?: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
};

type AvailabilityResponse = {
  spaceId: string;
  date: string;
  timezone: string;
  ocupiedSlots?: unknown[];
  occupiedSlots?: unknown[];
};

type TimeBlock = {
  name: string;
  startTime: string;
  endTime: string;
};

const BLOQUES_DISPONIBLES: TimeBlock[] = [
  {
    name: "Bloque A",
    startTime: "08:10",
    endTime: "09:40",
  },
  {
    name: "Bloque B",
    startTime: "09:55",
    endTime: "11:25",
  },
  {
    name: "Bloque C",
    startTime: "11:40",
    endTime: "13:10",
  },
  {
    name: "Bloque C2",
    startTime: "13:10",
    endTime: "14:30",
  },
  {
    name: "Bloque D",
    startTime: "14:30",
    endTime: "16:00",
  },
  {
    name: "Bloque E",
    startTime: "16:15",
    endTime: "17:45",
  },
  {
    name: "Bloque F",
    startTime: "18:00",
    endTime: "19:30",
  },
];

function mapSpaceToReserva(space: Space): Reserva {
  return {
    id: space.id,
    sala: space.name,
    nombre: space.description || "Espacio disponible para reserva",
    tipo: space.type === "room" ? "Sala" : "Mesa",
    area: space.zone,
    ubicacion: space.zone,
    descripcion: space.description || "Sin descripción registrada.",
    capacidad: space.capacity,
    equipamiento: [],
    reglas: [],
    horariosDisponibles: BLOQUES_DISPONIBLES.map((bloque) => bloque.name),
    fecha: "",
    horario: "",
    imagen: space.imageUrl || (space.name === "EIC 102" ? sala2 : sala1),
  };
}

function normalizarBloquesOcupados(slots: unknown[] = []) {
  return slots
    .map((slot) => {
      if (typeof slot === "string") return slot;

      if (slot && typeof slot === "object") {
        const item = slot as {
          block?: string;
          label?: string;
          name?: string;
          startTime?: string;
          endTime?: string;
        };

        if (item.block || item.label || item.name) {
          return item.block || item.label || item.name || "";
        }

        const bloqueCoincidente = BLOQUES_DISPONIBLES.find(
          (bloque) =>
            bloque.startTime === item.startTime && bloque.endTime === item.endTime,
        );

        return bloqueCoincidente?.name || "";
      }

      return "";
    })
    .filter(Boolean);
}

function obtenerFechaHoy() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Dashboard() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [errorSpaces, setErrorSpaces] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [area, setArea] = useState("");
  const [tipo, setTipo] = useState("");

  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const [misReservas, setMisReservas] = useState<ReservaGuardada[]>([]);
  const [reservasAdmin, setReservasAdmin] = useState<AdminReservation[]>([]);
  const [loadingReservasAdmin, setLoadingReservasAdmin] = useState(false);
  const [errorReservasAdmin, setErrorReservasAdmin] = useState("");
  const [vista, setVista] = useState<"salas" | "misReservas" | "adminReservas">("salas");

  useEffect(() => {
    async function cargarEspacios() {
      try {
        setLoadingSpaces(true);
        setErrorSpaces("");

        const response = await apiRequest("/spaces?page=1&limit=50");
        const backendSpaces: Space[] = response.data ?? response;

        setReservas(backendSpaces.map(mapSpaceToReserva));
      } catch (error) {
        console.error(error);
        setErrorSpaces("No se pudieron cargar los espacios.");
      } finally {
        setLoadingSpaces(false);
      }
    }

    cargarEspacios();
  }, []);

  useEffect(() => {
    async function cargarDisponibilidad() {
      if (!selectedReserva || !fecha) {
        setOccupiedSlots([]);
        setSelectedTimeSlot("");
        return;
      }

      try {
        setLoadingAvailability(true);
        setAvailabilityError("");

        const response: AvailabilityResponse = await apiRequest(
          `/spaces/${selectedReserva.id}/availability?date=${fecha}`,
        );

        const slots = response.ocupiedSlots ?? response.occupiedSlots ?? [];
        setOccupiedSlots(normalizarBloquesOcupados(slots));
        setSelectedTimeSlot("");
      } catch (error) {
        console.error("Error cargando disponibilidad:", error);
        setAvailabilityError("No se pudo cargar la disponibilidad.");
      } finally {
        setLoadingAvailability(false);
      }
    }

    cargarDisponibilidad();
  }, [selectedReserva, fecha]);

  const reservasFiltradas = reservas.filter((reserva) => {
    return (
      (!fecha || !reserva.fecha || reserva.fecha === fecha) &&
      (!horario ||
        reserva.horario === horario ||
        reserva.horariosDisponibles.includes(horario)) &&
      (!area || reserva.area === area) &&
      (!tipo || reserva.tipo === tipo)
    );
  });

  const handleReservar = async () => {
    if (!selectedReserva || !selectedTimeSlot || !fecha) return;

    const bloqueSeleccionado = BLOQUES_DISPONIBLES.find(
      (bloque) => bloque.name === selectedTimeSlot,
    );

    if (!bloqueSeleccionado) return;

    try {
      const reservaCreada = await createReservation({
        spaceId: String(selectedReserva.id),
        date: fecha,
        startTime: bloqueSeleccionado.startTime,
        endTime: bloqueSeleccionado.endTime,
      });

      setMisReservas((prev: ReservaGuardada[]) => {
        const yaExiste = prev.some(
          (reserva) =>
            reserva.id === selectedReserva.id &&
            reserva.fechaReservada === fecha &&
            reserva.horarioReservado === selectedTimeSlot,
        );

        if (yaExiste) return prev;

        return [
          ...prev,
          {
            ...selectedReserva,
            fechaReservada: reservaCreada?.date ?? fecha,
            horarioReservado: selectedTimeSlot,
          },
        ];
      });

      setSelectedReserva(null);
      setSelectedTimeSlot("");
      setOccupiedSlots([]);
    } catch (error) {
      console.error("Error creando reserva:", error);
      setAvailabilityError(
        error instanceof Error ? error.message : "No se pudo crear la reserva.",
      );
    }
  };

  const openReservationDetail = (reserva: Reserva) => {
    setSelectedReserva(reserva);
    setSelectedTimeSlot("");
    setOccupiedSlots([]);
    setAvailabilityError("");
  };

  const cargarReservasAdmin = async () => {
    try {
      setLoadingReservasAdmin(true);
      setErrorReservasAdmin("");

      const response: AdminReservation[] = await apiRequest("/reservations");
      const fechaConsulta = fecha || obtenerFechaHoy();
      const reservasDelDia = response.filter(
        (reserva) => reserva.date === fechaConsulta,
      );

      setReservasAdmin(reservasDelDia);
    } catch (error) {
      console.error(error);
      setErrorReservasAdmin("No se pudieron cargar las reservas.");
    } finally {
      setLoadingReservasAdmin(false);
    }
  };

  const cambiarEstadoReservaAdmin = async (
    reservationId: string,
    action: "confirm" | "cancel",
  ) => {
    try {
      setErrorReservasAdmin("");

      await apiRequest(`/reservations/${reservationId}/${action}`, {
        method: "PATCH",
      });

      await cargarReservasAdmin();
    } catch (error) {
      console.error(error);
      setErrorReservasAdmin(
        action === "confirm"
          ? "No se pudo confirmar la reserva."
          : "No se pudo cancelar la reserva.",
      );
    }
  };

  const userEmail = localStorage.getItem("user_email") || "usuario@alumnos.ucn.cl";
  const userRole = localStorage.getItem("user_role");
  const isAdmin = userRole === "admin";

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

          <button
            className="menu-option"
            onClick={() => setVista("misReservas")}
          >
            Reservas
          </button>

          {isAdmin && (
            <button
              className="menu-option"
              onClick={() => {
                setVista("adminReservas");
                cargarReservasAdmin();
              }}
            >
              Reservas del día
            </button>
          )}
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
            {BLOQUES_DISPONIBLES.map((bloque) => (
              <option key={bloque.name} value={bloque.name}>
                {bloque.name}
              </option>
            ))}
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
              <option value="Sala">Sala</option>
              <option value="Mesa">Mesa</option>
            </select>
          </aside>

          <section className="reservas-panel">
            {vista === "salas" && loadingSpaces && (
              <div className="empty-card">Cargando espacios desde backend...</div>
            )}

            {vista === "salas" && errorSpaces && (
              <div className="empty-card">{errorSpaces}</div>
            )}

            {vista === "salas" &&
              !loadingSpaces &&
              !errorSpaces &&
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

            {vista === "salas" &&
              !loadingSpaces &&
              !errorSpaces &&
              reservasFiltradas.length === 0 && (
                <div className="empty-card">
                  No hay espacios con los filtros seleccionados.
                </div>
              )}

            {vista === "misReservas" &&
              misReservas.map((reserva) => (
                <button
                  className="room-card"
                  key={`${reserva.id}-${reserva.fechaReservada}-${reserva.horarioReservado}`}
                >
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

            {vista === "adminReservas" && loadingReservasAdmin && (
              <div className="empty-card">Cargando reservas del día...</div>
            )}

            {vista === "adminReservas" && errorReservasAdmin && (
              <div className="empty-card">{errorReservasAdmin}</div>
            )}

            {vista === "adminReservas" &&
              !loadingReservasAdmin &&
              !errorReservasAdmin && (
                <div className="empty-card">
                  Reservas del día: {fecha || obtenerFechaHoy()}
                </div>
              )}

            {vista === "adminReservas" &&
              !loadingReservasAdmin &&
              !errorReservasAdmin &&
              reservasAdmin.map((reserva) => (
                <div className="room-card" key={reserva.id}>
                  <div className="room-info">
                    <h3>{reserva.space?.name || "Espacio sin nombre"}</h3>
                    <p>
                      {reserva.user?.email ||
                        `${reserva.user?.firstName ?? ""} ${reserva.user?.lastName ?? ""}`.trim() ||
                        "Usuario sin datos"}
                    </p>
                    <span>
                      {reserva.date} · {reserva.startTime} - {reserva.endTime}
                    </span>
                    <span>Estado: {reserva.status}</span>

                    {isAdmin && (
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="slot-btn"
                          onClick={() =>
                            cambiarEstadoReservaAdmin(reserva.id, "confirm")
                          }
                          disabled={reserva.status === "active"}
                        >
                          Confirmar
                        </button>

                        <button
                          type="button"
                          className="slot-btn"
                          onClick={() =>
                            cambiarEstadoReservaAdmin(reserva.id, "cancel")
                          }
                          disabled={reserva.status === "cancelled"}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

            {vista === "adminReservas" &&
              !loadingReservasAdmin &&
              !errorReservasAdmin &&
              reservasAdmin.length === 0 && (
                <div className="empty-card">
                  No hay reservas para el día seleccionado.
                </div>
              )}
          </section>

          {selectedReserva && (
            <div className="reservation-modal-overlay">
              <div className="reservation-modal">
                <button
                  className="close-modal"
                  onClick={() => {
                    setSelectedReserva(null);
                    setSelectedTimeSlot("");
                    setOccupiedSlots([]);
                  }}
                >
                  ✕
                </button>

                <h1 className="modal-title">Detalle del espacio</h1>

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
                        {selectedReserva.equipamiento.length > 0 ? (
                          <div className="chip-row">
                            {selectedReserva.equipamiento.map((item) => (
                              <span key={item} className="chip">
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p>Sin equipamiento registrado.</p>
                        )}
                      </section>

                      <section className="detail-card detail-card--wide">
                        <h3>Reglas de uso</h3>
                        {selectedReserva.reglas.length > 0 ? (
                          <ul className="rules-list">
                            {selectedReserva.reglas.map((rule) => (
                              <li key={rule}>{rule}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>Sin reglas registradas.</p>
                        )}
                      </section>

                      <section className="detail-card detail-card--wide">
                        <h3>Horarios disponibles</h3>

                        {!fecha && (
                          <p>Selecciona una fecha para consultar disponibilidad real.</p>
                        )}

                        {loadingAvailability && <p>Cargando disponibilidad...</p>}

                        {availabilityError && <p>{availabilityError}</p>}

                        <div className="slots-grid">
                          {BLOQUES_DISPONIBLES.map((slot) => {
                            const isOccupied = occupiedSlots.includes(slot.name);

                            return (
                              <button
                                key={slot.name}
                                type="button"
                                className={`slot-btn ${selectedTimeSlot === slot.name ? "selected" : ""}`}
                                onClick={() => !isOccupied && setSelectedTimeSlot(slot.name)}
                                disabled={isOccupied || loadingAvailability}
                              >
                                {isOccupied
                                  ? `${slot.name} ocupado`
                                  : `${slot.name} (${slot.startTime} - ${slot.endTime})`}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    </div>
                  </div>

                  <div className="summary-box">
                    <h3>Resumen</h3>

                    <div className="summary-item">{selectedReserva.sala}</div>

                    <div className="summary-item">
                      {selectedTimeSlot || "Selecciona un bloque"}
                    </div>

                    <div className="summary-item">
                      {fecha || "Selecciona una fecha"}
                    </div>

                    <div className="summary-item summary-item--small">
                      {selectedReserva.nombre}
                    </div>

                    <button
                      className="reserve-btn"
                      onClick={handleReservar}
                      disabled={!selectedTimeSlot || !fecha}
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
