import { z } from 'zod';

export interface FormulaFn<TInput, TOutput> {
  (input: TInput): TOutput;
}

export interface FormulaDefinition<TInput, TOutput> {
  name: string;
  inputSchema: z.ZodType<TInput, z.ZodTypeDef, any>;
  outputSchema: z.ZodType<TOutput>;
  fn: FormulaFn<TInput, TOutput>;
  description?: string;
  version: string;
}

export class FormulaRegistry {
  private formulas = new Map<string, FormulaDefinition<any, any>>();

  register<TInput, TOutput>(def: FormulaDefinition<TInput, TOutput>): void {
    if (this.formulas.has(def.name)) {
      console.warn(`[FormulaRegistry] Overwriting formula: ${def.name}`);
    }
    this.formulas.set(def.name, def);
  }

  execute<TInput, TOutput>(name: string, input: TInput): TOutput {
    const def = this.formulas.get(name);
    if (!def) throw new Error(`Formula not found: ${name}`);

    const parseResult = def.inputSchema.safeParse(input);
    if (!parseResult.success) {
      throw new Error(`Formula ${name} input validation failed: ${parseResult.error.message}`);
    }

    const output = def.fn(parseResult.data);

    const outputParse = def.outputSchema.safeParse(output);
    if (!outputParse.success) {
      throw new Error(`Formula ${name} output validation failed: ${outputParse.error.message}`);
    }

    return outputParse.data;
  }

  has(name: string): boolean {
    return this.formulas.has(name);
  }

  get(name: string): FormulaDefinition<any, any> | undefined {
    return this.formulas.get(name);
  }

  list(): string[] {
    return Array.from(this.formulas.keys());
  }
}

// ===== 核心公式注册（示例）=====

export const SalaryFormulaInput = z.object({
  rankLevel: z.number().int().min(1).max(15),
  tenureYears: z.number().min(0),
});

export const SalaryFormulaOutput = z.object({
  baseSalary: z.number(),
  allowance: z.number(),
  hpf: z.number(),
  totalMonthly: z.number(),
});

export function createSalaryFormula(): FormulaDefinition<z.infer<typeof SalaryFormulaInput>, z.infer<typeof SalaryFormulaOutput>> {
  return {
    name: 'salary.calculate',
    inputSchema: SalaryFormulaInput,
    outputSchema: SalaryFormulaOutput,
    version: '1.0.0',
    description: '计算月度薪资发放',
    fn: (input) => {
      const baseSalary = [0, 3000, 3500, 4500, 6000, 8000, 10000, 13000, 16000, 20000, 25000, 32000, 40000, 50000, 65000, 80000][input.rankLevel] ?? 3000;
      const allowance = [0, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7000, 8000][input.rankLevel] ?? 500;
      const hpf = [0, 1200, 1400, 1800, 2400, 3200, 4000, 5200, 6400, 8000, 10000, 12800, 16000, 20000, 26000, 32000][input.rankLevel] ?? 1200;
      return {
        baseSalary,
        allowance,
        hpf,
        totalMonthly: baseSalary + allowance,
      };
    },
  };
}

export const IndicatorDriftFormulaInput = z.object({
  currentValue: z.number().min(0).max(100),
  hasActivePolicy: z.boolean(),
  policyBonus: z.number().default(0),
  granularity: z.enum(['daily', 'monthly']),
});

export const IndicatorDriftFormulaOutput = z.object({
  drift: z.number(),
  newValue: z.number().min(0).max(100),
});

export function createIndicatorDriftFormula(): FormulaDefinition<z.infer<typeof IndicatorDriftFormulaInput>, z.infer<typeof IndicatorDriftFormulaOutput>> {
  return {
    name: 'indicator.drift',
    inputSchema: IndicatorDriftFormulaInput,
    outputSchema: IndicatorDriftFormulaOutput,
    version: '1.0.0',
    description: '城市指标自然漂移计算',
    fn: (input) => {
      const factor = input.granularity === 'daily' ? 1/30 : 1;
      const baseDrift = (Math.random() * 15 - 10) * factor; // -10 到 +5
      const policyEffect = input.hasActivePolicy ? input.policyBonus * factor : 0;
      const drift = Math.max(-5, Math.min(5, baseDrift + policyEffect));
      const newValue = Math.max(0, Math.min(100, input.currentValue + drift));
      return { drift: Math.round(drift * 10) / 10, newValue: Math.round(newValue * 10) / 10 };
    },
  };
}

export const ExceptionalPromoChanceInput = z.object({
  meritPoints: z.number().min(0),
  moralValue: z.number().min(0).max(100),
  requiredMerit: z.number().min(1),
});

export const ExceptionalPromoChanceOutput = z.object({
  chance: z.number().min(0).max(0.3),
});

export function createExceptionalPromoFormula(): FormulaDefinition<z.infer<typeof ExceptionalPromoChanceInput>, z.infer<typeof ExceptionalPromoChanceOutput>> {
  return {
    name: 'promotion.exceptionalChance',
    inputSchema: ExceptionalPromoChanceInput,
    outputSchema: ExceptionalPromoChanceOutput,
    version: '1.0.0',
    description: '破格晋升概率计算',
    fn: (input) => {
      const meritRatio = Math.min(2, input.meritPoints / input.requiredMerit);
      const moralFactor = 0.5 + input.moralValue / 200; // 0.5 - 1.0
      const chance = Math.min(0.30, 0.15 * meritRatio * moralFactor);
      return { chance: Math.round(chance * 10000) / 10000 };
    },
  };
}

export const BriberyExposureInput = z.object({
  inspectionRisk: z.number().min(0).max(100),
});

export const BriberyExposureOutput = z.object({
  exposed: z.boolean(),
  level: z.enum(['warning', 'suspend', 'case']),
  chance: z.number(),
});

export function createBriberyExposureFormula(): FormulaDefinition<z.infer<typeof BriberyExposureInput>, z.infer<typeof BriberyExposureOutput>> {
  return {
    name: 'bribery.exposure',
    inputSchema: BriberyExposureInput,
    outputSchema: BriberyExposureOutput,
    version: '1.0.0',
    description: '行贿东窗事发判定',
    fn: (input) => {
      const chance = Math.min(0.85, (input.inspectionRisk / 100) * 0.65);
      const exposed = Math.random() < chance;
      let level: 'warning' | 'suspend' | 'case' = 'warning';
      if (exposed) {
        if (input.inspectionRisk >= 70) level = 'case';
        else if (input.inspectionRisk >= 40) level = 'suspend';
      }
      return { exposed, level, chance: Math.round(chance * 10000) / 10000 };
    },
  };
}

export function registerCoreFormulas(registry: FormulaRegistry): void {
  registry.register(createSalaryFormula());
  registry.register(createIndicatorDriftFormula());
  registry.register(createExceptionalPromoFormula());
  registry.register(createBriberyExposureFormula());
  // 更多公式...
}