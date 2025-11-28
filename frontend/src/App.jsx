import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { api } from './api';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Throttle streaming updates: accumulate tokens in buffer, flush every frame
  const streamingBufferRef = useRef({
    stage1: {},
    stage2: {},
    stage3: ''
  });
  const rafIdRef = useRef(null);
  const conversationRef = useRef(null);

  // Keep conversationRef in sync
  useEffect(() => {
    conversationRef.current = currentConversation;
  }, [currentConversation]);

  // Flush streaming buffer to state (called via requestAnimationFrame)
  const flushStreamingBuffer = useCallback(() => {
    const buffer = streamingBufferRef.current;
    const hasContent =
      Object.keys(buffer.stage1).length > 0 ||
      Object.keys(buffer.stage2).length > 0 ||
      buffer.stage3;

    if (hasContent && conversationRef.current) {
      setCurrentConversation((prev) => {
        if (!prev || prev.messages.length === 0) return prev;
        const messages = [...prev.messages];
        const lastMsg = { ...messages[messages.length - 1] };

        // Merge stage1 buffer
        if (Object.keys(buffer.stage1).length > 0) {
          lastMsg.streaming = { ...lastMsg.streaming };
          lastMsg.streaming.stage1 = { ...lastMsg.streaming.stage1 };
          for (const [model, content] of Object.entries(buffer.stage1)) {
            lastMsg.streaming.stage1[model] =
              (lastMsg.streaming.stage1[model] || '') + content;
          }
        }

        // Merge stage2 buffer
        if (Object.keys(buffer.stage2).length > 0) {
          lastMsg.streaming = { ...lastMsg.streaming };
          lastMsg.streaming.stage2 = { ...lastMsg.streaming.stage2 };
          for (const [model, content] of Object.entries(buffer.stage2)) {
            lastMsg.streaming.stage2[model] =
              (lastMsg.streaming.stage2[model] || '') + content;
          }
        }

        // Merge stage3 buffer
        if (buffer.stage3) {
          lastMsg.streaming = { ...lastMsg.streaming };
          lastMsg.streaming.stage3 = (lastMsg.streaming.stage3 || '') + buffer.stage3;
        }

        messages[messages.length - 1] = lastMsg;
        return { ...prev, messages };
      });

      // Clear buffer
      streamingBufferRef.current = { stage1: {}, stage2: {}, stage3: '' };
    }

    rafIdRef.current = null;
  }, []);

  // Schedule a buffer flush if not already scheduled
  const scheduleFlush = useCallback(() => {
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(flushStreamingBuffer);
    }
  }, [flushStreamingBuffer]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleSendMessage = async (content) => {
    if (!currentConversationId) return;

    setIsLoading(true);
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: true,  // Start with stage1 loading
          stage2: false,
          stage3: false,
        },
        // NEW: Streaming state for each model
        streaming: {
          stage1: {},  // { "model-name": "partial text..." }
          stage2: {},  // { "model-name": "partial ranking..." }
          stage3: "",  // chairman partial text
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming
      await api.sendMessageStream(currentConversationId, content, (eventType, event) => {
        switch (eventType) {
          case 'stage1_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage1 = true;
              lastMsg.streaming.stage1 = {};
              return { ...prev, messages };
            });
            break;

          case 'stage1_token':
            // Accumulate to buffer instead of immediate setState
            streamingBufferRef.current.stage1[event.model] =
              (streamingBufferRef.current.stage1[event.model] || '') + event.content;
            scheduleFlush();
            break;

          case 'stage1_complete':
            // Flush any remaining buffer before completing
            if (rafIdRef.current) {
              cancelAnimationFrame(rafIdRef.current);
              rafIdRef.current = null;
            }
            streamingBufferRef.current = { stage1: {}, stage2: {}, stage3: '' };
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage1 = event.data;
              lastMsg.loading.stage1 = false;
              lastMsg.loading.stage2 = true;  // Auto-start stage2 loading
              lastMsg.streaming.stage1 = {};  // Clear streaming state
              return { ...prev, messages };
            });
            break;

          case 'stage2_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage2 = true;
              lastMsg.streaming.stage2 = {};
              return { ...prev, messages };
            });
            break;

          case 'stage2_token':
            // Accumulate to buffer instead of immediate setState
            streamingBufferRef.current.stage2[event.model] =
              (streamingBufferRef.current.stage2[event.model] || '') + event.content;
            scheduleFlush();
            break;

          case 'stage2_complete':
            // Flush any remaining buffer before completing
            if (rafIdRef.current) {
              cancelAnimationFrame(rafIdRef.current);
              rafIdRef.current = null;
            }
            streamingBufferRef.current = { stage1: {}, stage2: {}, stage3: '' };
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage2 = event.data;
              lastMsg.metadata = event.metadata;
              lastMsg.loading.stage2 = false;
              lastMsg.loading.stage3 = true;  // Auto-start stage3 loading
              lastMsg.streaming.stage2 = {};  // Clear streaming state
              return { ...prev, messages };
            });
            break;

          case 'stage3_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage3 = true;
              lastMsg.streaming.stage3 = '';
              return { ...prev, messages };
            });
            break;

          case 'stage3_token':
            // Accumulate to buffer instead of immediate setState
            streamingBufferRef.current.stage3 += event.content;
            scheduleFlush();
            break;

          case 'stage3_complete':
            // Flush any remaining buffer before completing
            if (rafIdRef.current) {
              cancelAnimationFrame(rafIdRef.current);
              rafIdRef.current = null;
            }
            streamingBufferRef.current = { stage1: {}, stage2: {}, stage3: '' };
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage3 = event.data;
              lastMsg.loading.stage3 = false;
              lastMsg.streaming.stage3 = '';  // Clear streaming state
              return { ...prev, messages };
            });
            break;

          case 'title_complete':
            // Reload conversations to get updated title
            loadConversations();
            break;

          case 'complete':
            // Stream complete, reload conversations list
            loadConversations();
            setIsLoading(false);
            break;

          case 'error':
            console.error('Stream error:', event.message);
            setIsLoading(false);
            break;

          default:
            console.log('Unknown event type:', eventType);
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic messages on error
      setCurrentConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;
