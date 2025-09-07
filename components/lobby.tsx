"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useMultiplayer } from "@/hooks/use-multiplayer"

interface LobbyProps {
  onGameStart: () => void
}

export function Lobby({ onGameStart }: LobbyProps) {
  const [playerName, setPlayerName] = useState("")
  const { isConnected, room, connect, disconnect } = useMultiplayer()

  const handleConnect = () => {
    if (playerName.trim()) {
      connect(playerName.trim())
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Naval Battle</h1>
              <p className="text-muted-foreground">Enter your name to join the battle</p>
            </div>

            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleConnect()}
                className="text-center"
              />
              <Button onClick={handleConnect} disabled={!playerName.trim()} className="w-full" size="lg">
                Join Battle
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Battle Room</h2>
              <p className="text-muted-foreground">Room ID: {room.id}</p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Players:</h3>
              {room.players.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="font-medium">
                    Player {index + 1}: {player.name}
                  </span>
                  {player.ready && <span className="text-primary text-sm font-medium">Ready</span>}
                </div>
              ))}

              {room.players.length < 2 && (
                <div className="p-3 bg-muted/50 rounded-md border-2 border-dashed border-muted-foreground/30">
                  <span className="text-muted-foreground">Waiting for opponent...</span>
                </div>
              )}
            </div>

            {room.players.length === 2 && room.gameState.phase !== "waiting" && (
              <Button onClick={onGameStart} size="lg" className="w-full">
                Start Game
              </Button>
            )}

            <Button onClick={handleDisconnect} variant="outline" className="w-full bg-transparent">
              Leave Room
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Connecting...</p>
        </div>
      </Card>
    </div>
  )
}
