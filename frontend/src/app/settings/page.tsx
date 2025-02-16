"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { ENDPOINTS } from "@/config/api"
import { fetchWithAuth } from "@/utils/api"

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [language, setLanguage] = useState("en")
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    setMounted(true)
    // Load saved settings from localStorage
    const savedLanguage = localStorage.getItem("language") || "en"
    const savedNotifications = localStorage.getItem("notifications") !== "false"
    setLanguage(savedLanguage)
    setNotifications(savedNotifications)
  }, [])

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light")
  }

  const handleLanguageChange = (value: string) => {
    setLanguage(value)
    localStorage.setItem("language", value)
    // Here you would typically trigger a language change in your i18n setup
  }

  const handleNotificationsChange = (checked: boolean) => {
    setNotifications(checked)
    localStorage.setItem("notifications", checked.toString())
    // Here you would typically update the user's notification preferences on the server
  }

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        const response = await fetchWithAuth(`${ENDPOINTS.users}/me/`, {
          method: "DELETE",
        })

        if (response.ok) {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          toast({
            title: "Account Deleted",
            description: "Your account has been successfully deleted.",
          })
          router.push("/")
        } else {
          throw new Error("Failed to delete account")
        }
      } catch (error) {
        console.error("Error deleting account:", error)
        toast({
          title: "Error",
          description: "Failed to delete account. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage your account settings and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="theme">Dark mode</Label>
              <p className="text-sm text-muted-foreground">Toggle between light and dark mode</p>
            </div>
            <Switch id="theme" checked={theme === "dark"} onCheckedChange={handleThemeChange} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notifications">Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive email notifications for appointments and updates</p>
            </div>
            <Switch id="notifications" checked={notifications} onCheckedChange={handleNotificationsChange} />
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="destructive" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

