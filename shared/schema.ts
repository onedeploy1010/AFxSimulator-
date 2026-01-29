import { z } from 'zod';

// ==================== 配套档位 ====================
export const STAKING_TIERS = [100, 500, 1000, 3000, 5000, 10000] as const;
export type StakingTier = typeof STAKING_TIERS[number];

// ==================== AF 释放模式 ====================
export const ReleaseMode = z.enum(['gold', 'coin']);
export type ReleaseMode = z.infer<typeof ReleaseMode>;

// ==================== 经纪人等级 ====================
export const BrokerLevel = z.enum(['V1', 'V2', 'V3', 'V4', 'V5', 'V6']);
export type BrokerLevel = z.infer<typeof BrokerLevel>;

// ==================== 用户分润比例 ====================
export const PROFIT_SHARE_TIERS = [0.60, 0.65, 0.70, 0.75, 0.80, 0.85] as const;
export type ProfitShareTier = typeof PROFIT_SHARE_TIERS[number];

// ==================== 配套参数 Schema ====================
export const TierConfigSchema = z.object({
  tier: z.number(),
  // AF 释放利息率（日利率）
  afReleaseRate: z.number().min(0).max(1),
  // 交易金倍数
  tradingFundMultiplier: z.number().min(1),
  // 用户分润比例
  profitShareRatio: z.number().min(0).max(1),
  // 交易手续费率（根据质押量变化 1%-8%）
  tradingFeeRate: z.number().min(0.01).max(0.08),
});
export type TierConfig = z.infer<typeof TierConfigSchema>;

// ==================== 质押周期配置 ====================
export const StakingPeriodSchema = z.object({
  enabled: z.boolean(),
  days: z.number().min(1),
});
export type StakingPeriod = z.infer<typeof StakingPeriodSchema>;

// ==================== AF 释放出口配置 ====================
export const AFExitConfigSchema = z.object({
  // 提现配置
  withdrawToMarketRatio: z.number().min(0).max(1), // 到二级市场比例
  withdrawBurnRatio: z.number().min(0).max(1), // 销毁比例
  // 保留为交易手续费比例
  keepAsTradingFeeRatio: z.number().min(0).max(1),
  // 兑换为交易金比例
  convertToTradingFundRatio: z.number().min(0).max(1),
});
export type AFExitConfig = z.infer<typeof AFExitConfigSchema>;

// ==================== AF 释放选择比例 ====================
export const AFReleaseChoiceSchema = z.object({
  withdrawPercentage: z.number().min(0).max(100), // % 用户选择提现
  convertPercentage: z.number().min(0).max(100), // % 用户选择转交易金
});
export type AFReleaseChoice = z.infer<typeof AFReleaseChoiceSchema>;

// ==================== 交易资金流配置 ====================
export const TradeFundFlowSchema = z.object({
  // LP 底池（AAM）配置
  lpUsdcRatio: z.number().min(0).max(1), // USDC 比例
  lpAfRatio: z.number().min(0).max(1), // AF 比例
  // 回购 AF 比例
  buybackRatio: z.number().min(0).max(1),
  // 外汇储备金比例
  forexReserveRatio: z.number().min(0).max(1),
});
export type TradeFundFlow = z.infer<typeof TradeFundFlowSchema>;

// ==================== 经纪人配置 ====================
export const BrokerConfigSchema = z.object({
  level: BrokerLevel,
  // 推广收益比例
  promotionRewardRatio: z.number().min(0).max(1),
  // AF 释放层级范围
  layerStart: z.number().min(1).max(20),
  layerEnd: z.number().min(1).max(20),
  // 每层释放比例
  layerReleaseRatio: z.number().min(0).max(1),
});
export type BrokerConfig = z.infer<typeof BrokerConfigSchema>;

// ==================== 系统配置 Schema ====================
export const SystemConfigSchema = z.object({
  // AF 释放模式
  releaseMode: ReleaseMode,
  // 质押周期
  stakingPeriod: StakingPeriodSchema,
  // AF 释放出口配置
  afExitConfig: AFExitConfigSchema,
  // AF 释放选择比例
  afReleaseChoice: AFReleaseChoiceSchema,
  // AF → 交易金兑换倍率
  afToTradingFundRate: z.number().min(0),
  // 交易资金流配置
  tradeFundFlow: TradeFundFlowSchema,
  // 各配套档位配置
  tierConfigs: z.array(TierConfigSchema),
  // 经纪人配置
  brokerConfigs: z.array(BrokerConfigSchema),
  // 交易利润分配
  tradeProfitDistribution: z.object({
    platformRatio: z.number().min(0).max(1), // 平台收益比例
    brokerRatio: z.number().min(0).max(1), // 经纪人收益比例
  }),
});
export type SystemConfig = z.infer<typeof SystemConfigSchema>;

// ==================== LP 池状态 ====================
export const LPPoolStateSchema = z.object({
  usdcBalance: z.number().min(0),
  afBalance: z.number().min(0),
  afPrice: z.number().min(0),
  k: z.number().min(0), // 恒定乘积 k = usdc * af
});
export type LPPoolState = z.infer<typeof LPPoolStateSchema>;

// ==================== 用户质押订单 ====================
export const StakingOrderSchema = z.object({
  id: z.string(),
  tier: z.number(),
  principal: z.number().min(0),
  tradingFund: z.number().min(0),
  afReleased: z.number().min(0),
  afPending: z.number().min(0),
  startDate: z.string(),
  stakingDays: z.number().min(0),
  currentDay: z.number().min(0),
  profitShareRatio: z.number(),
  status: z.enum(['active', 'completed', 'cancelled']),
});
export type StakingOrder = z.infer<typeof StakingOrderSchema>;

// ==================== 交易记录 ====================
export const TradeRecordSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  day: z.number(),
  tradingFundUsed: z.number(),
  grossProfit: z.number(),
  tradingFee: z.number(),
  netProfit: z.number(),
  userProfit: z.number(),
  platformProfit: z.number(),
  brokerProfit: z.number(),
  afConsumed: z.number(),
  timestamp: z.string(),
});
export type TradeRecord = z.infer<typeof TradeRecordSchema>;

// ==================== 经纪人收益记录 ====================
export const BrokerRewardSchema = z.object({
  level: BrokerLevel,
  layer: z.number(),
  afReleased: z.number(),
  usdcEarned: z.number(),
  promotionReward: z.number(),
});
export type BrokerReward = z.infer<typeof BrokerRewardSchema>;

// ==================== 每日释放记录 ====================
export const DailyReleaseRecordSchema = z.object({
  day: z.number(),
  totalAfReleased: z.number(),
  afToMarket: z.number(),
  afBurned: z.number(),
  afToTradingFee: z.number(),
  afToTradingFund: z.number(),
  lpPoolState: LPPoolStateSchema,
  forexReserve: z.number(),
  totalBuyback: z.number(),
});
export type DailyReleaseRecord = z.infer<typeof DailyReleaseRecordSchema>;

// ==================== 默认配置 ====================
export const DEFAULT_TIER_CONFIGS: TierConfig[] = [
  { tier: 100, afReleaseRate: 0.005, tradingFundMultiplier: 2, profitShareRatio: 0.60, tradingFeeRate: 0.08 },
  { tier: 500, afReleaseRate: 0.006, tradingFundMultiplier: 2.5, profitShareRatio: 0.65, tradingFeeRate: 0.06 },
  { tier: 1000, afReleaseRate: 0.007, tradingFundMultiplier: 3, profitShareRatio: 0.70, tradingFeeRate: 0.05 },
  { tier: 3000, afReleaseRate: 0.008, tradingFundMultiplier: 3.5, profitShareRatio: 0.75, tradingFeeRate: 0.03 },
  { tier: 5000, afReleaseRate: 0.009, tradingFundMultiplier: 4, profitShareRatio: 0.80, tradingFeeRate: 0.02 },
  { tier: 10000, afReleaseRate: 0.01, tradingFundMultiplier: 5, profitShareRatio: 0.85, tradingFeeRate: 0.01 },
];

export const DEFAULT_BROKER_CONFIGS: BrokerConfig[] = [
  { level: 'V1', promotionRewardRatio: 0.40, layerStart: 1, layerEnd: 4, layerReleaseRatio: 0.04 },
  { level: 'V2', promotionRewardRatio: 0.50, layerStart: 5, layerEnd: 8, layerReleaseRatio: 0.04 },
  { level: 'V3', promotionRewardRatio: 0.60, layerStart: 9, layerEnd: 11, layerReleaseRatio: 0.03 },
  { level: 'V4', promotionRewardRatio: 0.70, layerStart: 12, layerEnd: 14, layerReleaseRatio: 0.03 },
  { level: 'V5', promotionRewardRatio: 0.80, layerStart: 15, layerEnd: 17, layerReleaseRatio: 0.03 },
  { level: 'V6', promotionRewardRatio: 1.00, layerStart: 18, layerEnd: 20, layerReleaseRatio: 0.03 },
];

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  releaseMode: 'gold',
  stakingPeriod: {
    enabled: true,
    days: 30,
  },
  afExitConfig: {
    withdrawToMarketRatio: 0.80,
    withdrawBurnRatio: 0.20,
    keepAsTradingFeeRatio: 0,
    convertToTradingFundRatio: 0,
  },
  afReleaseChoice: {
    withdrawPercentage: 70,
    convertPercentage: 30,
  },
  afToTradingFundRate: 1.0,
  tradeFundFlow: {
    lpUsdcRatio: 0.30,
    lpAfRatio: 0.30,
    buybackRatio: 0.20,
    forexReserveRatio: 0.50,
  },
  tierConfigs: DEFAULT_TIER_CONFIGS,
  brokerConfigs: DEFAULT_BROKER_CONFIGS,
  tradeProfitDistribution: {
    platformRatio: 0.50,
    brokerRatio: 0.50,
  },
};

// ==================== 初始 LP 池状态 ====================
export const DEFAULT_LP_POOL: LPPoolState = {
  usdcBalance: 500000,
  afBalance: 100000,
  afPrice: 5.0,
  k: 500000 * 100000,
};

// ==================== 系统常量 ====================
export const CONSTANTS = {
  AMM_SLIPPAGE: 0.03,
  INITIAL_AF_SUPPLY: 10000000,
  MIN_TRADING_FEE: 0.01,
  MAX_TRADING_FEE: 0.08,
  MAX_BROKER_LAYERS: 20,
  TRADES_PER_DAY: 10, // 每日交易次数
};
