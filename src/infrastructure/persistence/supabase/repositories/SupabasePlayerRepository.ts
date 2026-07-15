import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PlayerMapper } from '../mappers/PlayerMapper';
import type { Player, PlayerPatches } from '@/domains/shared/types';
import type { PlayerRepository } from '../repositories';
import { OptimisticLockError, NotFoundError, RepositoryError } from '../repositories/Repository';

export class SupabasePlayerRepository implements PlayerRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly mapper: PlayerMapper = new PlayerMapper()
  ) {}

  async findById(id: string): Promise<Player | null> {
    const { data, error } = await this.client
      .from('player_saves')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new RepositoryError('Failed to find player by id', 'QUERY_FAILED', error);
    }
    return data ? this.mapper.toDomain(data) : null;
  }

  async findByUserId(userId: string): Promise<Player | null> {
    const { data, error } = await this.client
      .from('player_saves')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new RepositoryError('Failed to find player by user id', 'QUERY_FAILED', error);
    }
    return data ? this.mapper.toDomain(data) : null;
  }

  async save(player: Player): Promise<void> {
    const dto = this.mapper.toDTO(player);
    const { error } = await this.client
      .from('player_saves')
      .upsert({
        ...dto,
        version: player.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('version', player.version);

    if (error) {
      if (error.code === 'PGRST100' || error.message?.includes('version')) {
        throw new OptimisticLockError(player.id);
      }
      throw new RepositoryError('Failed to save player', 'SAVE_FAILED', error);
    }
  }

  async savePartial(id: string, patches: PlayerPatches): Promise<void> {
    const dto = this.mapper.patchesToDTO(patches);
    const { error } = await this.client
      .from('player_saves')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new RepositoryError('Failed to save partial player', 'SAVE_FAILED', error);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('player_saves')
      .delete()
      .eq('id', id);

    if (error) {
      throw new RepositoryError('Failed to delete player', 'DELETE_FAILED', error);
    }
  }
}