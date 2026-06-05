import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  MoreHorizontal,
  Mail,
  Shield,
  ShieldCheck,
  User,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import PaginationBar from '@/components/admin/PaginationBar';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 15, total: 0, totalPages: 0 });
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { toast } = useToast();
  const totalAdminsRef = useRef(totalAdmins);
  useEffect(() => { totalAdminsRef.current = totalAdmins; }, [totalAdmins]);

  // Debounce de busca: aguarda 400ms antes de fazer fetch
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset para página 1 ao mudar filtros
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedSearch, roleFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getUsers({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: debouncedSearch,
        role: roleFilter === 'all' ? undefined : roleFilter,
      });
      if (result.data?.users) {
        setUsers(result.data.users);
        if (result.data.pagination) {
          setPagination((p) => ({
            ...p,
            total: result.data!.pagination!.total,
            totalPages: result.data!.pagination!.totalPages,
          }));
          // Conta total de admins (chamada leve, sem paginação)
          if (totalAdminsRef.current === 0 && roleFilter === 'all') {
            api.getUsers({ page: 1, pageSize: 1, role: 'admin' }).then((r) => {
              if (r.data?.pagination) setTotalAdmins(r.data.pagination.total);
            });
          }
        }
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao carregar usuários', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, roleFilter, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filtragem agora é server-side; renderiza tudo o que veio
  const filteredUsers = users;

  const handleRoleChange = (userId: number, newRole: string) => {
    toast({
      title: "Função alterada",
      description: `Usuário atualizado para ${newRole === 'admin' ? 'Administrador' : 'Usuário'}.`,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl">Gerenciar Usuários</h1>
        <p className="text-muted-foreground">
          {pagination.total.toLocaleString('pt-BR')} usuários cadastrados
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pagination.total.toLocaleString('pt-BR')}</p>
              <p className="text-sm text-muted-foreground">Total de Usuários</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAdmins}</p>
              <p className="text-sm text-muted-foreground">Administradores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Shield className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as funções</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {loading && (
          <div className="absolute z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center inset-0 pointer-events-none">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {user.email}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                    className={user.role === 'admin' ? 'bg-gold text-primary-foreground' : ''}
                  >
                    {user.role === 'admin' ? (
                      <>
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Admin
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3 mr-1" />
                        Usuário
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')}>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Tornar Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'user')}>
                        <User className="w-4 h-4 mr-2" />
                        Tornar Usuário
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <PaginationBar
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
          onPageSizeChange={(size) =>
            setPagination((prev) => ({ ...prev, pageSize: size, page: 1 }))
          }
          itemLabel="usuários"
        />
      </div>
    </div>
  );
};

export default AdminUsers;
