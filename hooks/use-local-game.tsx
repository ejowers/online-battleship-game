"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import type { Ship, Cell, GamePhase } from "@/app/page"

interface Player {
  id: string
  name: string
  ready: boolean
}

interface GameState {
  phase: GamePhase
  currentPlayer: 1 | 2
  winner: 1 | 2 | null
  player1Board: Cell[][]
  player2Board: Cell[][]
  player1Ships: Ship[]
  player2Ships: Ship[]
}

interface LocalGameContextType {
  players: [Player | null, Player | null]
  gameState: GameState
  currentPlayerNumber: 1 | 2
  addPlayer: (name: string) => number
  setPlayerReady: (playerNumber: 1 | 2) => void
  placeShip: (
    playerNumber: 1 | 2,
    shipId: string,
    row: number,
    col: number,
    orientation: "horizontal" | "vertical",
  ) => void
  attack: (row: number, col: number) => void
  resetGame: () => void
  startGame: () => void
}

const LocalGameContext = createContext<LocalGameContextType | null>(null)

const createEmptyBoard = (): Cell[][] => {
  return Array(10)
    .fill(null)
    .map(() =>
      Array(10)
        .fill(null)
        .map(() => ({
          hasShip: false,
          isHit: false,
          shipId: null,
        })),
    )
}

const createDefaultShips = (): Ship[] => [
  { id: "carrier", size: 5, placed: false, sunk: false },
  { id: "battleship", size: 4, placed: false, sunk: false },
  { id: "cruiser", size: 4, placed: false, sunk: false },
  { id: "submarine", size: 3, placed: false, sunk: false },
  { id: "destroyer", size: 2, placed: false, sunk: false },
]

export function LocalGameProvider({ children }: { children: React.ReactNode }) {
  const [players, setPlayers] = useState<[Player | null, Player | null]>([null, null])
  const [gameState, setGameState] = useState<GameState>({
    phase: "waiting",
    currentPlayer: 1,
    winner: null,
    player1Board: createEmptyBoard(),
    player2Board: createEmptyBoard(),
    player1Ships: createDefaultShips(),
    player2Ships: createDefaultShips(),
  })
  const [currentPlayerNumber, setCurrentPlayerNumber] = useState<1 | 2>(1)

  const addPlayer = useCallback((name: string): number => {
    let playerNumber = 0
    setPlayers((prev) => {
      if (!prev[0]) {
        playerNumber = 1
        return [{ id: Math.random().toString(36), name, ready: false }, prev[1]]
      } else if (!prev[1]) {
        playerNumber = 2
        return [prev[0], { id: Math.random().toString(36), name, ready: false }]
      }
      return prev
    })
    return playerNumber
  }, [])

  const setPlayerReady = useCallback((playerNumber: 1 | 2) => {
    setPlayers((prev) => {
      const newPlayers: [Player | null, Player | null] = [...prev]
      if (newPlayers[playerNumber - 1]) {
        newPlayers[playerNumber - 1] = { ...newPlayers[playerNumber - 1]!, ready: true }
      }
      return newPlayers
    })
  }, [])

  const placeShip = useCallback(
    (playerNumber: 1 | 2, shipId: string, row: number, col: number, orientation: "horizontal" | "vertical") => {
      setGameState((prev) => {
        const newState = { ...prev }
        const board = playerNumber === 1 ? newState.player1Board : newState.player2Board
        const ships = playerNumber === 1 ? newState.player1Ships : newState.player2Ships

        const ship = ships.find((s) => s.id === shipId)
        if (!ship) return prev

        // Clear previous placement
        for (let r = 0; r < 10; r++) {
          for (let c = 0; c < 10; c++) {
            if (board[r][c].shipId === shipId) {
              board[r][c].hasShip = false
              board[r][c].shipId = null
            }
          }
        }

        // Check if placement is valid
        const cells: [number, number][] = []
        for (let i = 0; i < ship.size; i++) {
          const newRow = orientation === "horizontal" ? row : row + i
          const newCol = orientation === "horizontal" ? col + i : col

          if (newRow >= 10 || newCol >= 10 || board[newRow][newCol].hasShip) {
            return prev // Invalid placement
          }
          cells.push([newRow, newCol])
        }

        // Place ship
        cells.forEach(([r, c]) => {
          board[r][c].hasShip = true
          board[r][c].shipId = shipId
        })

        ship.placed = true

        // Check if all ships are placed
        const allShipsPlaced = ships.every((s) => s.placed)
        if (allShipsPlaced && playerNumber === 1) {
          setCurrentPlayerNumber(2)
        } else if (allShipsPlaced && playerNumber === 2) {
          // Both players have placed all ships
          if (prev.player1Ships.every((s) => s.placed)) {
            newState.phase = "battle"
            setCurrentPlayerNumber(1)
          }
        }

        return newState
      })
    },
    [],
  )

  const attack = useCallback((row: number, col: number) => {
    setGameState((prev) => {
      if (prev.phase !== "battle" || prev.winner) return prev

      const newState = { ...prev }
      const targetBoard = prev.currentPlayer === 1 ? newState.player2Board : newState.player1Board
      const targetShips = prev.currentPlayer === 1 ? newState.player2Ships : newState.player1Ships

      const cell = targetBoard[row][col]
      if (cell.isHit) return prev // Already attacked

      cell.isHit = true

      if (cell.hasShip && cell.shipId) {
        // Check if ship is sunk
        const ship = targetShips.find((s) => s.id === cell.shipId)
        if (ship) {
          const shipCells = targetBoard.flat().filter((c) => c.shipId === cell.shipId)
          const allHit = shipCells.every((c) => c.isHit)
          if (allHit) {
            ship.sunk = true
          }
        }

        // Check for win condition
        const allShipsSunk = targetShips.every((s) => s.sunk)
        if (allShipsSunk) {
          newState.winner = prev.currentPlayer
          newState.phase = "ended"
        }
      }

      // Switch turns
      newState.currentPlayer = prev.currentPlayer === 1 ? 2 : 1
      setCurrentPlayerNumber(newState.currentPlayer)

      return newState
    })
  }, [])

  const startGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, phase: "placement" }))
    setCurrentPlayerNumber(1)
  }, [])

  const resetGame = useCallback(() => {
    setGameState({
      phase: "waiting",
      currentPlayer: 1,
      winner: null,
      player1Board: createEmptyBoard(),
      player2Board: createEmptyBoard(),
      player1Ships: createDefaultShips(),
      player2Ships: createDefaultShips(),
    })
    setPlayers([null, null])
    setCurrentPlayerNumber(1)
  }, [])

  const value: LocalGameContextType = {
    players,
    gameState,
    currentPlayerNumber,
    addPlayer,
    setPlayerReady,
    placeShip,
    attack,
    resetGame,
    startGame,
  }

  return <LocalGameContext.Provider value={value}>{children}</LocalGameContext.Provider>
}

export function useLocalGame() {
  const context = useContext(LocalGameContext)
  if (!context) {
    throw new Error("useLocalGame must be used within a LocalGameProvider")
  }
  return context
}
