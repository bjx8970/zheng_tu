import { AggregateRoot, ValueObject } from '../../shared/kernel';
import type { Subordinate } from './Subordinate';

export interface Position {
  key: string;
  title: string;
  holderId: string | null;
  isVacant: boolean;
}

export interface Vacancy {
  positionKey: string;
  priority: number;
}

export interface QuotaConfig {
  maxTotal: number;
  maxByRank: Record<string, number>;
}

export interface BandMember {
  id: string;
  name: string;
  positionKey: string;
  ability: number;
  loyalty: number;
  integrity: number;
}

export interface LeadershipBandProps {
  level: number;
  positions: Position[];
  members: Map<string, BandMember>;
  vacancies: Vacancy[];
  quotas: QuotaConfig;
}

export class LeadershipBand extends AggregateRoot<LeadershipBandProps & { id: string; version: number }> {
  private constructor(props: LeadershipBandProps & { id: string; version: number }) {
    super(props);
  }

  static create(id: string, initial: LeadershipBandProps): LeadershipBand {
    return new LeadershipBand({ ...initial, id, version: 1 });
  }

  get level(): number { return this.props.level; }
  get positions(): Position[] { return this.props.positions; }
  get members(): Map<string, BandMember> { return this.props.members; }
  get vacancies(): Vacancy[] { return this.props.vacancies; }
  get quotas(): QuotaConfig { return this.props.quotas; }

  appoint(positionKey: string, candidate: Subordinate): void {
    const position = this.props.positions.find(p => p.key === positionKey);
    if (!position) throw new Error(`Position ${positionKey} not found`);
    if (!position.isVacant) throw new Error(`Position ${positionKey} is not vacant`);

    position.holderId = candidate.id;
    position.isVacant = false;

    const vacancyIndex = this.props.vacancies.findIndex(v => v.positionKey === positionKey);
    if (vacancyIndex >= 0) this.props.vacancies.splice(vacancyIndex, 1);

    this.props.members.set(candidate.id, {
      id: candidate.id,
      name: candidate.name,
      positionKey,
      ability: candidate.ability,
      loyalty: candidate.loyalty,
      integrity: candidate.integrity,
    });

    this.incrementVersion();
  }

  dismiss(positionKey: string): void {
    const position = this.props.positions.find(p => p.key === positionKey);
    if (!position || position.isVacant) return;

    const memberId = position.holderId;
    position.holderId = null;
    position.isVacant = true;

    if (memberId) this.props.members.delete(memberId);

    this.props.vacancies.push({ positionKey, priority: 1 });
    this.incrementVersion();
  }

  assessAll(): Map<string, { grade: string; meritGain: number }> {
    const results = new Map();
    for (const [memberId, member] of this.props.members) {
      const composite = (member.ability * 0.4 + member.loyalty * 0.3 + member.integrity * 0.3);
      let grade = '不合格';
      let meritGain = 0;
      if (composite >= 80) { grade = '优秀'; meritGain = 10; }
      else if (composite >= 70) { grade = '良好'; meritGain = 5; }
      else if (composite >= 60) { grade = '合格'; meritGain = 2; }
      results.set(memberId, { grade, meritGain });
    }
    return results;
  }

  getSuccessors(positionKey: string): BandMember[] {
    return Array.from(this.props.members.values())
      .filter(m => m.positionKey !== positionKey)
      .sort((a, b) => b.loyalty - a.loyalty)
      .slice(0, 5);
  }
}