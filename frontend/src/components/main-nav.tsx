"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ENDPOINTS } from "@/config/api"
import { getMediaUrl } from "@/config/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, User } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Appointments", href: "/appointments" },
  { name: "Doctors", href: "/doctors" },
]

interface UserData {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  avatar?: string
}

export function MainNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem("token")
      const storedUser = localStorage.getItem("user")
      setIsLoggedIn(!!token)
      if (storedUser) {
        setUserData(JSON.parse(storedUser))
      }
    }

    checkAuthStatus()
    window.addEventListener("storage", checkAuthStatus)

    return () => {
      window.removeEventListener("storage", checkAuthStatus)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await fetch(ENDPOINTS.logout, {
        method: "POST",
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      })
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      setIsLoggedIn(false)
      setUserData(null)
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const getInitials = (user: UserData) => {
    return (
      `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() ||
      user.username?.[0]?.toUpperCase() ||
      "U"
    )
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              Medical App
            </Link>
            <div className="ml-10 flex items-center space-x-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn && userData ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
  <AvatarImage src={getMediaUrl(userData?.avatar)} alt={userData?.username} />
  <AvatarFallback>{getInitials(userData)}</AvatarFallback>
</Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{`${userData.first_name} ${userData.last_name}`}</p>
                        <p className="text-xs leading-none text-muted-foreground">{userData.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login" passHref>
                  <Button variant="ghost" className="mr-2">
                    Login
                  </Button>
                </Link>
                <Link href="/register" passHref>
                  <Button>Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

