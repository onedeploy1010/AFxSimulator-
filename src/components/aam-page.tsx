/**
 * AAM 池监控页面
 * LP 池规模 / AF 币价变化模拟 / 回购 & 销毁影响
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  useLPPool,
  useDailyRecords,
  useStats,
  useSimulationActions,
} from '../stores/simulation-store';
import { formatNumber, formatCurrency, formatPercent, formatCompactNumber } from '../lib/utils';
import { calculateBuyAF, calculateSellAF, addLiquidity } from '../lib/tokenomics';
import { DEFAULT_LP_POOL, CONSTANTS } from '../../shared/schema';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
} from 'recharts';
import {
  Droplets,
  TrendingUp,
  TrendingDown,
  Flame,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Coins,
} from 'lucide-react';

export function AAMPage() {
  const lpPool = useLPPool();
  const dailyRecords = useDailyRecords();
  const stats = useStats();
  const { buyAF, sellAF, resetSimulation } = useSimulationActions();

  const [buyAmount, setBuyAmount] = useState<string>('1000');
  const [sellAmount, setSellAmount] = useState<string>('100');

  // 计算买入预览
  const buyPreview = useMemo(() => {
    const amount = parseFloat(buyAmount) || 0;
    if (amount <= 0) return null;
    return calculateBuyAF(amount, lpPool);
  }, [buyAmount, lpPool]);

  // 计算卖出预览
  const sellPreview = useMemo(() => {
    const amount = parseFloat(sellAmount) || 0;
    if (amount <= 0) return null;
    return calculateSellAF(amount, lpPool);
  }, [sellAmount, lpPool]);

  // 准备历史数据
  const historyData = dailyRecords.map((record) => ({
    day: record.day,
    price: record.lpPoolState.afPrice,
    usdc: record.lpPoolState.usdcBalance,
    af: record.lpPoolState.afBalance,
    burned: record.afBurned,
    buyback: record.totalBuyback,
  }));

  // 计算关键指标
  const priceChange = dailyRecords.length > 1
    ? ((lpPool.afPrice - dailyRecords[0].lpPoolState.afPrice) / dailyRecords[0].lpPoolState.afPrice) * 100
    : 0;

  const totalBuyback = dailyRecords.reduce((sum, r) => sum + r.totalBuyback, 0);
  const avgPrice = dailyRecords.length > 0
    ? dailyRecords.reduce((sum, r) => sum + r.lpPoolState.afPrice, 0) / dailyRecords.length
    : lpPool.afPrice;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Droplets className="h-6 w-6" />
            AAM 池监控
          </h1>
          <p className="text-gray-500 mt-1">LP 池状态、价格变化和回购销毁影响</p>
        </div>
        <Button variant="outline" onClick={resetSimulation}>
          <RefreshCw className="h-4 w-4 mr-2" />
          重置 LP 池
        </Button>
      </div>

      {/* LP 池状态卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-500">USDC 余额</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatCompactNumber(lpPool.usdcBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              初始: {formatCompactNumber(DEFAULT_LP_POOL.usdcBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-gray-500">AF 余额</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatCompactNumber(lpPool.afBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              初始: {formatCompactNumber(DEFAULT_LP_POOL.afBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {priceChange >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm text-gray-500">AF 价格</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatCurrency(lpPool.afPrice)}
            </p>
            <p className={`text-xs mt-1 ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-500">累计销毁</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatCompactNumber(stats.totalAFBurned)} AF
            </p>
            <p className="text-xs text-gray-400 mt-1">
              回购: {formatCurrency(totalBuyback)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LP 池详情 */}
      <Card>
        <CardHeader>
          <CardTitle>LP 池详情</CardTitle>
          <CardDescription>恒定乘积 AMM 模型 (k = x * y)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-700">USDC 池</h4>
              <p className="text-2xl font-bold mt-2">
                {formatNumber(lpPool.usdcBalance)}
              </p>
              <p className="text-sm text-gray-500 mt-1">USDC</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-700">AF 池</h4>
              <p className="text-2xl font-bold mt-2">
                {formatNumber(lpPool.afBalance)}
              </p>
              <p className="text-sm text-gray-500 mt-1">AF</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-700">恒定乘积 k</h4>
              <p className="text-2xl font-bold mt-2">
                {formatCompactNumber(lpPool.k)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                滑点: {formatPercent(CONSTANTS.AMM_SLIPPAGE)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 交易模拟 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 买入模拟 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-500" />
              买入 AF
            </CardTitle>
            <CardDescription>使用 USDC 购买 AF</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>投入 USDC</Label>
              <Input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                min={0}
              />
            </div>

            {buyPreview && (
              <div className="p-4 bg-green-50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">获得 AF</span>
                  <span className="font-medium text-green-600">
                    {formatNumber(buyPreview.afReceived)} AF
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">有效价格</span>
                  <span>{formatCurrency(buyPreview.effectivePrice)}/AF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">价格影响</span>
                  <span className={buyPreview.priceImpact > 0 ? 'text-green-600' : 'text-red-600'}>
                    {buyPreview.priceImpact > 0 ? '+' : ''}{formatPercent(buyPreview.priceImpact)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">新价格</span>
                  <span>{formatCurrency(buyPreview.newPool.afPrice)}</span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => buyAF(parseFloat(buyAmount) || 0)}
              disabled={!buyAmount || parseFloat(buyAmount) <= 0}
            >
              执行买入
            </Button>
          </CardContent>
        </Card>

        {/* 卖出模拟 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
              卖出 AF
            </CardTitle>
            <CardDescription>卖出 AF 获取 USDC</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>卖出 AF 数量</Label>
              <Input
                type="number"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                min={0}
              />
            </div>

            {sellPreview && (
              <div className="p-4 bg-red-50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">获得 USDC</span>
                  <span className="font-medium text-blue-600">
                    {formatCurrency(sellPreview.usdcReceived)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">有效价格</span>
                  <span>{formatCurrency(sellPreview.effectivePrice)}/AF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">价格影响</span>
                  <span className={sellPreview.priceImpact < 0 ? 'text-red-600' : 'text-green-600'}>
                    {sellPreview.priceImpact > 0 ? '+' : ''}{formatPercent(sellPreview.priceImpact)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">新价格</span>
                  <span>{formatCurrency(sellPreview.newPool.afPrice)}</span>
                </div>
              </div>
            )}

            <Button
              variant="destructive"
              className="w-full"
              onClick={() => sellAF(parseFloat(sellAmount) || 0)}
              disabled={!sellAmount || parseFloat(sellAmount) <= 0}
            >
              执行卖出
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 价格历史图表 */}
      {historyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>价格与 LP 池变化</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  label={{ value: '天数', position: 'insideBottom', offset: -5 }}
                />
                <YAxis yAxisId="left" label={{ value: '价格', angle: -90, position: 'insideLeft' }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: '余额', angle: 90, position: 'insideRight' }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="price"
                  name="AF 价格"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                />
                <Bar
                  yAxisId="right"
                  dataKey="usdc"
                  name="USDC 池"
                  fill="#3b82f6"
                  opacity={0.5}
                />
                <Bar
                  yAxisId="right"
                  dataKey="af"
                  name="AF 池"
                  fill="#a855f7"
                  opacity={0.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 回购与销毁图表 */}
      {historyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>回购与销毁趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="buyback"
                  name="回购金额"
                  stackId="1"
                  stroke="#22c55e"
                  fill="#86efac"
                />
                <Area
                  type="monotone"
                  dataKey="burned"
                  name="销毁 AF"
                  stackId="2"
                  stroke="#ef4444"
                  fill="#fca5a5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* LP 池历史记录 */}
      <Card>
        <CardHeader>
          <CardTitle>LP 池历史记录</CardTitle>
          <CardDescription>最近 20 条记录</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyRecords.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              暂无记录，请先运行模拟
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>天数</TableHead>
                  <TableHead>USDC 池</TableHead>
                  <TableHead>AF 池</TableHead>
                  <TableHead>AF 价格</TableHead>
                  <TableHead>回购</TableHead>
                  <TableHead>销毁</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyRecords
                  .slice(-20)
                  .reverse()
                  .map((record) => (
                    <TableRow key={record.day}>
                      <TableCell className="font-medium">第 {record.day} 天</TableCell>
                      <TableCell>
                        {formatCompactNumber(record.lpPoolState.usdcBalance)}
                      </TableCell>
                      <TableCell>
                        {formatCompactNumber(record.lpPoolState.afBalance)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(record.lpPoolState.afPrice)}
                      </TableCell>
                      <TableCell>{formatCurrency(record.totalBuyback)}</TableCell>
                      <TableCell className="text-red-600">
                        {formatNumber(record.afBurned)}
                      </TableCell>
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
