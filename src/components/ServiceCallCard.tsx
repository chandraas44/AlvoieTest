import { Calendar, MapPin, AlertCircle, Clock, Building2, Play, CheckCircle2 } from 'lucide-react';
import type { ServiceCall } from '../types';

interface ServiceCallCardProps {
  call: ServiceCall;
  onStatusChange: (callId: string, newStatus: ServiceCall['status']) => void;
}

export default function ServiceCallCard({ call, onStatusChange }: ServiceCallCardProps) {
  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };

  const categoryIcons = {
    installation: '🔧',
    repair: '🛠️',
    maintenance: '⚙️',
    inspection: '🔍',
    other: '📋',
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const getActionButton = () => {
    if (call.status === 'assigned') {
      return (
        <button
          onClick={() => onStatusChange(call.id, 'in_progress')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Start Work
        </button>
      );
    }
    if (call.status === 'in_progress') {
      return (
        <button
          onClick={() => onStatusChange(call.id, 'closed')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Complete
        </button>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{categoryIcons[call.category]}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1 truncate">{call.title}</h3>
            <p className="text-xs text-gray-500 font-mono">{call.ticket_number}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${priorityColors[call.priority]}`}>
          {call.priority.toUpperCase()}
        </span>
      </div>

      {call.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{call.description}</p>
      )}

      <div className="space-y-2 mb-3">
        {call.customer && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{call.customer.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">{call.location || 'No location specified'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{formatDate(call.scheduled_date)}</span>
        </div>
      </div>

      {call.notes && (
        <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{call.notes}</span>
        </div>
      )}

      {call.status === 'in_progress' && call.started_at && (
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg p-2 mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>Started {formatDate(call.started_at)}</span>
        </div>
      )}

      {call.status === 'closed' && call.completed_at && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg p-2 mb-3">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed {formatDate(call.completed_at)}</span>
        </div>
      )}

      {getActionButton()}
    </div>
  );
}
