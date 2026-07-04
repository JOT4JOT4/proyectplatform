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
};

export type AuthExchangeResponse = {
  message: string;
  access_token: string;
  user: BackendUser;
};

export type Space = {
  id: string;
  name: string;
  zone: string;
  type: string;
  description?: string | null;
  imageUrl?: string | null;
  capacity?: number;
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

export type SpaceAvailability = {
  spaceId: string;
  date: string;
  timezone: string;
  ocupiedSlots: OccupiedSlot[];
};

export type ReservationRecord = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'active' | 'cancelled' | 'completed';
  createdAt?: string;
  space?: Space;
  user?: BackendUser;
};
