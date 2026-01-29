/**
 * 质押页面
 * 支持用户叠加多笔质押订单
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
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
  useOrders,
  useLPPool,
  useStats,
  useSimulationActions,
} from '../stores/simulation-store';
import { formatNumber, formatCurrency, formatPercent } from '../lib/utils';
import { predictStakingReturns } from '../lib/tokenomics';
import { STAKING_TIERS } from '../../shared/schema';
import {
  Wallet,
  Plus,
  Trash2,
  TrendingUp,
  Calculator,
  Coins,
  DollarSign,
} from 'lucide-react';

export function StakingPage() {
  const config = useConfig();
  const orders = useOrders() || [];
  const lpPool = useLPPool();
  const stats = useStats();
  const { addStakingOrder, removeStakingOrder, clearAllOrders, getPrediction } = useSimulationActions();

  const [selectedTier, setSelectedTier] = useState<number>(STAKING_TIERS[0]);
  const [principal, setPrincipal] = useState<string>('');

  // 等待配置加载
  if (!config || !config.tierConfigs || !lpPool || !stats) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const tierConfig = config.tierConfigs.find((t) => t.tier === selectedTier);

  // 计算预测收益
  const prediction = principal && parseFloat(principal) > 0
    ? predictStakingReturns(
        parseFloat(principal),
        selectedTier,
        config,
        lpPool,
        config.stakingPeriod.enabled ? config.stakingPeriod.days : 30
      )
    : null;

  const handleAddOrder = () => {
    const amount = parseFloat(principal);
    if (amount > 0) {
      addStakingOrder(selectedTier, amount);
      setPrincipal('');
    }
  };

  const activeOrders = orders.filter((o) => o.status === 'active');
  const completedOrders = orders.filter((o) => o.status === 'completed');

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          质押管理
        </h1>
        <p className="text-gray-500 mt-1">创建和管理质押订单</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-500">总质押金额</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatCurrency(stats.totalStaked)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">已释放 AF</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatNumber(stats.totalAFReleased)} AF
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-gray-500">活跃订单</span>
            </div>
            <p className="text-2xl font-bold mt-2">{activeOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-gray-500">AF 当前价格</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatCurrency(lpPool.afPrice)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 新建质押 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            新建质押订单
          </CardTitle>
          <CardDescription>选择配套档位并输入质押金额</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {/* 左侧：输入区域 */}
            <div className="space-y-4">
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
                        {tier} USDT
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>质押金额 (USDT)</Label>
                <Input
                  type="number"
                  placeholder="输入质押金额"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  min={selectedTier}
                  step={100}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleAddOrder}
                disabled={!principal || parseFloat(principal) < selectedTier}
              >
                <Plus className="h-4 w-4 mr-2" />
                创建质押订单
              </Button>
            </div>

            {/* 中间：档位参数 */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold">档位参数</h4>
              {tierConfig && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">AF 日释放率</span>
                    <span className="font-medium">
                      {formatPercent(tierConfig.afReleaseRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">交易金倍数</span>
                    <span className="font-medium">
                      {tierConfig.tradingFundMultiplier}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">用户分润比例</span>
                    <span className="font-medium">
                      {formatPercent(tierConfig.profitShareRatio)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">交易手续费率</span>
                    <span className="font-medium">
                      {formatPercent(tierConfig.tradingFeeRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">质押周期</span>
                    <span className="font-medium">
                      {config.stakingPeriod.enabled
                        ? `${config.stakingPeriod.days} 天`
                        : '无限制'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：收益预测 */}
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold">收益预测</h4>
              {prediction ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">交易金总额</span>
                    <span className="font-medium">
                      {formatCurrency(prediction.totalTradingFund)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">预计 AF 释放</span>
                    <span className="font-medium">
                      {formatNumber(prediction.totalAFReleased)} AF
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">AF 估值</span>
                    <span className="font-medium">
                      {formatCurrency(prediction.estimatedAFValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">交易利润</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(prediction.totalUserProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-gray-700 font-medium">预计 ROI</span>
                    <span className="font-bold text-blue-600">
                      {formatPercent(prediction.roi / 100)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">输入金额查看收益预测</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 活跃订单列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>活跃订单</CardTitle>
            <CardDescription>当前进行中的质押订单</CardDescription>
          </div>
          {activeOrders.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllOrders}>
              清空全部
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">暂无活跃订单</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单 ID</TableHead>
                  <TableHead>档位</TableHead>
                  <TableHead>本金</TableHead>
                  <TableHead>交易金</TableHead>
                  <TableHead>已释放 AF</TableHead>
                  <TableHead>进度</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeOrders || []).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{order.tier} USDT</TableCell>
                    <TableCell>{formatCurrency(order.principal)}</TableCell>
                    <TableCell>{formatCurrency(order.tradingFund)}</TableCell>
                    <TableCell>{formatNumber(order.afReleased)} AF</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{
                              width: `${(order.currentDay / order.stakingDays) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {order.currentDay}/{order.stakingDays}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStakingOrder(order.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 已完成订单 */}
      {completedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>已完成订单</CardTitle>
            <CardDescription>质押周期已结束的订单</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单 ID</TableHead>
                  <TableHead>档位</TableHead>
                  <TableHead>本金</TableHead>
                  <TableHead>总释放 AF</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{order.tier} USDT</TableCell>
                    <TableCell>{formatCurrency(order.principal)}</TableCell>
                    <TableCell>{formatNumber(order.afReleased)} AF</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                        已完成
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
