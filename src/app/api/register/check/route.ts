import { NextResponse } from 'next/server';
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ exists: false });
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.trim().toLowerCase() || '';
    const phone = searchParams.get('phone')?.replace(/[\s-]/g, '') || '';
    const usn = searchParams.get('usn')?.trim().toUpperCase() || '';

    const orClauses: string[] = [];
    if (email) orClauses.push(`email.ilike.${email}`);
    if (phone) orClauses.push(`phone.eq.${phone}`);
    if (usn) orClauses.push(`usn.ilike.${usn}`);

    if (orClauses.length === 0) {
      return NextResponse.json({ exists: false });
    }

    const { data: matches, error } = await supabase
      .from('registrations')
      .select('id, usn, email, phone, full_name, branch, semester, section, created_at')
      .or(orClauses.join(','))
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (matches && matches.length > 0) {
      const match = matches[0];
      const matchEmail = email && match.email?.toLowerCase() === email;
      const matchPhone = phone && match.phone === phone;
      const matchUsn = usn && match.usn?.toUpperCase() === usn;

      // Find registration index (e.g. #1, #2 of 100)
      let registeredCount: number | undefined;
      try {
        const { count } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', match.created_at);
        if (typeof count === 'number') {
          registeredCount = count;
        }
      } catch {
        /* ignore */
      }

      let message = '';
      if (matchEmail && matchPhone) {
        message = `This mobile number (+91 ${phone}) and email (${email}) are already registered.`;
      } else if (matchEmail) {
        message = `This email (${email}) is already registered.`;
      } else if (matchPhone) {
        message = `This mobile number (+91 ${phone}) is already registered.`;
      } else if (matchUsn) {
        message = `This USN (${usn}) is already registered.`;
      } else {
        message = 'You are already registered for this workshop.';
      }

      return NextResponse.json(
        {
          exists: true,
          message,
          matchedFields: { email: matchEmail, phone: matchPhone, usn: matchUsn },
          registration: {
            fullName: match.full_name,
            usn: match.usn,
            email: match.email,
            phone: match.phone,
            branch: match.branch,
            semester: match.semester,
            section: match.section,
            registeredCount,
          },
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
      { exists: false },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error occurred.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
