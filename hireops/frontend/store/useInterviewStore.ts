import { create } from 'zustand';

export type MessageSender = 'ai' | 'candidate';

export interface TranscriptMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: Date;
}

interface InterviewState {
  // Volatile Connection & UI States
  isConnecting: boolean;
  isAiSpeaking: boolean;
  isCandidateSpeaking: boolean;
  interviewStatus: 'idle' | 'active' | 'completed';
  
  // Real-time Chat/Transcript Memory
  transcript: TranscriptMessage[];
  socketError: string | null;
  
  // Exposing Actions
  setIsConnecting: (status: boolean) => void;
  setAiSpeaking: (status: boolean) => void;
  setCandidateSpeaking: (status: boolean) => void;
  setInterviewStatus: (status: 'idle' | 'active' | 'completed') => void;
  addTranscriptMessage: (sender: MessageSender, text: string) => void;
  setSocketError: (error: string | null) => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
  isConnecting: false,
  isAiSpeaking: false,
  isCandidateSpeaking: false,
  transcript: [],
  socketError: null,
  interviewStatus: 'idle',

  setIsConnecting: (status) => set({ isConnecting: status }),
  setAiSpeaking: (status) => set({ isAiSpeaking: status }),
  setCandidateSpeaking: (status) => set({ isCandidateSpeaking: status }),
  setInterviewStatus: (status) => set({ interviewStatus: status }),
  
  addTranscriptMessage: (sender, text) => set((state) => ({
    transcript: [...state.transcript, {
      id: Math.random().toString(36).substring(7),
      sender,
      text,
      timestamp: new Date()
    }]
  })),
  
  setSocketError: (error) => set({ socketError: error }),
  
  reset: () => set({
    isConnecting: false,
    isAiSpeaking: false,
    isCandidateSpeaking: false,
    transcript: [],
    socketError: null,
    interviewStatus: 'idle'
  })
}));
