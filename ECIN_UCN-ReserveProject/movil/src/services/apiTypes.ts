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
