"use client";

import type React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Ship, Cell } from "@/lib/types";
import { Button } from "./ui/button";

interface GameBoardProps {
  board: Cell[][];
  ships: Ship[];
  onShipPlacement: (
    shipId: string,
    row: number,
    col: number,
    orientation: "horizontal" | "vertical"
  ) => void;
  onShipRemoval?: (shipId: string) => void;
  onCellAttack?: (row: number, col: number) => void;
  isSetupPhase: boolean;
  isCurrentPlayer: boolean;
}

export function GameBoard({
  board,
  ships,
  onShipPlacement,
  onShipRemoval,
  onCellAttack,
  isSetupPhase,
  isCurrentPlayer,
}: GameBoardProps) {
  const [draggedShip, setDraggedShip] = useState<Ship | null>(null);
  const [dragOrientation, setDragOrientation] = useState<
    "horizontal" | "vertical"
  >("horizontal");
  const [hoveredCells, setHoveredCells] = useState<
    { row: number; col: number }[]
  >([]);

  const getShipAtCell = (row: number, col: number): Ship | null => {
    return (
      ships.find((ship) => {
        if (
          !ship.position?.row !== undefined &&
          ship.position?.col !== undefined
        )
          return false;

        for (let i = 0; i < ship.size; i++) {
          const shipRow =
            ship.orientation === "horizontal"
              ? ship.position?.row
              : ship.position?.row! + i;
          const shipCol =
            ship.orientation === "horizontal"
              ? ship.position?.col! + i
              : ship.position?.col;
          if (shipRow === row && shipCol === col) {
            return true;
          }
        }
        return false;
      }) || null
    );
  };

  const handleShipDragStart = (e: React.DragEvent, ship: Ship) => {
    if (!isSetupPhase) return;

    e.dataTransfer.setData("ship", JSON.stringify(ship));
    e.dataTransfer.setData("isPlacedShip", "true");
    setDraggedShip(ship);
    setDragOrientation(ship.orientation || "horizontal");

    // Remove ship from current position
    if (onShipRemoval) {
      onShipRemoval(ship.id);
    }
  };

  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();

    if (!draggedShip) {
      try {
        const shipData = e.dataTransfer.getData("ship");
        if (shipData) {
          const ship = JSON.parse(shipData) as Ship;
          setDraggedShip(ship);
          if (e.dataTransfer.getData("isPlacedShip")) {
            setDragOrientation(ship.orientation || "horizontal");
          }
        }
      } catch (error) {
        console.log("[v0] Error parsing ship data:", error);
      }
    }

    if (!draggedShip || !isSetupPhase) return;

    const cells: { row: number; col: number }[] = [];
    for (let i = 0; i < draggedShip.size; i++) {
      const cellRow = dragOrientation === "horizontal" ? row : row + i;
      const cellCol = dragOrientation === "horizontal" ? col + i : col;
      if (cellRow < 10 && cellCol < 10) {
        cells.push({ row: cellRow, col: cellCol });
      }
    }
    setHoveredCells(cells);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setHoveredCells([]);
    }
  };

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setHoveredCells([]);

    let shipToPlace = draggedShip;
    if (!shipToPlace) {
      try {
        const shipData = e.dataTransfer.getData("ship");
        if (shipData) {
          shipToPlace = JSON.parse(shipData) as Ship;
        }
      } catch (error) {
        console.log("[v0] Error parsing ship data:", error);
        return;
      }
    }

    if (!shipToPlace || !isSetupPhase) return;

    if (canPlaceShip(row, col, shipToPlace)) {
      onShipPlacement(shipToPlace.id, row, col, dragOrientation);
    }

    setDraggedShip(null);
  };

  const handleCellClick = (row: number, col: number) => {
    if (isSetupPhase || isCurrentPlayer || !onCellAttack) return;
    onCellAttack(row, col);
  };

  const isHovered = (row: number, col: number) => {
    return hoveredCells.some((cell) => cell.row === row && cell.col === col);
  };

  const canPlaceShip = (row: number, col: number, ship?: Ship) => {
    const shipToCheck = ship || draggedShip;
    if (!shipToCheck) return false;

    for (let i = 0; i < shipToCheck.size; i++) {
      const cellRow = dragOrientation === "horizontal" ? row : row + i;
      const cellCol = dragOrientation === "horizontal" ? col + i : col;

      if (cellRow >= 10 || cellCol >= 10) return false;

      const cellHasShip = board[cellRow][cellCol].hasShip;
      const shipAtCell = getShipAtCell(cellRow, cellCol);

      if (cellHasShip && (!shipAtCell || shipAtCell.id !== shipToCheck.id)) {
        return false;
      }
    }
    return true;
  };

  return (
    <div className="inline-block">
      {/* Column headers */}
      <div className="flex mb-2">
        <div className="w-8 h-8"></div>
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="w-8 h-8 flex items-center justify-center text-sm font-medium text-muted-foreground"
          >
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>

      {/* Game grid */}
      <div className="flex flex-col" onDragLeave={handleDragLeave}>
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {/* Row header */}
            <div className="w-8 h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">
              {rowIndex + 1}
            </div>

            {/* Row cells */}
            {row.map((cell, colIndex) => {
              const shipAtCell = getShipAtCell(rowIndex, colIndex);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    "w-8 h-8 border border-border cursor-pointer transition-colors relative",
                    {
                      // Setup phase styling
                      "bg-card hover:bg-accent/20":
                        (isSetupPhase && !cell.hasShip) ||
                        (!isSetupPhase &&
                          !isCurrentPlayer &&
                          !cell.isHit &&
                          !cell.isMiss),
                      "bg-primary/20 hover:bg-primary/30":
                        isSetupPhase && cell.hasShip,

                      // Battle phase styling - your board
                      "bg-card":
                        !isSetupPhase &&
                        isCurrentPlayer &&
                        !cell.hasShip &&
                        !cell.isMiss,
                      "bg-primary/30":
                        !isSetupPhase &&
                        isCurrentPlayer &&
                        cell.hasShip &&
                        !cell.isHit,
                      "bg-destructive":
                        !isSetupPhase && isCurrentPlayer && cell.isHit,
                      "bg-blue-200":
                        !isSetupPhase && isCurrentPlayer && cell.isMiss,

                      // Battle phase styling - enemy board
                      "bg-red-300":
                        !isSetupPhase && !isCurrentPlayer && cell.isHit,
                      "bg-blue-100":
                        !isSetupPhase && !isCurrentPlayer && cell.isMiss,

                      // Drag hover effects
                      "bg-primary/40":
                        isHovered(rowIndex, colIndex) &&
                        canPlaceShip(rowIndex, colIndex),
                      "bg-destructive/40":
                        isHovered(rowIndex, colIndex) &&
                        !canPlaceShip(rowIndex, colIndex),
                    }
                  )}
                  draggable={isSetupPhase && cell.hasShip && !!shipAtCell}
                  onDragStart={(e) =>
                    shipAtCell && handleShipDragStart(e, shipAtCell)
                  }
                  onDragOver={(e) => handleDragOver(e, rowIndex, colIndex)}
                  onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {cell.isHit && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-red-600 font-bold text-lg">×</div>
                    </div>
                  )}
                  {cell.isMiss && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Orientation toggle for setup phase */}
      {isSetupPhase && (
        <div className="mt-4 text-center">
          <Button
            onClick={() =>
              setDragOrientation(
                dragOrientation === "horizontal" ? "vertical" : "horizontal"
              )
            }
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Orientation: {dragOrientation}
          </Button>
        </div>
      )}
    </div>
  );
}
