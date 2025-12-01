import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Send, 
  Paperclip, 
  ArrowLeft, 
  MessageSquare, 
  X,
  Clock,
  CheckCheck,
  File,
  Download,
  MoreVertical,
  Smile,
  Phone,
  Video
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// --- Tipos ---

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  files?: { url: string; name: string; size?: number }[] | null;
}

interface Conversation {
  id: string;
  title: string;
  avatar: string | null;
  participant_id: string;
  last_message?: string;
  last_timestamp?: string;
}

// --- Constantes ---

const MAX_FILE_SIZE = 35 * 1024 * 1024; // 35MB
const BUCKET_NAME = "chatfiles";
const MAX_MESSAGE_LENGTH = 5000;

// --- Componentes Auxiliares ---

interface FilePreviewProps {
  file: { url: string; name: string; size?: number };
  onRemove?: () => void;
  isPreview?: boolean;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onRemove, isPreview = false }) => {
  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["pdf", "doc", "docx", "txt"].includes(ext || "")) return "📄";
    if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return "🖼️";
    if (["mp3", "wav", "m4a"].includes(ext || "")) return "🎵";
    if (["mp4", "avi", "mov"].includes(ext || "")) return "🎬";
    return "📎";
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        isPreview
          ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      <span className="text-lg">{getFileIcon(file.name)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
        {file.size && <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>}
      </div>
      {isPreview && onRemove && (
        <button
          onClick={onRemove}
          className="p-1 hover:bg-blue-200 rounded-full transition-colors"
          aria-label="Remover arquivo"
        >
          <X size={16} className="text-blue-600" />
        </button>
      )}
      {!isPreview && (
        <a
          href={file.url}
          download={file.name}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          aria-label="Baixar arquivo"
        >
          <Download size={16} className="text-gray-600" />
        </a>
      )}
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName: string;
  isSent: boolean;
  showAvatar: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  senderName,
  isSent,
  showAvatar,
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`flex items-end gap-2 max-w-xs lg:max-w-md ${
          isOwn ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {showAvatar && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback
              className={`text-xs font-semibold ${
                isOwn
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                  : "bg-gradient-to-br from-gray-400 to-gray-500 text-white"
              }`}
            >
              {isOwn ? "EU" : senderName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
          {/* Bolha de mensagem */}
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm transition-all ${
              isOwn
                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm"
                : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
            }`}
          >
            <p className="text-sm leading-relaxed break-words">{message.content}</p>

            {/* Arquivos */}
            {message.files && message.files.length > 0 && (
              <div className="mt-3 space-y-2 pt-3 border-t border-opacity-20 border-current">
                {message.files.map((file, idx) => (
                  <FilePreview key={idx} file={file} isPreview={false} />
                ))}
              </div>
            )}
          </div>

          {/* Timestamp e Status */}
          <div
            className={`flex items-center gap-1 mt-1 text-xs ${
              isOwn ? "text-gray-500" : "text-gray-400"
            }`}
          >
            <span>{formatTime(message.created_at)}</span>
            {isOwn && (
              <span className="flex items-center gap-0.5">
                {isSent ? (
                  <CheckCheck size={14} className="text-green-500" />
                ) : (
                  <Clock size={14} />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Componente Principal ---

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Estados
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [sentMessageIds, setSentMessageIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // --- Efeitos ---

  // Carregar conversa
  useEffect(() => {
    if (!id || !user) return;

    const loadConversation = async () => {
      try {
        const { data, error } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) throw error;

        setConversation(data as Conversation);
      } catch (err) {
        console.error("Erro ao carregar conversa:", err);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a conversa",
          variant: "destructive",
        });
        navigate(-1);
      }
    };

    loadConversation();
  }, [id, user, navigate, toast]);

  // Carregar mensagens e configurar real-time
  useEffect(() => {
    if (!user || !id) return;

    setIsLoading(true);

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (data) {
          setMessages(data.map(msg => ({
            ...msg,
            files: msg.files ? (Array.isArray(msg.files) ? msg.files : []) : []
          })) as Message[]);
          // Marcar mensagens como lidas
          await markMessagesAsRead(data.map(msg => ({
            ...msg,
            files: msg.files ? (Array.isArray(msg.files) ? msg.files : []) : []
          })) as Message[]);
        }
      } catch (err) {
        console.error("Erro ao carregar mensagens:", err);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as mensagens",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          if (newMsg.sender_id !== user.id) {
            markMessageAsRead(newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, id, toast]);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Funções ---

  const markMessagesAsRead = async (msgs: Message[]) => {
    const unreadMessages = msgs.filter(
      (msg) => msg.receiver_id === user?.id && !msg.read
    );

    if (unreadMessages.length > 0) {
      await supabase
        .from("messages")
        .update({ read: true })
        .in(
          "id",
          unreadMessages.map((m) => m.id)
        );
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("id", messageId);
  };

  const handleFilesChange = useCallback((files: FileList) => {
    const newFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 35MB`,
          variant: "destructive",
        });
        continue;
      }

      newFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, [toast]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFile = async (file: File): Promise<{ url: string; name: string; size: number } | null> => {
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(fileName, 3600);

      return {
        url: data?.signedUrl || "",
        name: file.name,
        size: file.size,
      };
    } catch (err) {
      console.error("Erro no upload:", err);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo",
        variant: "destructive",
      });
      return null;
    }
  };

  const sendMessage = useCallback(async () => {
    if (!user || !conversation?.participant_id || !id) return;
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    setIsSending(true);

    try {
      // Upload de arquivos
      const filesData: { url: string; name: string; size: number }[] = [];
      for (const file of selectedFiles) {
        const uploadedFile = await uploadFile(file);
        if (uploadedFile) filesData.push(uploadedFile);
      }

      // Preparar conteúdo da mensagem
      const messageContent =
        newMessage.trim() ||
        (filesData.length > 0
          ? `📎 ${filesData.length} arquivo${filesData.length > 1 ? "s" : ""}`
          : "");

      if (!messageContent) {
        setIsSending(false);
        return;
      }

      // Inserir mensagem
      const messageToInsert = {
        conversation_id: id,
        sender_id: user.id,
        receiver_id: conversation.participant_id,
        content: messageContent,
        read: false,
        files: filesData.length > 0 ? filesData : undefined,
      };

      const { data, error } = await supabase
        .from("messages")
        .insert([messageToInsert])
        .select()
        .single();

      if (error || !data) throw error;

      // Marcar como enviado
      setSentMessageIds((prev) => new Set([...prev, data.id]));

      // Atualizar última mensagem da conversa
      await supabase
        .from("conversations")
        .update({
          last_message: messageContent,
          last_timestamp: new Date().toISOString(),
        })
        .eq("id", id);

      // Limpar inputs
      setNewMessage("");
      setSelectedFiles([]);
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }, [user, conversation, id, newMessage, selectedFiles, toast]);

  // Agrupar mensagens consecutivas do mesmo remetente
  const groupedMessages = useMemo(() => {
    const groups: { messages: Message[]; sender: string }[] = [];

    messages.forEach((msg) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.sender === msg.sender_id) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ messages: [msg], sender: msg.sender_id });
      }
    });

    return groups;
  }, [messages]);

  // --- Renderização ---

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen flex flex-col">
      {/* Header Premium */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Button>

            <Avatar className="h-12 w-12 ring-2 ring-blue-100">
              <AvatarImage src={conversation?.avatar || "/default-avatar.png"} />
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold">
                {conversation?.title.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-gray-900">
                {conversation?.title || "Conversa"}
              </h1>
              <div className="flex items-center gap-1">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <p className="text-sm text-gray-500">
                  {isOnline ? "Online agora" : "Offline"}
                </p>
              </div>
            </div>
          </div>

          {/* Ações do Header */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-100 text-gray-600"
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-100 text-gray-600"
            >
              <Video className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-100 text-gray-600"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Área de Mensagens */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-6 space-y-4"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
            <p className="text-gray-500 font-medium">Carregando mensagens...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-white rounded-full p-6 mb-4 shadow-sm">
              <MessageSquare className="h-12 w-12 text-gray-300" />
            </div>
            <p className="text-gray-600 font-medium mb-1">Nenhuma mensagem ainda</p>
            <p className="text-sm text-gray-400">
              Comece uma conversa enviando uma mensagem
            </p>
          </div>
        ) : (
          groupedMessages.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.messages.map((msg, msgIdx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === user.id}
                  senderName={conversation?.title || "Usuário"}
                  isSent={sentMessageIds.has(msg.id)}
                  showAvatar={
                    msgIdx === 0 ||
                    group.messages[msgIdx - 1].sender_id !== msg.sender_id
                  }
                />
              ))}
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
<footer className="sticky bottom-16 bg-white border-t border-gray-200 px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3">
          {/* Preview de Arquivos */}
          {selectedFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap p-3 bg-blue-50 rounded-lg border border-blue-200">
              {selectedFiles.map((file, idx) => (
                <FilePreview
                  key={idx}
                  file={{ url: "", name: file.name, size: file.size }}
                  onRemove={() => removeFile(idx)}
                  isPreview={true}
                />
              ))}
            </div>
          )}

          {/* Input Principal */}
<div className="flex items-end gap-2 bg-white border border-gray-300 rounded-2xl px-4 py-3 shadow-sm hover:border-gray-400 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 -mt-3">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
              disabled={isSending}
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={(e) => e.target.files && handleFilesChange(e.target.files)}
              disabled={isSending}
            />

            <textarea
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => {
                if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                  setNewMessage(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isSending) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 resize-none border-none focus:ring-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 max-h-24 outline-none"
              rows={1}
              disabled={isSending}
            />

            <Button
              type="button"
              onClick={sendMessage}
              size="icon"
              disabled={
                (!newMessage.trim() && selectedFiles.length === 0) || isSending
              }
              className="bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-600 hover:text-yellow-500 hover:bg-yellow-50"
              disabled={isSending}
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>

          {/* Contador de caracteres */}
          {newMessage.length > MAX_MESSAGE_LENGTH * 0.8 && (
            <p className="text-xs text-gray-500 text-right">
              {newMessage.length} / {MAX_MESSAGE_LENGTH}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Messages;