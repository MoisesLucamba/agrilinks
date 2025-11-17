import React, { useEffect, useState, useCallback } from "react";
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

// Função para realçar o termo pesquisado
const highlightText = (text: string, term: string) => {
  if (!term) return text;
  const regex = new RegExp(`${term}`, "gi"); // corrigido
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <strong key={i} className="text-primary">{part}</strong> : part
  );
};

const ConversationsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [conversationResults, setConversationResults] = useState<Conversation[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConvSearchTerm, setNewConvSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const navigate = useNavigate();

  // Carregar conversas
  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("conversations")
          .select("*")
          .eq("user_id", user.id)
          .order("last_timestamp", { ascending: false });

        if (error) throw error;
        setAllConversations((data as Conversation[]) || []);
        setConversationResults((data as Conversation[]) || []);
      } catch (error) {
        console.error("Erro ao carregar conversas:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as conversas",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadConversations();

    // Real-time para novas mensagens
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  // Debounce para busca
  const debounce = (func: Function, delay = 300) => {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

  const search = useCallback(
    debounce(async (term: string) => {
      if (!user || term.trim() === "") {
        setUserResults([]);
        setConversationResults(allConversations);
        return;
      }

      setLoading(true);

      try {
        // Buscar usuários
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, avatar_url")
          .ilike("full_name", `%${term}%`) // corrigido
          .neq("id", user.id)
          .limit(10);

        if (usersError) {
          console.error("Erro ao buscar usuários:", usersError);
        } else {
          setUserResults((users as UserProfile[]) || []);
        }

        // Filtrar conversas localmente
        const filtered = allConversations.filter(conv =>
          conv.title.toLowerCase().includes(term.toLowerCase())
        );
        setConversationResults(filtered);

      } catch (err) {
        console.error("Erro na busca:", err);
        toast({
          title: "Erro na busca",
          description: "Não foi possível realizar a busca",
          variant: "destructive"
        });
      }

      setLoading(false);
    }, 300),
    [user, allConversations, toast]
  );

  useEffect(() => {
    search(searchTerm);
  }, [searchTerm, search]);

  const startConversation = async (otherUserId: string, otherUserName: string, otherUserAvatar?: string | null) => {
    if (!user) return;
    
    try {
      // Verificar se já existe conversa usando participant_id
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", user.id)
        .eq("participant_id", otherUserId)
        .maybeSingle();

      if (existing) {
        navigate(`/messages/${existing.id}`); // corrigido
        return;
      }

      // Criar nova conversa com participant_id
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          participant_id: otherUserId,
          title: otherUserName,
          avatar: otherUserAvatar || null,
          last_message: null,
          last_timestamp: new Date().toISOString(),
          unread_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Conversa criada",
        description: `Conversa com ${otherUserName} iniciada!`
      });

      navigate(`/messages/${created.id}`); // corrigido
    } catch (err) {
      console.error("Erro ao iniciar conversa:", err);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a conversa",
        variant: "destructive"
      });
    }
  };

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
      return "Ontem";
    } else if (days < 7) {
      return `${days}d atrás`;
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit"
      });
    }
  };

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
          title: "Erro",
          description: "Não foi possível carregar os usuários",
          variant: "destructive"
        });
      } else {
        setAllUsers((users as UserProfile[]) || []);
      }
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    }
  };

  const filteredUsers = allUsers.filter(usr =>
    usr.full_name.toLowerCase().includes(newConvSearchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cabeçalho fixo */}
      <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 z-10 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">Mensagens</h1>
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
            placeholder="Buscar conversas ou usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </header>

      {/* Lista scrollável */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {loading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Buscando...
          </p>
        )}

        {/* Usuários encontrados */}
        {userResults.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide px-2">
              Usuários
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
                        Iniciar conversa
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
            {userResults.length > 0 && (
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide px-2">
                Conversas
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
                          {conv.last_message || "Nenhuma mensagem ainda"}
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
        {!loading && searchTerm && userResults.length === 0 && conversationResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhum resultado encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tente buscar por outro nome
            </p>
          </div>
        )}

        {!loading && !searchTerm && conversationResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma conversa ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Comece uma nova conversa com o botão +
            </p>
          </div>
        )}
      </div>

      {/* Modal Nova Conversa */}
      <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                value={newConvSearchTerm}
                onChange={(e) => setNewConvSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {newConvSearchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário disponível"}
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
