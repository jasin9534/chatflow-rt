import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MessageCircle, Video, Users, Shield } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/chat');
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-3xl flex items-center justify-center shadow-lg">
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ChatFlow
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with friends and colleagues through instant messaging, voice calls, and video chat.
            All in one beautiful, secure platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="text-lg px-8 shadow-lg hover:shadow-xl transition-shadow"
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="text-lg px-8"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-20">
          <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow animate-fade-in">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Messaging</h3>
            <p className="text-muted-foreground">
              Send and receive messages instantly with typing indicators and read receipts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Video & Voice Calls</h3>
            <p className="text-muted-foreground">
              High-quality video and audio calls with screen sharing capabilities.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Group Chats</h3>
            <p className="text-muted-foreground">
              Create group conversations and collaborate with multiple people at once.
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-20 text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-6 py-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">End-to-end encrypted conversations</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
