## Update v1

Currently the metadata stored for a given game is the total points scored for each player. Please also record the number of rounds won for each player of a given game. How this will show up in the history ledger will be decided in a future iteration. Track the number of rounds won by each player in a given game. A game won is identified by the player have points == 0 for that round. 

For example, for the 10 rounds in a given game, you could have Curtis win 5 rounds, Darwin win 3, Albert win 2, and Yiming win 0. Those would be the numbers. 

Each round should only have one player with 0 cards. If there are more than this, throw an error. 


## Update v2
I want to introduce additional logging for my game. I want to log the record of each round. Thus, for a given game, include the date of the game, the game_id (or how it is tracked in other data tables), the round number of the game, the total round points, and the number of points each player has. 
This does not have to be showed to , but should be accessible for analytics in the future. 

### Implementation notes

- **Source of truth**: `games/{gameId}/rounds/{roundId}/scores/{playerId}`
- **Denormalized analytics view**: top-level `roundLogs/{gameId}_{roundId}` written whenever a round becomes complete (all 4 players have numeric points), and updated if scores are edited.
- **Backfill**: run `npm run backfill:roundLogs`.
  - Requires **Admin credentials** via Application Default Credentials (ADC):
    - Option A: `gcloud auth application-default login`
    - Option B: set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json`