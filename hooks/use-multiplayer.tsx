"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { Ship, Cell, GamePhase } from "@/app/page"

interface GameRoom {
  id: string
  players: { id: string; name: string; ready: boolean }[]
  gameState: {
    phase: GamePhase
    currentPlayer: 1 | 2
    winner: 1 | 2 | null
    player1Board: Cell[][]
    player2Board: Cell[][]
    player1Ships: Ship[]
    player2Ships: Ship[]
  }
}

interface MultiplayerContextType {
  isConnected: boolean
  room: GameRoom | null
  playerId: string | null
  playerNumber: 1 | 2 | null
  connect: (playerName: string) => void
  disconnect: () => void
  placeShip: (shipId: string, row: number, col: number, orientation: "horizontal" | "vertical") => void
  setReady: () => void
  attack: (row: number, col: number) => void
  resetGame: () => void
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null)

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [playerId] = useState(() => Math.random().toString(36).substring(2, 15))
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null)

  const connect = useCallback(
    (playerName: string) => {
      if (socket) return

      const wsUrl = `ws://localhost:3000/api/websocket?playerId=${playerId}&playerName=${encodeURIComponent(playerName)}`
      const newSocket = new WebSocket(wsUrl)

      newSocket.onopen = () => {
        console.log("Connected to multiplayer server")
        setIsConnected(true)
      }

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch (error) {
          console.error("Error parsing message:", error)
        }
      }

      newSocket.onclose = () => {
        console.log("Disconnected from multiplayer server")
        setIsConnected(false)
        setSocket(null)
        setRoom(null)
        setPlayerNumber(null)
      }

      newSocket.onerror = (error) => {
        console.error("WebSocket error:", error)
      }

      setSocket(newSocket)
    },
    [playerId, socket],
  )

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close()
    }
  }, [socket])

  const handleMessage = useCallback(
    (message: any) => {
      switch (message.type) {
        case "ROOM_UPDATE":
        case "GAME_START":
        case "SHIP_PLACED":
        case "PLAYER_READY_UPDATE":
        case "ATTACK_RESULT":
        case "GAME_RESET":
          setRoom(message.room)
          // Determine player number
          const playerIndex = message.room.players.findIndex((p: any) => p.id === playerId)
          setPlayerNumber(playerIndex !== -1 ? ((playerIndex + 1) as 1 | 2) : null)
          break
        case "PLAYER_DISCONNECTED":
          setRoom(message.room)
          break
      }
    },
    [playerId],
  )

  const placeShip = useCallback(
    (shipId: string, row: number, col: number, orientation: "horizontal" | "vertical") => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "SHIP_PLACEMENT",
            data: { shipId, row, col, orientation },
          }),
        )
      }
    },
    [socket],
  )

  const setReady = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "PLAYER_READY",
        }),
      )
    }
  }, [socket])

  const attack = useCallback(
    (row: number, col: number) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "ATTACK",
            data: { row, col },
          }),
        )
      }
    },
    [socket],
  )

  const resetGame = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "RESET_GAME",
        }),
      )
    }
  }, [socket])

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close()
      }
    }
  }, [socket])

  const value: MultiplayerContextType = {
    isConnected,
    room,
    playerId,
    playerNumber,
    connect,
    disconnect,
    placeShip,
    setReady,
    attack,
    resetGame,
  }

  return <MultiplayerContext.Provider value={value}>{children}</MultiplayerContext.Provider>
}

export function useMultiplayer() {
  const context = useContext(MultiplayerContext)
  if (!context) {
    throw new Error("useMultiplayer must be used within a MultiplayerProvider")
  }
  return context
}
