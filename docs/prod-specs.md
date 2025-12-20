Originally: Bespoke for my family

Context:

- My family often plays Big Two. Big Two is a card game in which every round players are dealt 13 cards and then try to get rid of their cards. The round ends when one player has 0 cards. Once the round is over, all players receive points that is equivalent to the number of cards left remaining. We play this for a fixed number of rounds which is called a game (generally 10) and then add up all the points. The player with the fewest points win.
- Currently, the recording of points is done with pen and paper.
- My mom often forgets the rules.

Goal of app

- Create a centralized place so we can easily keep track of scores
- have a place so my mom can easily understand the rules
- In the end of 2026 I want to show my parents how many games we played

This app will be primarily on mobile, with possibility of an ipad. 

User Specifications

1. No authentication needed
2. landing page: should be the home screen with navigation tab below
3. navigation tab:
    1. History: Place where you can see a ledger of all past games, and scores of which place everyone has ever gotten. 
        1. Icon of Clock
    2. Home screen: 
        1. If there is not an active game, then just a ‘start game’ button
        2. If there is currently an ongoing game, then clicking lands on that active game
            1. Button is orange if there is an active game
            2. Subtitle with (n of 10); n = what the current round is
        3. Icon of house
    3. Big Two Rules: 
        1. Icon is Rule book. Upon clicking is a list of rules
4. Home Screen:
    1. If there is no ‘active’ game. There can only be one active game at a time.
        1. The middle is ‘start a game button’
        2. There can only be one active game. Starting a new game prompts to end or discard the current game.
5. Start a game (number of round - default to 10). Once a game is started, the following UI.
    1. Header: 
        1. Big Two
        2. Subtitle: [Date]
        3. Three horizontal lines button right aligned. Clicking the button pulls up an interstitial:
            1. Number of Rounds: This button is an option  to change number of games.
                1. If game has already started then the past round scores should stay the same. If shortening the number of rounds, truncate existing game, removing the rounds. If more, then simply extend 
            2. End game. This is a button to end the game early.
            3. Hide scores: This is a toggle (the setting persists). When this is clicked, all past scores and grand totals are blurred. 
    2. Middle: Scores
        1. Header of table is A Y D C. Each of these is a column
        2. Each row represents one round of the game
        3. Current row is highlighted a different shade of grey
        4. Click on any of the boxes and the keypad comes up to edit box that is a number. If click anywhere on row then defaults to opening up on A
            1. When keypad is open, screen should be centered on the row that is being edited. 
            2. Only valid numbers is 0 - 13. if 14 or above is entered, do not go to next box. 
        5. There needs to be an easy way to go back and edit. Maybe arrow buttons. If 1 is the value don’t automatically go to next block. Any other value go to next. Move clockwise. Thus, if I start with C, and A is not filled, A is next.
        6. Once all four players have a number for a given round, close the keypad, show a clear animation of moving to the next round, and then pull the keypad up again.
            1. Clicking on another players box moves to that player’s box value. Clicking anywhere else closes the keypad. 
    3. Bottom has grand total.
6. End game screen
    1. End game is triggered by either all scores being filled for the expected number of round. There’s an end game button on the top right that is in the same place to change how long the game is 
        1. Have an animation at the end for the winner when you finish the game. In fourth place…third place, etc.
        2. Have the picture of the person, name, and number of points 
        3. Use a photo of each person - in fourth place, mommy, third place Curtis, 2nd place Darwin, 1st place with a crown. This will be uploaded at a different time. For now, just use a placeholder
        4. Have points next to it 
7. Rules tab: Explains the order of the 5 handed cards
    1. Following text with dividers. Is scrollable:
    2. Highest 5 Card happen
        1. [Highest] Straight flush (同花连号): Same color and straight: 
            1. Example: 10♠ J♠ Q♠ K♠ A♠
        2. [Second highest] 4 of a King + Bomb (四张相同加一): Four same number + 1
            1. Example: A♠ A♥ A♦ A♣ + K♠
        3. [Third Highest] Full House (三张相同 + 两张相同): Three of a kind + apir
            1. Example: K♠ K♥ K♦ 10♣ 10♠
        4. [Fourth Highest] Flush (同花): All same suite
            1. Example: 2♠ 5♠ 7♠ 9♠ K♠
        5. [Fourth Highest] Straight (连号): Five consecutive numbers
            1. Example: 5♣ 6♦ 7♠ 8♥ 9♣
    3. Remember: 
        1. J♠ Q♦ K♥ A♣ 2♠ is not a valid straight
        2. Always look at highest card
8. History tab
    1. Summary at top:
        1. A pivot table with each person’s name as the row and the number of 1st, 2nd, 3rd, and 4h places. Totals at the ends. 
        2. Table of all games played. Columns are:
            1. Day
                1. If there’s a second game played include a (n) on the second and beyond. this shows up in a table 
            2. Number of rounds. 
            3. Scores of each person. 
            4. Number of rounds. 
            5. P2: Games can be tagged with a time (x-mas 2025, etc) to see who won