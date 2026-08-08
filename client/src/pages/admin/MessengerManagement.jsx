import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import { MessageSquare, Send, Bot, User, CheckCircle2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const MessengerManagement = () => {
  const [conversations, setConversations] = useState([]);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/messenger/conversations');
      if (res.success) {
        setConversations(res.data);
        if (res.data.length > 0 && !activeCustomer) {
          setActiveCustomer(res.data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (customerId) => {
    try {
      const res = await api.get(`/messenger/conversations/${customerId}`);
      if (res.success) {
        setMessages(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeCustomer) {
      fetchMessages(activeCustomer.id);
    }
  }, [activeCustomer]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeCustomer) return;

    setSending(true);
    try {
      const res = await api.post('/messenger/send', {
        customerId: activeCustomer.id,
        text: newMessage,
      });
      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            customer_id: activeCustomer.id,
            direction: 'outbound',
            content: newMessage,
            created_at: new Date().toISOString(),
            is_bot_message: false,
          },
        ]);
        setNewMessage('');
        toast.success('Message sent to customer via Messenger');
      }
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loader text="Loading Messenger conversations..." />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Messenger Chatbot Management</h1>
          <p className="text-xs text-slate-400">Integrated Facebook Messenger live conversations & bot sessions</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchConversations} icon={RefreshCw}>
          Refresh Chats
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[650px]">
        {/* Conversations List */}
        <Card className="flex flex-col p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/60">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" /> Active Customers
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveCustomer(c)}
                  className={`p-4 cursor-pointer transition-colors ${
                    activeCustomer?.id === c.id ? 'bg-cyan-500/10 border-l-4 border-cyan-400' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-100">{c.full_name || 'Customer'}</h4>
                    <span className="text-[10px] text-slate-500">
                      {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-1">{c.last_message || 'No messages'}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Live Chat Box */}
        <Card className="lg:col-span-2 flex flex-col p-0 overflow-hidden">
          {activeCustomer ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{activeCustomer.full_name}</h3>
                  <p className="text-[11px] text-slate-400">Messenger ID: {activeCustomer.messenger_id}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Live Synced
                  </span>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40">
                {messages.map((m) => {
                  const isInbound = m.direction === 'inbound';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                          isInbound
                            ? 'bg-slate-800/90 text-slate-100 border border-slate-700 rounded-tl-none'
                            : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-tr-none shadow-md'
                        }`}
                      >
                        {m.content}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 px-1">
                        {m.is_bot_message ? '🤖 AI Bot • ' : ''}
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Type a message to reply on Facebook Messenger..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm"
                />
                <Button type="submit" variant="primary" isLoading={sending} icon={Send}>
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 mb-2 opacity-30 text-cyan-400" />
              <p>Select a customer conversation to view live messages.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MessengerManagement;
