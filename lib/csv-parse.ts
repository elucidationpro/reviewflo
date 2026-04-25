/**
 * Minimal RFC-4180 CSV parser.
 * Handles quoted fields with embedded commas/newlines, double-quote escaping ("").
 * Lowercases headers, trims field whitespace.
 */

export interface CsvRow { [header: string]: string }

export interface ParseCsvOptions {
  /** Hard cap on rows to defend against pathological inputs. Default 50_000. */
  maxRows?: number
}

export interface ParseCsvResult {
  headers: string[]
  rows: CsvRow[]
}

export function parseCsv(text: string, options: ParseCsvOptions = {}): ParseCsvResult {
  const maxRows = options.maxRows ?? 50_000

  // Normalize line endings.
  const input = text.replace(/\r\n?/g, '\n')
  if (!input.trim()) return { headers: [], rows: [] }

  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let inQuotes = false
  let i = 0

  while (i < input.length) {
    const ch = input[i]

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }

    if (ch === ',') {
      record.push(field)
      field = ''
      i++
      continue
    }

    if (ch === '\n') {
      record.push(field)
      records.push(record)
      record = []
      field = ''
      i++
      if (records.length > maxRows) break
      continue
    }

    field += ch
    i++
  }

  // Flush trailing field/record.
  if (field.length > 0 || record.length > 0) {
    record.push(field)
    records.push(record)
  }

  if (records.length === 0) return { headers: [], rows: [] }

  const rawHeaders = records[0]
  const headers = rawHeaders.map((h) => h.trim().toLowerCase())

  const rows: CsvRow[] = []
  for (let r = 1; r < records.length; r++) {
    const cells = records[r]
    // Skip fully empty trailing rows.
    if (cells.every((c) => c.trim() === '')) continue
    const row: CsvRow = {}
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = (cells[c] ?? '').trim()
    }
    rows.push(row)
  }

  return { headers, rows }
}

const FIRST_NAME_KEYS = ['first_name', 'firstname', 'first', 'given_name', 'givenname']
const LAST_NAME_KEYS = ['last_name', 'lastname', 'last', 'surname', 'family_name']
const EMAIL_KEYS = ['email', 'email_address', 'emailaddress', 'e-mail']
const PHONE_KEYS = ['phone', 'phone_number', 'phonenumber', 'mobile', 'cell', 'cell_phone']

function pick(row: CsvRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface NormalizedContact {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
}

export interface NormalizeResult {
  contacts: NormalizedContact[]
  skipped_missing: number
  skipped_invalid_email: number
}

/**
 * Map raw CSV rows to normalized contacts.
 * - Requires at least one of email/phone (skipped_missing if neither).
 * - Lowercases email; rejects malformed (skipped_invalid_email).
 * - Phone: keep digits + leading "+" if present; otherwise drops the row's phone but keeps email.
 */
export function normalizeContacts(rows: CsvRow[]): NormalizeResult {
  const contacts: NormalizedContact[] = []
  let skipped_missing = 0
  let skipped_invalid_email = 0

  for (const row of rows) {
    const firstName = pick(row, FIRST_NAME_KEYS) || null
    const lastName = pick(row, LAST_NAME_KEYS) || null
    let email: string | null = pick(row, EMAIL_KEYS).toLowerCase() || null
    const rawPhone = pick(row, PHONE_KEYS)

    if (email && !EMAIL_REGEX.test(email)) {
      skipped_invalid_email++
      email = null
    }

    let phone: string | null = null
    if (rawPhone) {
      const hasPlus = rawPhone.startsWith('+')
      const digits = rawPhone.replace(/\D/g, '')
      if (digits.length >= 7) phone = (hasPlus ? '+' : '') + digits
    }

    if (!email && !phone) {
      skipped_missing++
      continue
    }

    contacts.push({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
    })
  }

  return { contacts, skipped_missing, skipped_invalid_email }
}
