"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState("")
  const [guestName, setGuestName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAnonymous = searchParams.get("anonymous") === "true"

  useEffect(() => {
    // If not anonymous and no token, redirect to login
    if (!isAnonymous && !localStorage.getItem("token")) {
      router.push("/login")
    }
  }, [isAnonymous, router])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomCode.trim()) return

    setIsLoading(true)

    try {
      // For anonymous users, we need to create a temporary session
      if (isAnonymous) {
        if (!guestName.trim()) {
          toast({
            title: "Error",
            description: "Please enter a guest name",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }

        // Create anonymous session
        const anonResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/anonymous`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: guestName }),
        })

        if (!anonResponse.ok) {
          throw new Error("Failed to create anonymous session")
        }

        const anonData = await anonResponse.json()
        localStorage.setItem("tempToken", anonData.token)
        localStorage.setItem("isGuest", "true")
      }

      // Verify room exists
      const token = isAnonymous ? localStorage.getItem("tempToken") : localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rooms/verify/${roomCode}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Invalid room code or room does not exist")
      }

      // Redirect to the room
      router.push(`/rooms/${roomCode}`)
    } catch (error) {
      console.error("Error joining room:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join room",
        variant: "destructive",
      })

      // Clean up temporary tokens if there was an error
      if (isAnonymous) {
        localStorage.removeItem("tempToken")
        localStorage.removeItem("isGuest")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{isAnonymous ? "Join as Guest" : "Join Room"}</CardTitle>
          <CardDescription>Enter a room code to join an existing drawing session</CardDescription>
        </CardHeader>
        <form onSubmit={handleJoin}>
          <CardContent className="space-y-4">
            {isAnonymous && (
              <div className="space-y-2">
                <Label htmlFor="guest-name">Your Name</Label>
                <Input
                  id="guest-name"
                  placeholder="Enter your display name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="room-code">Room Code</Label>
              <Input
                id="room-code"
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Joining..." : "Join Room"}
            </Button>
            <div className="text-center text-sm">
              <Button variant="link" onClick={() => router.push(isAnonymous ? "/login" : "/")} className="p-0">
                {isAnonymous ? "Login instead" : "Back to home"}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

