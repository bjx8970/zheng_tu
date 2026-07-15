// tests/factories/SubordinateFactory.ts
import type { Subordinate, SubLevel } from '@/domains/personnel/entities/Subordinate';

export class SubordinateFactory {
  private static baseId = 3000;

  static create(overrides: Partial<Subordinate> = {}): Subordinate {
    const id = `test-sub-${this.baseId++}`;
    const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
    const givenNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军'];
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const given = givenNames[Math.floor(Math.random() * givenNames.length)];

    return {
      id,
      playerId: 'test-player-1',
      name: `${surname}${given}`,
      gender: Math.random() > 0.5 ? 'male' : 'female',
      age: 25 + Math.floor(Math.random() * 30),
      avatarId: Math.floor(Math.random() * 10) + 1,
      ability: 40 + Math.floor(Math.random() * 40),
      loyalty: 50 + Math.floor(Math.random() * 40),
      integrity: 40 + Math.floor(Math.random() * 40),
      subLevel: 1,
      appointedRole: null,
      appointedDept: null,
      appointedAt: null,
      transferredCity: null,
      isReserve: false,
      isFollowing: false,
      ...overrides,
    };
  }

  static createBatch(count: number, overrides: Partial<Subordinate> = {}): Subordinate[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static eligibleForPromotion(overrides: Partial<Subordinate> = {}): Subordinate {
    return this.create({
      ability: 60,
      loyalty: 70,
      integrity: 55,
      subLevel: 2,
      ...overrides,
    });
  }

  static highPotential(overrides: Partial<Subordinate> = {}): Subordinate {
    return this.create({
      ability: 80,
      loyalty: 85,
      integrity: 75,
      subLevel: 3,
      ...overrides,
    });
  }

  static lowPotential(overrides: Partial<Subordinate> = {}): Subordinate {
    return this.create({
      ability: 30,
      loyalty: 40,
      integrity: 35,
      subLevel: 1,
      ...overrides,
    });
  }

  static withRole(role: string, dept: string, overrides: Partial<Subordinate> = {}): Subordinate {
    return this.create({
      appointedRole: role,
      appointedDept: dept,
      appointedAt: Date.now(),
      ...overrides,
    });
  }
}