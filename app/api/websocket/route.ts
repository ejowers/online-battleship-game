import type { NextRequest } from "next/server"
import { WebSocket } from "ws"

export interface GameRoom {
  id: string
  players: { id: string; name: string; ready: boolean }[]
  gameState: {
    phase: "waiting" | "setup" | "battle" | "finished"
    currentPlayer: 1 | 2
    winner: 1 | 2 | null
    player1Board: any[][]
    player2Board: any[][]
    player1Ships: any[]
    player2Ships: any[]
  }
}

// In-memory storage for game rooms (in production, use Redis or database)
const gameRooms = new Map<string, GameRoom>()
const playerConnections = new Map<string, WebSocket>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const playerId = searchParams.get("playerId")
  const playerName = searchParams.get("playerName") || "Anonymous"

  if (!playerId) {
    return new Response("Missing playerId", { status: 400 })
  }

  const socket = new WebSocket()
  const response = new Response()

  socket.onopen = () => {
    console.log(`Player ${playerId} connected`)
    playerConnections.set(playerId, socket)

    // Try to find or create a game room
    let room = findAvailableRoom()
    if (!room) {
      room = createGameRoom()
    }

    // Add player to room
    if (room.players.length < 2) {
      room.players.push({ id: playerId, name: playerName, ready: false })

      // Notify all players in room
      broadcastToRoom(room.id, {
        type: "ROOM_UPDATE",
        room: room,
      })

      // If room is full, start setup phase
      if (room.players.length === 2) {
        room.gameState.phase = "setup"
        broadcastToRoom(room.id, {
          type: "GAME_START",
          room: room,
        })
      }
    }
  }

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)
      handleMessage(playerId, message)
    } catch (error) {
      console.error("Error parsing message:", error)
    }
  }

  socket.onclose = () => {
    console.log(`Player ${playerId} disconnected`)
    playerConnections.delete(playerId)
    handlePlayerDisconnect(playerId)
  }

  return response
}

function findAvailableRoom(): GameRoom | null {
  for (const room of gameRooms.values()) {
    if (room.players.length < 2 && room.gameState.phase === "waiting") {
      return room
    }
  }
  return null
}

function createGameRoom(): GameRoom {
  const roomId = Math.random().toString(36).substring(2, 15)
  const room: GameRoom = {
    id: roomId,
    players: [],
    gameState: {
      phase: "waiting",
      currentPlayer: 1,
      winner: null,
      player1Board: Array(10)
        .fill(null)
        .map(() =>
          Array(10)
            .fill(null)
            .map(() => ({ hasShip: false, isHit: false, isMiss: false })),
        ),
      player2Board: Array(10)
        .fill(null)
        .map(() =>
          Array(10)
            .fill(null)
            .map(() => ({ hasShip: false, isHit: false, isMiss: false })),
        ),
      player1Ships: [
        { id: "carrier", size: 5, placed: false },
        { id: "battleship", size: 4, placed: false },
        { id: "cruiser", size: 4, placed: false },
        { id: "submarine", size: 3, placed: false },
        { id: "destroyer", size: 2, placed: false },
      ],
      player2Ships: [
        { id: "carrier", size: 5, placed: false },
        { id: "battleship", size: 4, placed: false },
        { id: "cruiser", size: 4, placed: false },
        { id: "submarine", size: 3, placed: false },
        { id: "destroyer", size: 2, placed: false },
      ],
    },
  }

  gameRooms.set(roomId, room)
  return room
}

function handleMessage(playerId: string, message: any) {
  const room = findRoomByPlayerId(playerId)
  if (!room) return

  const playerIndex = room.players.findIndex((p) => p.id === playerId)
  if (playerIndex === -1) return

  switch (message.type) {
    case "SHIP_PLACEMENT":
      handleShipPlacement(room, playerIndex + 1, message.data)
      break
    case "PLAYER_READY":
      handlePlayerReady(room, playerIndex)
      break
    case "ATTACK":
      handleAttack(room, playerIndex + 1, message.data)
      break
    case "RESET_GAME":
      handleGameReset(room)
      break
  }
}

function handleShipPlacement(room: GameRoom, playerNumber: 1 | 2, data: any) {
  const { shipId, row, col, orientation } = data
  const ships = playerNumber === 1 ? room.gameState.player1Ships : room.gameState.player2Ships
  const board = playerNumber === 1 ? room.gameState.player1Board : room.gameState.player2Board

  const ship = ships.find((s) => s.id === shipId)
  if (!ship || ship.placed) return

  // Validate placement
  if (!isValidPlacement(board, row, col, ship.size, orientation)) return

  // Update ship
  ship.placed = true
  ship.position = { row, col }
  ship.orientation = orientation

  // Update board
  for (let i = 0; i < ship.size; i++) {
    const cellRow = orientation === "horizontal" ? row : row + i
    const cellCol = orientation === "horizontal" ? col + i : col
    board[cellRow][cellCol] = { ...board[cellRow][cellCol], hasShip: true, shipId }
  }

  broadcastToRoom(room.id, {
    type: "SHIP_PLACED",
    playerNumber,
    room: room,
  })
}

function handlePlayerReady(room: GameRoom, playerIndex: number) {
  room.players[playerIndex].ready = true

  // Check if both players are ready
  if (room.players.every((p) => p.ready) && room.gameState.phase === "setup") {
    room.gameState.phase = "battle"
    room.gameState.currentPlayer = 1
  }

  broadcastToRoom(room.id, {
    type: "PLAYER_READY_UPDATE",
    room: room,
  })
}

function handleAttack(room: GameRoom, attackingPlayer: 1 | 2, data: any) {
  if (room.gameState.currentPlayer !== attackingPlayer) return

  const { row, col } = data
  const targetBoard = attackingPlayer === 1 ? room.gameState.player2Board : room.gameState.player1Board
  const targetShips = attackingPlayer === 1 ? room.gameState.player2Ships : room.gameState.player1Ships

  const cell = targetBoard[row][col]
  if (cell.isHit || cell.isMiss) return

  if (cell.hasShip) {
    cell.isHit = true

    // Check for win condition
    const allShipsSunk = targetShips.every((ship) => {
      if (!ship.position) return true

      for (let i = 0; i < ship.size; i++) {
        const cellRow = ship.orientation === "horizontal" ? ship.position.row : ship.position.row + i
        const cellCol = ship.orientation === "horizontal" ? ship.position.col + i : ship.position.col
        if (!targetBoard[cellRow][cellCol].isHit) return false
      }
      return true
    })

    if (allShipsSunk) {
      room.gameState.winner = attackingPlayer
      room.gameState.phase = "finished"
    }
  } else {
    cell.isMiss = true
  }

  // Switch turns
  room.gameState.currentPlayer = attackingPlayer === 1 ? 2 : 1

  broadcastToRoom(room.id, {
    type: "ATTACK_RESULT",
    room: room,
    attack: { row, col, hit: cell.hasShip },
  })
}

function handleGameReset(room: GameRoom) {
  // Reset game state
  room.gameState = {
    phase: "setup",
    currentPlayer: 1,
    winner: null,
    player1Board: Array(10)
      .fill(null)
      .map(() =>
        Array(10)
          .fill(null)
          .map(() => ({ hasShip: false, isHit: false, isMiss: false })),
      ),
    player2Board: Array(10)
      .fill(null)
      .map(() =>
        Array(10)
          .fill(null)
          .map(() => ({ hasShip: false, isHit: false, isMiss: false })),
      ),
    player1Ships: [
      { id: "carrier", size: 5, placed: false },
      { id: "battleship", size: 4, placed: false },
      { id: "cruiser", size: 4, placed: false },
      { id: "submarine", size: 3, placed: false },
      { id: "destroyer", size: 2, placed: false },
    ],
    player2Ships: [
      { id: "carrier", size: 5, placed: false },
      { id: "battleship", size: 4, placed: false },
      { id: "cruiser", size: 4, placed: false },
      { id: "submarine", size: 3, placed: false },
      { id: "destroyer", size: 2, placed: false },
    ],
  }

  room.players.forEach((p) => (p.ready = false))

  broadcastToRoom(room.id, {
    type: "GAME_RESET",
    room: room,
  })
}

function findRoomByPlayerId(playerId: string): GameRoom | null {
  for (const room of gameRooms.values()) {
    if (room.players.some((p) => p.id === playerId)) {
      return room
    }
  }
  return null
}

function broadcastToRoom(roomId: string, message: any) {
  const room = gameRooms.get(roomId)
  if (!room) return

  room.players.forEach((player) => {
    const socket = playerConnections.get(player.id)
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  })
}

function handlePlayerDisconnect(playerId: string) {
  const room = findRoomByPlayerId(playerId)
  if (!room) return

  // Remove player from room
  room.players = room.players.filter((p) => p.id !== playerId)

  // If room is empty, delete it
  if (room.players.length === 0) {
    gameRooms.delete(room.id)
  } else {
    // Notify remaining players
    broadcastToRoom(room.id, {
      type: "PLAYER_DISCONNECTED",
      room: room,
    })
  }
}

function isValidPlacement(board: any[][], row: number, col: number, size: number, orientation: string): boolean {
  for (let i = 0; i < size; i++) {
    const cellRow = orientation === "horizontal" ? row : row + i
    const cellCol = orientation === "horizontal" ? col + i : col

    if (cellRow >= 10 || cellCol >= 10 || board[cellRow][cellCol].hasShip) {
      return false
    }
  }
  return true
}
