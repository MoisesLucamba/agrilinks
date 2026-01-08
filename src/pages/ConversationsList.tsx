
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// --- Tipos ---

interface Conversation {
  id: string;
  title: string;
  last_message: string | null;
  last_timestamp: string;
  unread_count: number;
  avatar: string | null;
  participant_id: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

// --- Funções Auxiliares ---

// Função para realçar o termo pesquisado
const highlightText = (text: string, term: string) => {
  if (!term) return text;
  // Escapa caracteres especiais para uso em RegExp
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedTerm})`, "gi");
  const parts = text.split(regex);
  
  return parts.map((part, i) =>
    regex.test(part) ? <strong key={i} className="text-primary">{part}</strong> : part
  );
};

// Função de debounce
const debounce = (func: Function, delay = 300) => {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

// --- Componente Principal ---

const ConversationsList = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados
  const [searchTerm, setSearchTerm] = useState("");
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConvSearchTerm, setNewConvSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // --- Lógica de Conversas ---

  // Função para carregar conversas
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Busca todas as conversas onde o usuário é o user_id OU participant_id
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`user_id.eq.${user.id},participant_id.eq.${user.id}`)
        .order("last_timestamp", { ascending: false });

      if (error) throw error;
      setAllConversations((data as Conversation[]) || []);
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
      toast({
        title: t('common.error'),
        description: t('messages.noMessages'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Efeito para carregar conversas e configurar o Real-time
  useEffect(() => {
    loadConversations();

    if (!user) return;

    // Real-time para novas mensagens/atualizações de conversas
    const channel = supabase
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          // Filtra por conversas onde o usuário é um dos participantes
          filter: `user_id=eq.${user.id},participant_id=eq.${user.id}`, 
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadConversations]);

  // --- Lógica de Busca ---

  // Função de busca principal (debounced)
  const search = useCallback(
    debounce(async (term: string) => {
      if (!user || term.trim() === "") {
        setUserResults([]);
        return;
      }

      setLoading(true);

      try {
        // Buscar usuários
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, avatar_url")
          .ilike("full_name", `%${term}%`)
          .neq("id", user.id)
          .limit(10);

        if (usersError) {
          console.error("Erro ao buscar usuários:", usersError);
        } else {
          setUserResults((users as UserProfile[]) || []);
        }

      } catch (err) {
        console.error("Erro na busca:", err);
        toast({
          title: t('common.error'),
          description: t('messages.noResults'),
          variant: "destructive"
        });
      }

      setLoading(false);
    }, 300),
    [user, toast]
  );

  // Efeito para disparar a busca quando o termo de busca muda
  useEffect(() => {
    search(searchTerm);
  }, [searchTerm, search]);

  // Filtrar conversas localmente (useMemo para otimização)
  const conversationResults = useMemo(() => {
    if (searchTerm.trim() === "") {
      return allConversations;
    }
    return allConversations.filter(conv =>
      conv.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allConversations, searchTerm]);

  // --- Lógica de Ações ---

  // Função para iniciar ou navegar para uma conversa
  const startConversation = useCallback(async (
    participantId: string, 
    participantName: string, 
    participantAvatar: string | null
  ) => {
    if (!user) return;

    // 1. Verificar se já existe uma conversa entre os dois
    const { data: existingConv, error: searchError } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user_id.eq.${user.id},participant_id.eq.${participantId}),and(user_id.eq.${participantId},participant_id.eq.${user.id})`)
      .limit(1);

    if (searchError) {
      console.error("Erro ao buscar conversa existente:", searchError);
      toast({
        title: t('common.error'),
        description: t('messages.noResults'),
        variant: "destructive"
      });
      return;
    }

    if (existingConv && existingConv.length > 0) {
      // Conversa existe, navega para ela
      navigate(`/messages/${existingConv[0].id}`);
      return;
    }

    // 2. Se não existir, cria uma nova conversa
    try {
      const newConvData = {
        user_id: user.id,
        participant_id: participantId,
        title: participantName, // O título inicial é o nome do outro usuário
        avatar: participantAvatar,
        last_message: null,
        last_timestamp: new Date().toISOString(),
        unread_count: 0,
      };

      const { data: createdConv, error: createError } = await supabase
        .from("conversations")
        .insert([newConvData])
        .select("id")
        .single();

      if (createError) throw createError;

      // Navega para a nova conversa
      navigate(`/messages/${createdConv.id}`);
      
    } catch (error) {
      console.error("Erro ao criar nova conversa:", error);
      toast({
        title: t('common.error'),
        description: t('messages.noResults'),
        variant: "destructive"
      });
    }
  }, [user, navigate, toast, t]);

  // Função para formatar o tempo
  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("pt-BR", { 
        hour: "2-digit", 
        minute: "2-digit" 
      });
    } else if (days === 1) {
      return t('messages.yesterday');
    } else if (days < 7) {
      return `${days}${t('messages.daysAgo')}`;
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit"
      });
    }
  };

  // Função para abrir o modal de nova conversa e carregar usuários
  const openNewConversationDialog = async () => {
    if (!user) return;
    setNewConversationOpen(true);
    setNewConvSearchTerm("");
    
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .neq("id", user.id)
        .order("full_name", { ascending: true })
        .limit(50);
      
      if (error) {
        console.error("Erro ao buscar usuários:", error);
        toast({
          title: t('common.error'),
          description: t('messages.noUserFound'),
          variant: "destructive"
        });
      } else {
        setAllUsers((users as UserProfile[]) || []);
      }
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    }
  };

  // Usuários filtrados para o modal (useMemo para otimização)
  const filteredUsers = useMemo(() => {
    return allUsers.filter(usr =>
      usr.full_name.toLowerCase().includes(newConvSearchTerm.toLowerCase())
    );
  }, [allUsers, newConvSearchTerm]);

  // --- Renderização ---

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cabeçalho fixo */}
      <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 z-10 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">{t('messages.title')}</h1>
          <Button
            size="icon"
            onClick={openNewConversationDialog}
            className="rounded-full"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('messages.searchConversations')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </header>

      {/* Lista scrollável */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {loading && searchTerm.trim() !== "" && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('messages.searching')}
          </p>
        )}

        {/* Usuários encontrados */}
        {userResults.length > 0 && searchTerm.trim() !== "" && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide px-2">
              {t('messages.users')}
            </p>
            <div className="space-y-2">
              {userResults.map((usr) => (
                <Card
                  key={usr.id}
                  onClick={() => startConversation(usr.id, usr.full_name, usr.avatar_url)}
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={usr.avatar_url || "/default-avatar.png"} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {usr.full_name.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <span className="font-medium">
                        {highlightText(usr.full_name, searchTerm)}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {t('messages.clickToStart')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Conversas existentes */}
        {conversationResults.length > 0 && (
          <div>
            {userResults.length > 0 && searchTerm.trim() !== "" && (
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide px-2">
                {t('messages.conversations')}
              </p>
            )}
            <div className="space-y-2">
              {conversationResults.map((conv) => (
                <Card
                  key={conv.id}
                  onClick={() => navigate(`/messages/${conv.id}`)}
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={conv.avatar || "/default-avatar.png"} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          {conv.title.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-semibold text-sm truncate">
                          {highlightText(conv.title, searchTerm)}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {conv.last_message || t('messages.noMessageYet')}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(conv.last_timestamp)}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!loading && searchTerm.trim() !== "" && userResults.length === 0 && conversationResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('messages.noResults')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('messages.tryAnotherName')}
            </p>
          </div>
        )}

        {!loading && searchTerm.trim() === "" && conversationResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('messages.noConversations')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('messages.startWithButton')}
            </p>
          </div>
        )}
      </div>

      {/* Modal Nova Conversa */}
      <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('messages.newConversation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('messages.searchUser')}
                value={newConvSearchTerm}
                onChange={(e) => setNewConvSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {newConvSearchTerm ? t('messages.noUserFound') : t('messages.startWithButton')}
                </p>
              ) : (
                filteredUsers.map((usr) => (
                  <Card
                    key={usr.id}
                    onClick={() => {
                      startConversation(usr.id, usr.full_name, usr.avatar_url);
                      setNewConversationOpen(false);
                    }}
                    className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={usr.avatar_url || "/default-avatar.png"} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {usr.full_name.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{usr.full_name}</span>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConversationsList;