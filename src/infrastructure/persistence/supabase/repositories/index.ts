import type { Player, PlayerPatches } from '@/domains/shared/types';

// ===== Repository 接口（领域层依赖，基建层实现）=====

export type { PlayerPatches };

export interface PlayerRepository {
  findById(id: string): Promise<Player | null>;
  findByUserId(userId: string): Promise<Player | null>;
  save(player: Player): Promise<void>;
  savePartial(id: string, patches: PlayerPatches): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface CityGovernanceRepository {
  findByCityId(cityId: string): Promise<any | null>;
  findByPlayerId(playerId: string): Promise<any | null>;
  save(city: any): Promise<void>;
  saveIndicators(cityId: string, indicators: any): Promise<void>;
  saveDepartments(cityId: string, departments: any[]): Promise<void>;
}

export interface LeadershipBandRepository {
  findByPlayerId(playerId: string): Promise<any | null>;
  save(band: any): Promise<void>;
  saveMember(playerId: string, member: any): Promise<void>;
  removeMember(playerId: string, positionKey: string): Promise<void>;
}

export interface SubordinateRepository {
  findByPlayerId(playerId: string): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  save(subordinate: any): Promise<void>;
  saveBatch(subordinates: any[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface FactionRepository {
  findByKey(key: string): Promise<any | null>;
  findByPlayerId(playerId: string): Promise<any | null>;
  save(faction: any): Promise<void>;
  addMember(factionKey: string, playerId: string, member: any): Promise<void>;
  removeMember(factionKey: string, playerId: string): Promise<void>;
}

export interface EventRepository {
  findPendingByPlayerId(playerId: string): Promise<any[]>;
  findByTypeAndPlayer(type: string, playerId: string): Promise<any[]>;
  save(event: any): Promise<void>;
  markProcessed(eventId: string): Promise<void>;
}

export interface SaveSlotRepository {
  listSlots(userId: string): Promise<Array<{ slot: number; label: string; data: any; createdAt: number }>>;
  saveSlot(userId: string, slot: number, label: string, data: any): Promise<void>;
  loadSlot(userId: string, slot: number): Promise<any | null>;
  deleteSlot(userId: string, slot: number): Promise<void>;
}

export interface ReportRepository {
  findUnreadByPlayerId(playerId: string): Promise<any[]>;
  findByPlayerIdAndMonth(playerId: string, month: number): Promise<any | null>;
  save(report: any): Promise<void>;
  markRead(reportId: string): Promise<void>;
}

// ===== 单元工作接口（事务边界）=====

export interface UnitOfWork {
  player: PlayerRepository;
  city: CityGovernanceRepository;
  band: LeadershipBandRepository;
  subordinate: SubordinateRepository;
  faction: FactionRepository;
  event: EventRepository;
  saveSlot: SaveSlotRepository;
  report: ReportRepository;

  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface UnitOfWorkFactory {
  create(): Promise<UnitOfWork>;
}