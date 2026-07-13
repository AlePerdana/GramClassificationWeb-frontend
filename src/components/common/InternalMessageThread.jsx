import React, { useEffect, useState } from 'react';
import authService from '../../service/authService';
import { APP_CONFIG } from '../../utils/constant';

const API_HOST = APP_CONFIG.API_HOST;

const InternalMessageThread = ({ specimenId, readOnly = false, compact = false, hideHeader = false, placeholder = "Tulis komentar..." }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    if (!specimenId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_HOST}/api/messages/?specimen_id=${specimenId}`, {
        headers: { Accept: 'application/json', ...authService.getAuthorizationHeader() },
      });
      if (res.status === 401) {
        authService.clearSession();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
      }
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages();
  }, [specimenId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_HOST}/api/messages/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...authService.getAuthorizationHeader(),
        },
        body: JSON.stringify({ specimen_id: specimenId, message_text: newMessage.trim() }),
      });
      if (res.status === 401) {
        authService.clearSession();
        return;
      }
      if (res.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  };

  const getRoleIcon = (role) => {
    if (role === 'Dokter') return '👨‍⚕️';
    if (role === 'Analis') return '🔬';
    return '👤';
  };

  const renderMessageItem = (msg) => (
    <div key={msg.id} className="flex gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm">
        {getRoleIcon(msg.sender_role)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-slate-800">{msg.sender_name}</span>
          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
            msg.sender_role === 'Dokter'
              ? 'bg-blue-100 text-blue-700'
              : msg.sender_role === 'Analis'
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-600'
          }`}>
            {msg.sender_role || 'User'}
          </span>
          <span className="text-[11px] text-slate-400 ml-auto">
            {msg.created_at ? new Date(msg.created_at).toLocaleString('id-ID') : ''}
          </span>
        </div>
        <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
          {msg.message_text}
        </div>
      </div>
    </div>
  );

  const renderMessageList = () => {
    if (loading) {
      return <p className="text-sm text-gray-400 text-center py-6">Memuat komentar...</p>;
    }
    if (messages.length === 0) {
      return <p className="text-sm text-gray-400 text-center py-6">Belum ada komentar.</p>;
    }
    return (
      <div className="space-y-5">
        {messages.map(renderMessageItem)}
      </div>
    );
  };

  const renderInput = () => {
    const isInputDisabled = sending || !specimenId;
    const finalPlaceholder = specimenId ? placeholder : "Harap unggah sampel terlebih dahulu untuk menulis komentar...";
    return (
      <div className="border-t border-slate-200 bg-white">
        <div className="p-4">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={finalPlaceholder}
            rows={2}
            className="w-full text-sm px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none resize-none mb-2"
            disabled={isInputDisabled}
          />
          <div className="flex justify-end">
            <button
              onClick={sendMessage}
              disabled={isInputDisabled || !newMessage.trim()}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {sending ? 'Mengirim...' : 'Kirim Komentar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Compact mode: digunakan di banner revisi halaman proses
  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {!hideHeader && (
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h4 className="text-xs font-bold text-slate-600">
              💬 Komentar ({messages.length})
            </h4>
          </div>
        )}
        <div className="max-h-48 overflow-y-auto p-3 space-y-3">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-4">Memuat komentar...</p>
          ) : messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px]">
                    {getRoleIcon(msg.sender_role)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-bold text-slate-700">{msg.sender_name}</span>
                      <span className={`px-1 py-0.5 text-[8px] font-bold rounded-full ${
                        msg.sender_role === 'Dokter' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {msg.sender_role}
                      </span>
                      <span className="text-[9px] text-slate-400 ml-auto">
                        {msg.created_at ? new Date(msg.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      {msg.message_text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada komentar.</p>
          )}
        </div>
        {!readOnly && (
          <div className="border-t border-slate-100 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Tulis komentar..."
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? '...' : 'Kirim'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full forum/comment layout
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {!hideHeader && (
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h4 className="text-sm font-bold text-slate-700">
            💬 Komentar {messages.length > 0 && `(${messages.length})`}
          </h4>
        </div>
      )}
      <div className="max-h-80 overflow-y-auto p-5">
        {renderMessageList()}
      </div>
      {!readOnly && renderInput()}
    </div>
  );
};

export default InternalMessageThread;
