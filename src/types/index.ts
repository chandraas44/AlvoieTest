export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCall {
  id: string;
  ticket_number: string;
  customer_id: string;
  assigned_engineer_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'assigned' | 'in_progress' | 'closed';
  category: 'installation' | 'repair' | 'maintenance' | 'inspection' | 'other';
  location: string;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface ExpenseSubmission {
  id: string;
  engineer_id: string;
  expense_date: string;
  category: 'travel' | 'meals' | 'materials' | 'fuel' | 'accommodation' | 'other';
  amount: number;
  currency: string;
  description: string;
  receipt_url: string;
  service_call_id: string | null;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
}
