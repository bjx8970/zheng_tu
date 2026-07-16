// tests/factories/CityFactory.ts
import type { CityGovernance, CityIndicators, Department, FundAccount, Project } from '@/domains/city/entities/CityGovernance';

export class CityFactory {
  private static baseId = 2000;

  static create(overrides: Partial<CityGovernance> = {}): CityGovernance {
    const id = `test-city-${this.baseId++}`;

    return {
      cityId: id,
      level: 'county',
      indicators: this.createIndicators(overrides.indicators),
      departments: this.createDepartments(overrides.departments),
      activePolicies: [],
      projects: [],
      fundAccount: this.createFundAccount(overrides.fundAccount),
      ...overrides,
    };
  }

  static createIndicators(overrides?: Partial<CityIndicators>): CityIndicators {
    return {
      gdp: 60,
      livelihood: 55,
      ecology: 50,
      business: 55,
      security: 65,
      ...overrides,
    };
  }

  static createDepartments(overrides?: Partial<Department>[]): Department[] {
    const defaults: Department[] = [
      { key: 'finance', name: '财政局', level: 1, staff: 20, baseFund: 5000, baseTax: 10000, baseMerit: 5 },
      { key: 'development', name: '发改委', level: 1, staff: 15, baseFund: 3000, baseTax: 5000, baseMerit: 8 },
      { key: 'public_security', name: '公安局', level: 1, staff: 30, baseFund: 2000, baseTax: 0, baseMerit: 10 },
      { key: 'organization', name: '组织部', level: 1, staff: 10, baseFund: 1000, baseTax: 0, baseMerit: 15 },
      { key: 'publicity', name: '宣传部', level: 1, staff: 12, baseFund: 800, baseTax: 0, baseMerit: 8 },
    ];

    if (overrides) {
      return overrides.map((o, i) => ({ ...defaults[i], ...o }));
    }
    return defaults;
  }

  static createFundAccount(overrides?: Partial<FundAccount>): FundAccount {
    return {
      cityGovFund: 1000,
      fundBalance: 500000,
      taxRevenue: 1000000,
      personalSavings: 0,
      providentFundBalance: 0,
      ...overrides,
    };
  }

  static withLowIndicators(): CityGovernance {
    return this.create({
      indicators: { gdp: 30, livelihood: 25, ecology: 20, business: 30, security: 35 },
    });
  }

  static withHighIndicators(): CityGovernance {
    return this.create({
      indicators: { gdp: 90, livelihood: 85, ecology: 80, business: 90, security: 95 },
    });
  }

  static withProject(project: Project): CityGovernance {
    return this.create({ projects: [project] });
  }
}