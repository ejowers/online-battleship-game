"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { Attack, GamePhase, Player, Ship } from "@/lib/types";

interface MultiplayerContextType {
  socket: Socket | null;
  connected: boolean;
  gameId: string | null;
  players: Player[];
  currentTurn: string | null;
  phase: GamePhase;
  winner: string | null;
  roomCode: string | null;
  joinQuickMatch: (playerName: string) => void;
  createRoom: (playerName: string) => void;
  joinRoom: (playerName: string, roomCode: string) => void;
  placeShips: (ships: Ship[]) => void;
  attack: (row: number, col: number) => void;
  attackResult: {
    row: number;
    col: number;
    isHit: boolean;
    attackerId: string;
  } | null;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [winner, setWinner] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [attackResult, setAttackResult] = useState<Attack | null>(null);

  useEffect(() => {
    const socketInstance = io();

    socketInstance.on("connect", () => {
      console.log("[v0] Connected to server");
      setConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("[v0] Disconnected from server");
      setConnected(false);
    });

    socketInstance.on("waiting-for-opponent", () => {
      console.log("[v0] Waiting for opponent");
      setPhase("waiting");
    });

    socketInstance.on("room-created", ({ roomCode: code, gameId: id }) => {
      console.log("[v0] Room created:", code);
      setRoomCode(code);
      setGameId(id);
      setPhase("waiting");
    });

    socketInstance.on("room-not-found", () => {
      console.log("[v0] Room not found");
      alert("Room not found!");
    });

    socketInstance.on("room-full", () => {
      console.log("[v0] Room is full");
      alert("Room is full!");
    });

    socketInstance.on(
      "game-start",
      ({
        gameId: id,
        players: gamePlayers,
        phase: gamePhase,
        roomCode: code,
      }) => {
        console.log("[v0] Game starting:", id, gamePlayers);
        setGameId(id);
        setPlayers(gamePlayers);
        setPhase(gamePhase);
        if (code) setRoomCode(code);
      }
    );

    socketInstance.on("ships-placed", () => {
      console.log("[v0] Ships placed successfully");
    });

    socketInstance.on(
      "battle-start",
      ({ currentTurn: turn, players: gamePlayers }) => {
        console.log("[v0] Battle starting, current turn:", turn);
        setPhase("battle");
        setCurrentTurn(turn);
        setPlayers(gamePlayers);
      }
    );

    socketInstance.on(
      "attack-result",
      ({ row, col, isHit, currentTurn: turn, attackerId }) => {
        console.log("[v0] Attack result:", {
          row,
          col,
          isHit,
          turn,
          attackerId,
        });
        setAttackResult({ row, col, isHit, attackerId });
        setCurrentTurn(turn);

        // Clear attack result after a short delay
        setTimeout(() => setAttackResult(null), 2000);
      }
    );

    socketInstance.on("game-over", ({ winner: winnerId, winnerName }) => {
      console.log("[v0] Game over, winner:", winnerName);
      setPhase("finished");
      setWinner(winnerId);
    });

    socketInstance.on("player-disconnected", ({ playerId }) => {
      console.log("[v0] Player disconnected:", playerId);
      alert("Your opponent has disconnected!");
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinQuickMatch = (playerName: string) => {
    if (socket) {
      console.log("[v0] Joining quick match as:", playerName);
      socket.emit("join-quick-match", playerName);
    }
  };

  const createRoom = (playerName: string) => {
    if (socket) {
      console.log("[v0] Creating room as:", playerName);
      socket.emit("create-room", playerName);
    }
  };

  const joinRoom = (playerName: string, roomCode: string) => {
    if (socket) {
      console.log("[v0] Joining room:", roomCode, "as:", playerName);
      socket.emit("join-room", { playerName, roomCode });
    }
  };

  const placeShips = (ships: Ship[]) => {
    if (socket) {
      console.log("[v0] Placing ships:", ships.length);
      socket.emit("place-ships", ships);
    }
  };

  const attack = (row: number, col: number) => {
    if (socket) {
      console.log("[v0] Attacking:", row, col);
      socket.emit("attack", { row, col });
    }
  };

  return (
    <MultiplayerContext.Provider
      value={{
        socket,
        connected,
        gameId,
        players,
        currentTurn,
        phase,
        winner,
        roomCode,
        joinQuickMatch,
        createRoom,
        joinRoom,
        placeShips,
        attack,
        attackResult,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error("useMultiplayer must be used within a MultiplayerProvider");
  }
  return context;
}
