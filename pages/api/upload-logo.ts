import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const BUCKET = 'business-logos'
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
  }
  return map[mime] || 'png'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    const { businessId, dataUrl, mimeType } = req.body as { businessId?: string; dataUrl?: string; mimeType?: string }
    if (!businessId || !dataUrl) {
      return res.status(400).json({ error: 'businessId and dataUrl are required' })
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single()

    if (!business) {
      return res.status(403).json({ error: 'You do not have permission to update this business' })
    }

    const mimetype = (mimeType || 'image/png').toLowerCase()
    if (!ALLOWED_TYPES.includes(mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type. Use PNG, JPG, SVG, or WebP.',
      })
    }

    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    if (buffer.length > MAX_SIZE_BYTES) {
      return res.status(400).json({
        error: 'File too large. Maximum size is 2 MB.',
      })
    }

    const ext = getExtension(mimetype)
    const path = `${businessId}/${Date.now()}.${ext}`

    const { data: bucketList } = await supabaseAdmin.storage.listBuckets()
    const bucketExists = bucketList?.some((b) => b.name === BUCKET)
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: '2MB',
        allowedMimeTypes: ALLOWED_TYPES,
      })
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: mimetype,
        upsert: false,
      })

    if (uploadError) {
      console.error('[upload-logo] Upload error:', uploadError)
      return res.status(500).json({ error: 'Upload failed. Please try again.' })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(path)

    return res.status(200).json({ url: urlData.publicUrl })
  } catch (err) {
    console.error('[upload-logo] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
