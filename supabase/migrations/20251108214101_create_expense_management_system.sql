/*
  # Expense Management System for Service Engineers

  1. Overview
    - Creates expense submission and tracking system
    - Allows service engineers to track their monthly expenses
    - Manages approval workflow for expense claims
    - Stores expense receipts and documentation

  2. New Tables
    
    a) `expense_submissions`
      - `id` (uuid, primary key, auto-generated)
      - `engineer_id` (uuid, references profiles)
      - `expense_date` (date, not null)
      - `category` (text: 'travel', 'meals', 'materials', 'fuel', 'accommodation', 'other')
      - `amount` (numeric, not null)
      - `currency` (text, default 'USD')
      - `description` (text, not null)
      - `receipt_url` (text)
      - `service_call_id` (uuid, references service_calls, nullable)
      - `status` (text: 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid')
      - `submitted_at` (timestamptz)
      - `reviewed_at` (timestamptz)
      - `reviewed_by` (uuid, references profiles, nullable)
      - `review_notes` (text)
      - `payment_date` (timestamptz)
      - `created_at` (timestamptz, defaults to now)
      - `updated_at` (timestamptz, defaults to now)

  3. Security
    - Enable RLS on expense_submissions table
    - Engineers can view only their own expenses
    - Engineers can create and update their own draft/submitted expenses
    - Engineers cannot modify approved, rejected, or paid expenses

  4. Sample Data
    - Creates sample expense submissions for different months
    - Demonstrates various expense categories and statuses
    - Links some expenses to service calls

  5. Important Notes
    - Expenses are tied to specific dates for monthly reporting
    - Status workflow: draft → submitted → under_review → approved/rejected → paid
    - Receipt URLs will be populated when integrated with file storage
    - Expenses can optionally reference service calls for context
*/

-- Create expense_submissions table
CREATE TABLE IF NOT EXISTS expense_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('travel', 'meals', 'materials', 'fuel', 'accommodation', 'other')),
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'USD',
  description text NOT NULL,
  receipt_url text DEFAULT '',
  service_call_id uuid REFERENCES service_calls(id) ON DELETE SET NULL,
  status text DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes text DEFAULT '',
  payment_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE expense_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Engineers can view their own expenses
CREATE POLICY "Engineers can view own expenses"
  ON expense_submissions FOR SELECT
  TO authenticated
  USING (engineer_id = auth.uid());

-- Policy: Engineers can insert their own expenses
CREATE POLICY "Engineers can create own expenses"
  ON expense_submissions FOR INSERT
  TO authenticated
  WITH CHECK (engineer_id = auth.uid());

-- Policy: Engineers can update their own non-finalized expenses
CREATE POLICY "Engineers can update own pending expenses"
  ON expense_submissions FOR UPDATE
  TO authenticated
  USING (engineer_id = auth.uid() AND status IN ('draft', 'submitted'))
  WITH CHECK (engineer_id = auth.uid() AND status IN ('draft', 'submitted'));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_expense_submissions_updated_at ON expense_submissions;
CREATE TRIGGER update_expense_submissions_updated_at
  BEFORE UPDATE ON expense_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_expense_submissions_engineer_date 
  ON expense_submissions(engineer_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expense_submissions_status 
  ON expense_submissions(engineer_id, status);

-- Insert sample expense submissions
-- Current month expenses
INSERT INTO expense_submissions (
  engineer_id,
  expense_date,
  category,
  amount,
  description,
  status,
  submitted_at
)
SELECT 
  p.id,
  CURRENT_DATE - INTERVAL '2 days',
  'fuel',
  85.50,
  'Fuel for travel to customer site - Acme Corporation',
  'submitted',
  CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM profiles p
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expense_submissions (
  engineer_id,
  expense_date,
  category,
  amount,
  description,
  status,
  submitted_at,
  reviewed_at,
  review_notes
)
SELECT 
  p.id,
  CURRENT_DATE - INTERVAL '5 days',
  'meals',
  42.00,
  'Lunch during extended service call',
  'under_review',
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'Reviewing receipt documentation'
FROM profiles p
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expense_submissions (
  engineer_id,
  expense_date,
  category,
  amount,
  description,
  status,
  submitted_at
)
SELECT 
  p.id,
  CURRENT_DATE - INTERVAL '7 days',
  'materials',
  156.75,
  'Replacement parts for emergency repair - TechStart Solutions',
  'submitted',
  CURRENT_TIMESTAMP - INTERVAL '7 days'
FROM profiles p
LIMIT 1
ON CONFLICT DO NOTHING;

-- Last month expenses (approved)
INSERT INTO expense_submissions (
  engineer_id,
  expense_date,
  category,
  amount,
  description,
  status,
  submitted_at,
  reviewed_at,
  review_notes
)
SELECT 
  p.id,
  CURRENT_DATE - INTERVAL '25 days',
  'travel',
  125.00,
  'Round trip mileage to Global Industries facility',
  'approved',
  CURRENT_TIMESTAMP - INTERVAL '25 days',
  CURRENT_TIMESTAMP - INTERVAL '20 days',
  'Approved. Standard mileage rate applied.'
FROM profiles p
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expense_submissions (
  engineer_id,
  expense_date,
  category,
  amount,
  description,
  status,
  submitted_at,
  reviewed_at,
  review_notes,
  payment_date
)
SELECT 
  p.id,
  CURRENT_DATE - INTERVAL '28 days',
  'fuel',
  92.30,
  'Fuel expenses for multiple service calls',
  'paid',
  CURRENT_TIMESTAMP - INTERVAL '28 days',
  CURRENT_TIMESTAMP - INTERVAL '23 days',
  'Approved and processed for payment',
  CURRENT_TIMESTAMP - INTERVAL '15 days'
FROM profiles p
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expense_submissions (
  engineer_id,
  expense_date,
  category,
  amount,
  description,
  status,
  submitted_at,
  reviewed_at,
  review_notes
)
SELECT 
  p.id,
  CURRENT_DATE - INTERVAL '32 days',
  'accommodation',
  180.00,
  'Hotel stay for multi-day installation project',
  'approved',
  CURRENT_TIMESTAMP - INTERVAL '32 days',
  CURRENT_TIMESTAMP - INTERVAL '27 days',
  'Approved. Pre-authorized by project manager.'
FROM profiles p
LIMIT 1
ON CONFLICT DO NOTHING;

-- Two months ago expenses (mostly paid)
INSERT INTO expense_submissions (
  engineer_id,
  expense_date,
  category,
  amount,
  description,
  status,
  submitted_at,
  reviewed_at,
  review_notes,
  payment_date
)
SELECT 
  p.id,
  CURRENT_DATE - INTERVAL '45 days',
  'meals',
  38.50,
  'Dinner during evening emergency call',
  'paid',
  CURRENT_TIMESTAMP - INTERVAL '45 days',
  CURRENT_TIMESTAMP - INTERVAL '40 days',
  'Approved',
  CURRENT_TIMESTAMP - INTERVAL '35 days'
FROM profiles p
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expense_submissions (
  engineer_id,
  expense_date,
  category,
  amount,
  description,
  status,
  submitted_at,
  reviewed_at,
  review_notes,
  payment_date
)
SELECT 
  p.id,
  CURRENT_DATE - INTERVAL '50 days',
  'materials',
  215.00,
  'Specialized tools for maintenance work',
  'paid',
  CURRENT_TIMESTAMP - INTERVAL '50 days',
  CURRENT_TIMESTAMP - INTERVAL '45 days',
  'Approved. Tools added to inventory.',
  CURRENT_TIMESTAMP - INTERVAL '35 days'
FROM profiles p
LIMIT 1
ON CONFLICT DO NOTHING;

-- One rejected expense for demonstration
INSERT INTO expense_submissions (
  engineer_id,
  expense_date,
  category,
  amount,
  description,
  status,
  submitted_at,
  reviewed_at,
  review_notes
)
SELECT 
  p.id,
  CURRENT_DATE - INTERVAL '10 days',
  'meals',
  75.00,
  'Team dinner',
  'rejected',
  CURRENT_TIMESTAMP - INTERVAL '10 days',
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  'Not eligible for reimbursement. Please review expense policy regarding team meals.'
FROM profiles p
LIMIT 1
ON CONFLICT DO NOTHING;