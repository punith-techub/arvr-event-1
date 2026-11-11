import { NextResponse } from 'next/server';
import { supabaseServer as supabase, REGISTRATION_CAP, SHORTLIST_COUNT, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          dbReady: false,
          isClosed: false,
          count: 0,
          cap: REGISTRATION_CAP,
          shortlistCount: SHORTLIST_COUNT,
          remaining: REGISTRATION_CAP,
          message:
            'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    let { count, error } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return NextResponse.json(
          {
            dbReady: false,
            isClosed: false,
            count: 0,
            cap: REGISTRATION_CAP,
            shortlistCount: SHORTLIST_COUNT,
            remaining: REGISTRATION_CAP,
            message: "Database table 'registrations' needs to be created in Supabase.",
          },
          {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
              Pragma: 'no-cache',
              Expires: '0',
            },
          }
        );
      }
      return NextResponse.json(
        { error: 'Could not fetch status: ' + error.message },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          },
        }
      );
    }

    // Fallback safeguard if head count is null/undefined
    let currentCount = count ?? 0;
    if (typeof count !== 'number') {
      const { data: allRows } = await supabase.from('registrations').select('id');
      currentCount = allRows ? allRows.length : 0;
    }

    const isClosed = currentCount >= REGISTRATION_CAP;

    return NextResponse.json(
      {
        dbReady: true,
        isClosed,
        count: currentCount,
        cap: REGISTRATION_CAP,
        shortlistCount: SHORTLIST_COUNT,
        remaining: Math.max(0, REGISTRATION_CAP - currentCount),
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error checking status.';
    return NextResponse.json(
      { error: msg },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  }
}
