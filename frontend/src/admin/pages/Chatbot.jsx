import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, DownloadCloud, Search } from 'lucide-react';
import { chatbotAPI } from '../../api';

const normalizeListResponse = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.results) return payload.results;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

const escapeCsvValue = (value) => {
  if (value == null) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const downloadCsv = (filename, rows) => {
  const csvContent = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function AdminChatbot() {
  const [selectedSession, setSelectedSession] = useState(null);
  const [filterText, setFilterText] = useState('');

  const { data: sessionsData, isLoading: sessionsLoading, isError: sessionsError, refetch: refetchSessions } = useQuery({
    queryKey: ['chatbot-sessions'],
    queryFn: () => chatbotAPI.getSessions(),
    staleTime: 5 * 60 * 1000,
  });

  const sessions = normalizeListResponse(sessionsData);

  const filteredSessions = useMemo(() => {
    const search = filterText.trim().toLowerCase();
    if (!search) return sessions;
    return sessions.filter((session) => {
      const name = session.user_name || '';
      const email = session.user_email || '';
      const key = session.session_key || '';
      const message = session.last_message || '';
      return [name, email, key, message].some((value) => value.toLowerCase().includes(search));
    });
  }, [sessions, filterText]);

  const { data: historyData, isLoading: historyLoading, isError: historyError, refetch: refetchHistory } = useQuery({
    queryKey: ['chatbot-history', selectedSession?.session_key],
    queryFn: () => chatbotAPI.getHistory(selectedSession?.session_key),
    enabled: Boolean(selectedSession),
    staleTime: 5 * 60 * 1000,
  });

  const history = normalizeListResponse(historyData);

  const exportSessionsCsv = () => {
    const rows = [
      ['Session Key', 'User Name', 'User Email', 'Messages', 'Last Message', 'Created At', 'Updated At'],
      ...filteredSessions.map((session) => [
        session.session_key,
        session.user_name || 'Anonymous',
        session.user_email || '',
        session.message_count,
        session.last_message || '',
        new Date(session.created_at).toLocaleString(),
        new Date(session.updated_at).toLocaleString(),
      ]),
    ];
    downloadCsv('chatbot-sessions.csv', rows);
  };

  const exportConversationCsv = () => {
    if (!selectedSession || !history.length) return;
    const rows = [
      ['Session Key', selectedSession.session_key],
      ['User Name', selectedSession.user_name || 'Anonymous'],
      ['User Email', selectedSession.user_email || ''],
      [],
      ['Timestamp', 'Sender', 'Message'],
      ...history.map((message) => [
        new Date(message.created_at).toLocaleString(),
        message.sender,
        message.message,
      ]),
    ];
    downloadCsv(`chatbot-history-${selectedSession.session_key.slice(0, 8)}.csv`, rows);
  };

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (sessionsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">Failed to load chatbot sessions.</div>
          <button
            onClick={() => refetchSessions()}
            className="mt-4 inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle className="w-8 h-8 text-sky-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Chatbot Logs</h1>
              <p className="text-sm text-slate-500">Review past chatbot sessions and conversation logs.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Sessions', value: sessions.length, color: 'bg-blue-50 text-blue-700' },
              { label: 'Recent Sessions', value: Math.min(sessions.length, 5), color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Selected', value: selectedSession ? selectedSession.session_key.slice(0, 8) : 'None', color: 'bg-slate-50 text-slate-700' },
              { label: 'Last Updated', value: selectedSession ? new Date(selectedSession.updated_at).toLocaleString() : 'N/A', color: 'bg-amber-50 text-amber-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className={`mt-3 text-2xl font-semibold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filterText}
            onChange={(event) => setFilterText(event.target.value)}
            placeholder="Search sessions by name, email, key or message"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportSessionsCsv}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <DownloadCloud className="h-4 w-4" />
            Export Sessions
          </button>
          <button
            type="button"
            onClick={exportConversationCsv}
            disabled={!selectedSession || history.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DownloadCloud className="h-4 w-4" />
            Export Conversation
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-700">Chat Sessions</div>
          <div className="max-h-[560px] overflow-y-auto">
            {sessions.map((session) => (
              <button
                key={session.session_key}
                type="button"
                onClick={() => setSelectedSession(session)}
                className={`w-full text-left border-b border-slate-100 px-6 py-4 transition ${
                  selectedSession?.session_key === session.session_key ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{session.user_name}</p>
                    <p className="text-xs text-slate-500">{session.user_email || 'Anonymous'}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">{session.message_count} msgs</div>
                </div>
                <p className="mt-2 text-sm text-slate-600 truncate">{session.last_message || 'No messages yet.'}</p>
                <p className="mt-2 text-xs text-slate-400">{new Date(session.updated_at).toLocaleString()}</p>
              </button>
            ))}
            {sessions.length === 0 && (
              <div className="p-6 text-sm text-slate-500">No chatbot sessions found.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-700">Conversation</div>
          <div className="max-h-[560px] overflow-y-auto px-6 py-4 space-y-4">
            {!selectedSession ? (
              <div className="text-sm text-slate-500">Select a session to view the full chat log.</div>
            ) : historyLoading ? (
              <div className="text-sm text-slate-500">Loading history…</div>
            ) : historyError ? (
              <div className="text-sm text-rose-600">Failed to load chat history.</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-slate-500">No messages recorded for this session.</div>
            ) : (
              history.map((message, index) => (
                <div key={`${message.sender}-${index}`} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{message.sender}</span>
                    <span className="text-xs text-slate-400">{new Date(message.created_at).toLocaleString()}</span>
                  </div>
                  <div className={`rounded-2xl p-4 text-sm ${message.sender === 'bot' ? 'bg-slate-100 text-slate-900' : 'bg-blue-50 text-slate-900'}`}>
                    {message.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
