-- Migration: Add weekly_report_emails opt-in to businesses table
-- Run in Supabase SQL Editor
--
-- Defaults to FALSE — no business gets weekly emails unless they explicitly opt in.
-- This prevents unexpected emails to businesses you signed up manually.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS weekly_report_emails BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN businesses.weekly_report_emails IS
  'If true, business receives a weekly performance summary email every Monday at 9am. Opt-in only — defaults to false.';
