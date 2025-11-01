/*
  # Service Call Management System for alovie.com

  1. Overview
    - Creates comprehensive service call tracking system
    - Manages customer service requests with full lifecycle tracking
    - Links service calls to service engineers (profiles)

  2. New Tables
    
    a) `customers`
      - `id` (uuid, primary key, auto-generated)
      - `name` (text, not null)
      - `email` (text, unique)
      - `phone` (text)
      - `company` (text)
      - `address` (text)
      - `created_at` (timestamptz, defaults to now)
      - `updated_at` (timestamptz, defaults to now)
    
    b) `service_calls`
      - `id` (uuid, primary key, auto-generated)
      - `ticket_number` (text, unique, auto-generated)
      - `customer_id` (uuid, references customers)
      - `assigned_engineer_id` (uuid, references profiles)
      - `title` (text, not null)
      - `description` (text)
      - `priority` (text: 'low', 'medium', 'high', 'critical')
      - `status` (text: 'assigned', 'in_progress', 'closed')
      - `category` (text: 'installation', 'repair', 'maintenance', 'inspection', 'other')
      - `location` (text)
      - `scheduled_date` (timestamptz)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `notes` (text)
      - `created_at` (timestamptz, defaults to now)
      - `updated_at` (timestamptz, defaults to now)

  3. Security
    - Enable RLS on all tables
    - Engineers can view calls assigned to them
    - Engineers can update their own assigned calls
    - Read-only access to customer data for assigned calls

  4. Sample Data
    - Creates sample customers
    - Creates sample service calls in different statuses
    - Demonstrates the complete workflow

  5. Important Notes
    - Ticket numbers are auto-generated with prefix 'SC-'
    - Status workflow: assigned → in_progress → closed
    - Priority levels help engineers prioritize work
    - All timestamps are tracked for SLA monitoring
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  company text DEFAULT '',
  address text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_calls table
CREATE TABLE IF NOT EXISTS service_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL DEFAULT 'SC-' || LPAD(FLOOR(RANDOM() * 999999)::text, 6, '0'),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  assigned_engineer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'closed')),
  category text DEFAULT 'other' CHECK (category IN ('installation', 'repair', 'maintenance', 'inspection', 'other')),
  location text DEFAULT '',
  scheduled_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_calls ENABLE ROW LEVEL SECURITY;

-- Customers policies: Engineers can view customers for their assigned calls
CREATE POLICY "Engineers can view customers for assigned calls"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_calls
      WHERE service_calls.customer_id = customers.id
      AND service_calls.assigned_engineer_id = auth.uid()
    )
  );

-- Service calls policies: Engineers can view their assigned calls
CREATE POLICY "Engineers can view assigned calls"
  ON service_calls FOR SELECT
  TO authenticated
  USING (assigned_engineer_id = auth.uid());

-- Engineers can update their assigned calls
CREATE POLICY "Engineers can update assigned calls"
  ON service_calls FOR UPDATE
  TO authenticated
  USING (assigned_engineer_id = auth.uid())
  WITH CHECK (assigned_engineer_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_calls_updated_at ON service_calls;
CREATE TRIGGER update_service_calls_updated_at
  BEFORE UPDATE ON service_calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample customers
INSERT INTO customers (name, email, phone, company, address) VALUES
  ('Acme Corporation', 'contact@acme.com', '+1-555-0101', 'Acme Corporation', '123 Business Park, Tech City, TC 12345'),
  ('TechStart Solutions', 'support@techstart.com', '+1-555-0102', 'TechStart Solutions', '456 Innovation Drive, Silicon Valley, SV 67890'),
  ('Global Industries Ltd', 'service@globalind.com', '+1-555-0103', 'Global Industries Ltd', '789 Enterprise Way, Metro City, MC 54321'),
  ('Sunrise Retail', 'info@sunriseretail.com', '+1-555-0104', 'Sunrise Retail', '321 Market Street, Downtown, DT 98765'),
  ('Blue Sky Manufacturing', 'ops@bluesky.com', '+1-555-0105', 'Blue Sky Manufacturing', '654 Industrial Blvd, Factory Town, FT 13579')
ON CONFLICT (email) DO NOTHING;

-- Insert sample service calls (these will be assigned to the first engineer who logs in)
-- Note: We'll use a placeholder for assigned_engineer_id which should be updated when engineers sign up
INSERT INTO service_calls (
  customer_id,
  title,
  description,
  priority,
  status,
  category,
  location,
  scheduled_date,
  notes
)
SELECT 
  c.id,
  'HVAC System Installation',
  'Install new HVAC system in main office building. Requires 2-day installation with minimal disruption to operations.',
  'high',
  'assigned',
  'installation',
  '123 Business Park, Tech City',
  now() + interval '2 days',
  'Customer requested early morning start time'
FROM customers c WHERE c.email = 'contact@acme.com'
ON CONFLICT DO NOTHING;

INSERT INTO service_calls (
  customer_id,
  title,
  description,
  priority,
  status,
  category,
  location,
  scheduled_date,
  notes
)
SELECT 
  c.id,
  'Network Equipment Repair',
  'Server room cooling unit malfunction. Urgent repair needed.',
  'critical',
  'assigned',
  'repair',
  '456 Innovation Drive, Silicon Valley',
  now() + interval '4 hours',
  'Emergency service - customer equipment at risk'
FROM customers c WHERE c.email = 'support@techstart.com'
ON CONFLICT DO NOTHING;

INSERT INTO service_calls (
  customer_id,
  title,
  description,
  priority,
  status,
  category,
  location,
  scheduled_date,
  notes
)
SELECT 
  c.id,
  'Quarterly Maintenance Check',
  'Regular quarterly maintenance inspection of all HVAC systems across facility.',
  'medium',
  'assigned',
  'maintenance',
  '789 Enterprise Way, Metro City',
  now() + interval '1 week',
  'Scheduled maintenance as per annual contract'
FROM customers c WHERE c.email = 'service@globalind.com'
ON CONFLICT DO NOTHING;

INSERT INTO service_calls (
  customer_id,
  title,
  description,
  priority,
  status,
  category,
  location,
  scheduled_date,
  started_at,
  notes
)
SELECT 
  c.id,
  'Fire Suppression System Inspection',
  'Annual inspection of fire suppression systems in retail locations.',
  'high',
  'in_progress',
  'inspection',
  '321 Market Street, Downtown',
  now() - interval '1 hour',
  now() - interval '1 hour',
  'Currently on-site. System testing in progress.'
FROM customers c WHERE c.email = 'info@sunriseretail.com'
ON CONFLICT DO NOTHING;

INSERT INTO service_calls (
  customer_id,
  title,
  description,
  priority,
  status,
  category,
  location,
  scheduled_date,
  started_at,
  notes
)
SELECT 
  c.id,
  'Electrical Panel Upgrade',
  'Upgrading main electrical panels to support new manufacturing equipment.',
  'high',
  'in_progress',
  'installation',
  '654 Industrial Blvd, Factory Town',
  now() - interval '3 hours',
  now() - interval '2 hours',
  'Phase 1 complete. Moving to phase 2.'
FROM customers c WHERE c.email = 'ops@bluesky.com'
ON CONFLICT DO NOTHING;

INSERT INTO service_calls (
  customer_id,
  title,
  description,
  priority,
  status,
  category,
  location,
  scheduled_date,
  started_at,
  completed_at,
  notes
)
SELECT 
  c.id,
  'Security System Repair',
  'Replaced faulty motion sensors in warehouse area.',
  'medium',
  'closed',
  'repair',
  '123 Business Park, Tech City',
  now() - interval '2 days',
  now() - interval '2 days',
  now() - interval '1 day',
  'All sensors tested and operational. Customer signed off.'
FROM customers c WHERE c.email = 'contact@acme.com'
ON CONFLICT DO NOTHING;

INSERT INTO service_calls (
  customer_id,
  title,
  description,
  priority,
  status,
  category,
  location,
  scheduled_date,
  started_at,
  completed_at,
  notes
)
SELECT 
  c.id,
  'AC Unit Maintenance',
  'Routine maintenance and filter replacement for office AC units.',
  'low',
  'closed',
  'maintenance',
  '456 Innovation Drive, Silicon Valley',
  now() - interval '5 days',
  now() - interval '5 days',
  now() - interval '4 days',
  'All units serviced. Next maintenance due in 3 months.'
FROM customers c WHERE c.email = 'support@techstart.com'
ON CONFLICT DO NOTHING;