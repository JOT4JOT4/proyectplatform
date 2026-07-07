export interface Reserva {
  id: string;
  title: string;
  details: string;
  description?: string;
  date?: string; // ISO date yyyy-mm-dd
  slot?: string; // time slot code e.g. A, B, C
  area?: string; // area name
  tipo?: string; // type of room
  children?: Reserva[];
}

export type HistorialReserva = {
  id: string;
  title: string;
  status: string;
};

export type BackendUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string | null;
  role: string;
  maxWeeklyReservations?: number | null;
};

export type UserPenalty = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt?: string;
};

export type UserWarning = {
  id: string;
  date: string;
  reason: string;
};

export type AuthExchangeResponse = {
  message: string;
  access_token: string;
  user: BackendUser;
};

export type AdminSetting = {
  id: string;
  key: string;
  value: string;
  createdAt?: string;
};

export type Space = {
  id: string;
  name: string;
  zone: string;
  type: string;
  description?: string | null;
  imageUrl?: string | null;
  capacity?: number;
  allowedTimeSlots?: string[];
  isActive?: boolean;
  createdAt?: string;
  subspaces?: Space[];
};

export type SpacesResponse = {
  data: Space[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
};

export type OccupiedSlot = {
  startTime: string;
  endTime: string;
};

type DivisionSlot = {
  startTime: string;
  endTime: string;
};

export type SpaceAvailability = {
  spaceId: string;
  date: string;
  timezone: string;
  ocupiedSlots: OccupiedSlot[];
  divisions?: DivisionSlot[]; 
};

export type ReservationRecord = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'active' | 'obsolete' | 'cancelled' | 'completed';
  createdAt?: string;
  space?: Space;
  user?: BackendUser;
};
