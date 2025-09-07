import type { NextRequest } from "next/server"
import { Server as SocketIOServer } from "socket.io"
import type { Server as HTTPServer } from "http"

// Game state types
interface Ship {
  id: string
  size: number
  positions: { row: number; col: number }[]
  hits: boolean[]
}

interface GameState {
  id: string
  players: {
    [playerId: string]: {
      id: string
      name: string
      ships: Ship[]
      board: ("empty" | "ship" | "hit" | "miss")[][]
      ready: boolean
    }
  }
  currentTurn: string | null
  phase: "waiting" | "setup" | "battle" | "finished"
  winner: string | null
  roomCode?: string
}

const games = new Map<string, GameState>()
const playerToGame = new Map<string, string>()

let io: SocketIOServer

export async function GET(req: NextRequest) {
  if (!io) {
    // @ts-ignore
    const httpServer: HTTPServer = req.socket?.server
    io = new SocketIOServer(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    io.on("connection", (socket) => {
      console.log("[v0] Player connected:", socket.id)

      socket.on("join-quick-match", (playerName: string) => {
        console.log("[v0] Quick match request from:", playerName)
        handleQuickMatch(socket, playerName)
      })

      socket.on("create-room", (playerName: string) => {
        console.log("[v0] Create room request from:", playerName)
        handleCreateRoom(socket, playerName)
      })

      socket.on("join-room", ({ playerName, roomCode }: { playerName: string; roomCode: string }) => {
        console.log("[v0] Join room request:", playerName, roomCode)
        handleJoinRoom(socket, playerName, roomCode)
      })

      socket.on("place-ships", (ships: Ship[]) => {
        console.log("[v0] Ships placed by:", socket.id)
        handlePlaceShips(socket, ships)
      })

      socket.on("attack", ({ row, col }: { row: number; col: number }) => {
        console.log("[v0] Attack from:", socket.id, "at", row, col)
        handleAttack(socket, row, col)
      })

      socket.on("disconnect", () => {
        console.log("[v0] Player disconnected:", socket.id)
        handleDisconnect(socket)
      })
    })
  }

  return new Response("Socket.io server initialized", { status: 200 })
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function createGame(roomCode?: string): GameState {
  const gameId = Math.random().toString(36).substring(2, 15)
  const game: GameState = {
    id: gameId,
    players: {},
    currentTurn: null,
    phase: "waiting",
    winner: null,
    roomCode,
  }
  games.set(gameId, game)
  return game
}

function handleQuickMatch(socket: any, playerName: string) {
  // Find existing game waiting for players
  let game = Array.from(games.values()).find(
    (g) => g.phase === "waiting" && Object.keys(g.players).length === 1 && !g.roomCode,
  )

  if (!game) {
    // Create new game
    game = createGame()
  }

  // Add player to game
  game.players[socket.id] = {
    id: socket.id,
    name: playerName,
    ships: [],
    board: Array(10)
      .fill(null)
      .map(() => Array(10).fill("empty")),
    ready: false,
  }

  playerToGame.set(socket.id, game.id)
  socket.join(game.id)

  if (Object.keys(game.players).length === 2) {
    game.phase = "setup"
    io.to(game.id).emit("game-start", {
      gameId: game.id,
      players: Object.values(game.players).map((p) => ({ id: p.id, name: p.name })),
      phase: game.phase,
    })
  } else {
    socket.emit("waiting-for-opponent")
  }
}

function handleCreateRoom(socket: any, playerName: string) {
  const roomCode = generateRoomCode()
  const game = createGame(roomCode)

  game.players[socket.id] = {
    id: socket.id,
    name: playerName,
    ships: [],
    board: Array(10)
      .fill(null)
      .map(() => Array(10).fill("empty")),
    ready: false,
  }

  playerToGame.set(socket.id, game.id)
  socket.join(game.id)

  socket.emit("room-created", { roomCode, gameId: game.id })
}

function handleJoinRoom(socket: any, playerName: string, roomCode: string) {
  const game = Array.from(games.values()).find((g) => g.roomCode === roomCode)

  if (!game) {
    socket.emit("room-not-found")
    return
  }

  if (Object.keys(game.players).length >= 2) {
    socket.emit("room-full")
    return
  }

  game.players[socket.id] = {
    id: socket.id,
    name: playerName,
    ships: [],
    board: Array(10)
      .fill(null)
      .map(() => Array(10).fill("empty")),
    ready: false,
  }

  playerToGame.set(socket.id, game.id)
  socket.join(game.id)

  game.phase = "setup"
  io.to(game.id).emit("game-start", {
    gameId: game.id,
    players: Object.values(game.players).map((p) => ({ id: p.id, name: p.name })),
    phase: game.phase,
    roomCode,
  })
}

function handlePlaceShips(socket: any, ships: Ship[]) {
  const gameId = playerToGame.get(socket.id)
  if (!gameId) return

  const game = games.get(gameId)
  if (!game || !game.players[socket.id]) return

  game.players[socket.id].ships = ships
  game.players[socket.id].ready = true

  // Update board with ship positions
  const board = Array(10)
    .fill(null)
    .map(() => Array(10).fill("empty"))
  ships.forEach((ship) => {
    ship.positions.forEach((pos) => {
      board[pos.row][pos.col] = "ship"
    })
  })
  game.players[socket.id].board = board

  // Check if both players are ready
  const allReady = Object.values(game.players).every((p) => p.ready)
  if (allReady && Object.keys(game.players).length === 2) {
    game.phase = "battle"
    const playerIds = Object.keys(game.players)
    game.currentTurn = playerIds[Math.floor(Math.random() * playerIds.length)]

    io.to(gameId).emit("battle-start", {
      currentTurn: game.currentTurn,
      players: Object.values(game.players).map((p) => ({ id: p.id, name: p.name })),
    })
  }

  socket.emit("ships-placed")
}

function handleAttack(socket: any, row: number, col: number) {
  const gameId = playerToGame.get(socket.id)
  if (!gameId) return

  const game = games.get(gameId)
  if (!game || game.currentTurn !== socket.id || game.phase !== "battle") return

  // Find opponent
  const opponentId = Object.keys(game.players).find((id) => id !== socket.id)
  if (!opponentId) return

  const opponent = game.players[opponentId]
  const isHit = opponent.board[row][col] === "ship"

  // Update opponent's board
  opponent.board[row][col] = isHit ? "hit" : "miss"

  // Update ship hits if it's a hit
  if (isHit) {
    opponent.ships.forEach((ship) => {
      const hitIndex = ship.positions.findIndex((pos) => pos.row === row && pos.col === col)
      if (hitIndex !== -1) {
        ship.hits[hitIndex] = true
      }
    })
  }

  // Check for win condition
  const allShipsSunk = opponent.ships.every((ship) => ship.hits.every((hit) => hit))
  if (allShipsSunk) {
    game.phase = "finished"
    game.winner = socket.id
    io.to(gameId).emit("game-over", { winner: socket.id, winnerName: game.players[socket.id].name })
  } else {
    // Switch turns
    game.currentTurn = opponentId
    io.to(gameId).emit("attack-result", {
      row,
      col,
      isHit,
      currentTurn: game.currentTurn,
      attackerId: socket.id,
    })
  }
}

function handleDisconnect(socket: any) {
  const gameId = playerToGame.get(socket.id)
  if (gameId) {
    const game = games.get(gameId)
    if (game) {
      // Notify other players
      socket.to(gameId).emit("player-disconnected", { playerId: socket.id })

      // Clean up if game hasn't started
      if (game.phase === "waiting" || Object.keys(game.players).length === 1) {
        games.delete(gameId)
      }
    }
    playerToGame.delete(socket.id)
  }
}
