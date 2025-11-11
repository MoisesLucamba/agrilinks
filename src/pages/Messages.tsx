import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Paperclip, ArrowLeft, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  files?: { url: string; name: string }[];
}

const MAX_FILE_SIZE = 35 * 1024 * 1024; // 35MB
const BUCKET_NAME = 'chatfiles';

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [conversationTitle, setConversationTitle] = useState('');
  const [conversationAvatar, setConversationAvatar] = useState<string | null>(null);
  const [receiverId, setReceiverId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar conversa e destinatário
  useEffect(() => {
    if (!id || !user) return;

    const loadConversation = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          console.error('Erro ao carregar conversa:', error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar a conversa",
            variant: "destructive"
          });
          return;
        }

        setConversationTitle(data.title);
        setConversationAvatar(data.avatar);

        // Usar participant_id como receiver_id
        const otherUserId = data.participant_id;
        setReceiverId(otherUserId);
      } catch (err) {
        console.error('Erro ao carregar conversa:', err);
      }
    };

    loadConversation();
  }, [id, user, toast]);

  // Carregar mensagens + real-time
  useEffect(() => {
    if (!id) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Erro ao carregar mensagens:', error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as mensagens",
            variant: "destructive"
          });
        }
        
        if (data) setMessages(data as Message[]);
      } catch (err) {
        console.error('Erro ao carregar mensagens:', err);
      }
    };

    fetchMessages();

    // Real-time updates
    const channel = supabase
      .channel(conversation-${id})
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: conversation_id=eq.${id},
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, toast]);

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Upload de arquivos
  const handleFilesChange = (files: FileList) => {
    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_FILE_SIZE) {
        toast({
          title: "Arquivo muito grande",
          description: Arquivo ${files[i].name} excede o limite de 35MB,
          variant: "destructive"
        });
        continue;
      }
      newFiles.push(files[i]);
    }
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const uploadFile = async (file: File) => {
    try {
      const ext = file.name.split('.').pop();
      const fileName = ${crypto.randomUUID()}.${ext};
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error(uploadError);
        toast({
          title: "Erro ao enviar arquivo",
          description: uploadError.message,
          variant: "destructive"
        });
        return null;
      }

      const { data } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(fileName, 3600);
      return data?.signedUrl || null;
    } catch (err) {
      console.error('Erro no upload:', err);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!user || !receiverId || !id) return;
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    // Upload arquivos
    const filesData: { url: string; name: string }[] = [];
    for (const file of selectedFiles) {
      const url = await uploadFile(file);
      if (url) filesData.push({ url, name: file.name });
    }

    const messageContent = newMessage || (filesData.length > 0 ? [${filesData.length} arquivo(s)] : '');

    const messageToInsert = {
      conversation_id: id,
      sender_id: user.id,
      receiver_id: receiverId,
      content: messageContent,
      read: false,
      files: filesData.length > 0 ? filesData : undefined,
    };

    // Limpar input
    setNewMessage('');
    setSelectedFiles([]);

    // Inserir no Supabase
    const { error } = await supabase.from('messages').insert([messageToInsert]);
    
    if (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive"
      });
      return;
    }

    // Atualizar última mensagem na conversa
    await supabase
      .from('conversations')
      .update({ 
        last_message: messageContent, 
        last_timestamp: new Date().toISOString() 
      })
      .eq('id', id);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm flex items-center gap-3 px-4 py-3 shadow-sm border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversationAvatar || "/default-avatar.png"} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {conversationTitle.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-lg font-semibold">{conversationTitle}</h1>
          <p className="text-sm text-muted-foreground">Online agora</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhuma mensagem ainda</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}}>
            <div className={flex items-start gap-2 max-w-[75%] ${msg.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'}}>
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback
                  className={`text-xs ${
                    msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {msg.sender_id === user?.id ? 'EU' : conversationTitle.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div
                  className={`px-4 py-2 rounded-2xl shadow-sm transition-all ${
                    msg.sender_id === user?.id
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-card text-card-foreground rounded-bl-md border border-border'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  {msg.files &&
                    msg.files.map((f, idx) => (
                      <a key={idx} href={f.url} target="_blank" rel="noreferrer" className="block text-xs underline mt-1">
                        {f.name}
                      </a>
                    ))}
                </div>
                <span className="text-xs text-muted-foreground mt-1">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2">
          <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-5 w-5" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={(e) => e.target.files && handleFilesChange(e.target.files)}
          />
          <textarea
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 resize-none border-none focus:ring-0 bg-transparent px-2 py-1 text-sm h-10"
          />
          <Button
            type="button"
            onClick={sendMessage}
            size="icon"
            disabled={!newMessage.trim() && selectedFiles.length === 0}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Messages;