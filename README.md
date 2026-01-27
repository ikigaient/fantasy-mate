# Fantasy Mate - FPL Team Analyzer

A Next.js web application that analyzes your Fantasy Premier League team, identifies strengths and weaknesses, and provides transfer recommendations and chip strategy advice.

## Features

- **Team Analysis** - Overall rating (0-100), team value breakdown, average form
- **Strengths Detection** - High-form players, favorable fixtures, premium assets performing
- **Weaknesses Detection** - Underperformers, tough fixtures, injuries, team concentration risk
- **Transfer Recommendations** - Smart suggestions for the next 3 gameweeks with replacement options
- **Chip Strategy** - When to use Wildcard, Free Hit, Bench Boost, and Triple Captain
- **Fixture Calendar** - 6 gameweek fixture difficulty view for your entire squad

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data**: FPL Public API (no authentication required)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ikigaient/fantasy-mate.git
cd fantasy-mate

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Usage

1. Go to the homepage
2. Enter your FPL Team ID (found in the URL when viewing your team: `fantasy.premierleague.com/entry/XXXXXX/event/X`)
3. View your team analysis across different tabs:
   - **Overview** - Strengths and weaknesses summary
   - **Squad** - Player-by-player breakdown with form and fixtures
   - **Fixtures** - 6 gameweek fixture difficulty calendar
   - **Transfers** - Recommended transfers for next 3 gameweeks
   - **Chips** - Chip usage recommendations

## Project Structure

```
fantasy-mate/
├── app/
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                # Home page with team ID input
│   ├── globals.css             # Global styles + Tailwind
│   ├── analysis/[teamId]/
│   │   └── page.tsx            # Analysis dashboard (client component)
│   └── api/
│       ├── bootstrap/route.ts  # Proxy for FPL bootstrap data
│       ├── team/[teamId]/route.ts  # Proxy for team data
│       └── fixtures/route.ts   # Proxy for fixtures data
├── components/
│   ├── TeamInput.tsx           # Team ID input form
│   ├── TeamOverview.tsx        # Team summary card with rating
│   ├── SquadAnalysis.tsx       # Player-by-player breakdown
│   ├── StrengthsWeaknesses.tsx # Strengths/weaknesses cards
│   ├── FixtureAnalysis.tsx     # Fixture difficulty table
│   ├── TransferSuggestions.tsx # Transfer recommendations
│   ├── ChipStrategy.tsx        # Chip usage advice
│   └── ui/
│       ├── Card.tsx            # Card component
│       ├── Badge.tsx           # Badge component
│       ├── ProgressBar.tsx     # Progress bar component
│       └── Loading.tsx         # Loading spinners
├── lib/
│   ├── types.ts                # TypeScript interfaces for FPL data
│   ├── fpl-api.ts              # API client and helper functions
│   ├── analysis.ts             # Team analysis algorithms
│   ├── transfers.ts            # Transfer recommendation logic
│   └── chips.ts                # Chip strategy logic
├── tailwind.config.js
├── tsconfig.json
├── next.config.js
└── package.json
```

## FPL API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/api/bootstrap-static/` | All players, teams, gameweeks, game settings |
| `/api/entry/{team_id}/` | User's team info |
| `/api/entry/{team_id}/event/{gw}/picks/` | Current team selection |
| `/api/entry/{team_id}/history/` | Past performance, chips used |
| `/api/fixtures/` | Fixture list with difficulty ratings |

## Analysis Algorithms

### Player Score Calculation

```
player_score = (form * 2) + (points_per_game * 1.5) + (fixture_ease * 1) - (injury_risk * 2)
```

### Strengths Detected

- **Strong Form** - 3+ players with form >= 5.0
- **Favorable Fixtures** - 5+ players with avg fixture difficulty < 3
- **Premium Assets Firing** - 2+ expensive players (10m+) with good form
- **Balanced Formation** - Good distribution across positions
- **Good Value** - High points-per-million efficiency

### Weaknesses Detected

- **Underperforming Players** - Players with form < 3.0
- **Difficult Fixtures** - 4+ players facing tough opponents (FDR >= 4)
- **Injury Concerns** - Players with availability doubts
- **Team Concentration** - 3+ players from same team
- **Weak Bench** - Bench players with poor form

### Transfer Priority

For each gameweek, the system:
1. Ranks current players by a "transfer out score" (form, fixtures, injuries)
2. Identifies the worst performer
3. Finds best replacements within budget at same position
4. Calculates expected points for next 3 gameweeks
5. Recommends whether taking a hit (-4) is worthwhile

### Chip Recommendations

- **Wildcard** - Recommended when 4+ players in poor form or 3+ injured
- **Free Hit** - Recommended for blank gameweeks or extreme fixture swings
- **Bench Boost** - Recommended for double gameweeks with strong bench (form > 3)
- **Triple Captain** - Identifies best TC candidate based on form + fixtures

## Fixture Difficulty Rating (FDR)

Uses the official FPL difficulty scale (1-5):
- 1 (Green) - Very easy
- 2 (Light Green) - Easy
- 3 (Yellow) - Medium
- 4 (Orange) - Difficult
- 5 (Red) - Very difficult

## Environment Variables

None required - the app uses the public FPL API.

## API Rate Limiting

The FPL API has rate limiting. The app includes:
- 5-minute caching on API responses
- Retry logic with exponential backoff
- Parallel data fetching to minimize requests

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Acknowledgments

- Data provided by the [Fantasy Premier League API](https://fantasy.premierleague.com)
- Built with [Next.js](https://nextjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
