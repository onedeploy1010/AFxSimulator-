/**
 * 释放进度页面
 * 查看第 N 天 AF 释放情况
 */

import React, { useState } from 'react';
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
  useConfig,
  useOrders,
  useLPPool,
  useCurrentDay,
  useDailyRecords,
  useStats,
  useSimulationActions,
  useIsSimulating,
} from '../stores/simulation-store';
import { formatNumber, formatCurrency, formatPercent } from '../lib/utils';
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
} from 'recharts';
import {
  Play,
  FastForward,
  RotateCcw,
  Calendar,
  Coins,
  Flame,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export function ReleasePage() {
  const config = useConfig();
  const orders = useOrders() || [];
  const lpPool = useLPPool();
  const currentDay = useCurrentDay() ?? 0;
  const dailyRecords = useDailyRecords() || [];
  const stats = useStats();

  if (!lpPool || !stats) {
    return <div className="p-8 text-center">Loading...</div>;
  }
  const { advanceDay, advanceDays, resetSimulation } = useSimulationActions();
  const isSimulating = useIsSimulating();

  const [daysToAdvance, setDaysToAdvance] = useState<string>('7');

  const activeOrders = orders.filter((o) => o.status === 'active');

  // 准备图表数据
  const chartData = dailyRecords.map((record) => ({
    day: record.day,
    released: record.totalAfReleased,
    burned: record.afBurned,
    toMarket: record.afToMarket,
    price: record.lpPoolState.afPrice,
    lpUsdc: record.lpPoolState.usdcBalance,
    lpAf: record.lpPoolState.afBalance,
  }));

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            释放进度
          </h1>
          <p className="text-gray-500 mt-1">模拟 AF 每日释放和市场变化</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">当前第 {currentDay} 天</span>
        </div>
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle>模拟控制</CardTitle>
          <CardDescription>推进模拟时间查看释放情况</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => advanceDay()}
              disabled={activeOrders.length === 0 || isSimulating}
            >
              <Play className="h-4 w-4 mr-2" />
              推进 1 天
            </Button>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-20"
                value={daysToAdvance}
                onChange={(e) => setDaysToAdvance(e.target.value)}
                min={1}
                max={365}
              />
              <Button
                variant="secondary"
                onClick={() => advanceDays(parseInt(daysToAdvance) || 7)}
                disabled={activeOrders.length === 0 || isSimulating}
              >
                <FastForward className="h-4 w-4 mr-2" />
                推进多天
              </Button>
            </div>

            <Button variant="outline" onClick={resetSimulation}>
              <RotateCcw className="h-4 w-4 mr-2" />
              重置模拟
            </Button>
          </div>

          {activeOrders.length === 0 && (
            <p className="text-sm text-amber-600 mt-4">
              请先在质押页面创建订单后再开始模拟
            </p>
          )}
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-500">累计释放 AF</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatNumber(stats.totalAFReleased)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-500">累计销毁 AF</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatNumber(stats.totalAFBurned)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">外汇储备金</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatCurrency(stats.totalForexReserve)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-gray-500">AF 当前价格</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatCurrency(lpPool.afPrice)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AF 释放趋势图 */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AF 释放趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  label={{ value: '天数', position: 'insideBottom', offset: -5 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="released"
                  name="释放 AF"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#93c5fd"
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

      {/* 价格变化趋势 */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AF 价格变化</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  label={{ value: '天数', position: 'insideBottom', offset: -5 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="price"
                  name="AF 价格"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 每日释放明细 */}
      <Card>
        <CardHeader>
          <CardTitle>每日释放明细</CardTitle>
          <CardDescription>最近释放记录（显示最近 20 条）</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyRecords.length === 0 ? (
            <p className="text-center text-gray-500 py-8">暂无释放记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>天数</TableHead>
                  <TableHead>总释放 AF</TableHead>
                  <TableHead>到市场</TableHead>
                  <TableHead>销毁</TableHead>
                  <TableHead>转交易金</TableHead>
                  <TableHead>回购金额</TableHead>
                  <TableHead>AF 价格</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyRecords
                  .slice(-20)
                  .reverse()
                  .map((record) => (
                    <TableRow key={record.day}>
                      <TableCell className="font-medium">第 {record.day} 天</TableCell>
                      <TableCell>{formatNumber(record.totalAfReleased)}</TableCell>
                      <TableCell>{formatNumber(record.afToMarket)}</TableCell>
                      <TableCell className="text-red-600">
                        {formatNumber(record.afBurned)}
                      </TableCell>
                      <TableCell>{formatNumber(record.afToTradingFund)}</TableCell>
                      <TableCell>{formatCurrency(record.totalBuyback)}</TableCell>
                      <TableCell>
                        {formatCurrency(record.lpPoolState.afPrice)}
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
