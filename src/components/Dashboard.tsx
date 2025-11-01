import { useState, useEffect } from 'react';
import { LogOut, Heart, RefreshCw, ClipboardList, Wrench, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ServiceCallCard from './ServiceCallCard';
import type { User } from '@supabase/supabase-js';
import type { ServiceCall } from '../types';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [assignedCalls, setAssignedCalls] = useState<ServiceCall[]>([]);
  const [inProgressCalls, setInProgressCalls] = useState<ServiceCall[]>([]);
  const [closedCalls, setClosedCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServiceCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('service_calls')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('assigned_engineer_id', user.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      if (data) {
        const typedData = data as ServiceCall[];
        setAssignedCalls(typedData.filter(call => call.status === 'assigned'));
        setInProgressCalls(typedData.filter(call => call.status === 'in_progress'));
        setClosedCalls(typedData.filter(call => call.status === 'closed'));
      }
    } catch (error) {
      console.error('Error fetching service calls:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServiceCalls();

    const channel = supabase
      .channel('service_calls_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_calls',
          filter: `assigned_engineer_id=eq.${user.id}`,
        },
        () => {
          fetchServiceCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const handleStatusChange = async (callId: string, newStatus: ServiceCall['status']) => {
    try {
      const updateData: Record<string, string | null> = { status: newStatus };

      if (newStatus === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      } else if (newStatus === 'closed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('service_calls')
        .update(updateData)
        .eq('id', callId);

      if (error) throw error;

      await fetchServiceCalls();
    } catch (error) {
      console.error('Error updating service call:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchServiceCalls();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
          <div className="lg:col-span-1 flex flex-col">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Assigned Calls</h2>
                  <p className="text-sm text-gray-500">{assignedCalls.length} pending</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {assignedCalls.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No assigned calls</p>
                </div>
              ) : (
                assignedCalls.map(call => (
                  <ServiceCallCard
                    key={call.id}
                    call={call}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex-1 flex flex-col min-h-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                    <Wrench className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Working On</h2>
                    <p className="text-sm text-gray-500">{inProgressCalls.length} in progress</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {inProgressCalls.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No calls in progress</p>
                  </div>
                ) : (
                  inProgressCalls.map(call => (
                    <ServiceCallCard
                      key={call.id}
                      call={call}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Closed Calls</h2>
                    <p className="text-sm text-gray-500">{closedCalls.length} completed</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {closedCalls.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No closed calls</p>
                  </div>
                ) : (
                  closedCalls.map(call => (
                    <ServiceCallCard
                      key={call.id}
                      call={call}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
