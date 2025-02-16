// Base URLs
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
export const FRONTEND_BASE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"
export const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_URL || "http://localhost:8000"
const createResourceUrl = (baseUrl: string, id?: number | string) => {
  return id ? `${baseUrl}${id}/` : baseUrl
}

// API endpoints
export const ENDPOINTS = {
  // Base endpoints with ID support
  users: (id?: number) => createResourceUrl(`${API_BASE_URL}/users/`, id),
  doctors: (id?: number) => createResourceUrl(`${API_BASE_URL}/doctors/`, id),
  appointments: (id?: number) => createResourceUrl(`${API_BASE_URL}/appointments/`, id),

  // Action endpoints
  newAppointment: `${API_BASE_URL}/appointments/new/`,
  newUser: `${API_BASE_URL}/users/new/`,
  newDoctor: `${API_BASE_URL}/doctors/new/`,

  // Auth endpoints
  login: `${API_BASE_URL}/login/`,
  register: `${API_BASE_URL}/register/`,
  logout: `${API_BASE_URL}/logout/`,
  userProfile: `${API_BASE_URL}/profile/`,
  avatarUpload: `${API_BASE_URL}/profile/avatar/`,
}
export const getMediaUrl = (path?: string) => {
  if (!path) return ""
  // If the path is already a full URL, return it as is
  if (path.startsWith("http")) return path
  // Otherwise, combine it with the media base URL
  return `${MEDIA_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}
// Frontend routes
export const ROUTES = {
  appointments: {
    list: "/appointments",
    new: "/appointments/new",
    details: (id: number) => `/appointments/${id}`,
  },
  users: {
    list: "/users",
    new: "/users/new",
    details: (id: number) => `/users/${id}`,
  },
  doctors: {
    list: "/doctors",
    new: "/doctors/new",
    details: (id: number) => `/doctors/${id}`,
  },
  auth: {
    login: "/login",
    register: "/register",
  },
}

