"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMultiplayer } from "@/hooks/use-socket-multiplayer";
import Image from "next/image";

export function OnlineLobby() {
  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const { connected, phase, roomCode, joinQuickMatch, createRoom, joinRoom } =
    useMultiplayer();

  const handleQuickMatch = () => {
    if (playerName.trim()) {
      joinQuickMatch(playerName.trim());
    }
  };

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      createRoom(playerName.trim());
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && roomCodeInput.trim()) {
      joinRoom(playerName.trim(), roomCodeInput.trim().toUpperCase());
    }
  };

  if (phase === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-blue-700">
              Waiting for Opponent
            </CardTitle>
            {roomCode && (
              <CardDescription className="text-lg font-mono bg-blue-100 p-2 rounded">
                Room Code:{" "}
                <span className="font-bold text-blue-800">{roomCode}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">
              {roomCode
                ? "Share the room code with your opponent"
                : "Finding an opponent..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex text-3xl font-bold text-blue-700 items-center justify-center gap-4">
            <Image
              src="/battleship.png"
              alt="battleship"
              width={50}
              height={50}
            />
            Battleship
          </CardTitle>
          <CardDescription>
            Connection:{" "}
            <span className={connected ? "text-green-600" : "text-red-600"}>
              {connected ? "Connected" : "Connecting..."}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label
              htmlFor="playerName"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Your Name
            </label>
            <Input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full"
            />
          </div>

          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick">Quick Match</TabsTrigger>
              <TabsTrigger value="room">Private Room</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-4">
              <p className="text-sm text-slate-600 text-center">
                Join a random match with another player
              </p>
              <Button
                onClick={handleQuickMatch}
                disabled={!connected || !playerName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Join Quick Match
              </Button>
            </TabsContent>

            <TabsContent value="room" className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={handleCreateRoom}
                  disabled={!connected || !playerName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Create Private Room
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">Or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter room code"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    className="w-full"
                  />
                  <Button
                    onClick={handleJoinRoom}
                    disabled={
                      !connected || !playerName.trim() || !roomCodeInput.trim()
                    }
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    Join Room
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
