import { NextResponse } from 'next/server';
import { supabaseServer as supabase, REGISTRATION_CAP, SHORTLIST_COUNT, isSupabaseConfigured } from '@/lib/supabase';
import { registrationSchema } from '@/lib/registration';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Supabase is not configured on the server. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.',
        },
        { status: 503 }
      );
    }

    const json = await req.json();
    const result = registrationSchema.safeParse(json);

    if (!result.success) {
      const firstError = result.error.errors[0]?.message || 'Invalid registration form data.';
      return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const payload = result.data;

    // 1. Check current count in Supabase
    const { count, error: countError } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      if (countError.code === 'PGRST205') {
        return NextResponse.json(
          {
            success: false,
            error:
              "The 'registrations' table is not yet created in your Supabase database. Please run the SQL schema located at 'supabase/schema.sql' in the Supabase SQL Editor.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Database check failed: ' + countError.message },
        { status: 500 }
      );
    }

    const currentCount = count ?? 0;

    // 2. Enforce 100 member cap
    if (currentCount >= REGISTRATION_CAP) {
      return NextResponse.json(
        {
          success: false,
          isClosed: true,
          error: `Registrations are closed. The limit of ${REGISTRATION_CAP} members has been reached. ${SHORTLIST_COUNT} members will be shortlisted.`,
        },
        { status: 403 }
      );
    }

    // 3. Check for duplicate Email, Mobile Number, or USN
    const { data: existing, error: dupError } = await supabase
      .from('registrations')
      .select('id, usn, email, phone, full_name, branch, semester, section')
      .or(`email.ilike.${payload.email},phone.eq.${payload.phone},usn.ilike.${payload.usn}`)
      .limit(1);

    if (dupError && dupError.code !== 'PGRST116') {
      console.warn('Duplicate check warning:', dupError);
    }

    if (existing && existing.length > 0) {
      const match = existing[0];
      const matchEmail = match.email?.trim().toLowerCase() === payload.email.trim().toLowerCase();
      const matchPhone = match.phone?.trim() === payload.phone.trim();
      const matchUsn = match.usn?.trim().toUpperCase() === payload.usn.trim().toUpperCase();

      let duplicateMessage = '';
      if (matchEmail && matchPhone) {
        duplicateMessage = `This mobile number (+91 ${payload.phone}) and email (${payload.email}) are already registered.`;
      } else if (matchEmail) {
        duplicateMessage = `This email (${payload.email}) is already registered.`;
      } else if (matchPhone) {
        duplicateMessage = `This mobile number (+91 ${payload.phone}) is already registered.`;
      } else if (matchUsn) {
        duplicateMessage = `This USN (${payload.usn}) is already registered.`;
      } else {
        duplicateMessage = 'You are already registered for this workshop.';
      }

      return NextResponse.json(
        {
          success: false,
          alreadyRegistered: true,
          error: duplicateMessage,
          existingRegistration: {
            fullName: match.full_name,
            usn: match.usn,
            email: match.email,
            phone: match.phone,
            branch: match.branch,
            semester: match.semester,
            section: match.section,
          },
        },
        { status: 409 }
      );
    }

    // 4. Insert registration
    const { data: record, error: insertError } = await supabase
      .from('registrations')
      .insert({
        full_name: payload.fullName,
        usn: payload.usn.toUpperCase(),
        phone: payload.phone,
        email: payload.email.toLowerCase(),
        section: payload.section.toUpperCase(),
        semester: payload.semester,
        branch: payload.branch,
        github_url: payload.githubUrl,
        linkedin_url: payload.linkedinUrl,
        prior_experience: payload.priorExperience,
        why_attend: payload.whyAttend,
        interests: payload.interests,
        laptop_specs: payload.laptopSpecs,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === 'PGRST205' || insertError.message.includes('Could not find the table')) {
        return NextResponse.json(
          {
            success: false,
            error:
              "The 'registrations' table is not yet created in Supabase. Please open your Supabase Dashboard -> SQL Editor, and run 'supabase/schema.sql'.",
          },
          { status: 503 }
        );
      }
      if (
        insertError.code === '42501' ||
        insertError.message.toLowerCase().includes('row-level security') ||
        insertError.message.toLowerCase().includes('violates row-level security policy')
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Database Row-Level Security (RLS) is blocking inserts. In your Supabase Dashboard -> SQL Editor, run 'supabase/fix_rls.sql' (or add SUPABASE_SERVICE_ROLE_KEY to your environment variables).",
          },
          { status: 500 }
        );
      }
      if (insertError.message.includes('limit reached')) {
        return NextResponse.json(
          {
            success: false,
            isClosed: true,
            error: `Registration closed: The ${REGISTRATION_CAP}-member limit was reached just now.`,
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to save registration: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful!',
      registration: record,
      registeredCount: currentCount + 1,
      cap: REGISTRATION_CAP,
      shortlistCount: SHORTLIST_COUNT,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error occurred.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
