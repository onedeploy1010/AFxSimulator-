/**
 * 仪表板页面
 * 主页面布局，包含侧边栏导航和内容区域
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ConfigPage } from '../components/config-page';
import { StakingPage } from '../components/staking-page';
import { ReleasePage } from '../components/release-page';
import { TradingPage } from '../components/trading-page';
import { AAMPage } from '../components/aam-page';
import { useActiveTab, useSimulationActions, useLPPool, useStats, useCurrentDay } from '../stores/simulation-store';
import { formatCurrency, formatNumber, formatCompactNumber } from '../lib/utils';
import {
  Settings,
  Wallet,
  Calendar,
  TrendingUp,
  Droplets,
  Coins,
  Flame,
  DollarSign,
  Clock,
} from 'lucide-react';

export function Dashboard() {
  const activeTab = useActiveTab() || 'config';
  const { setActiveTab } = useSimulationActions();
  const lpPool = useLPPool();
  const stats = useStats();
  const currentDay = useCurrentDay() ?? 0;

  // 等待 store 初始化
  if (!lpPool || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold">Loading AFx Simulator...</h1>
        </div>
      </div>
    );
  }

  const safeAfPrice = lpPool?.afPrice ?? 0;
  const safeTotalAFReleased = stats?.totalAFReleased ?? 0;
  const safeTotalAFBurned = stats?.totalAFBurned ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部状态栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Coins className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AFx 模拟计算器</h1>
                <p className="text-xs text-gray-500">多参数经济模型验证工具</p>
              </div>
            </div>

            {/* 实时指标 */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">第</span>
                <span className="text-sm font-bold">{currentDay}</span>
                <span className="text-sm text-gray-500">天</span>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                <span className="text-sm">AF 价格:</span>
                <span className="text-sm font-bold">{formatCurrency(safeAfPrice)}</span>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-green-500" />
                <span className="text-sm">已释放:</span>
                <span className="text-sm font-bold">{formatCompactNumber(safeTotalAFReleased)} AF</span>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-500" />
                <span className="text-sm">已销毁:</span>
                <span className="text-sm font-bold">{formatCompactNumber(safeTotalAFBurned)} AF</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              参数配置
            </TabsTrigger>
            <TabsTrigger value="staking" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              质押管理
            </TabsTrigger>
            <TabsTrigger value="release" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              释放进度
            </TabsTrigger>
            <TabsTrigger value="trading" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              交易模拟
            </TabsTrigger>
            <TabsTrigger value="aam" className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              AAM 池监控
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <ConfigPage />
          </TabsContent>
          <TabsContent value="staking">
            <StakingPage />
          </TabsContent>
          <TabsContent value="release">
            <ReleasePage />
          </TabsContent>
          <TabsContent value="trading">
            <TradingPage />
          </TabsContent>
          <TabsContent value="aam">
            <AAMPage />
          </TabsContent>
        </Tabs>
      </main>

      {/* 底部信息 */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>AFx 经济模型模拟计算器 v1.0</p>
            <p>数据仅供模拟参考，不构成投资建议</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
