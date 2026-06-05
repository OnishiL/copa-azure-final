import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MapPin,
  Users,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface Stadium {
  id: number;
  name: string;
  city: string;
  country: string;
  capacity: number;
  image: string | null;
  description: string | null;
  inauguration_year: number | null;
  latitude: number | null;
  longitude: number | null;
}

const AdminStadiums: React.FC = () => {
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStadium, setEditingStadium] = useState<Stadium | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    country: '',
    capacity: '',
    image: '',
    description: '',
    inauguration_year: '',
    latitude: '',
    longitude: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getStadiums();
      if (result.data?.stadiums) setStadiums(result.data.stadiums);
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao carregar estádios', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredStadiums = stadiums.filter((stadium) => {
    const matchesSearch =
      stadium.name.toLowerCase().includes(search.toLowerCase()) ||
      stadium.city.toLowerCase().includes(search.toLowerCase());
    const matchesCountry = countryFilter === 'all' || stadium.country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  const countries = [...new Set(stadiums.map((s) => s.country))];

  const handleEdit = (stadium: Stadium) => {
    setEditingStadium(stadium);
    setFormData({
      name: stadium.name,
      city: stadium.city,
      country: stadium.country,
      capacity: stadium.capacity.toString(),
      image: stadium.image || '',
      description: stadium.description || '',
      inauguration_year: stadium.inauguration_year?.toString() || '',
      latitude: stadium.latitude?.toString() || '',
      longitude: stadium.longitude?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingStadium(null);
    setFormData({
      name: '',
      city: '',
      country: '',
      capacity: '',
      image: '',
      description: '',
      inauguration_year: '',
      latitude: '',
      longitude: '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.city || !formData.country || !formData.capacity) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: formData.name,
        city: formData.city,
        country: formData.country,
        capacity: parseInt(formData.capacity),
        image: formData.image || undefined,
        description: formData.description || undefined,
        inauguration_year: formData.inauguration_year ? parseInt(formData.inauguration_year) : undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };

      let result;
      if (editingStadium) {
        result = await api.updateStadium(editingStadium.id, data);
      } else {
        result = await api.createStadium(data);
      }

      if (result.error) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: editingStadium ? 'Estádio atualizado' : 'Estádio criado' });
        setIsDialogOpen(false);
        loadData();
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao salvar estádio', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const result = await api.deleteStadium(deleteId);
      if (result.error) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Estádio excluído' });
        loadData();
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao excluir estádio', variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'Estados Unidos': '🇺🇸',
      'México': '🇲🇽',
      'Canadá': '🇨🇦',
    };
    return flags[country] || '🏟️';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Gerenciar Estádios</h1>
          <p className="text-muted-foreground">
            {filteredStadiums.length} estádios cadastrados
          </p>
        </div>
        <Button className="gold-gradient" onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Estádio
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <MapPin className="w-4 h-4 mr-2" />
            <SelectValue placeholder="País" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os países</SelectItem>
            {countries.map((country) => (
              <SelectItem key={country} value={country}>
                {getCountryFlag(country)} {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Estádio</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Capacidade</TableHead>
              <TableHead>País</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStadiums.map((stadium) => (
              <TableRow key={stadium.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {stadium.image ? (
                      <img
                        src={stadium.image}
                        alt={stadium.name}
                        className="w-16 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                        🏟️
                      </div>
                    )}
                    <span className="font-medium">{stadium.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {stadium.city}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    {stadium.capacity.toLocaleString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getCountryFlag(stadium.country)} {stadium.country}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(stadium)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(stadium.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Edição/Criação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStadium ? 'Editar Estádio' : 'Adicionar Estádio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Estádio *</Label>
              <Input 
                placeholder="Ex: MetLife Stadium" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Input 
                  placeholder="Ex: Nova York" 
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>País *</Label>
                <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Estados Unidos">Estados Unidos</SelectItem>
                    <SelectItem value="México">México</SelectItem>
                    <SelectItem value="Canadá">Canadá</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacidade *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 80000"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ano de inauguração</Label>
                <Input
                  type="number"
                  min="1900"
                  max="2030"
                  placeholder="Ex: 2010"
                  value={formData.inauguration_year}
                  onChange={(e) => setFormData({ ...formData, inauguration_year: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="Ex: 40.812778"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="Ex: -74.074167"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL da Imagem</Label>
              <Input 
                placeholder="https://..." 
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
              {formData.image && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Prévia:</p>
                  <img 
                    src={formData.image} 
                    alt="Prévia do estádio" 
                    className="w-full h-32 object-cover rounded border border-border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                placeholder="Descrição do estádio..." 
                rows={3} 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingStadium ? 'Atualizar' : 'Salvar'} Estádio
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este estádio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStadiums;
