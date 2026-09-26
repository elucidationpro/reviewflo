/** Bearer credentials stay in the first-party header, never OAuth URLs/history. */
export async function connectGoogle(accessToken: string, businessId: string, onboarding = false) {
  const res = await fetch('/api/auth/google/connect', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ businessId, onboarding }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Unable to connect Google')
  window.location.assign(data.url)
}
