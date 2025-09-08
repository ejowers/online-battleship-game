To run the game:

`npm install`
`node server.js`

By default, this will run on port `3000`. If you wish to run on a differnt port, use the following command instead:
`PORT=desired_port node server.js`

Open [localhost:3000](http://localhost:3000/) in 2 tabs on the same device to play. If on the same network, you can also open a tab on another device using your IP_Address:3000.

You will see the lobby screen. You can either start a random match or create a room. If you create a room, share the room code with your opponent to play. Only 2 people are allowed in a room.

Drag the ships onto the board to set your board and press "Ready to Battle"

Take turns selecting cells to hit on your opponents's board. Hits are shown in red, misses are shown in blue. A ship is sunk once all the cells containing the ship have been hit. Once all of a player's ships have been sunk, the game is over.

Press "Play again" to return to the Lobby and play again.
