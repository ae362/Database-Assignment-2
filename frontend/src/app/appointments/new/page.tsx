"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ENDPOINTS } from "@/config/api"
import type { Doctor } from "@/types"
import { fetchWithAuth } from "@/utils/api"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"

interface TimeSlot {
  time: string
  is_available: boolean
}

export default function NewAppointment() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, isLoading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedDoctor, setSelectedDoctor] = useState<string>("")
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchDoctors()
    }
  }, [isAuthenticated])

  async function fetchDoctors() {
    try {
      const response = await fetchWithAuth(ENDPOINTS.doctors())
      const data = await response.json()
      setDoctors(data)
    } catch (error) {
      console.error("Error:", error)
      setError("Failed to load doctors data")
    }
  }

  useEffect(() => {
    async function fetchAvailableSlots() {
      if (!selectedDoctor || !selectedDate) return

      try {
        const response = await fetchWithAuth(
          `${ENDPOINTS.appointments()}available_slots/?doctor_id=${selectedDoctor}&date=${format(selectedDate, "yyyy-MM-dd")}`,
        )

        if (!response.ok) {
          throw new Error("Failed to fetch available slots")
        }

        const data = await response.json()
        setAvailableSlots(data)
      } catch (error) {
        console.error("Error:", error)
        setError("Failed to load available time slots")
      }
    }

    fetchAvailableSlots()
  }, [selectedDoctor, selectedDate])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!selectedDate || !selectedTime || !selectedDoctor) {
      setError("Please fill in all required fields")
      setIsSubmitting(false)
      return
    }

    const appointmentData = {
      doctor: Number.parseInt(selectedDoctor),
      date: `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`,
      notes: notes,
    }

    try {
      const response = await fetchWithAuth(ENDPOINTS.appointments(), {
        method: "POST",
        body: JSON.stringify(appointmentData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create appointment")
      }

      toast({
        title: "Success",
        description: "Appointment created successfully",
      })

      router.push("/appointments")
      router.refresh()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create appointment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Schedule New Appointment</h1>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="doctor">Doctor</Label>
          <Select
            name="doctor"
            required
            onValueChange={(value) => {
              setSelectedDoctor(value)
              setSelectedTime("")
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id.toString()}>
                  Dr. {doctor.name} - {doctor.specialization}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date</Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date)
              setSelectedTime("")
            }}
            disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
            className="rounded-md border"
          />
        </div>

        {selectedDate && selectedDoctor && (
          <div className="space-y-2">
            <Label>Available Time Slots</Label>
            <div className="grid grid-cols-4 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot.time}
                  type="button"
                  variant={selectedTime === slot.time ? "default" : "outline"}
                  className={cn("w-full", !slot.is_available && "bg-muted text-muted-foreground cursor-not-allowed")}
                  disabled={!slot.is_available}
                  onClick={() => setSelectedTime(slot.time)}
                >
                  {slot.time}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-4">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting || !selectedTime}>
          {isSubmitting ? "Scheduling..." : "Schedule Appointment"}
        </Button>
      </form>
    </div>
  )
}

