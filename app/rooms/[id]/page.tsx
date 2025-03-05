"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Square, Circle, Minus, TextCursorIcon as Cursor, Undo, Redo, Save, Users, ArrowLeft } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HexColorPicker } from "@/components/color-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type ShapeType = "rectangle" | "circle" | "line" | "cursor"
type CursorPosition = { x: number; y: number; userId: string; userName: string; color: string }

interface User {
  id: string
  name: string
  color: string
}

interface Shape {
  id: string
  type: ShapeType
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  userId: string
}

export default function DrawingRoom() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShape, setCurrentShape] = useState<ShapeType>("rectangle")
  const [color, setColor] = useState("#000000")
  const [shapes, setShapes] = useState<Shape[]>([])
  const [undoStack, setUndoStack] = useState<Shape[][]>([])
  const [redoStack, setRedoStack] = useState<Shape[][]>([])
  const [cursors, setCursors] = useState<CursorPosition[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 })

  const userId = useRef<string>("")
  const userName = useRef<string>("")

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("tempToken")
    if (!token) {
      router.push("/login")
      return
    }

    // Get user info
    const userInfo = localStorage.getItem("user")
    if (userInfo) {
      const user = JSON.parse(userInfo)
      userId.current = user.id
      userName.current = user.name
    } else if (localStorage.getItem("isGuest") === "true") {
      // For guests, we'll get their info from the server
      userId.current = "guest-" + Math.random().toString(36).substring(2, 9)
      userName.current = "Guest"
    } else {
      router.push("/login")
      return
    }

    // Connect to WebSocket server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${process.env.NEXT_PUBLIC_WS_HOST}/ws/rooms/${roomId}?token=${token}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      toast({
        title: "Connected",
        description: "You are now connected to the drawing room",
      })
    }

    ws.onclose = () => {
      setIsConnected(false)
      toast({
        title: "Disconnected",
        description: "Connection to the drawing room was lost",
        variant: "destructive",
      })
    }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to the drawing room",
        variant: "destructive",
      })
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case "init":
          setShapes(data.shapes || [])
          setUsers(data.users || [])
          // Set our color from the server
          const currentUser = data.users.find((u: User) => u.id === userId.current)
          if (currentUser) {
            setColor(currentUser.color)
          }
          break

        case "cursor_update":
          setCursors((prev) => {
            const filtered = prev.filter((c) => c.userId !== data.cursor.userId)
            return [...filtered, data.cursor]
          })
          break

        case "shape_add":
          setShapes((prev) => [...prev, data.shape])
          break

        case "shapes_update":
          setShapes(data.shapes)
          break

        case "user_join":
          setUsers((prev) => [...prev, data.user])
          toast({
            title: "User Joined",
            description: `${data.user.name} has joined the room`,
          })
          break

        case "user_leave":
          setUsers((prev) => prev.filter((u) => u.id !== data.userId))
          setCursors((prev) => prev.filter((c) => c.userId !== data.userId))
          toast({
            title: "User Left",
            description: `${data.userName} has left the room`,
          })
          break
      }
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }, [roomId, router])

  // Draw all shapes and cursors
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all shapes
    shapes.forEach((shape) => {
      ctx.strokeStyle = shape.color
      ctx.lineWidth = 2

      switch (shape.type) {
        case "rectangle":
          ctx.beginPath()
          ctx.rect(
            Math.min(shape.x1, shape.x2),
            Math.min(shape.y1, shape.y2),
            Math.abs(shape.x2 - shape.x1),
            Math.abs(shape.y2 - shape.y1),
          )
          ctx.stroke()
          break

        case "circle":
          ctx.beginPath()
          const radius = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2))
          ctx.arc(shape.x1, shape.y1, radius, 0, 2 * Math.PI)
          ctx.stroke()
          break

        case "line":
          ctx.beginPath()
          ctx.moveTo(shape.x1, shape.y1)
          ctx.lineTo(shape.x2, shape.y2)
          ctx.stroke()
          break
      }
    })

    // Draw current shape if drawing
    if (isDrawing && currentShape !== "cursor") {
      ctx.strokeStyle = color
      ctx.lineWidth = 2

      switch (currentShape) {
        case "rectangle":
          ctx.beginPath()
          ctx.rect(
            Math.min(startPoint.x, currentPoint.x),
            Math.min(startPoint.y, currentPoint.y),
            Math.abs(currentPoint.x - startPoint.x),
            Math.abs(currentPoint.y - startPoint.y),
          )
          ctx.stroke()
          break

        case "circle":
          ctx.beginPath()
          const radius = Math.sqrt(
            Math.pow(currentPoint.x - startPoint.x, 2) + Math.pow(currentPoint.y - startPoint.y, 2),
          )
          ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI)
          ctx.stroke()
          break

        case "line":
          ctx.beginPath()
          ctx.moveTo(startPoint.x, startPoint.y)
          ctx.lineTo(currentPoint.x, currentPoint.y)
          ctx.stroke()
          break
      }
    }

    // Draw cursors
    cursors.forEach((cursor) => {
      if (cursor.userId === userId.current) return // Don't draw our own cursor

      ctx.fillStyle = cursor.color
      ctx.beginPath()
      ctx.moveTo(cursor.x, cursor.y)
      ctx.lineTo(cursor.x + 15, cursor.y + 5)
      ctx.lineTo(cursor.x + 5, cursor.y + 15)
      ctx.fill()

      // Draw user name
      ctx.font = "12px Arial"
      ctx.fillStyle = cursor.color
      ctx.fillText(cursor.userName, cursor.x + 10, cursor.y - 5)
    })
  }, [shapes, isDrawing, startPoint, currentPoint, currentShape, color, cursors])

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    handleResize() // Initial resize
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Send cursor position updates
  const updateCursorPosition = useCallback(
    (x: number, y: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

      wsRef.current.send(
        JSON.stringify({
          type: "cursor_update",
          cursor: {
            x,
            y,
            userId: userId.current,
            userName: userName.current,
            color,
          },
        }),
      )
    },
    [color],
  )

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentShape === "cursor") return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setStartPoint({ x, y })
    setCurrentPoint({ x, y })
    setIsDrawing(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Always update cursor position
    updateCursorPosition(x, y)

    if (isDrawing && currentShape !== "cursor") {
      setCurrentPoint({ x, y })
    }
  }

  const handleMouseUp = () => {
    if (!isDrawing || currentShape === "cursor") return

    // Save current state for undo
    setUndoStack((prev) => [...prev, shapes])
    setRedoStack([])

    // Create new shape
    const newShape: Shape = {
      id: Date.now().toString(),
      type: currentShape,
      x1: startPoint.x,
      y1: startPoint.y,
      x2: currentPoint.x,
      y2: currentPoint.y,
      color,
      userId: userId.current,
    }

    // Add shape locally
    setShapes((prev) => [...prev, newShape])

    // Send shape to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "shape_add",
          shape: newShape,
        }),
      )
    }

    setIsDrawing(false)
  }

  const handleMouseLeave = () => {
    if (isDrawing) {
      handleMouseUp()
    }
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return

    const prevShapes = undoStack[undoStack.length - 1]
    setRedoStack((prev) => [...prev, shapes])
    setShapes(prevShapes)
    setUndoStack((prev) => prev.slice(0, -1))

    // Send update to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "shapes_update",
          shapes: prevShapes,
        }),
      )
    }
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return

    const nextShapes = redoStack[redoStack.length - 1]
    setUndoStack((prev) => [...prev, shapes])
    setShapes(nextShapes)
    setRedoStack((prev) => prev.slice(0, -1))

    // Send update to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "shapes_update",
          shapes: nextShapes,
        }),
      )
    }
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Create a temporary link
    const link = document.createElement("a")
    link.download = `drawing-${roomId}.png`
    link.href = canvas.toDataURL("image/png")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleBack = () => {
    router.push("/rooms")
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Drawing Room</h1>
          <Badge variant="outline" className="ml-2">
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        <TooltipProvider>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={currentShape}
              onValueChange={(value) => value && setCurrentShape(value as ShapeType)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value="cursor" aria-label="Select cursor">
                    <Cursor className="h-4 w-4" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>Select</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value="rectangle" aria-label="Draw rectangle">
                    <Square className="h-4 w-4" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>Rectangle</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value="circle" aria-label="Draw circle">
                    <Circle className="h-4 w-4" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>Circle</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value="line" aria-label="Draw line">
                    <Minus className="h-4 w-4" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>Line</TooltipContent>
              </Tooltip>
            </ToggleGroup>

            <Separator orientation="vertical" className="h-8" />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-10 h-10 p-0" style={{ backgroundColor: color }}>
                  <span className="sr-only">Pick a color</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <HexColorPicker color={color} onChange={setColor} />
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-8" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleUndo} disabled={undoStack.length === 0}>
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRedo} disabled={redoStack.length === 0}>
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-8" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleSave}>
                  <Save className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save as PNG</TooltipContent>
            </Tooltip>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Users className="h-4 w-4" />
                  <span className="sr-only">Show users</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60">
                <div className="space-y-2">
                  <h3 className="font-medium">Users in this room</h3>
                  <Separator />
                  <div className="max-h-40 overflow-y-auto">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center gap-2 py-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: user.color }} />
                        <span>{user.name}</span>
                        {user.id === userId.current && <span className="text-xs text-muted-foreground">(you)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </TooltipProvider>
      </div>

      <div className="flex-1 relative overflow-hidden bg-slate-50">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
    </div>
  )
}

