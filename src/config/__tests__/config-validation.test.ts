import positionsData from '@/config/positions.json';
import careerPositionsData from '@/config/career-positions.json';
import citiesData from '@/config/cities.json';

describe('positions.json', () => {
  it('所有 COUNTIES 岗位 key 不重复', () => {
    const keys = positionsData.COUNTY_OFFICIAL_POSITIONS.map(p => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('所有 PROVINCES 岗位 key 不重复', () => {
    const keys = positionsData.PROVINCE_OFFICIAL_POSITIONS.map(p => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('所有 CITY 岗位 key 不重复', () => {
    const keys = positionsData.CITY_OFFICIAL_POSITIONS.map(p => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('career-positions.json', () => {
  const positions = careerPositionsData.positions as Record<string, unknown>;

  it('所有 rank 等级都有 positions 映射', () => {
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].forEach(r => {
      expect(positions[String(r)]).toBeDefined();
    });
  });

  it('每个 position 都有四个仕途路线', () => {
    for (const rankKey of Object.keys(positions)) {
      const entry = positions[rankKey] as Record<string, unknown>;
      for (const path of ['party', 'government', 'discipline', 'league']) {
        expect(entry[path]).toBeDefined();
        expect(entry[path]).toHaveProperty('name');
        expect(entry[path]).toHaveProperty('bossTitle');
      }
    }
  });

  it('所有 tracks 长度一致（15 级）', () => {
    const tracks = careerPositionsData.tracks as Record<string, unknown[]>;
    for (const line of ['party', 'government', 'discipline', 'league']) {
      expect(tracks[line]).toHaveLength(15);
    }
  });
});

describe('cities.json', () => {
  const CITY_POOLS = citiesData.CITY_POOLS as Record<string, string[]>;
  const DEFAULT_CITY_BY_LEVEL = citiesData.DEFAULT_CITY_BY_LEVEL as Record<string, string>;

  it('DEFAULT_CITY_BY_LEVEL 的乡镇级城市在 CITY_POOLS 乡镇中', () => {
    const townPool = CITY_POOLS['乡镇'];
    for (let i = 1; i <= 3; i++) {
      const city = DEFAULT_CITY_BY_LEVEL[String(i)];
      expect(townPool).toContain(city);
    }
  });
});

describe('premier-office.json', () => {
  it('所有 vpArea 都被 areaTab 引用', () => {
    const premierData = require('@/config/premier-office.json');
    const vpAreas: Array<{ id: string }> = premierData.vpAreas;
    const areaTabs: Array<{ id: string; ids: string[] }> = premierData.areaTabs;
    const referencedIds = new Set(areaTabs.flatMap(t => t.ids));
    for (const area of vpAreas) {
      expect(referencedIds.has(area.id)).toBe(true);
    }
  });
});
