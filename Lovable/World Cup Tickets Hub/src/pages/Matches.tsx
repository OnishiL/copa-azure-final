import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Search, Ticket, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { getStadiumStartingPrice } from '@/lib/stadium-sectors';

interface ApiMatch {
  id: number;
  date: string;
  time: string;
  stage: string;
  group_name: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  stadium_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home_team_name: string | null;
  home_team_code: string | null;
  home_team_flag: string | null;
  away_team_name: string | null;
  away_team_code: string | null;
  away_team_flag: string | null;
  stadium_name: string | null;
  stadium_city: string | null;
}

const STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'Fase de Grupos', label: 'Fase de Grupos' },
  { value: 'round_of_32', label: '32 avos' },
  { value: 'round_of_16', label: 'Oitavas' },
  { value: 'quarter_final', label: 'Quartas' },
  { value: 'semi_final', label: 'Semis' },
  { value: 'third_place', label: '3º/4º' },
  { value: 'final', label: 'Final' },
];

const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  STAGE_OPTIONS.map((o) => [o.value, o.label])
);

function formatDateBR(dateIso: string): string {
  if (!dateIso) return '-';
  const d = new Date(dateIso);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

const TeamDisplay: React.FC<{ name: string | null; code: string | null; flag: string | null }> = ({
  name, code, flag,
}) => {
  const isFlagUrl = flag?.startsWith('http');
  return (
    <div className="text-center flex-1">
      {isFlagUrl ? (
        <img src={flag!} alt={`Bandeira ${name || ''}`} className="w-12 h-8 object-cover rounded mx-auto mb-2" />
      ) : (
        <div className="w-12 h-8 rounded bg-secondary/50 mx-auto mb-2 flex items-center justify-center text-xl">
          🏳️
        </div>
      )}
      <span className="font-medium text-sm">{name || 'TBD'}</span>
      {code && <span className="block text-xs text-muted-foreground">{code}</span>}
    </div>
  );
};

const Matches: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const groupFilter = searchParams.get('group')?.toUpperCase() || '';
  const teamFilterId = searchParams.get('team') || '';

  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.getMatches(),
  });

  const allMatches = useMemo<ApiMatch[]>(() => data?.data?.matches || [], [data]);

  const filteredMatches = useMemo(() => {
    return allMatches.filter((match) => {
      // Group filter
      if (groupFilter && match.group_name?.toUpperCase() !== groupFilter) return false;

      // Team filter (a partir de ?team=brasil-id ou similar)
      if (teamFilterId) {
        const tid = String(teamFilterId);
        const home = String(match.home_team_id || '');
        const away = String(match.away_team_id || '');
        const homeCode = (match.home_team_code || '').toLowerCase();
        const awayCode = (match.away_team_code || '').toLowerCase();
        if (
          home !== tid &&
          away !== tid &&
          homeCode !== tid.toLowerCase() &&
          awayCode !== tid.toLowerCase()
        ) {
          return false;
        }
      }

      // Stage filter
      if (selectedStage !== 'all' && match.stage !== selectedStage) return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const hits =
          match.home_team_name?.toLowerCase().includes(q) ||
          match.away_team_name?.toLowerCase().includes(q) ||
          match.stadium_name?.toLowerCase().includes(q) ||
          match.stadium_city?.toLowerCase().includes(q) ||
          (STAGE_LABELS[match.stage] || '').toLowerCase().includes(q);
        if (!hits) return false;
      }

      return true;
    });
  }, [allMatches, groupFilter, teamFilterId, selectedStage, searchQuery]);

  const clearGroupFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('group');
    setSearchParams(next, { replace: true });
  };

  const clearTeamFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('team');
    setSearchParams(next, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-display text-4xl md:text-6xl mb-4">
            <span className="gold-text">Jogos</span> da Copa
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Confira todos os jogos da Copa do Mundo FIFA 2026 e garanta seus ingressos para
            assistir ao vivo.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por seleção, estádio ou cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {STAGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={selectedStage === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStage(opt.value)}
                className={selectedStage === opt.value ? 'gold-gradient' : ''}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Active filter chips */}
        {(groupFilter || teamFilterId) && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>
            {groupFilter && (
              <button
                type="button"
                onClick={clearGroupFilter}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                Grupo {groupFilter}
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {teamFilterId && (
              <button
                type="button"
                onClick={clearTeamFilter}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                Time #{teamFilterId}
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-6">
          {filteredMatches.length}{' '}
          {filteredMatches.length === 1 ? 'jogo encontrado' : 'jogos encontrados'}
        </p>

        {/* Matches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((match, index) => {
            const startingPrice = getStadiumStartingPrice(match.stadium_id);
            const isFinal = match.stage === 'final';
            const isSemi = match.stage === 'semi_final';
            const isKnockout = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'].includes(match.stage);
            const hasTBD = !match.home_team_name || !match.away_team_name;

            return (
              <Link
                key={match.id}
                to={`/matches/${match.id}`}
                className={cn(
                  'group relative rounded-2xl overflow-hidden bg-card border transition-all duration-300 hover:border-primary/50 animate-fade-in',
                  hasTBD ? 'border-dashed border-primary/30' : 'border-border'
                )}
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div
                  className={cn(
                    'absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-medium z-10',
                    isFinal
                      ? 'bg-primary text-primary-foreground'
                      : isSemi
                      ? 'bg-primary/20 text-primary'
                      : isKnockout
                      ? 'bg-secondary text-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {STAGE_LABELS[match.stage] || match.stage}
                  {match.group_name && ` • Grupo ${match.group_name}`}
                </div>

                {hasTBD && (
                  <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium z-10">
                    A definir
                  </div>
                )}

                <div className="p-6 pt-14">
                  <div className="flex items-center justify-between mb-6">
                    <TeamDisplay
                      name={match.home_team_name}
                      code={match.home_team_code}
                      flag={match.home_team_flag}
                    />
                    <div className="px-4">
                      {match.status === 'finished' &&
                      match.home_score !== null &&
                      match.away_score !== null ? (
                        <span className="font-display text-2xl text-primary">
                          {match.home_score} × {match.away_score}
                        </span>
                      ) : (
                        <span className="font-display text-xl text-muted-foreground">VS</span>
                      )}
                    </div>
                    <TeamDisplay
                      name={match.away_team_name}
                      code={match.away_team_code}
                      flag={match.away_team_flag}
                    />
                  </div>

                  <div className="border-t border-border my-4" />

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        {formatDateBR(match.date)} • {match.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{match.stadium_name || 'TBD'}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground block">A partir de</span>
                      <span className="text-lg font-bold text-primary">${startingPrice}</span>
                    </div>
                    <Button size="sm" className="gold-gradient group-hover:opacity-90">
                      <Ticket className="w-4 h-4 mr-1" />
                      Comprar
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredMatches.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">
              Nenhum jogo encontrado com os filtros selecionados.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedStage('all');
                setSearchQuery('');
                clearGroupFilter();
                clearTeamFilter();
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Matches;
