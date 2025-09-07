"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import type { Ship } from "@/app/page"

interface ShipLibraryProps {
  ships: Ship[]
  onShipSelect: (ship: Ship) => void
}

export function ShipLibrary({ ships, onShipSelect }: ShipLibraryProps) {
  const handleDragStart = (e: React.DragEvent, ship: Ship) => {
    e.dataTransfer.setData("ship", JSON.stringify(ship))
  }

  const getShipName = (shipId: string) => {
    const names: Record<string, string> = {
      carrier: "Aircraft Carrier",
      battleship: "Battleship",
      cruiser: "Cruiser",
      submarine: "Submarine",
      destroyer: "Destroyer",
    }
    return names[shipId] || shipId
  }

  return (
    <div className="bg-card p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4 text-card-foreground">Fleet</h3>
      <div className="space-y-3">
        {ships.map((ship) => (
          <div
            key={ship.id}
            className={cn("flex items-center gap-4 p-3 rounded-md border transition-all", {
              "bg-muted border-muted-foreground/20 opacity-50": ship.placed,
              "bg-background border-border hover:bg-accent/10 cursor-grab": !ship.placed,
            })}
            draggable={!ship.placed}
            onDragStart={(e) => handleDragStart(e, ship)}
          >
            <div className="flex-1">
              <div className="font-medium text-sm">{getShipName(ship.id)}</div>
              <div className="text-xs text-muted-foreground">{ship.size} cells</div>
            </div>

            {/* Visual representation of ship */}
            <div className="flex gap-1">
              {Array.from({ length: ship.size }, (_, i) => (
                <div key={i} className={cn("w-4 h-4 rounded-sm", ship.placed ? "bg-primary/30" : "bg-primary")} />
              ))}
            </div>

            {ship.placed && <div className="text-xs text-primary font-medium">Placed</div>}
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Drag ships to the board to place them. Click the orientation button to rotate.
      </div>
    </div>
  )
}
