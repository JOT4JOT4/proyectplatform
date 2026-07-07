import { useEffect, useState, type ChangeEvent } from "react";
import logo from "../../assets/logo-ucn.png";
import sala1 from "../../assets/sala indi.jpg";
import sala2 from "../../assets/sala multi.jpg";
import "../css/dashboard.css";
import {
  apiRequest,
  createReservation,
  createSpace,
  updateSpace,
  deleteSpace,
  createSpaceBlock,
  getSpaceBlocks,
  deleteSpaceBlock,
  type SpacePayload,
  type SpaceBlockPayload,
  getReservationSettings,
  saveReservationSetting,
  createBlockConfig,
  getBlockConfigs,
} from "../services/Api";

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
  reservationId: string;
  fechaReservada: string;
  horarioReservado: string;
  status?: string;
  startTime?: string;
  endTime?: string;
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

type BlockConfig = {
  id?: string;
  effectiveDate: string;
  divisions: number;
  createdAt?: string;
  updatedAt?: string;
};

type SpaceBlock = {
  id: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
  space?: {
    id?: string;
    name?: string;
  };
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
    reservationId: res.id,
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
    status: res.status,
    startTime: start,
    endTime: end,
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
      (occupied) => occupied.startTime < endTime && occupied.endTime > startTime,
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

  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [spaceForm, setSpaceForm] = useState<SpacePayload>({
    name: "",
    type: "room",
    zone: "",
    description: "",
    capacity: 1,
    imageUrl: "",
  });
  const [spaceMessage, setSpaceMessage] = useState("");
  const [spaceError, setSpaceError] = useState("");
  const [spaceBlocks, setSpaceBlocks] = useState<SpaceBlock[]>([]);
  const [loadingSpaceBlocks, setLoadingSpaceBlocks] = useState(false);
  const [spaceBlockMessage, setSpaceBlockMessage] = useState("");
  const [spaceBlockError, setSpaceBlockError] = useState("");

  const [spaceBlockForm, setSpaceBlockForm] = useState<SpaceBlockPayload>({
    spaceId: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  const [vista, setVista] = useState<
    "salas" | "misReservas" | "adminReservas" | "adminEspacios" | "adminBloqueos" | "adminConfiguracion"
  >("salas");

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

      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSuccessMessage("Reserva hecha con éxito.");

      setSelectedReserva(null);
      setSelectedBaseBlock("");
      setSelectedTimeSlot("");
      setOccupiedSlots([]);

      cargarMisReservas();

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error creando reserva:", error);
      setAvailabilityError(
        error instanceof Error ? error.message : "No se pudo crear la reserva.",
      );
    } finally {
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

  const resetSpaceForm = () => {
    setEditingSpaceId(null);
    setSpaceForm({
      name: "",
      type: "room",
      zone: "",
      description: "",
      capacity: 1,
      imageUrl: "",
    });
    setSpaceError("");
    setSpaceMessage("");
  };

  const handleSpaceSubmit = async () => {
    try {
      setSpaceError("");
      setSpaceMessage("");

      if (!spaceForm.name || !spaceForm.zone || !spaceForm.description) {
        setSpaceError("Completa nombre, área y descripción.");
        return;
      }

      if (spaceForm.capacity < 1) {
        setSpaceError("La capacidad debe ser mayor a 0.");
        return;
      }

      if (editingSpaceId) {
        await updateSpace(editingSpaceId, spaceForm);
        setSpaceMessage("Espacio actualizado correctamente.");
      } else {
        await createSpace(spaceForm);
        setSpaceMessage("Espacio creado correctamente.");
      }

      resetSpaceForm();

      const response = await apiRequest("/spaces?page=1&limit=50");
      const backendSpaces: Space[] = response.data ?? response;
      setReservas(backendSpaces.map(mapSpaceToReserva));
    } catch (error) {
      console.error(error);
      setSpaceError("No se pudo guardar el espacio.");
    }
  };

  const handleEditSpace = (reserva: Reserva) => {
    setEditingSpaceId(String(reserva.id));
    setSpaceForm({
      name: reserva.sala,
      type: reserva.tipo === "Sala" ? "room" : "table",
      zone: reserva.area,
      description: reserva.descripcion,
      capacity: reserva.capacidad,
      imageUrl: reserva.imagen || "",
    });
    setSpaceError("");
    setSpaceMessage("");
  };

  const handleDeleteSpace = async (id: string) => {
    const confirmar = window.confirm("¿Seguro que deseas eliminar este espacio?");

    if (!confirmar) return;

    try {
      setSpaceError("");
      setSpaceMessage("");

      await deleteSpace(id);

      setSpaceMessage("Espacio eliminado correctamente.");

      const response = await apiRequest("/spaces?page=1&limit=50");
      const backendSpaces: Space[] = response.data ?? response;
      setReservas(backendSpaces.map(mapSpaceToReserva));
    } catch (error) {
      console.error(error);
      setSpaceError("No se pudo eliminar el espacio.");
    }
  };

  const resetSpaceBlockForm = () => {
    setSpaceBlockForm({
      spaceId: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      reason: "",
    });

    setSpaceBlockError("");
  };

  const cargarSpaceBlocks = async () => {
    try {
      setLoadingSpaceBlocks(true);
      setSpaceBlockError("");

      const response = await getSpaceBlocks();

      const blocks: SpaceBlock[] = response.data ?? response;

      setSpaceBlocks(Array.isArray(blocks) ? blocks : []);
    } catch (error) {
      console.error("Error cargando bloqueos:", error);
      setSpaceBlockError("No se pudieron cargar los bloqueos.");
    } finally {
      setLoadingSpaceBlocks(false);
    }
  };

  const handleCreateSpaceBlock = async () => {
    try {
      setSpaceBlockError("");
      setSpaceBlockMessage("");

      if (
        !spaceBlockForm.spaceId ||
        !spaceBlockForm.startDate ||
        !spaceBlockForm.endDate ||
        !spaceBlockForm.reason.trim()
      ) {
        setSpaceBlockError(
          "Debes seleccionar un espacio, las fechas y escribir un motivo.",
        );
        return;
      }

      if (spaceBlockForm.endDate < spaceBlockForm.startDate) {
        setSpaceBlockError(
          "La fecha final no puede ser anterior a la fecha inicial.",
        );
        return;
      }

      const tieneHoraInicio = Boolean(spaceBlockForm.startTime);
      const tieneHoraFin = Boolean(spaceBlockForm.endTime);

      if (tieneHoraInicio !== tieneHoraFin) {
        setSpaceBlockError(
          "Debes seleccionar ambas horas o dejar ambas vacías para bloquear el día completo.",
        );
        return;
      }

      if (
        spaceBlockForm.startDate === spaceBlockForm.endDate &&
        spaceBlockForm.startTime &&
        spaceBlockForm.endTime &&
        spaceBlockForm.endTime <= spaceBlockForm.startTime
      ) {
        setSpaceBlockError(
          "La hora final debe ser posterior a la hora inicial.",
        );
        return;
      }

      const payload: SpaceBlockPayload = {
        spaceId: spaceBlockForm.spaceId,
        startDate: spaceBlockForm.startDate,
        endDate: spaceBlockForm.endDate,
        reason: spaceBlockForm.reason.trim(),
      };

      if (spaceBlockForm.startTime && spaceBlockForm.endTime) {
        payload.startTime = spaceBlockForm.startTime;
        payload.endTime = spaceBlockForm.endTime;
      }

      await createSpaceBlock(payload);

      setSpaceBlockMessage("Horario bloqueado correctamente.");

      resetSpaceBlockForm();

      await cargarSpaceBlocks();
    } catch (error) {
      console.error("Error creando bloqueo:", error);

      setSpaceBlockError(
        error instanceof Error
          ? error.message
          : "No se pudo crear el bloqueo.",
      );
    }
  };

  const handleDeleteSpaceBlock = async (blockId: string) => {
    const confirmar = window.confirm(
      "¿Seguro que deseas eliminar este bloqueo?",
    );

    if (!confirmar) return;

    try {
      setSpaceBlockError("");
      setSpaceBlockMessage("");

      await deleteSpaceBlock(blockId);

      setSpaceBlockMessage("Bloqueo eliminado correctamente.");

      await cargarSpaceBlocks();
    } catch (error) {
      console.error("Error eliminando bloqueo:", error);

      setSpaceBlockError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el bloqueo.",
      );
    }
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
        body: action === "cancel"
          ? JSON.stringify({ reason: "Cancelada por administrador desde web" })
          : undefined,
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

  const cancelarMiReserva = async (reservationId: string) => {
  try {
    setErrorMisReservas("");

    await apiRequest(`/reservations/${reservationId}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({
        reason: "Cancelada desde frontend web",
      }),
    });

    await cargarMisReservas();
  } catch (error) {
    console.error(error);
    setErrorMisReservas("No se pudo cancelar la reserva.");
    }
  };

  const userEmail = localStorage.getItem("user_email") || "usuario@alumnos.ucn.cl";
  const userRole = localStorage.getItem("user_role");
  const isAdmin = userRole === "admin";

  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_role");
    window.location.href = "/";
  };

  const isReservationFuture = (date: string, endTime: string) => {
  const reservationEnd = new Date(`${date}T${endTime}`);
  const now = new Date();

  return reservationEnd > now;
  };

  const [reservationSettings, setReservationSettings] = useState({
    reservation_max_advance_days: "10",
    cancel_deadline_days: "1",
    reservation_weekly_limit: "10",
  });

  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(false);

  const cargarReservationSettings = async () => {
    try {
      setLoadingSettings(true);
      setSettingsError("");
      setSettingsMessage("");

      const response = await getReservationSettings();

      const settingsMap = response.reduce<Record<string, string>>(
        (acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        },
        {},
      );

      setReservationSettings((prev) => ({
        ...prev,
        reservation_max_advance_days:
          settingsMap.reservation_max_advance_days ??
          prev.reservation_max_advance_days,

        cancel_deadline_days:
          settingsMap.cancel_deadline_days ??
          prev.cancel_deadline_days,

        reservation_weekly_limit:
          settingsMap.reservation_weekly_limit ??
          prev.reservation_weekly_limit,
      }));
    } catch (error) {
      console.error("Error cargando configuración:", error);
      setSettingsError("No se pudo cargar la configuración.");
    } finally {
      setLoadingSettings(false);
    }
  };

  const guardarReservationSettings = async () => {
    try {
      setLoadingSettings(true);
      setSettingsError("");
      setSettingsMessage("");

      await saveReservationSetting(
        "reservation_max_advance_days",
        reservationSettings.reservation_max_advance_days,
      );

      await saveReservationSetting(
        "cancel_deadline_days",
        reservationSettings.cancel_deadline_days,
      );

      await saveReservationSetting(
        "reservation_weekly_limit",
        reservationSettings.reservation_weekly_limit,
      );

      setSettingsMessage("Configuración guardada correctamente.");
    } catch (error) {
      console.error("Error guardando configuración:", error);
      setSettingsError("No se pudo guardar la configuración.");
    } finally {
      setLoadingSettings(false);
    }
  };

  const [effectiveDate, setEffectiveDate] = useState(obtenerFechaHoy());
  const [blockConfigs, setBlockConfigs] = useState<BlockConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [configsError, setConfigsError] = useState("");
  const [configsMessage, setConfigsMessage] = useState("");

  const cargarBlockConfigs = async () => {
    try {
      setLoadingConfigs(true);
      setConfigsError("");
      const response = await getBlockConfigs();
      setBlockConfigs(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Error cargando subdivisiones:", error);
      setConfigsError("No se pudieron cargar las configuraciones de subdivisiones.");
    } finally {
      setLoadingConfigs(false);
    }
  };

  const guardarBlockConfig = async (divisions: number) => {
    try {
      setLoadingConfigs(true);
      setConfigsError("");
      setConfigsMessage("");
      await createBlockConfig(effectiveDate, divisions);
      setConfigsMessage(`Subdivisiones configuradas en ${divisions} para la fecha ${effectiveDate}.`);
      await cargarBlockConfigs();
    } catch (error) {
      console.error("Error guardando subdivisiones:", error);
      setConfigsError("No se pudo guardar la configuración de subdivisiones.");
    } finally {
      setLoadingConfigs(false);
    }
  };

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
          {isAdmin && (
            <button
              className="menu-option"
              onClick={() => {
                setVista("adminEspacios");
                resetSpaceForm();
              }}
            >
              Administrar salas
            </button>
          )}
          {isAdmin && (
            <button
              className="menu-option"
              onClick={() => {
                setVista("adminBloqueos");
                resetSpaceBlockForm();
                cargarSpaceBlocks();
              }}
            >
              Bloquear horarios
            </button>
          )}
          {isAdmin && (
            <button
              className="menu-option"
              onClick={() => {
                setVista("adminConfiguracion");
                cargarReservationSettings();
                cargarBlockConfigs();
              }}
            >
              Configuración
            </button>
          )}
          <button
            type="button"
            className="menu-option logout-button"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
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
              misReservas
                .filter((reserva) => reserva.status !== "cancelled")
                .filter((reserva) =>
                reserva.endTime
                  ? isReservationFuture(reserva.fechaReservada, reserva.endTime)
                  : true
                )
                .map((reserva) => (
                <div
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

                  <button
                    type="button"
                    className="slot-btn cancel-reservation-btn"
                    onClick={() => cancelarMiReserva(reserva.reservationId)}
                  >
                    Cancelar reserva
                  </button>
                </div>
              ))}

            {vista === "misReservas" &&
              !loadingMisReservas &&
              !errorMisReservas &&
              misReservas.filter((reserva) => reserva.status !== "cancelled").length === 0 && (
                <div className="empty-card">
                  No tienes reservas activas.
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

            {vista === "adminEspacios" && (
              <>
                <div className="admin-section-title">
                  {editingSpaceId ? "Editar espacio" : "Crear nuevo espacio"}
                </div>

                {spaceError && <div className="form-message form-message-error">{spaceError}</div>}
                {spaceMessage && (
                  <div className="form-message form-message-success">{spaceMessage}</div>
                )}

                <div className={`space-form-card ${editingSpaceId ? "editing" : ""}`}>
                <div className="space-form-grid">
                  <label>
                    Nombre
                    <input
                      value={spaceForm.name}
                      onChange={(e) => setSpaceForm({ ...spaceForm, name: e.target.value })}
                      placeholder="Ej: Sala de Estudio 101"
                    />
                  </label>

                  <label>
                    Tipo
                    <select
                      value={spaceForm.type}
                      onChange={(e) =>
                        setSpaceForm({
                          ...spaceForm,
                          type: e.target.value as "room" | "table",
                        })
                      }
                    >
                      <option value="room">Sala</option>
                      <option value="table">Mesa</option>
                    </select>
                  </label>

                  <label>
                    Área / zona
                    <input
                      value={spaceForm.zone}
                      onChange={(e) => setSpaceForm({ ...spaceForm, zone: e.target.value })}
                      placeholder="Ej: Biblioteca - Piso 2"
                    />
                  </label>

                  <label>
                    Capacidad
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={spaceForm.capacity}
                      onChange={(e) =>
                        setSpaceForm({
                          ...spaceForm,
                          capacity: Number(e.target.value),
                        })
                      }
                    />
                  </label>

                  <label className="space-form-full">
                    Descripción
                    <textarea
                      value={spaceForm.description}
                      onChange={(e) =>
                        setSpaceForm({ ...spaceForm, description: e.target.value })
                      }
                      placeholder="Describe el espacio..."
                    />
                  </label>

                  <label className="space-form-full">
                    Imagen del espacio (URL)
                    <input
                      value={spaceForm.imageUrl}
                      onChange={(e) =>
                        setSpaceForm({ ...spaceForm, imageUrl: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </label>
                </div>

                <div className="space-form-actions">
                  <button className="slot-btn" type="button" onClick={handleSpaceSubmit}>
                    {editingSpaceId ? "Actualizar espacio" : "Crear espacio"}
                  </button>

                  <button className="slot-btn" type="button" onClick={resetSpaceForm}>
                    {editingSpaceId ? "Cancelar edición" : "Limpiar"}
                  </button>
                </div>
              </div>

                {reservas.map((reserva) => (
                  <div className="admin-space-card" key={reserva.id}>
                    <img
                      src={reserva.imagen}
                      alt={reserva.sala}
                      className="admin-space-image"
                    />

                    <div className="admin-space-info">
                      <h3>{reserva.sala}</h3>

                      <span>
                        {reserva.tipo} · {reserva.area} · Capacidad: {reserva.capacidad}
                      </span>

                      <p>{reserva.descripcion}</p>
                    </div>

                    <div className="admin-space-actions">
                      <button
                        type="button"
                        className="slot-btn"
                        onClick={() => handleEditSpace(reserva)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="slot-btn cancel-reservation-btn"
                        onClick={() => handleDeleteSpace(String(reserva.id))}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {vista === "adminBloqueos" && (
              <>
                <div className="admin-section-title">
                  Bloquear horarios de salas
                </div>

                {spaceBlockError && (
                  <div className="form-message form-message-error">
                    {spaceBlockError}
                  </div>
                )}

                {spaceBlockMessage && (
                  <div className="form-message form-message-success">
                    {spaceBlockMessage}
                  </div>
                )}

                <div className="space-form-card">
                  <div className="space-form-grid">
                    <label>
                      Espacio
                      <select
                        value={spaceBlockForm.spaceId}
                        onChange={(e) =>
                          setSpaceBlockForm({
                            ...spaceBlockForm,
                            spaceId: e.target.value,
                          })
                        }
                      >
                        <option value="">Selecciona un espacio</option>
                        {reservas.map((reserva) => (
                          <option key={reserva.id} value={String(reserva.id)}>
                            {reserva.sala}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Fecha inicio
                      <input
                        type="date"
                        value={spaceBlockForm.startDate}
                        onChange={(e) =>
                          setSpaceBlockForm({
                            ...spaceBlockForm,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Fecha fin
                      <input
                        type="date"
                        value={spaceBlockForm.endDate}
                        onChange={(e) =>
                          setSpaceBlockForm({
                            ...spaceBlockForm,
                            endDate: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Hora inicio
                      <input
                        type="time"
                        value={spaceBlockForm.startTime}
                        onChange={(e) =>
                          setSpaceBlockForm({
                            ...spaceBlockForm,
                            startTime: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Hora fin
                      <input
                        type="time"
                        value={spaceBlockForm.endTime}
                        onChange={(e) =>
                          setSpaceBlockForm({
                            ...spaceBlockForm,
                            endTime: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="space-form-full">
                      Motivo
                      <textarea
                        value={spaceBlockForm.reason}
                        onChange={(e) =>
                          setSpaceBlockForm({
                            ...spaceBlockForm,
                            reason: e.target.value,
                          })
                        }
                        placeholder="Ej: Mantención, evento, limpieza, reparación..."
                      />
                    </label>
                  </div>

                  <div className="space-form-actions">
                    <button
                      type="button"
                      className="slot-btn"
                      onClick={handleCreateSpaceBlock}
                    >
                      Crear bloqueo
                    </button>

                    <button
                      type="button"
                      className="slot-btn"
                      onClick={resetSpaceBlockForm}
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {loadingSpaceBlocks && (
                  <div className="empty-card">Cargando bloqueos...</div>
                )}

                {!loadingSpaceBlocks && spaceBlocks.length === 0 && (
                  <div className="empty-card">
                    No hay bloqueos registrados.
                  </div>
                )}

                {!loadingSpaceBlocks &&
                  spaceBlocks.map((block) => (
                    <div className="admin-reservation-card" key={block.id}>
                      <div className="admin-reservation-info">
                        <h3>{block.space?.name || "Espacio sin nombre"}</h3>

                        <span>
                          {block.startDate} al {block.endDate}
                        </span>

                        <span>
                          {block.startTime && block.endTime
                            ? `${block.startTime} - ${block.endTime}`
                            : "Día completo"}
                        </span>

                        <span>Motivo: {block.reason}</span>
                      </div>

                      <div className="admin-actions">
                        <button
                          type="button"
                          className="slot-btn cancel-reservation-btn"
                          onClick={() => handleDeleteSpaceBlock(block.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
              </>
            )}
            {vista === "adminConfiguracion" && (
              <>
                <div className="admin-section-title">
                  Configuración de reservas
                </div>

                <div className="admin-config-subtitle">
                  Estos límites afectan las reservas realizadas desde web y móvil.
                </div>

                {settingsError && (
                  <div className="form-message form-message-error">
                    {settingsError}
                  </div>
                )}

                {settingsMessage && (
                  <div className="form-message form-message-success">
                    {settingsMessage}
                  </div>
                )}

                {loadingSettings && (
                  <div className="empty-card">Cargando configuración...</div>
                )}

                {!loadingSettings && (
                  <>
                    <div className="settings-card">
                      <h3>Anticipación máxima para reservar</h3>
                      <p>Cantidad máxima de días hacia adelante que un usuario puede reservar.</p>

                      <div className="settings-current">
                        <strong>Valor actual</strong>
                        <span>{reservationSettings.reservation_max_advance_days} días</span>
                      </div>

                      <input
                        type="number"
                        min="1"
                        value={reservationSettings.reservation_max_advance_days}
                        onChange={(e) =>
                          setReservationSettings({
                            ...reservationSettings,
                            reservation_max_advance_days: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="settings-card">
                      <h3>Plazo mínimo para cancelar</h3>
                      <p>
                        Cantidad mínima de días antes de la reserva para cancelar sin advertencia.
                      </p>

                      <div className="settings-current">
                        <strong>Valor actual</strong>
                        <span>{reservationSettings.cancel_deadline_days} días</span>
                      </div>

                      <input
                        type="number"
                        min="0"
                        value={reservationSettings.cancel_deadline_days}
                        onChange={(e) =>
                          setReservationSettings({
                            ...reservationSettings,
                            cancel_deadline_days: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="settings-card">
                      <h3>Límite semanal de reservas</h3>
                      <p>Cantidad máxima de reservas que un usuario puede hacer por semana.</p>

                      <div className="settings-current">
                        <strong>Valor actual</strong>
                        <span>{reservationSettings.reservation_weekly_limit}</span>
                      </div>

                      <input
                        type="number"
                        min="1"
                        value={reservationSettings.reservation_weekly_limit}
                        onChange={(e) =>
                          setReservationSettings({
                            ...reservationSettings,
                            reservation_weekly_limit: e.target.value,
                          })
                        }
                      />
                    </div>

                    <button
                      type="button"
                      className="settings-save-btn"
                      onClick={guardarReservationSettings}
                      disabled={loadingSettings}
                    >
                      Guardar configuración
                    </button>

                    {/* Configuración de Subdivisiones */}
                    <div style={{ marginTop: '40px', borderTop: '2px solid #eaedf3', paddingTop: '30px' }}>
                      <div className="admin-section-title">
                        Subdivisión de bloques por fecha
                      </div>
                      <div className="admin-config-subtitle">
                        Configura en cuántas partes dividir los bloques base de 90 minutos para una fecha específica.
                      </div>

                      {configsError && (
                        <div className="form-message form-message-error">
                          {configsError}
                        </div>
                      )}

                      {configsMessage && (
                        <div className="form-message form-message-success">
                          {configsMessage}
                        </div>
                      )}

                      <div className="settings-card" style={{ marginBottom: '20px' }}>
                        <h3>Seleccionar fecha de aplicación</h3>
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #dcdfe6', marginTop: '10px' }}
                        />
                      </div>

                      <div className="settings-card">
                        <h3>Número de divisiones</h3>
                        <p>Selecciona en cuántos sub-bloques dividir los horarios de la fecha seleccionada:</p>
                        
                        <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                          {[1, 2, 3, 4].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => guardarBlockConfig(num)}
                              disabled={loadingConfigs}
                              style={{
                                flex: 1,
                                padding: '12px 20px',
                                border: '1px solid #0059e9',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                backgroundColor: '#fff',
                                color: '#0059e9',
                                fontWeight: '700',
                                transition: 'all 0.2s',
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#0059e9';
                                e.currentTarget.style.color = '#fff';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#fff';
                                e.currentTarget.style.color = '#0059e9';
                              }}
                            >
                              {num} {num === 1 ? 'Original' : `${num} Divs`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Historial de configuraciones */}
                      <div className="settings-card" style={{ marginTop: '20px' }}>
                        <h3>Configuraciones existentes</h3>
                        {loadingConfigs ? (
                          <p>Cargando configuraciones...</p>
                        ) : blockConfigs.length === 0 ? (
                          <p style={{ fontStyle: 'italic', color: '#909399' }}>No hay subdivisiones configuradas. Todos los días usan el formato original (1 división).</p>
                        ) : (
                          <div style={{ marginTop: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #eaedf3', textAlign: 'left' }}>
                                  <th style={{ padding: '8px 0', color: '#909399' }}>Fecha</th>
                                  <th style={{ padding: '8px 0', color: '#909399' }}>Divisiones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {blockConfigs.map((config, index) => (
                                  <tr key={index} style={{ borderBottom: '1px solid #f2f6fc' }}>
                                    <td style={{ padding: '8px 0', fontWeight: '500' }}>{config.effectiveDate}</td>
                                    <td style={{ padding: '8px 0' }}>
                                      <span style={{
                                        backgroundColor: config.divisions > 1 ? '#fff9e6' : '#e6eef8',
                                        color: config.divisions > 1 ? '#ff9800' : '#0059e9',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontWeight: 'bold',
                                        fontSize: '12px'
                                      }}>
                                        {config.divisions} {config.divisions === 1 ? 'división' : 'divisiones'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
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
