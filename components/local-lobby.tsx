"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useLocalGame } from "@/hooks/use-local-game"

interface LocalLobbyProps {
  onGameStart: () => void
}

export function LocalLobby({ onGameStart }: LocalLobbyProps) {
  const [playerName, setPlayerName] = useState("")
  const { players, addPlayer, startGame } = useLocalGame()

  const handleAddPlayer = () => {
    if (playerName.trim()) {
      addPlayer(playerName.trim())
      setPlayerName("")
    }
  }

  const handleStartGame = () => {
    startGame()
    onGameStart()
  }

  const canStart = players[0] && players[1]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Naval Battle</h1>
            <p className="text-muted-foreground">Local Multiplayer - Add both players</p>
          </div>

          {!canStart && (
            <div className="space-y-4">
              <Input
                type="text"
                placeholder={`Enter ${players[0] ? "Player 2" : "Player 1"} name`}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddPlayer()}
                className="text-center"
              />
              <Button onClick={handleAddPlayer} disabled={!playerName.trim()} className="w-full" size="lg">
                Add {players[0] ? "Player 2" : "Player 1"}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold">Players:</h3>
            {players.map(
              (player, index) =>
                player && (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <span className="font-medium">
                      Player {index + 1}: {player.name}
                    </span>
                    <span className="text-primary text-sm font-medium">Ready</span>
                  </div>
                ),
            )}

            {!players[0] && (
              <div className="p-3 bg-muted/50 rounded-md border-2 border-dashed border-muted-foreground/30">
                <span className="text-muted-foreground">Add Player 1...</span>
              </div>
            )}

            {players[0] && !players[1] && (
              <div className="p-3 bg-muted/50 rounded-md border-2 border-dashed border-muted-foreground/30">
                <span className="text-muted-foreground">Add Player 2...</span>
              </div>
            )}
          </div>

          {canStart && (
            <Button onClick={handleStartGame} size="lg" className="w-full">
              Start Battle
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
