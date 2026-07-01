const API_URL = "https://proyectplatform-production.up.railway.app";

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
