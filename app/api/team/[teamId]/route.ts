import { NextRequest, NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const { teamId } = params;
  const { searchParams } = new URL(request.url);
  const gameweek = searchParams.get('gw');

  try {
    // Fetch team info
    const entryResponse = await fetch(`${FPL_BASE_URL}/entry/${teamId}/`, {
      next: { revalidate: 60 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FantasyMate/1.0)',
      },
    });

    if (!entryResponse.ok) {
      if (entryResponse.status === 404) {
        return NextResponse.json(
          { error: 'Team not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch team data' },
        { status: entryResponse.status }
      );
    }

    const entryData = await entryResponse.json();

    // Fetch history
    const historyResponse = await fetch(
      `${FPL_BASE_URL}/entry/${teamId}/history/`,
      {
        next: { revalidate: 60 },
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FantasyMate/1.0)',
        },
      }
    );

    const historyData = historyResponse.ok
      ? await historyResponse.json()
      : { current: [], past: [], chips: [] };

    // Fetch picks if gameweek specified
    let picksData = null;
    if (gameweek) {
      const picksResponse = await fetch(
        `${FPL_BASE_URL}/entry/${teamId}/event/${gameweek}/picks/`,
        {
          next: { revalidate: 60 },
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FantasyMate/1.0)',
          },
        }
      );
      if (picksResponse.ok) {
        picksData = await picksResponse.json();
      }
    }

    return NextResponse.json({
      entry: entryData,
      history: historyData,
      picks: picksData,
    });
  } catch (error) {
    console.error('Team API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
