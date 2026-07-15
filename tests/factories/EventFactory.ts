// tests/factories/EventFactory.ts
import type { DomainEvent } from '@/domains/shared/kernel';

export class EventFactory {
  static createPlayerPromoted(
    playerId: string,
    oldRank: number,
    newRank: number,
    chosenPath: string = 'government'
  ): DomainEvent {
    return {
      type: 'PLAYER_PROMOTED',
      payload: {
        playerId,
        oldRank,
        newRank,
        oldCity: '某县',
        newCity: newRank >= 6 ? '某市' : '某县',
        chosenPath,
        followCandidates: [],
        secretaryCandidates: [],
      },
      occurredAt: new Date(),
      eventId: crypto.randomUUID(),
    };
  }

  static createCityFundConsumed(
    playerId: string,
    amount: number,
    purpose: string,
    oldBalance: number
  ): DomainEvent {
    return {
      type: 'CITY_FUND_CONSUMED',
      payload: {
        playerId,
        amount,
        purpose,
        oldBalance,
        newBalance: Math.max(0, oldBalance - amount),
      },
      occurredAt: new Date(),
      eventId: crypto.randomUUID(),
    };
  }

  static createMassIncidentTriggered(
    playerId: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): DomainEvent {
    return {
      type: 'MASS_INCIDENT_TRIGGERED',
      payload: {
        playerId,
        incidentId: `incident-${Date.now()}`,
        severity,
        deadlineDays: severity === 'high' ? 7 : severity === 'medium' ? 15 : 30,
      },
      occurredAt: new Date(),
      eventId: crypto.randomUUID(),
    };
  }

  static createBriberyExposed(
    playerId: string,
    level: 'warning' | 'suspend' | 'case' = 'warning'
  ): DomainEvent {
    return {
      type: 'BRIBERY_EXPOSED',
      payload: {
        playerId,
        level,
        penalty: {
          inspectionRisk: level === 'case' ? 30 : level === 'suspend' ? 20 : 10,
          meritPoints: level === 'suspend' ? -100 : 0,
          bossFavor: level === 'case' ? -20 : level === 'suspend' ? -15 : -5,
          moralValue: level === 'warning' ? -5 : 0,
        },
      },
      occurredAt: new Date(),
      eventId: crypto.randomUUID(),
    };
  }

  static createMonthlySettlement(
    playerId: string,
    month: number,
    changes: Record<string, number>
  ): DomainEvent {
    return {
      type: 'MONTHLY_SETTLEMENT_COMPLETED',
      payload: {
        playerId,
        month,
        indicators: { gdp: 0, livelihood: 0, ecology: 0, business: 0, security: 0 },
        fundChanges: changes,
      },
      occurredAt: new Date(),
      eventId: crypto.randomUUID(),
    };
  }

  static createFactionAssetChanged(
    playerId: string,
    factionKey: string,
    delta: { political: number; economic: number; social: number; cultural: number }
  ): DomainEvent {
    return {
      type: 'FACTION_ASSET_CHANGED',
      payload: { playerId, factionKey, delta },
      occurredAt: new Date(),
      eventId: crypto.randomUUID(),
    };
  }

  static createSubordinateAppointed(
    playerId: string,
    subId: string,
    positionKey: string
  ): DomainEvent {
    return {
      type: 'SUBORDINATE_APPOINTED',
      payload: { playerId, subId, positionKey },
      occurredAt: new Date(),
      eventId: crypto.randomUUID(),
    };
  }
}