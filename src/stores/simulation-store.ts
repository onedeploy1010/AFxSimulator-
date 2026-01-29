/**
 * AFx 模拟器状态管理
 * 使用 Zustand 进行状态管理，支持 localStorage 持久化
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
import {
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_LP_POOL,
} from '../../shared/schema';
import {
  processAllOrdersDaily,
  generateId,
  predictStakingReturns,
  calculateAFPrice,
  calculateBuyAF,
  calculateSellAF,
} from '../lib/tokenomics';

// ==================== 状态接口 ====================

interface SimulationState {
  // 系统配置
  config: SystemConfig;

  // LP 池状态
  lpPool: LPPoolState;

  // 用户质押订单
  orders: StakingOrder[];

  // 交易记录
  tradeRecords: TradeRecord[];

  // 经纪人收益记录
  brokerRewards: BrokerReward[];

  // 每日释放记录
  dailyRecords: DailyReleaseRecord[];

  // 模拟时间
  currentDay: number;

  // 统计数据
  stats: {
    totalStaked: number;
    totalAFReleased: number;
    totalAFBurned: number;
    totalUserProfit: number;
    totalPlatformProfit: number;
    totalBrokerProfit: number;
    totalForexReserve: number;
  };

  // UI 状态
  activeTab: string;
  isSimulating: boolean;
}

interface SimulationActions {
  // 配置相关
  updateConfig: (config: Partial<SystemConfig>) => void;
  updateTierConfig: (tier: number, config: Partial<TierConfig>) => void;
  updateBrokerConfig: (level: string, config: Partial<BrokerConfig>) => void;
  resetConfig: () => void;

  // 质押相关
  addStakingOrder: (tier: number, principal: number) => void;
  removeStakingOrder: (orderId: string) => void;
  clearAllOrders: () => void;

  // 模拟相关
  advanceDay: (dailyProfitRate?: number) => void;
  advanceDays: (days: number, dailyProfitRate?: number) => void;
  resetSimulation: () => void;

  // LP 池操作
  buyAF: (usdcAmount: number) => void;
  sellAF: (afAmount: number) => void;

  // UI 相关
  setActiveTab: (tab: string) => void;

  // 计算
  getPrediction: (principal: number, tier: number, days: number) => ReturnType<typeof predictStakingReturns>;
  getTierConfig: (tier: number) => TierConfig | undefined;
}

type SimulationStore = SimulationState & SimulationActions;

// ==================== 初始状态 ====================

const initialStats = {
  totalStaked: 0,
  totalAFReleased: 0,
  totalAFBurned: 0,
  totalUserProfit: 0,
  totalPlatformProfit: 0,
  totalBrokerProfit: 0,
  totalForexReserve: 0,
};

// ==================== Store 创建 ====================

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      config: DEFAULT_SYSTEM_CONFIG,
      lpPool: DEFAULT_LP_POOL,
      orders: [],
      tradeRecords: [],
      brokerRewards: [],
      dailyRecords: [],
      currentDay: 0,
      stats: initialStats,
      activeTab: 'config',
      isSimulating: false,

      // ==================== 配置相关 ====================

      updateConfig: (newConfig) => {
        set((state) => ({
          config: { ...state.config, ...newConfig },
        }));
      },

      updateTierConfig: (tier, updates) => {
        set((state) => ({
          config: {
            ...state.config,
            tierConfigs: state.config.tierConfigs.map((tc) =>
              tc.tier === tier ? { ...tc, ...updates } : tc
            ),
          },
        }));
      },

      updateBrokerConfig: (level, updates) => {
        set((state) => ({
          config: {
            ...state.config,
            brokerConfigs: state.config.brokerConfigs.map((bc) =>
              bc.level === level ? { ...bc, ...updates } : bc
            ),
          },
        }));
      },

      resetConfig: () => {
        set({ config: DEFAULT_SYSTEM_CONFIG });
      },

      // ==================== 质押相关 ====================

      addStakingOrder: (tier, principal) => {
        const state = get();
        const tierConfig = state.config.tierConfigs.find((tc) => tc.tier === tier);

        if (!tierConfig) return;

        const newOrder: StakingOrder = {
          id: generateId(),
          tier,
          principal,
          tradingFund: principal * tierConfig.tradingFundMultiplier,
          afReleased: 0,
          afPending: 0,
          startDate: new Date().toISOString(),
          stakingDays: state.config.stakingPeriod.enabled ? state.config.stakingPeriod.days : 365,
          currentDay: 0,
          profitShareRatio: tierConfig.profitShareRatio,
          status: 'active',
        };

        set((state) => ({
          orders: [...state.orders, newOrder],
          stats: {
            ...state.stats,
            totalStaked: state.stats.totalStaked + principal,
          },
        }));
      },

      removeStakingOrder: (orderId) => {
        set((state) => {
          const order = state.orders.find((o) => o.id === orderId);
          return {
            orders: state.orders.filter((o) => o.id !== orderId),
            stats: {
              ...state.stats,
              totalStaked: state.stats.totalStaked - (order?.principal || 0),
            },
          };
        });
      },

      clearAllOrders: () => {
        set({
          orders: [],
          stats: { ...get().stats, totalStaked: 0 },
        });
      },

      // ==================== 模拟相关 ====================

      advanceDay: (dailyProfitRate = 0.02) => {
        const state = get();

        if (state.orders.filter((o) => o.status === 'active').length === 0) return;

        set({ isSimulating: true });

        const result = processAllOrdersDaily(
          state.orders,
          state.config,
          state.lpPool,
          dailyProfitRate
        );

        const newDay = state.currentDay + 1;
        const dailyRecord: DailyReleaseRecord = {
          day: newDay,
          ...result.dailyRecord,
        };

        set((state) => ({
          orders: result.updatedOrders,
          lpPool: result.updatedLPPool,
          brokerRewards: [...state.brokerRewards, ...result.totalBrokerRewards],
          dailyRecords: [...state.dailyRecords, dailyRecord],
          currentDay: newDay,
          stats: {
            ...state.stats,
            totalAFReleased: state.stats.totalAFReleased + dailyRecord.totalAfReleased,
            totalAFBurned: state.stats.totalAFBurned + dailyRecord.afBurned,
            totalForexReserve: state.stats.totalForexReserve + dailyRecord.forexReserve,
          },
          isSimulating: false,
        }));
      },

      advanceDays: (days, dailyProfitRate = 0.02) => {
        for (let i = 0; i < days; i++) {
          get().advanceDay(dailyProfitRate);
        }
      },

      resetSimulation: () => {
        set({
          lpPool: DEFAULT_LP_POOL,
          orders: [],
          tradeRecords: [],
          brokerRewards: [],
          dailyRecords: [],
          currentDay: 0,
          stats: initialStats,
        });
      },

      // ==================== LP 池操作 ====================

      buyAF: (usdcAmount) => {
        const state = get();
        const result = calculateBuyAF(usdcAmount, state.lpPool);
        set({ lpPool: result.newPool });
      },

      sellAF: (afAmount) => {
        const state = get();
        const result = calculateSellAF(afAmount, state.lpPool);
        set({ lpPool: result.newPool });
      },

      // ==================== UI 相关 ====================

      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      // ==================== 计算 ====================

      getPrediction: (principal, tier, days) => {
        const state = get();
        return predictStakingReturns(principal, tier, state.config, state.lpPool, days);
      },

      getTierConfig: (tier) => {
        return get().config.tierConfigs.find((tc) => tc.tier === tier);
      },
    }),
    {
      name: 'afx-simulation-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        lpPool: state.lpPool,
        orders: state.orders,
        dailyRecords: state.dailyRecords,
        currentDay: state.currentDay,
        stats: state.stats,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SimulationState> | undefined;
        return {
          ...currentState,
          ...persisted,
          // 确保 config 完整
          config: {
            ...DEFAULT_SYSTEM_CONFIG,
            ...(persisted?.config || {}),
            tierConfigs: persisted?.config?.tierConfigs || DEFAULT_SYSTEM_CONFIG.tierConfigs,
            brokerConfigs: persisted?.config?.brokerConfigs || DEFAULT_SYSTEM_CONFIG.brokerConfigs,
          },
          // 确保 lpPool 完整
          lpPool: {
            ...DEFAULT_LP_POOL,
            ...(persisted?.lpPool || {}),
          },
          // 确保 stats 完整
          stats: {
            ...initialStats,
            ...(persisted?.stats || {}),
          },
          // 确保数组不为 undefined
          orders: persisted?.orders || [],
          dailyRecords: persisted?.dailyRecords || [],
        };
      },
    }
  )
);

// ==================== 选择器 Hooks ====================

export const useConfig = () => useSimulationStore((state) => state.config);
export const useLPPool = () => useSimulationStore((state) => state.lpPool);
export const useOrders = () => useSimulationStore((state) => state.orders);
export const useStats = () => useSimulationStore((state) => state.stats);
export const useCurrentDay = () => useSimulationStore((state) => state.currentDay);
export const useDailyRecords = () => useSimulationStore((state) => state.dailyRecords);
export const useBrokerRewards = () => useSimulationStore((state) => state.brokerRewards);
export const useActiveTab = () => useSimulationStore((state) => state.activeTab);
export const useIsSimulating = () => useSimulationStore((state) => state.isSimulating);

// ==================== Action Hooks ====================

export const useSimulationActions = () =>
  useSimulationStore((state) => ({
    updateConfig: state.updateConfig,
    updateTierConfig: state.updateTierConfig,
    updateBrokerConfig: state.updateBrokerConfig,
    resetConfig: state.resetConfig,
    addStakingOrder: state.addStakingOrder,
    removeStakingOrder: state.removeStakingOrder,
    clearAllOrders: state.clearAllOrders,
    advanceDay: state.advanceDay,
    advanceDays: state.advanceDays,
    resetSimulation: state.resetSimulation,
    buyAF: state.buyAF,
    sellAF: state.sellAF,
    setActiveTab: state.setActiveTab,
    getPrediction: state.getPrediction,
    getTierConfig: state.getTierConfig,
  }));
