import { useState, useEffect } from 'react';
import { LogOut, Heart, RefreshCw, Receipt, Calendar, DollarSign, FileText, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Breadcrumb from './Breadcrumb';
import type { User } from '@supabase/supabase-js';
import type { ExpenseSubmission } from '../types';

interface ExpenseSubmissionsProps {
  user: User;
  onNavigateHome: () => void;
}

export default function ExpenseSubmissions({ user, onNavigateHome }: ExpenseSubmissionsProps) {
  const [expenses, setExpenses] = useState<ExpenseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_submissions')
        .select('*')
        .eq('engineer_id', user.id)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      if (data) {
        setExpenses(data as ExpenseSubmission[]);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses();

    const channel = supabase
      .channel('expense_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_submissions',
          filter: `engineer_id=eq.${user.id}`,
        },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchExpenses();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getMonthYear = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { year: 'numeric', month: 'long' });
  };

  const uniqueMonths = Array.from(
    new Set(expenses.map(exp => getMonthYear(exp.expense_date)))
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const filteredExpenses = selectedMonth === 'all'
    ? expenses
    : expenses.filter(exp => getMonthYear(exp.expense_date) === selectedMonth);

  const getStatusColor = (status: ExpenseSubmission['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'paid':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoryIcon = (category: ExpenseSubmission['category']) => {
    switch (category) {
      case 'travel':
        return '🚗';
      case 'meals':
        return '🍽️';
      case 'materials':
        return '🔧';
      case 'fuel':
        return '⛽';
      case 'accommodation':
        return '🏨';
      case 'other':
        return '📋';
      default:
        return '📄';
    }
  };

  const calculateTotals = (expenseList: ExpenseSubmission[]) => {
    const total = expenseList.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const approved = expenseList
      .filter(exp => exp.status === 'approved' || exp.status === 'paid')
      .reduce((sum, exp) => sum + Number(exp.amount), 0);
    const pending = expenseList
      .filter(exp => exp.status === 'submitted' || exp.status === 'under_review')
      .reduce((sum, exp) => sum + Number(exp.amount), 0);

    return { total, approved, pending };
  };

  const totals = calculateTotals(filteredExpenses);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">alovie</span>
                <p className="text-xs text-gray-500">Service Engineer Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="text-sm text-gray-700 hidden sm:block">
                <div className="font-medium">{user.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumb
          items={[
            { label: 'Dashboard', onClick: onNavigateHome },
            { label: 'Expense Submissions' },
          ]}
        />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Expense Submissions</h1>
            <p className="text-gray-600">Track and manage your monthly expense claims</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All Months</option>
              {uniqueMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Total Submitted</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Approved</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.approved)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Pending Review</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.pending)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No expense submissions found</p>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(expense.expense_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getCategoryIcon(expense.category)}</span>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {expense.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-gray-900 max-w-md">
                            {expense.description}
                            {expense.review_notes && expense.status !== 'submitted' && (
                              <p className="text-xs text-gray-500 mt-1 italic">
                                Note: {expense.review_notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(expense.amount, expense.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(expense.status)}`}>
                          {expense.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.submitted_at ? formatDate(expense.submitted_at) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredExpenses.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This data comes from the expense management system. Full integration with expense submission and receipt upload will be available in the next release.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
