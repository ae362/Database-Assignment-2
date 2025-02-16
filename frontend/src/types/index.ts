export interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  medical_history: string;
  allergies: string;
  medications: string;
}

export interface Doctor {
  id: number
  name: string
  specialization: string
  email: string
  phone: string
}

export interface Appointment {
  id: number
  patient: number
  patient_name: string
  doctor: number
  doctor_name: string
  date: string
  notes: string
  status: "scheduled" | "completed" | "cancelled"
}

