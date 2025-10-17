import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Video, Mic, MicOff, VideoOff, Monitor, MonitorOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  isVideoCall: boolean;
}

const VideoCallModal = ({ isOpen, onClose, roomId, isVideoCall }: VideoCallModalProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      initializeCall();
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

  const initializeCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate:', event.candidate);
        }
      };

      setPeerConnection(pc);
    } catch (error) {
      console.error('Error initializing call:', error);
      toast({
        title: 'Error',
        description: 'Failed to access camera/microphone',
        variant: 'destructive',
      });
    }
  };

  const cleanup = () => {
    localStream?.getTracks().forEach((track) => track.stop());
    peerConnection?.close();
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnection
          ?.getSenders()
          .find((s) => s.track?.kind === 'video');

        if (sender) {
          sender.replaceTrack(videoTrack);
        }

        videoTrack.onended = () => {
          const originalVideoTrack = localStream?.getVideoTracks()[0];
          if (originalVideoTrack && sender) {
            sender.replaceTrack(originalVideoTrack);
          }
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } else {
        const videoTrack = localStream?.getVideoTracks()[0];
        const sender = peerConnection
          ?.getSenders()
          .find((s) => s.track?.kind === 'video');

        if (videoTrack && sender) {
          sender.replaceTrack(videoTrack);
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
      toast({
        title: 'Error',
        description: 'Failed to share screen',
        variant: 'destructive',
      });
    }
  };

  const endCall = () => {
    cleanup();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px]">
        <DialogHeader>
          <DialogTitle>{isVideoCall ? 'Video Call' : 'Audio Call'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-4 h-full">
          {/* Remote Video */}
          <div className="flex-1 bg-muted rounded-lg overflow-hidden relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">Waiting for other user...</p>
              </div>
            )}
          </div>

          {/* Local Video */}
          {isVideoCall && (
            <div className="w-48 h-36 bg-muted rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 pt-4">
          <Button
            variant={isMuted ? 'destructive' : 'secondary'}
            size="icon"
            className="rounded-full w-12 h-12"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {isVideoCall && (
            <>
              <Button
                variant={isVideoEnabled ? 'secondary' : 'destructive'}
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                variant={isScreenSharing ? 'default' : 'secondary'}
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={toggleScreenShare}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </Button>
            </>
          )}

          <Button
            variant="destructive"
            size="icon"
            className="rounded-full w-12 h-12"
            onClick={endCall}
          >
            <Phone className="w-5 h-5 rotate-135" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModal;