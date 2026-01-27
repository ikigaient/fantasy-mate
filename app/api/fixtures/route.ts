import { NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET() {
  try {
    const response = await fetch(`${FPL_BASE_URL}/fixtures/`, {
      next: { revalidate: 300 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FantasyMate/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch fixtures' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fixtures API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
