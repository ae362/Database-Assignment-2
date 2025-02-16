import { ENDPOINTS } from "@/config/api"

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found")
  }

  const headers = new Headers(options.headers)
  headers.set("Authorization", `Token ${token}`)
  headers.set("Content-Type", "application/json")

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  return response
}

export const getAppointments = async () => {
  const response = await fetchWithAuth(ENDPOINTS.appointments())
  return response.json()
}

export const createAppointment = async (appointmentData: any) => {
  const response = await fetchWithAuth(ENDPOINTS.appointments(), {
    method: "POST",
    body: JSON.stringify(appointmentData),
  })
  return response.json()
}

export const getDoctors = async () => {
    const response = await fetchWithAuth(ENDPOINTS.doctors())
    return response.json()
  }
  
  export const createDoctor = async (doctorData: any) => {
    const response = await fetchWithAuth(ENDPOINTS.doctors(), {
      method: "POST",
      body: JSON.stringify(doctorData),
    })
    return response.json()
  }
  