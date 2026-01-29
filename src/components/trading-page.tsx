/**
 * 交易模拟页面
 * 手续费消耗 AF 数量 / 用户利润 / 平台利润 / 经纪人收益
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  useConfig,
  useLPPool,
  useOrders,
  useBrokerRewards,
} from '../stores/simulation-store';
import { formatNumber, formatCurrency, formatPercent } from '../lib/utils';
import { calculateTrade, simulateDailyTrading } from '../lib/tokenomics';
import { STAKING_TIERS } from '../../shared/schema';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Calculator,
  DollarSign,
  Users,
  Building,
  Coins,
} from 'lucide-react';

export function TradingPage() {
  const config = useConfig();
  const lpPool = useLPPool();
  const orders = useOrders() || [];
  const brokerRewards = useBrokerRewards() || [];

  const [tradingFund, setTradingFund] = useState<string>('1000');
  const [profitRate, setProfitRate] = useState<number>(2);
  const [selectedTier, setSelectedTier] = useState<number>(STAKING_TIERS[2]);

  if (!config || !config.tierConfigs || !lpPool) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const tierConfig = config.tierConfigs.find((t) => t.tier === selectedTier);

  // 计算单笔交易结果
  const tradeResult = useMemo(() => {
    if (!tierConfig || !tradingFund) return null;

    return calculateTrade(
      parseFloat(tradingFund) || 0,
      profitRate / 100,
      tierConfig.tradingFeeRate,
      tierConfig.profitShareRatio,
      config,
      lpPool.afPrice
    );
  }, [tradingFund, profitRate, tierConfig, config, lpPool.afPrice]);

  // 利润分配饼图数据
  const profitDistributionData = tradeResult
    ? [
        { name: '用户利润', value: tradeResult.userProfit, color: '#3b82f6' },
        { name: '平台收益', value: tradeResult.platformProfit, color: '#8b5cf6' },
        { name: '经纪人收益', value: tradeResult.brokerProfit, color: '#22c55e' },
        { name: '交易手续费', value: tradeResult.tradingFee, color: '#f59e0b' },
      ]
    : [];

  // 资金流向数据
  const fundFlowData = tradeResult
    ? [
        { name: 'LP USDC', value: tradeResult.lpContribution.usdc },
        { name: 'LP AF', value: tradeResult.lpContribution.af * lpPool.afPrice },
        { name: '回购 AF', value: tradeResult.buybackAmount },
        { name: '外汇储备', value: tradeResult.forexReserve },
      ]
    : [];

  // 汇总经纪人收益（按等级）
  const brokerSummary = useMemo(() => {
    const summary: Record<string, { afReleased: number; count: number }> = {};

    for (const reward of brokerRewards) {
      if (!summary[reward.level]) {
        summary[reward.level] = { afReleased: 0, count: 0 };
      }
      summary[reward.level].afReleased += reward.afReleased;
      summary[reward.level].count += 1;
    }

    return Object.entries(summary).map(([level, data]) => ({
      level,
      ...data,
      usdcValue: data.afReleased * lpPool.afPrice,
    }));
  }, [brokerRewards, lpPool.afPrice]);

  const activeOrders = orders.filter((o) => o.status === 'active');
  const totalTradingFund = activeOrders.reduce((sum, o) => sum + o.tradingFund, 0);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          交易模拟
        </h1>
        <p className="text-gray-500 mt-1">模拟交易过程和利润分配</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-500">活跃交易金</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatCurrency(totalTradingFund)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">活跃订单数</span>
            </div>
            <p className="text-2xl font-bold mt-2">{activeOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-gray-500">AF 价格</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatCurrency(lpPool.afPrice)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-gray-500">经纪人总释放</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatNumber(brokerRewards.reduce((sum, r) => sum + r.afReleased, 0))} AF
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 交易模拟器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            单笔交易模拟
          </CardTitle>
          <CardDescription>输入参数查看交易结果</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* 左侧：输入参数 */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>选择配套档位</Label>
                <Select
                  value={selectedTier.toString()}
                  onValueChange={(value) => setSelectedTier(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAKING_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier.toString()}>
                        {tier} USDT (手续费 {formatPercent(
                          config.tierConfigs.find((t) => t.tier === tier)?.tradingFeeRate || 0
                        )})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>交易金额 (USDT)</Label>
                <Input
                  type="number"
                  value={tradingFund}
                  onChange={(e) => setTradingFund(e.target.value)}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label>交易利润率: {profitRate}%</Label>
                <Slider
                  value={[profitRate]}
                  onValueChange={([value]) => setProfitRate(value)}
                  min={0}
                  max={20}
                  step={0.5}
                />
              </div>

              {tierConfig && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <h4 className="font-semibold">档位参数</h4>
                  <div className="flex justify-between">
                    <span className="text-gray-500">用户分润比例</span>
                    <span>{formatPercent(tierConfig.profitShareRatio)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">交易手续费率</span>
                    <span>{formatPercent(tierConfig.tradingFeeRate)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：计算结果 */}
            <div className="space-y-4">
              {tradeResult && (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                    <h4 className="font-semibold">交易结果</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">毛利润</span>
                        <span className="font-medium">
                          {formatCurrency(tradeResult.grossProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">手续费</span>
                        <span className="font-medium text-orange-600">
                          -{formatCurrency(tradeResult.tradingFee)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">净利润</span>
                        <span className="font-medium">
                          {formatCurrency(tradeResult.netProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">消耗 AF</span>
                        <span className="font-medium">
                          {formatNumber(tradeResult.afConsumedForFee)} AF
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg space-y-3">
                    <h4 className="font-semibold">利润分配</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">用户利润</span>
                        <span className="font-medium text-blue-600">
                          {formatCurrency(tradeResult.userProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">平台收益</span>
                        <span className="font-medium text-purple-600">
                          {formatCurrency(tradeResult.platformProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">经纪人收益</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(tradeResult.brokerProfit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg space-y-3">
                    <h4 className="font-semibold">资金流向</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">添加 LP (USDC)</span>
                        <span>{formatCurrency(tradeResult.lpContribution.usdc)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">添加 LP (AF)</span>
                        <span>{formatNumber(tradeResult.lpContribution.af)} AF</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">回购 AF</span>
                        <span>{formatCurrency(tradeResult.buybackAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">外汇储备</span>
                        <span>{formatCurrency(tradeResult.forexReserve)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 利润分配图表 */}
      {profitDistributionData.length > 0 && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>利润分配</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={profitDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {profitDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>资金流向</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={fundFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 经纪人收益汇总 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            经纪人收益汇总
          </CardTitle>
          <CardDescription>按等级汇总的 AF 释放收益</CardDescription>
        </CardHeader>
        <CardContent>
          {brokerSummary.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              暂无经纪人收益记录，请先运行模拟
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>经纪人等级</TableHead>
                  <TableHead>释放次数</TableHead>
                  <TableHead>累计释放 AF</TableHead>
                  <TableHead>USDC 估值</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokerSummary.map((item) => (
                  <TableRow key={item.level}>
                    <TableCell className="font-medium">{item.level}</TableCell>
                    <TableCell>{item.count}</TableCell>
                    <TableCell>{formatNumber(item.afReleased)} AF</TableCell>
                    <TableCell>{formatCurrency(item.usdcValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
