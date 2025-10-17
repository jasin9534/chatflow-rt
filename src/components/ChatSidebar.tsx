import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Search, Plus, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

interface ChatRoom {
  id: string;
  name: string | null;
  is_group: boolean;
  otherUser?: Profile;
  lastMessage?: string;
  unreadCount?: number;
}

interface ChatSidebarProps {
  currentUser: Profile | null;
  onSelectRoom: (roomId: string) => void;
  selectedRoomId: string | null;
}

const ChatSidebar = ({ currentUser, onSelectRoom, selectedRoomId }: ChatSidebarProps) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      loadRooms();
      loadAllUsers();
    }
  }, [currentUser]);

  const loadRooms = async () => {
    if (!currentUser) return;

    const { data: roomMembers, error } = await supabase
      .from('chat_room_members')
      .select(`
        room_id,
        chat_rooms (
          id,
          name,
          is_group
        )
      `)
      .eq('user_id', currentUser.id);

    if (error) {
      console.error('Error loading rooms:', error);
      return;
    }

    const roomsData: ChatRoom[] = [];
    for (const member of roomMembers || []) {
      const room = member.chat_rooms as any;
      if (!room) continue;

      if (!room.is_group) {
        const { data: otherMembers } = await supabase
          .from('chat_room_members')
          .select('user_id, profiles (*)')
          .eq('room_id', room.id)
          .neq('user_id', currentUser.id)
          .single();

        if (otherMembers) {
          roomsData.push({
            id: room.id,
            name: room.name,
            is_group: room.is_group,
            otherUser: otherMembers.profiles as Profile,
          });
        }
      } else {
        roomsData.push({
          id: room.id,
          name: room.name,
          is_group: room.is_group,
        });
      }
    }

    setRooms(roomsData);
  };

  const loadAllUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUser?.id);

    if (!error && data) {
      setAllUsers(data);
    }
  };

  const createOrOpenChat = async (otherUserId: string) => {
    if (!currentUser) return;

    const { data: existingRooms } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('user_id', currentUser.id);

    if (existingRooms) {
      for (const member of existingRooms) {
        const { data: otherMember } = await supabase
          .from('chat_room_members')
          .select('room_id')
          .eq('room_id', member.room_id)
          .eq('user_id', otherUserId)
          .single();

        if (otherMember) {
          onSelectRoom(member.room_id);
          return;
        }
      }
    }

    const { data: newRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({ is_group: false })
      .select()
      .single();

    if (roomError || !newRoom) {
      toast({
        title: 'Error',
        description: 'Failed to create chat room',
        variant: 'destructive',
      });
      return;
    }

    await supabase.from('chat_room_members').insert([
      { room_id: newRoom.id, user_id: currentUser.id },
      { room_id: newRoom.id, user_id: otherUserId },
    ]);

    loadRooms();
    onSelectRoom(newRoom.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const filteredUsers = allUsers.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRooms = rooms.filter((room) => {
    const searchLower = searchQuery.toLowerCase();
    if (room.is_group) {
      return room.name?.toLowerCase().includes(searchLower);
    }
    return room.otherUser?.username.toLowerCase().includes(searchLower);
  });

  return (
    <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={currentUser?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {currentUser?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-sidebar-foreground">{currentUser?.username}</h2>
              <p className="text-xs text-sidebar-foreground/60">
                {currentUser?.status === 'online' ? 'Active now' : 'Offline'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-10 bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery && filteredUsers.length > 0 && (
          <div className="p-2">
            <p className="text-xs text-sidebar-foreground/60 px-2 py-1">Search Results</p>
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => createOrOpenChat(user.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-sidebar-accent rounded-lg transition-colors"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-sidebar-foreground">{user.username}</h3>
                  <p className="text-sm text-sidebar-foreground/60">
                    {user.status === 'online' ? 'Online' : 'Offline'}
                  </p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </button>
            ))}
          </div>
        )}

        {!searchQuery && rooms.length === 0 && (
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-sidebar-foreground/40" />
            <p className="text-sidebar-foreground/60 mb-2">No conversations yet</p>
            <p className="text-sm text-sidebar-foreground/40">
              Use the search above to find people and start chatting
            </p>
          </div>
        )}

        {(searchQuery ? filteredRooms : rooms).map((room) => {
          const displayName = room.is_group ? room.name : room.otherUser?.username;
          const avatarUrl = room.is_group ? null : room.otherUser?.avatar_url;
          const isOnline = room.otherUser?.status === 'online';

          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={`w-full flex items-center gap-3 p-3 hover:bg-sidebar-accent transition-colors ${
                selectedRoomId === room.id ? 'bg-sidebar-accent' : ''
              }`}
            >
              <div className="relative">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {displayName?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!room.is_group && (
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-sidebar ${
                    isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <h3 className="font-medium text-sidebar-foreground truncate">{displayName}</h3>
                <p className="text-sm text-sidebar-foreground/60 truncate">
                  {room.lastMessage || 'Start a conversation'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChatSidebar;