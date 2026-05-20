import React, { useState, useEffect, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';

const VAPI_API_KEY = '448c5fed-c390-4245-a42e-4261616b977b';

const Agent = ({ userName, userId, interviewId, feedbackId, type, questions, role }) => {
  const [vapi, setVapi] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');

  useEffect(() => {
    const vapiInstance = new Vapi(VAPI_API_KEY);
    setVapi(vapiInstance);

    // Event listeners
    vapiInstance.on('call-start', () => {
      setConnecting(false);
      setConnected(true);
    });

    vapiInstance.on('call-end', () => {
      setConnecting(false);
      setConnected(false);
      setAssistantIsSpeaking(false);
    });

    vapiInstance.on('speech-start', () => {
      setAssistantIsSpeaking(true);
    });

    vapiInstance.on('speech-end', () => {
      setAssistantIsSpeaking(false);
    });

    vapiInstance.on('message', (message) => {
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        setTranscript((prev) => [
          ...prev,
          {
            role: message.role,
            content: message.transcript,
          },
        ]);
        setCurrentTranscript('');
      } else if (message.type === 'transcript' && message.transcriptType === 'partial') {
        setCurrentTranscript(message.transcript);
      }
    });

    vapiInstance.on('error', (error) => {
      console.error('Vapi error:', error);
      setConnecting(false);
    });

    return () => {
      vapiInstance.stop();
    };
  }, []);

  const startCall = useCallback(async () => {
    if (!vapi) return;

    setConnecting(true);

    try {
      // Use the permanent assistant ID from VAPI dashboard
      const assistantId = '1b5c0eb7-0aac-4167-8534-372ec682fe04';

      // Start the call with the permanent assistant
      await vapi.start(assistantId);
    } catch (error) {
      console.error('Error starting call:', error);
      setConnecting(false);
    }
  }, [vapi]);

  const endCall = useCallback(async () => {
    if (!vapi) return;

    vapi.stop();

    // If we have a transcript and this is an interview, generate feedback
    if (transcript.length > 0 && type === 'interview' && interviewId) {
      try {
        await api.post('/feedback/create', {
          interviewId,
          userId,
          transcript,
          feedbackId,
        });

        // Redirect to feedback page
        window.location.href = `/interview/${interviewId}/feedback`;
      } catch (error) {
        console.error('Error creating feedback:', error);
      }
    }
  }, [vapi, transcript, type, interviewId, userId, feedbackId]);

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Avatar */}
      <div className="relative">
        <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center ${assistantIsSpeaking ? 'animate-pulse' : ''}`}>
          <img
            src="/ai-avatar.png"
            alt="AI Interviewer"
            className="w-24 h-24 rounded-full"
          />
        </div>
        {assistantIsSpeaking && (
          <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping" />
        )}
      </div>

      {/* User Info */}
      <div className="text-center">
        <h3 className="text-xl font-semibold">
          {connected ? `Hello, ${userName}!` : 'AI Interviewer'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {connected
            ? 'Interview in progress...'
            : 'Click "Start Interview" to begin'}
        </p>
      </div>

      {/* Control Buttons */}
      <div>
        {!connected ? (
          <Button
            onClick={startCall}
            disabled={connecting}
            className="px-8 py-6 text-lg bg-green-600 hover:bg-green-700"
          >
            {connecting ? 'Connecting...' : 'Start Interview'}
          </Button>
        ) : (
          <Button
            onClick={endCall}
            className="px-8 py-6 text-lg bg-red-600 hover:bg-red-700"
          >
            End Interview
          </Button>
        )}
      </div>

      {/* Transcript Display */}
      {(transcript.length > 0 || currentTranscript) && (
        <div className="w-full max-w-2xl border rounded-lg p-4 bg-card">
          <h4 className="font-semibold mb-3">Conversation:</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {transcript.map((item, idx) => (
              <div
                key={idx}
                className={`p-2 rounded ${
                  item.role === 'user'
                    ? 'bg-blue-100 ml-8'
                    : 'bg-gray-100 mr-8'
                }`}
              >
                <span className="font-semibold text-xs">
                  {item.role === 'user' ? 'You: ' : 'AI: '}
                </span>
                <span className="text-sm">{item.content}</span>
              </div>
            ))}
            {currentTranscript && (
              <div className="p-2 rounded bg-gray-50 mr-8 italic">
                <span className="text-sm">{currentTranscript}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Agent;
