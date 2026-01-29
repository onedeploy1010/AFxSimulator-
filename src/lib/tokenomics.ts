/**
 * AFx 代币经济学计算引擎
 * 核心计算逻辑：AF 释放、交易模拟、经纪人收益、LP 池变化
 */

import type {
  SystemConfig,
  LPPoolState,
  StakingOrder,
  TradeRecord,
  BrokerReward,
  DailyReleaseRecord,
  TierConfig,
  BrokerConfig,
} from '../../shared/schema';
import { CONSTANTS } from '../../shared/schema';

// ==================== LP 池计算 ====================

/**
 * 计算 AF 价格（基于 AMM 恒定乘积公式）
 */
export function calculateAFPrice(lpPool: LPPoolState): number {
  if (lpPool.afBalance <= 0) return 0;
  return lpPool.usdcBalance / lpPool.afBalance;
}

/**
 * 计算买入 AF 的结果
 * @param usdcAmount 投入的 USDC 数量
 * @param lpPool 当前 LP 池状态
 */
export function calculateBuyAF(
  usdcAmount: number,
  lpPool: LPPoolState
): {
  afReceived: number;
  newPool: LPPoolState;
  priceImpact: number;
  effectivePrice: number;
} {
  const slippage = CONSTANTS.AMM_SLIPPAGE;
  const effectiveUsdc = usdcAmount * (1 - slippage);

  // 恒定乘积公式: (usdc + effectiveUsdc) * (af - afOut) = k
  const newUsdcBalance = lpPool.usdcBalance + effectiveUsdc;
  const newAfBalance = lpPool.k / newUsdcBalance;
  const afReceived = lpPool.afBalance - newAfBalance;

  const oldPrice = calculateAFPrice(lpPool);
  const newPrice = calculateAFPrice({ ...lpPool, usdcBalance: newUsdcBalance, afBalance: newAfBalance });
  const priceImpact = (newPrice - oldPrice) / oldPrice;
  const effectivePrice = effectiveUsdc / afReceived;

  return {
    afReceived,
    newPool: {
      usdcBalance: newUsdcBalance,
      afBalance: newAfBalance,
      afPrice: newPrice,
      k: lpPool.k,
    },
    priceImpact,
    effectivePrice,
  };
}

/**
 * 计算卖出 AF 的结果
 * @param afAmount 卖出的 AF 数量
 * @param lpPool 当前 LP 池状态
 */
export function calculateSellAF(
  afAmount: number,
  lpPool: LPPoolState
): {
  usdcReceived: number;
  newPool: LPPoolState;
  priceImpact: number;
  effectivePrice: number;
} {
  const slippage = CONSTANTS.AMM_SLIPPAGE;

  // 恒定乘积公式: (usdc - usdcOut) * (af + afAmount) = k
  const newAfBalance = lpPool.afBalance + afAmount;
  const newUsdcBalance = lpPool.k / newAfBalance;
  const usdcOut = lpPool.usdcBalance - newUsdcBalance;
  const usdcReceived = usdcOut * (1 - slippage);

  const oldPrice = calculateAFPrice(lpPool);
  const newPrice = calculateAFPrice({ ...lpPool, usdcBalance: newUsdcBalance, afBalance: newAfBalance });
  const priceImpact = (newPrice - oldPrice) / oldPrice;
  const effectivePrice = usdcReceived / afAmount;

  return {
    usdcReceived,
    newPool: {
      usdcBalance: newUsdcBalance,
      afBalance: newAfBalance,
      afPrice: newPrice,
      k: lpPool.k,
    },
    priceImpact,
    effectivePrice,
  };
}

/**
 * 添加流动性到 LP 池
 */
export function addLiquidity(
  usdcAmount: number,
  afAmount: number,
  lpPool: LPPoolState
): LPPoolState {
  const newUsdcBalance = lpPool.usdcBalance + usdcAmount;
  const newAfBalance = lpPool.afBalance + afAmount;
  const newK = newUsdcBalance * newAfBalance;

  return {
    usdcBalance: newUsdcBalance,
    afBalance: newAfBalance,
    afPrice: newUsdcBalance / newAfBalance,
    k: newK,
  };
}

// ==================== AF 释放计算 ====================

/**
 * 计算每日 AF 释放量
 * @param order 质押订单
 * @param config 系统配置
 * @param currentPrice 当前 AF 价格
 */
export function calculateDailyAFRelease(
  order: StakingOrder,
  config: SystemConfig,
  currentPrice: number
): number {
  const tierConfig = config.tierConfigs.find(t => t.tier === order.tier);
  if (!tierConfig) return 0;

  if (config.releaseMode === 'gold') {
    // 金本位：按 USDC 价值释放 AF
    const dailyUsdcValue = order.principal * tierConfig.afReleaseRate;
    return currentPrice > 0 ? dailyUsdcValue / currentPrice : 0;
  } else {
    // 币本位：按固定 AF 数量释放
    return (order.principal / currentPrice) * tierConfig.afReleaseRate;
  }
}

/**
 * 计算 AF 释放分配
 */
export function calculateAFReleaseDistribution(
  totalAFReleased: number,
  config: SystemConfig
): {
  toWithdraw: number;
  toTradingFund: number;
  withdrawToMarket: number;
  withdrawBurn: number;
} {
  const { afReleaseChoice, afExitConfig } = config;

  // 按用户选择比例分配
  const toWithdraw = totalAFReleased * (afReleaseChoice.withdrawPercentage / 100);
  const toTradingFund = totalAFReleased * (afReleaseChoice.convertPercentage / 100);

  // 提现部分的分配
  const withdrawToMarket = toWithdraw * afExitConfig.withdrawToMarketRatio;
  const withdrawBurn = toWithdraw * afExitConfig.withdrawBurnRatio;

  return {
    toWithdraw,
    toTradingFund,
    withdrawToMarket,
    withdrawBurn,
  };
}

// ==================== 交易计算 ====================

/**
 * 计算单笔交易结果
 */
export function calculateTrade(
  tradingFund: number,
  profitRate: number, // 交易利润率
  tradingFeeRate: number,
  profitShareRatio: number,
  config: SystemConfig,
  afPrice: number
): {
  grossProfit: number;
  tradingFee: number;
  netProfit: number;
  userProfit: number;
  platformProfit: number;
  brokerProfit: number;
  afConsumedForFee: number;
  lpContribution: { usdc: number; af: number };
  buybackAmount: number;
  forexReserve: number;
} {
  const grossProfit = tradingFund * profitRate;
  const tradingFee = grossProfit * tradingFeeRate;
  const netProfit = grossProfit - tradingFee;

  // 用户分润
  const userProfit = netProfit * profitShareRatio;
  const remainingProfit = netProfit - userProfit;

  // 平台和经纪人分润
  const { platformRatio, brokerRatio } = config.tradeProfitDistribution;
  const platformProfit = remainingProfit * platformRatio;
  const brokerProfit = remainingProfit * brokerRatio;

  // 手续费消耗的 AF 数量
  const afConsumedForFee = afPrice > 0 ? tradingFee / afPrice : 0;

  // 资金流分配
  const { lpUsdcRatio, lpAfRatio, buybackRatio, forexReserveRatio } = config.tradeFundFlow;

  return {
    grossProfit,
    tradingFee,
    netProfit,
    userProfit,
    platformProfit,
    brokerProfit,
    afConsumedForFee,
    lpContribution: {
      usdc: tradingFund * lpUsdcRatio,
      af: (tradingFund * lpAfRatio) / afPrice,
    },
    buybackAmount: tradingFund * buybackRatio,
    forexReserve: tradingFund * forexReserveRatio,
  };
}

/**
 * 模拟每日交易
 */
export function simulateDailyTrading(
  order: StakingOrder,
  config: SystemConfig,
  lpPool: LPPoolState,
  dailyProfitRate: number = 0.02 // 默认 2% 日利润率
): {
  trades: Omit<TradeRecord, 'id' | 'orderId' | 'timestamp'>[];
  totalUserProfit: number;
  totalPlatformProfit: number;
  totalBrokerProfit: number;
  totalAfConsumed: number;
  totalLpContribution: { usdc: number; af: number };
  totalBuyback: number;
  totalForexReserve: number;
} {
  const tierConfig = config.tierConfigs.find(t => t.tier === order.tier);
  if (!tierConfig) {
    return {
      trades: [],
      totalUserProfit: 0,
      totalPlatformProfit: 0,
      totalBrokerProfit: 0,
      totalAfConsumed: 0,
      totalLpContribution: { usdc: 0, af: 0 },
      totalBuyback: 0,
      totalForexReserve: 0,
    };
  }

  const tradesPerDay = CONSTANTS.TRADES_PER_DAY;
  const tradingFundPerTrade = order.tradingFund / tradesPerDay;
  const trades: Omit<TradeRecord, 'id' | 'orderId' | 'timestamp'>[] = [];

  let totalUserProfit = 0;
  let totalPlatformProfit = 0;
  let totalBrokerProfit = 0;
  let totalAfConsumed = 0;
  let totalLpUsdc = 0;
  let totalLpAf = 0;
  let totalBuyback = 0;
  let totalForexReserve = 0;

  for (let i = 0; i < tradesPerDay; i++) {
    const result = calculateTrade(
      tradingFundPerTrade,
      dailyProfitRate / tradesPerDay,
      tierConfig.tradingFeeRate,
      tierConfig.profitShareRatio,
      config,
      lpPool.afPrice
    );

    trades.push({
      day: order.currentDay,
      tradingFundUsed: tradingFundPerTrade,
      grossProfit: result.grossProfit,
      tradingFee: result.tradingFee,
      netProfit: result.netProfit,
      userProfit: result.userProfit,
      platformProfit: result.platformProfit,
      brokerProfit: result.brokerProfit,
      afConsumed: result.afConsumedForFee,
    });

    totalUserProfit += result.userProfit;
    totalPlatformProfit += result.platformProfit;
    totalBrokerProfit += result.brokerProfit;
    totalAfConsumed += result.afConsumedForFee;
    totalLpUsdc += result.lpContribution.usdc;
    totalLpAf += result.lpContribution.af;
    totalBuyback += result.buybackAmount;
    totalForexReserve += result.forexReserve;
  }

  return {
    trades,
    totalUserProfit,
    totalPlatformProfit,
    totalBrokerProfit,
    totalAfConsumed,
    totalLpContribution: { usdc: totalLpUsdc, af: totalLpAf },
    totalBuyback,
    totalForexReserve,
  };
}

// ==================== 经纪人收益计算 ====================

/**
 * 获取层级对应的经纪人配置
 */
export function getBrokerConfigByLayer(
  layer: number,
  brokerConfigs: BrokerConfig[]
): BrokerConfig | null {
  return brokerConfigs.find(
    config => layer >= config.layerStart && layer <= config.layerEnd
  ) || null;
}

/**
 * 计算经纪人 AF 释放收益（20 层分配）
 */
export function calculateBrokerAFRelease(
  totalAFReleased: number,
  brokerConfigs: BrokerConfig[]
): BrokerReward[] {
  const rewards: BrokerReward[] = [];

  for (let layer = 1; layer <= CONSTANTS.MAX_BROKER_LAYERS; layer++) {
    const config = getBrokerConfigByLayer(layer, brokerConfigs);
    if (config) {
      const afReleased = totalAFReleased * config.layerReleaseRatio;
      rewards.push({
        level: config.level,
        layer,
        afReleased,
        usdcEarned: 0, // 将在后续计算
        promotionReward: 0,
      });
    }
  }

  return rewards;
}

/**
 * 计算经纪人推广收益
 */
export function calculateBrokerPromotionReward(
  referralProfit: number,
  brokerLevel: BrokerConfig
): number {
  return referralProfit * brokerLevel.promotionRewardRatio;
}

// ==================== 每日模拟 ====================

/**
 * 处理单个订单的每日模拟
 */
export function processOrderDaily(
  order: StakingOrder,
  config: SystemConfig,
  lpPool: LPPoolState,
  dailyProfitRate: number = 0.02
): {
  updatedOrder: StakingOrder;
  dailyAFRelease: number;
  afDistribution: ReturnType<typeof calculateAFReleaseDistribution>;
  tradingResult: ReturnType<typeof simulateDailyTrading>;
  brokerRewards: BrokerReward[];
} {
  // 计算每日 AF 释放
  const dailyAFRelease = calculateDailyAFRelease(order, config, lpPool.afPrice);

  // 计算 AF 分配
  const afDistribution = calculateAFReleaseDistribution(dailyAFRelease, config);

  // 模拟交易
  const tradingResult = simulateDailyTrading(order, config, lpPool, dailyProfitRate);

  // 计算经纪人 AF 释放收益
  const brokerRewards = calculateBrokerAFRelease(dailyAFRelease, config.brokerConfigs);

  // 更新订单状态
  const updatedOrder: StakingOrder = {
    ...order,
    afReleased: order.afReleased + dailyAFRelease,
    currentDay: order.currentDay + 1,
    status: order.currentDay + 1 >= order.stakingDays ? 'completed' : 'active',
  };

  return {
    updatedOrder,
    dailyAFRelease,
    afDistribution,
    tradingResult,
    brokerRewards,
  };
}

/**
 * 处理所有订单的每日模拟
 */
export function processAllOrdersDaily(
  orders: StakingOrder[],
  config: SystemConfig,
  lpPool: LPPoolState,
  dailyProfitRate: number = 0.02
): {
  updatedOrders: StakingOrder[];
  updatedLPPool: LPPoolState;
  dailyRecord: Omit<DailyReleaseRecord, 'day'>;
  totalBrokerRewards: BrokerReward[];
} {
  let currentLPPool = { ...lpPool };
  let totalAfReleased = 0;
  let totalAfToMarket = 0;
  let totalAfBurned = 0;
  let totalAfToTradingFee = 0;
  let totalAfToTradingFund = 0;
  let totalForexReserve = 0;
  let totalBuyback = 0;

  const updatedOrders: StakingOrder[] = [];
  const allBrokerRewards: BrokerReward[] = [];

  for (const order of orders) {
    if (order.status !== 'active') {
      updatedOrders.push(order);
      continue;
    }

    const result = processOrderDaily(order, config, currentLPPool, dailyProfitRate);
    updatedOrders.push(result.updatedOrder);

    totalAfReleased += result.dailyAFRelease;
    totalAfToMarket += result.afDistribution.withdrawToMarket;
    totalAfBurned += result.afDistribution.withdrawBurn;
    totalAfToTradingFund += result.afDistribution.toTradingFund;

    totalForexReserve += result.tradingResult.totalForexReserve;
    totalBuyback += result.tradingResult.totalBuyback;

    // 处理 LP 池变化
    currentLPPool = addLiquidity(
      result.tradingResult.totalLpContribution.usdc,
      result.tradingResult.totalLpContribution.af,
      currentLPPool
    );

    // 处理回购
    if (result.tradingResult.totalBuyback > 0) {
      const buyResult = calculateBuyAF(result.tradingResult.totalBuyback, currentLPPool);
      currentLPPool = buyResult.newPool;
      totalAfBurned += buyResult.afReceived * 0.5; // 回购的 50% 销毁
    }

    // 累积经纪人收益
    allBrokerRewards.push(...result.brokerRewards);
  }

  // 处理卖出到市场的 AF
  if (totalAfToMarket > 0) {
    const sellResult = calculateSellAF(totalAfToMarket, currentLPPool);
    currentLPPool = sellResult.newPool;
  }

  return {
    updatedOrders,
    updatedLPPool: currentLPPool,
    dailyRecord: {
      totalAfReleased,
      afToMarket: totalAfToMarket,
      afBurned: totalAfBurned,
      afToTradingFee: totalAfToTradingFee,
      afToTradingFund: totalAfToTradingFund,
      lpPoolState: currentLPPool,
      forexReserve: totalForexReserve,
      totalBuyback,
    },
    totalBrokerRewards: aggregateBrokerRewards(allBrokerRewards),
  };
}

/**
 * 汇总经纪人收益
 */
function aggregateBrokerRewards(rewards: BrokerReward[]): BrokerReward[] {
  const aggregated = new Map<number, BrokerReward>();

  for (const reward of rewards) {
    const existing = aggregated.get(reward.layer);
    if (existing) {
      existing.afReleased += reward.afReleased;
      existing.usdcEarned += reward.usdcEarned;
      existing.promotionReward += reward.promotionReward;
    } else {
      aggregated.set(reward.layer, { ...reward });
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => a.layer - b.layer);
}

// ==================== 收益预测 ====================

/**
 * 预测质押收益
 */
export function predictStakingReturns(
  principal: number,
  tier: number,
  config: SystemConfig,
  lpPool: LPPoolState,
  days: number
): {
  totalAFReleased: number;
  totalUserProfit: number;
  totalTradingFund: number;
  estimatedAFValue: number;
  roi: number;
} {
  const tierConfig = config.tierConfigs.find(t => t.tier === tier);
  if (!tierConfig) {
    return {
      totalAFReleased: 0,
      totalUserProfit: 0,
      totalTradingFund: 0,
      estimatedAFValue: 0,
      roi: 0,
    };
  }

  const tradingFund = principal * tierConfig.tradingFundMultiplier;
  let totalAFReleased = 0;
  let totalUserProfit = 0;
  let currentPrice = lpPool.afPrice;

  for (let day = 0; day < days; day++) {
    // 计算每日 AF 释放
    if (config.releaseMode === 'gold') {
      const dailyUsdcValue = principal * tierConfig.afReleaseRate;
      totalAFReleased += currentPrice > 0 ? dailyUsdcValue / currentPrice : 0;
    } else {
      totalAFReleased += (principal / currentPrice) * tierConfig.afReleaseRate;
    }

    // 计算每日交易利润
    const dailyTradeProfit = tradingFund * 0.02 * tierConfig.profitShareRatio;
    totalUserProfit += dailyTradeProfit;
  }

  const estimatedAFValue = totalAFReleased * currentPrice;
  const totalReturns = estimatedAFValue + totalUserProfit;
  const roi = (totalReturns / principal) * 100;

  return {
    totalAFReleased,
    totalUserProfit,
    totalTradingFund: tradingFund,
    estimatedAFValue,
    roi,
  };
}

// ==================== 工具函数 ====================

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化数字
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 格式化货币
 */
export function formatCurrency(num: number): string {
  return `$${formatNumber(num)}`;
}

/**
 * 格式化百分比
 */
export function formatPercent(num: number): string {
  return `${(num * 100).toFixed(2)}%`;
}
