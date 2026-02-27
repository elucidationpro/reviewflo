import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { isValidSlug, isReservedSlug, normalizeSlugForValidation } from '@/lib/slug-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { slug } = req.body;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ available: false, error: 'Slug is required' });
    }

    const normalized = normalizeSlugForValidation(slug);
    if (isReservedSlug(normalized)) {
      return res.status(400).json({
        available: false,
        error: 'That link is reserved. Please choose another.',
      });
    }
    if (!isValidSlug(normalized)) {
      return res.status(400).json({
        available: false,
        error: 'Use only letters, numbers, and hyphens. 3–30 characters.',
      });
    }

    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', normalized)
      .single();

    return res.status(200).json({
      available: !existing,
      slug: normalized,
    });
  } catch (error) {
    console.error('Error checking slug:', error);
    return res.status(500).json({ available: false, error: 'Could not check availability' });
  }
}
