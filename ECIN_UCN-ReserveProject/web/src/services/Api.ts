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

export type SpaceBlockPayload = {
  spaceId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason: string;
};

export async function createSpaceBlock(data: SpaceBlockPayload) {
  return apiRequest("/reservations/blocks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSpaceBlocks() {
  return apiRequest("/reservations/blocks");
}

export async function deleteSpaceBlock(id: string) {
  return apiRequest(`/reservations/blocks/${id}`, {
    method: "DELETE",
  });
}

export type ReservationSetting = {
  id?: string;
  key: string;
  value: string;
};

export async function getReservationSettings(): Promise<ReservationSetting[]> {
  return apiRequest("/reservations/settings");
}

export async function saveReservationSetting(
  key: string,
  value: string,
): Promise<ReservationSetting> {
  return apiRequest("/reservations/settings", {
    method: "POST",
    body: JSON.stringify({
      key,
      value,
    }),
  });
}

export async function createBlockConfig(effectiveDate: string, divisions: number) {
  return apiRequest("/reservations/block-config", {
    method: "POST",
    body: JSON.stringify({ effectiveDate, divisions }),
  });
}

export async function getBlockConfigs() {
  return apiRequest("/reservations/block-config");
}