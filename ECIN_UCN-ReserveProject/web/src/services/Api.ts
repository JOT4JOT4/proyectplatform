import { getApiUrl } from "../config";

const API_URL = getApiUrl();

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem("access_token");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Error en la solicitud");
  }

  return data;
}

export async function createReservation(data: {
  spaceId: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  return apiRequest("/reservations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getReservationsByUser(userId: string) {
  return apiRequest(`/reservations/user/${userId}`);
}

export type SpacePayload = {
  name: string;
  type: "room" | "table";
  zone: string;
  description: string;
  capacity: number;
  imageUrl?: string;
};

export async function createSpace(data: SpacePayload) {
  return apiRequest("/spaces", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSpace(id: string, data: SpacePayload) {
  return apiRequest(`/spaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSpace(id: string) {
  return apiRequest(`/spaces/${id}`, {
    method: "DELETE",
  });
}