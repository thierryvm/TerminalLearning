/**
 * submitTicket — Sprint 2.C Étape 2 (THI-295) support ticket submission flow.
 *
 * Orchestrates the full client-side submit path for a support ticket:
 *   1. Validate description length + (optional) screenshot MIME/size client-side
 *      (mirror of the DB CHECK constraints from migrations 028/029 + bucket
 *      allow-list from migration 030 — fail fast, friendly FR message).
 *   2. If a screenshot is attached: upload it to the private `support_screenshots`
 *      bucket under `{userId}/{uuid}.{ext}` (the first path segment must equal the
 *      caller uid — enforced by the RLS INSERT policy in migration 030).
 *   3. Mint a 7-day signed URL for the object. The resulting URL matches the
 *      migration 029 M1 CHECK (`.../object/sign/support_screenshots/...`), so the
 *      ticket INSERT is accepted; any other URL shape would be rejected at the DB.
 *   4. INSERT the ticket row (RLS WITH CHECK forces user_id = auth.uid()).
 *
 * On INSERT failure after a successful upload, the orphaned object is removed
 * best-effort (the user-delete-own RLS policy covers this) so a rejected ticket
 * does not leave a dangling screenshot in storage.
 *
 * RLS / constraint errors are mapped to actionable FR messages (no technical
 * jargon surfaced to the user; raw codes flow to Sentry server-side per the
 * THI-241 doctrine). Returns `{ error: null }` on success.
 */
import { supabase } from '@/lib/supabase';
import type { SupportTicketType } from '@/app/types/database';

export const SUPPORT_BUCKET = 'support_screenshots';
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB — mirror migration 030 file_size_limit
export const ALLOWED_SCREENSHOT_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 5000;
const SIGNED_URL_TTL_SECONDS = 604800; // 7 days — matches column comment (migration 028)

type AllowedMime = (typeof ALLOWED_SCREENSHOT_MIME)[number];

const EXT_BY_MIME: Record<AllowedMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export interface SubmitTicketParams {
  userId: string;
  type: SupportTicketType;
  description: string;
  /** Optional screenshot. Validated against ALLOWED_SCREENSHOT_MIME + MAX_SCREENSHOT_BYTES. */
  screenshot?: File | null;
}

export interface SubmitTicketResult {
  error: string | null;
}

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_SCREENSHOT_MIME as readonly string[]).includes(mime);
}

export async function submitTicket(params: SubmitTicketParams): Promise<SubmitTicketResult> {
  const { userId, type, screenshot } = params;
  const description = params.description.trim();

  if (!supabase) {
    return { error: 'Le service est indisponible pour le moment. Réessayez plus tard.' };
  }
  if (!userId) {
    return { error: 'Connectez-vous pour envoyer un signalement.' };
  }
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    return {
      error: `La description doit faire entre ${DESCRIPTION_MIN} et ${DESCRIPTION_MAX} caractères.`,
    };
  }

  let screenshotUrl: string | null = null;
  let uploadedPath: string | null = null;

  if (screenshot) {
    if (!isAllowedMime(screenshot.type)) {
      return { error: 'Format d’image non supporté. Utilisez PNG, JPG ou WebP.' };
    }
    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      return { error: 'L’image dépasse 5 Mo. Compressez-la ou choisissez-en une plus petite.' };
    }

    const ext = EXT_BY_MIME[screenshot.type];
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(SUPPORT_BUCKET)
      .upload(path, screenshot, { contentType: screenshot.type, upsert: false });
    if (uploadError) {
      return { error: 'Impossible d’envoyer l’image. Réessayez sans capture ou plus tard.' };
    }
    uploadedPath = path;

    const { data: signed, error: signError } = await supabase.storage
      .from(SUPPORT_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) {
      // Roll back the orphaned upload before bailing.
      await supabase.storage.from(SUPPORT_BUCKET).remove([path]);
      return { error: 'Impossible de finaliser l’envoi de l’image. Réessayez plus tard.' };
    }
    screenshotUrl = signed.signedUrl;
  }

  const { error: insertError } = await supabase
    .from('support_tickets')
    .insert({ user_id: userId, type, description, screenshot_url: screenshotUrl });

  if (insertError) {
    // Best-effort cleanup so a rejected ticket leaves no dangling screenshot.
    if (uploadedPath) {
      await supabase.storage.from(SUPPORT_BUCKET).remove([uploadedPath]);
    }
    if (insertError.code === '42501' || insertError.code === 'PGRST301') {
      return { error: 'Connectez-vous pour envoyer un signalement.' };
    }
    return { error: 'Impossible d’envoyer le signalement pour le moment. Réessayez dans un instant.' };
  }

  return { error: null };
}
