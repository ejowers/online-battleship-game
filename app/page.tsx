"use client";

import { useState } from "react";
import { GameBoard } from "@/components/game-board";
import { ShipLibrary } from "@/components/ship-library";
import { OnlineLobby } from "@/components/online-lobby";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMultiplayer } from "@/hooks/use-socket-multiplayer";
import Image from "next/image";

export type Ship = {
  id: string;
  size: number;
  placed: boolean;
  position?: { row: number; col: number };
  orientation?: "horizontal" | "vertical";
  positions?: { row: number; col: number }[];
  hits?: boolean[];
};

export type Cell = {
  hasShip: boolean;
  shipId?: string;
  isHit: boolean;
  isMiss: boolean;
};

export type GamePhase = "placement" | "battle" | "ended";

const BattleshipGame = () => {
  const [myShips, setMyShips] = useState<Ship[]>([
    { id: "carrier", size: 5, placed: false },
    { id: "battleship", size: 4, placed: false },
    { id: "cruiser", size: 4, placed: false },
    { id: "submarine", size: 3, placed: false },
    { id: "destroyer", size: 2, placed: false },
  ]);
  const [myBoard, setMyBoard] = useState<Cell[][]>(
    Array(10)
      .fill(null)
      .map(() =>
        Array(10)
          .fill(null)
          .map(() => ({ hasShip: false, isHit: false, isMiss: false }))
      )
  );
  const [opponentBoard, setOpponentBoard] = useState<Cell[][]>(
    Array(10)
      .fill(null)
      .map(() =>
        Array(10)
          .fill(null)
          .map(() => ({ hasShip: false, isHit: false, isMiss: false }))
      )
  );
  const [shipsPlaced, setShipsPlaced] = useState(false);

  const {
    socket,
    connected,
    phase,
    currentTurn,
    players,
    winner,
    placeShips,
    attack,
    attackResult,
  } = useMultiplayer();

  if (phase === "lobby" || phase === "waiting") {
    return <OnlineLobby />;
  }

  const isMyTurn = currentTurn === socket?.id;
  const isSetupPhase = phase === "setup";
  const allMyShipsPlaced = myShips.every((ship) => ship.placed);
  const myPlayer = players.find((p) => p.id === socket?.id);
  const opponent = players.find((p) => p.id !== socket?.id);

  const handleShipPlacement = (
    shipId: string,
    row: number,
    col: number,
    orientation: "horizontal" | "vertical"
  ) => {
    const ship = myShips.find((s) => s.id === shipId);
    if (!ship || ship.placed) return;

    // Check if placement is valid
    const positions: { row: number; col: number }[] = [];
    for (let i = 0; i < ship.size; i++) {
      const newRow = orientation === "horizontal" ? row : row + i;
      const newCol = orientation === "horizontal" ? col + i : col;

      if (newRow >= 10 || newCol >= 10 || newRow < 0 || newCol < 0) return;
      if (myBoard[newRow][newCol].hasShip) return;

      positions.push({ row: newRow, col: newCol });
    }

    // Update ship
    const updatedShips = myShips.map((s) =>
      s.id === shipId
        ? {
            ...s,
            placed: true,
            position: { row, col },
            orientation,
            positions,
            hits: Array(ship.size).fill(false),
          }
        : s
    );
    setMyShips(updatedShips);

    // Update board
    const newBoard = [...myBoard];
    positions.forEach((pos) => {
      newBoard[pos.row][pos.col] = {
        ...newBoard[pos.row][pos.col],
        hasShip: true,
        shipId,
      };
    });
    setMyBoard(newBoard);
  };

  const handleReadyClick = () => {
    if (allMyShipsPlaced && !shipsPlaced) {
      // Convert ships to server format
      const serverShips = myShips.map((ship) => ({
        id: ship.id,
        size: ship.size,
        positions: ship.positions || [],
        hits: ship.hits || Array(ship.size).fill(false),
      }));
      placeShips(serverShips);
      setShipsPlaced(true);
    }
  };

  const handleCellAttack = (row: number, col: number) => {
    if (
      isMyTurn &&
      phase === "battle" &&
      !opponentBoard[row][col].isHit &&
      !opponentBoard[row][col].isMiss
    ) {
      attack(row, col);
    }
  };

  if (attackResult && attackResult.attackerId === socket?.id) {
    const newOpponentBoard = [...opponentBoard];
    newOpponentBoard[attackResult.row][attackResult.col] = {
      ...newOpponentBoard[attackResult.row][attackResult.col],
      isHit: attackResult.isHit,
      isMiss: !attackResult.isHit,
    };
    if (JSON.stringify(newOpponentBoard) !== JSON.stringify(opponentBoard)) {
      setOpponentBoard(newOpponentBoard);
    }
  }

  if (attackResult && attackResult.attackerId !== socket?.id) {
    const newMyBoard = [...myBoard];
    newMyBoard[attackResult.row][attackResult.col] = {
      ...newMyBoard[attackResult.row][attackResult.col],
      isHit: attackResult.isHit,
      isMiss: !attackResult.isHit,
    };
    if (JSON.stringify(newMyBoard) !== JSON.stringify(myBoard)) {
      setMyBoard(newMyBoard);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="flex text-4xl font-bold text-foreground mb-2 items-center justify-center gap-4">
            <Image
              src="/battleship.png"
              alt="battleship"
              width={50}
              height={50}
            />
            Naval Battle
          </h1>
          <div className="space-y-1">
            <p className="text-muted-foreground">
              You: {myPlayer?.name} vs {opponent?.name || "Opponent"}
            </p>
            {isSetupPhase && (
              <p className="text-muted-foreground">
                {allMyShipsPlaced
                  ? shipsPlaced
                    ? "Waiting for opponent..."
                    : "Ready to place ships"
                  : "Place your ships"}
              </p>
            )}
            {phase === "battle" && (
              <p className="text-muted-foreground">
                {isMyTurn ? "Your turn - Attack!" : "Opponent's turn"}
              </p>
            )}
            {phase === "finished" && (
              <p className="text-muted-foreground">
                {winner === socket?.id
                  ? "Victory is yours!"
                  : "Defeat... but fight again!"}
              </p>
            )}
          </div>
        </div>

        {isSetupPhase && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Place Your Ships</h2>
              <GameBoard
                board={myBoard}
                ships={myShips}
                onShipPlacement={handleShipPlacement}
                isSetupPhase={true}
                isCurrentPlayer={true}
              />
            </Card>

            <ShipLibrary ships={myShips} onShipSelect={() => {}} />

            <div className="text-center">
              <Button
                onClick={handleReadyClick}
                disabled={!allMyShipsPlaced || shipsPlaced}
              >
                {shipsPlaced ? "Ready - Waiting..." : "Ready to Battle"}
              </Button>
            </div>
          </div>
        )}

        {phase === "battle" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Your Fleet</h2>
              <GameBoard
                board={myBoard}
                ships={myShips}
                onShipPlacement={() => {}}
                isSetupPhase={false}
                isCurrentPlayer={true}
              />
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Enemy Waters {!isMyTurn && "(Wait for your turn)"}
              </h2>
              <GameBoard
                board={opponentBoard}
                ships={[]}
                onShipPlacement={() => {}}
                onCellAttack={handleCellAttack}
                isSetupPhase={false}
                isCurrentPlayer={false}
              />
            </Card>
          </div>
        )}

        {phase === "finished" && (
          <div className="text-center space-y-4">
            <Card className="p-8">
              <h2 className="text-3xl font-bold text-primary mb-4">
                Battle Complete!
              </h2>
              <p className="text-xl mb-6">
                {winner === socket?.id
                  ? "Victory is yours!"
                  : "Defeat... but fight again!"}
              </p>
              <div className="space-x-4">
                <Button onClick={() => window.location.reload()}>
                  Battle Again
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default BattleshipGame;
