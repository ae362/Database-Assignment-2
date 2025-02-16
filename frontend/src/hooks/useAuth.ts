"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ENDPOINTS } from "@/config/api"

interface User {
  id: number
  username: string
  email: string
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem("token")
    const storedUser = localStorage.getItem("user")

    if (token && storedUser) {
      try {
        const response = await fetch(ENDPOINTS.userProfile, {
          headers: {
            Authorization: `Token ${token}`,
          },
        })

        if (response.ok) {
          setUser(JSON.parse(storedUser))
          setIsAuthenticated(true)
        } else {
          throw new Error("Authentication failed")
        }
      } catch (error) {
        console.error("Auth error:", error)
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setIsAuthenticated(false)
        setUser(null)
      }
    } else {
      setIsAuthenticated(false)
      setUser(null)
    }
    setIsLoading(false)
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem("token")
      if (token) {
        await fetch(ENDPOINTS.logout, {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
          },
        })
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      setIsAuthenticated(false)
      setUser(null)
      router.push("/login")
    }
  }

  return {
    isAuthenticated,
    isLoading,
    user,
    logout,
    checkAuth,
  }
}

