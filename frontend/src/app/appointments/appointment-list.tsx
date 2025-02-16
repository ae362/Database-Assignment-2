"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Appointment } from "@/types"
import { ENDPOINTS } from "@/config/api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { fetchWithAuth } from "@/utils/api"
import { useAuth } from "@/hooks/useAuth"

export function AppointmentList() {
  const router = useRouter()
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const { isAuthenticated, isLoading: authIsLoading } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      fetchAppointments()
    }
  }, [isAuthenticated])

  async function fetchAppointments() {
    try {
      const response = await fetchWithAuth(ENDPOINTS.appointments())
      if (!response.ok) throw new Error("Failed to fetch appointments")
      const data = await response.json()
      setAppointments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  async function cancelAppointment(id: number) {
    setIsLoading(true)
    setCancellingId(id)
    try {
      const response = await fetchWithAuth(`${ENDPOINTS.appointments(id)}cancel/`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel appointment")
      }

      setAppointments((current) => current.filter((apt) => apt.id !== id))

      toast({
        title: "Success",
        description: "Appointment cancelled successfully",
      })
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel appointment",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setCancellingId(null)
    }
  }

  if (authIsLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return null
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/15 p-4">
        <div className="text-sm text-destructive">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Doctor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => (
            <TableRow key={appointment.id}>
              <TableCell>{appointment.doctor_name}</TableCell>
              <TableCell>{format(new Date(appointment.date), "PPp")}</TableCell>
              <TableCell className="max-w-[300px] truncate">{appointment.notes}</TableCell>
              <TableCell>
                <Badge variant="default">{appointment.status}</Badge>
              </TableCell>
              <TableCell>
                {appointment.status === "scheduled" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isLoading && cancellingId === appointment.id}>
                        {isLoading && cancellingId === appointment.id ? "Cancelling..." : "Cancel"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel this appointment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>No, keep appointment</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => cancelAppointment(appointment.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Yes, cancel appointment
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

