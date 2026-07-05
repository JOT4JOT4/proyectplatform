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
  divisions?: number;
};

type OccupiedTimeRange = {
  startTime: string;
  endTime: string;
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

function formatTimeWithoutSeconds(timeStr?: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return timeStr;
}

type BackendReservation = AdminReservation & {
  space?: Partial<Space>;
};

function mapBackendReservationToReservaGuardada(
  res: BackendReservation,
): ReservaGuardada {
  const space = res.space || {};
  const start = formatTimeWithoutSeconds(res.startTime);
  const end = formatTimeWithoutSeconds(res.endTime);

  const bloqueCoincidente = BLOQUES_DISPONIBLES.find(
    (bloque) => bloque.startTime === start && bloque.endTime === end,
  );
  const horarioReservado = bloqueCoincidente ? bloqueCoincidente.name : `${start} - ${end}`;

  return {
    id: space.id || "",
    sala: space.name || "Espacio",
    nombre: space.description || "Reserva de espacio",
    tipo: space.type === "room" ? "Sala" : "Mesa",
    area: space.zone || "",
    ubicacion: space.zone || "",
    descripcion: space.description || "Sin descripción registrada.",
    capacidad: space.capacity || 0,
    equipamiento: [],
    reglas: [],
    horariosDisponibles: BLOQUES_DISPONIBLES.map((bloque) => bloque.name),
    fecha: res.date,
    horario: horarioReservado,
    imagen: space.imageUrl || (space.name === "EIC 102" ? sala2 : sala1),
    fechaReservada: res.date,
    horarioReservado: horarioReservado,
  };
}

function normalizarBloquesOcupados(slots: unknown[] = []): OccupiedTimeRange[] {
  return slots
    .map((slot) => {
      if (slot && typeof slot === "object") {
        const item = slot as {
          startTime?: string;
          endTime?: string;
        };
        if (item.startTime && item.endTime) {
          return {
            startTime: formatTimeWithoutSeconds(item.startTime),
            endTime: formatTimeWithoutSeconds(item.endTime),
          };
        }
      }
      return null;
    })
    .filter((x): x is OccupiedTimeRange => x !== null);
}

function getSubBlocks(baseBlock: TimeBlock, divisions: number): TimeBlock[] {
  if (divisions <= 1) return [baseBlock];

  const [startH, startM] = baseBlock.startTime.split(":").map(Number);
  const [endH, endM] = baseBlock.endTime.split(":").map(Number);

  const startTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;
  const totalDuration = endTotalMinutes - startTotalMinutes;

  const slotDuration = Math.floor(totalDuration / divisions);
  const subBlocks: TimeBlock[] = [];

  for (let i = 0; i < divisions; i++) {
    const slotStartTotal = startTotalMinutes + i * slotDuration;
    const slotEndTotal = slotStartTotal + slotDuration;

    const formatTime = (totalMin: number) => {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const startTime = formatTime(slotStartTotal);
    const endTime = formatTime(slotEndTotal);

    subBlocks.push({
      name: `${baseBlock.name} - Sub ${i + 1}`,
      startTime,
      endTime,
    });
  }

  return subBlocks;
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
  const [selectedBaseBlock, setSelectedBaseBlock] = useState("");
  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedTimeRange[]>([]);
  const [divisions, setDivisions] = useState(1);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [reserving, setReserving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const isSlotOccupied = (startTime: string, endTime: string) => {
    return occupiedSlots.some(
      (occupied) => occupied.startTime === startTime && occupied.endTime === endTime,
    );
  };

  const getBaseBlockStatus = (baseBlock: TimeBlock) => {
    if (divisions <= 1) {
      return isSlotOccupied(baseBlock.startTime, baseBlock.endTime) ? "occupied" : "free";
    }

    const subs = getSubBlocks(baseBlock, divisions);
    const occupiedCount = subs.filter((sub) => isSlotOccupied(sub.startTime, sub.endTime)).length;

    if (occupiedCount === subs.length) {
      return "occupied";
    } else if (occupiedCount > 0) {
      return "partial";
    }
    return "free";
  };

  const [misReservas, setMisReservas] = useState<ReservaGuardada[]>([]);
  const [loadingMisReservas, setLoadingMisReservas] = useState(false);
  const [errorMisReservas, setErrorMisReservas] = useState("");
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
        setSelectedBaseBlock("");
        setSelectedTimeSlot("");
        setDivisions(1);
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
        setDivisions(response.divisions ?? 1);
        setSelectedBaseBlock("");
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

  const cargarMisReservas = async () => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    try {
      setLoadingMisReservas(true);
      setErrorMisReservas("");
      const response = await apiRequest(`/reservations/user/${userId}`);
      const mapped = response.map(mapBackendReservationToReservaGuardada);
      setMisReservas(mapped);
    } catch (error) {
      console.error("Error al cargar reservas:", error);
      setErrorMisReservas("No se pudieron cargar tus reservas.");
    } finally {
      setLoadingMisReservas(false);
    }
  };

  useEffect(() => {
    if (selectedReserva) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedReserva]);

  const handleReservar = async () => {
  if (!selectedReserva || !selectedTimeSlot || !fecha) return;

  const bloqueSeleccionado =
    divisions > 1 && selectedTimeSlot.includes(" - Sub ")
      ? (() => {
          const baseBlockName = selectedTimeSlot.split(" - ")[0];
          const baseBlock = BLOQUES_DISPONIBLES.find(
            (b) => b.name === baseBlockName,
          );

          if (!baseBlock) return null;

          return getSubBlocks(baseBlock, divisions).find(
            (s) => s.name === selectedTimeSlot,
          );
        })()
      : BLOQUES_DISPONIBLES.find((b) => b.name === selectedTimeSlot);

  if (!bloqueSeleccionado) return;
  setReserving(true);
  setAvailabilityError("");

  try {
    await createReservation({
      spaceId: String(selectedReserva.id),
      date: fecha,
      startTime: bloqueSeleccionado.startTime,
      endTime: bloqueSeleccionado.endTime,
    });
    await cargarMisReservas();

    await new Promise((resolve) => setTimeout(resolve, 2000));
    setSuccessMessage("Reserva hecha con éxito.");

    setSelectedReserva(null);
    setSelectedBaseBlock("");
    setSelectedTimeSlot("");
    setOccupiedSlots([]);

    setTimeout(() => {
      setSuccessMessage("");
    }, 2000);

  } catch (error) {
    console.error("Error creando reserva:", error);
    setAvailabilityError(
      error instanceof Error ? error.message : "No se pudo crear la reserva.",
    );
  }
  finally {
  setReserving(false);
}
};

  const openReservationDetail = (reserva: Reserva) => {
    setSelectedReserva(reserva);
    setSelectedBaseBlock("");
    setSelectedTimeSlot("");
    setOccupiedSlots([]);
    setAvailabilityError("");
  };

  const cargarReservasAdmin = async (fechaFiltro?: string) => {
    try {
      setLoadingReservasAdmin(true);
      setErrorReservasAdmin("");

      const response: AdminReservation[] = await apiRequest("/reservations");
      const fechaConsulta = fechaFiltro || fecha || obtenerFechaHoy();
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
      {successMessage && (
        <div className="success-toast">
          {successMessage}
        </div>
      )}
      <nav className="top-navbar">
        <div className="navbar-left">
          <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <button className="home-btn" onClick={() => setVista("salas")} title="Inicio">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </button>
        </div>

        <img src={logo} alt="Logo institución" className="navbar-logo" />
      </nav>

        <aside className={`side-menu ${menuOpen ? "open" : ""}`}>
          <p className="menu-user-email">{userEmail}</p>

          <button
            className="menu-option"
            onClick={() => {
              setVista("misReservas");
              cargarMisReservas();
            }}
          >
            Mis Reservas
          </button>

          {isAdmin && (
            <button
              className="menu-option"
              onClick={() => {
                setVista("adminReservas");
                cargarReservasAdmin(fecha || obtenerFechaHoy());
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const nuevaFecha = e.target.value;
                setFecha(nuevaFecha);

                if (vista === "adminReservas") {
                  cargarReservasAdmin(nuevaFecha);
                }
              }}
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

            {vista === "misReservas" && loadingMisReservas && (
              <div className="empty-card">Cargando tus reservas...</div>
            )}

            {vista === "misReservas" && errorMisReservas && (
              <div className="empty-card">{errorMisReservas}</div>
            )}

            {vista === "misReservas" &&
              !loadingMisReservas &&
              !errorMisReservas &&
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

            {vista === "misReservas" &&
              !loadingMisReservas &&
              !errorMisReservas &&
              misReservas.length === 0 && (
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
                <>
                  <div className="empty-card">
                    Reservas del día: {fecha || obtenerFechaHoy()}
                  </div>
                </>
            )}

            {vista === "adminReservas" &&
              !loadingReservasAdmin &&
              !errorReservasAdmin &&
              reservasAdmin.map((reserva) => {
                const nombreUsuario =
                  reserva.user?.firstName ||
                  reserva.user?.email?.split("@")[0] ||
                  "Usuario";

                return (
                  <div className="admin-reservation-card" key={reserva.id}>
                    <div className="admin-reservation-info">
                      <h3>
                        {reserva.space?.name || "Espacio sin nombre"} - {nombreUsuario}
                      </h3>

                      <span>
                        {reserva.date} ·{" "}
                        {formatTimeWithoutSeconds(reserva.startTime)} -{" "}
                        {formatTimeWithoutSeconds(reserva.endTime)}
                      </span>

                      <span>Estado: {reserva.status}</span>
                    </div>

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
                  </div>
                );
              })}

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
                    setSelectedBaseBlock("");
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

                        {divisions > 1 && (
                          <p style={{ fontStyle: "italic", color: "#666", marginBottom: "10px" }}>
                            El horario solicitado no coincide con la división de bloques permitida ({divisions} división(es) para esta fecha). Selecciona un bloque base para ver sus subdivisiones.
                          </p>
                        )}

                        {!fecha && (
                          <p>Selecciona una fecha para consultar disponibilidad real.</p>
                        )}

                        {loadingAvailability && <p>Cargando disponibilidad...</p>}

                        {availabilityError && <p>{availabilityError}</p>}

                        <div className="slots-grid">
                          {BLOQUES_DISPONIBLES.map((slot) => {
                            const status = getBaseBlockStatus(slot);
                            const isOccupied = status === "occupied";
                            const isSelected = selectedBaseBlock === slot.name || (divisions <= 1 && selectedTimeSlot === slot.name);

                            return (
                              <button
                                key={slot.name}
                                type="button"
                                className={`slot-btn ${isSelected ? "selected" : ""} ${status === "partial" ? "partial" : ""}`}
                                onClick={() => {
                                  if (!isOccupied) {
                                    setSelectedBaseBlock(slot.name);
                                    if (divisions <= 1) {
                                      setSelectedTimeSlot(slot.name);
                                    } else {
                                      setSelectedTimeSlot(""); // Require selecting a subblock
                                    }
                                  }
                                }}
                                disabled={isOccupied || loadingAvailability}
                              >
                                {isOccupied
                                  ? `${slot.name} ocupado`
                                  : status === "partial"
                                    ? `${slot.name} (parcial)`
                                    : `${slot.name} (${slot.startTime} - ${slot.endTime})`}
                              </button>
                            );
                          })}
                        </div>

                        {divisions > 1 && selectedBaseBlock && (
                          <div className="sub-blocks-section" style={{ marginTop: "20px", borderTop: "1px solid #eee", paddingTop: "15px" }}>
                            <h4 style={{ marginBottom: "10px" }}>Subdivisiones para {selectedBaseBlock}:</h4>
                            <div className="slots-grid">
                              {(() => {
                                const baseBlock = BLOQUES_DISPONIBLES.find(b => b.name === selectedBaseBlock);
                                if (!baseBlock) return null;
                                const subs = getSubBlocks(baseBlock, divisions);
                                return subs.map((sub) => {
                                  const isSubOccupied = isSlotOccupied(sub.startTime, sub.endTime);
                                  const isSubSelected = selectedTimeSlot === sub.name;

                                  return (
                                    <button
                                      key={sub.name}
                                      type="button"
                                      className={`slot-btn ${isSubSelected ? "selected" : ""}`}
                                      onClick={() => !isSubOccupied && setSelectedTimeSlot(sub.name)}
                                      disabled={isSubOccupied || loadingAvailability}
                                    >
                                      {isSubOccupied
                                        ? `${sub.name.split(" - ")[1]} ocupado`
                                        : `${sub.name.split(" - ")[1]} (${sub.startTime} - ${sub.endTime})`}
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
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
                      disabled={!selectedTimeSlot || !fecha || reserving}
                    >
                      {reserving ? "Reservando..." : "Reservar"}
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
