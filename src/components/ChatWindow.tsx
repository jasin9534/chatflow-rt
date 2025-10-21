import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Phone, Video, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  profiles: Profile;
}

interface ChatWindowProps {
  roomId: string;
  currentUser: Profile;
  onVideoCall?: () => void;
  onAudioCall?: () => void;
}

const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long (max 5000 characters)')
});

const ChatWindow = ({ roomId, currentUser, onVideoCall, onAudioCall }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  useEffect(() => {
    if (roomId) {
      loadMessages();
      loadOtherUser();
      subscribeToMessages();
      subscribeToTyping();
    }

    return () => {
      supabase.removeAllChannels();
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles (*)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
    }
  };

  const loadOtherUser = async () => {
    const { data } = await supabase
      .from('chat_room_members')
      .select('profiles (*)')
      .eq('room_id', roomId)
      .neq('user_id', currentUser.id)
      .single();

    if (data) {
      setOtherUser(data.profiles as Profile);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          if (data && payload.new) {
            const newMessage: Message = {
              id: payload.new.id,
              content: payload.new.content,
              sender_id: payload.new.sender_id,
              created_at: payload.new.created_at,
              profiles: data,
            };
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToTyping = () => {
    const channel = supabase
      .channel(`typing:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const typingData = payload.new as any;
          if (typingData && typingData.user_id !== currentUser.id) {
            setOtherUserTyping(typingData.is_typing || false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateTypingStatus = async (typing: boolean) => {
    await supabase
      .from('typing_indicators')
      .upsert({
        room_id: roomId,
        user_id: currentUser.id,
        is_typing: typing,
        updated_at: new Date().toISOString(),
      });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 1000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = messageSchema.safeParse({ content: newMessage });
    if (!validation.success) {
      toast({
        title: 'Invalid message',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: currentUser.id,
      content: validation.data.content,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      return;
    }

    setNewMessage('');
    setIsTyping(false);
    updateTypingStatus(false);
  };

  if (!otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="h-16 border-b border-border px-6 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherUser.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {otherUser.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{otherUser.username}</h2>
            <p className="text-xs text-muted-foreground">
              {otherUserTyping ? 'typing...' : otherUser.status === 'online' ? 'Active now' : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onAudioCall}>
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onVideoCall}>
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundColor: 'hsl(var(--chat-bg))' }}>
        {messages.map((message) => {
          const isSent = message.sender_id === currentUser.id;
          return (
            <div
              key={message.id}
              className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isSent
                    ? 'bg-[hsl(var(--chat-bubble-sent))] text-white'
                    : 'bg-[hsl(var(--chat-bubble-received))] text-foreground border border-border'
                }`}
              >
                <p className="break-words">{message.content}</p>
                <p className={`text-xs mt-1 ${isSent ? 'text-white/70' : 'text-muted-foreground'}`}>
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleInputChange}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;