import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qawrdhxyadfmuxdzeslo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhd3JkaHh5YWRmbXV4ZHplc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTY5MTIsImV4cCI6MjA3NjEzMjkxMn0.SglbTao2ncvzhLQgEseD1ol1Bi1Ep9wxpzJo96cFMqM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
