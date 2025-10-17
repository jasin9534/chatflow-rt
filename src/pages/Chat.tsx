import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ChatSidebar from '@/components/ChatSidebar';
import ChatWindow from '@/components/ChatWindow';
import VideoCallModal from '@/components/VideoCallModal';
import { MessageCircle } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

const Chat = () => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showAudioCall, setShowAudioCall] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      setCurrentUser(profile);
      await supabase
        .from('profiles')
        .update({ status: 'online' })
        .eq('id', session.user.id);
    }

    window.addEventListener('beforeunload', () => {
      supabase
        .from('profiles')
        .update({ status: 'offline', last_seen: new Date().toISOString() })
        .eq('id', session.user.id);
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar
        currentUser={currentUser}
        onSelectRoom={setSelectedRoomId}
        selectedRoomId={selectedRoomId}
      />

      {selectedRoomId && currentUser ? (
        <ChatWindow
          roomId={selectedRoomId}
          currentUser={currentUser}
          onVideoCall={() => setShowVideoCall(true)}
          onAudioCall={() => setShowAudioCall(true)}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-background">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to ChatFlow</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Select a conversation from the sidebar or search for someone to start chatting
          </p>
        </div>
      )}

      {selectedRoomId && (
        <>
          <VideoCallModal
            isOpen={showVideoCall}
            onClose={() => setShowVideoCall(false)}
            roomId={selectedRoomId}
            isVideoCall={true}
          />
          <VideoCallModal
            isOpen={showAudioCall}
            onClose={() => setShowAudioCall(false)}
            roomId={selectedRoomId}
            isVideoCall={false}
          />
        </>
      )}
    </div>
  );
};

export default Chat;