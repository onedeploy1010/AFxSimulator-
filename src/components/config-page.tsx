/**
 * 参数配置页面
 * 统一修改所有参数与公式来源
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
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
import { useConfig, useSimulationActions } from '../stores/simulation-store';
import { formatPercent } from '../lib/utils';
import { STAKING_TIERS } from '../../shared/schema';
import { Settings, RefreshCw, Coins, Users, Percent, ArrowRightLeft } from 'lucide-react';

export function ConfigPage() {
  const config = useConfig();
  const { updateConfig, updateTierConfig, updateBrokerConfig, resetConfig } = useSimulationActions();

  // 等待配置加载
  if (!config || !config.tierConfigs || !config.brokerConfigs) {
    return (
      <div className="p-8 text-center">
        <p>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            参数配置
          </h1>
          <p className="text-gray-500 mt-1">配置 AFx 经济模型的所有核心参数</p>
        </div>
        <Button variant="outline" onClick={resetConfig}>
          <RefreshCw className="h-4 w-4 mr-2" />
          重置默认
        </Button>
      </div>

      {/* 释放模式配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            AF 释放模式
          </CardTitle>
          <CardDescription>选择 AF 代币的释放计算方式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                config.releaseMode === 'gold'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => updateConfig({ releaseMode: 'gold' })}
            >
              <h3 className="font-semibold">金本位</h3>
              <p className="text-sm text-gray-500 mt-1">
                按 USDC 价值释放 AF，释放数量随价格波动
              </p>
            </div>
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                config.releaseMode === 'coin'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => updateConfig({ releaseMode: 'coin' })}
            >
              <h3 className="font-semibold">币本位</h3>
              <p className="text-sm text-gray-500 mt-1">
                按固定 AF 数量释放，不受价格影响
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 质押周期配置 */}
      <Card>
        <CardHeader>
          <CardTitle>质押周期</CardTitle>
          <CardDescription>配置是否启用质押周期及周期天数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>启用质押周期</Label>
              <p className="text-sm text-gray-500">开启后用户需锁仓指定天数</p>
            </div>
            <Switch
              checked={config.stakingPeriod.enabled}
              onCheckedChange={(checked) =>
                updateConfig({
                  stakingPeriod: { ...config.stakingPeriod, enabled: checked },
                })
              }
            />
          </div>
          {config.stakingPeriod.enabled && (
            <div className="space-y-2">
              <Label>周期天数: {config.stakingPeriod.days} 天</Label>
              <Slider
                value={[config.stakingPeriod.days]}
                onValueChange={([days]) =>
                  updateConfig({
                    stakingPeriod: { ...config.stakingPeriod, days },
                  })
                }
                min={7}
                max={365}
                step={1}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 配套档位参数 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            配套档位参数
          </CardTitle>
          <CardDescription>每个配套档位的独立参数配置</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>档位 (USDT)</TableHead>
                <TableHead>AF 日释放率</TableHead>
                <TableHead>交易金倍数</TableHead>
                <TableHead>用户分润</TableHead>
                <TableHead>手续费率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(config.tierConfigs || []).map((tierConfig) => (
                <TableRow key={tierConfig.tier}>
                  <TableCell className="font-medium">{tierConfig.tier}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-24"
                      value={(tierConfig.afReleaseRate * 100).toFixed(2)}
                      onChange={(e) =>
                        updateTierConfig(tierConfig.tier, {
                          afReleaseRate: parseFloat(e.target.value) / 100,
                        })
                      }
                      step="0.01"
                      min="0"
                      max="10"
                    />
                    <span className="ml-1 text-gray-500">%</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-20"
                      value={tierConfig.tradingFundMultiplier}
                      onChange={(e) =>
                        updateTierConfig(tierConfig.tier, {
                          tradingFundMultiplier: parseFloat(e.target.value),
                        })
                      }
                      step="0.5"
                      min="1"
                      max="10"
                    />
                    <span className="ml-1 text-gray-500">x</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-20"
                      value={(tierConfig.profitShareRatio * 100).toFixed(0)}
                      onChange={(e) =>
                        updateTierConfig(tierConfig.tier, {
                          profitShareRatio: parseFloat(e.target.value) / 100,
                        })
                      }
                      step="5"
                      min="0"
                      max="100"
                    />
                    <span className="ml-1 text-gray-500">%</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-20"
                      value={(tierConfig.tradingFeeRate * 100).toFixed(0)}
                      onChange={(e) =>
                        updateTierConfig(tierConfig.tier, {
                          tradingFeeRate: parseFloat(e.target.value) / 100,
                        })
                      }
                      step="1"
                      min="1"
                      max="8"
                    />
                    <span className="ml-1 text-gray-500">%</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AF 释放选择比例 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            AF 释放选择比例
          </CardTitle>
          <CardDescription>用户选择提现或转换交易金的比例</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>选择提现: {config.afReleaseChoice.withdrawPercentage}%</Label>
              <Label>选择转交易金: {config.afReleaseChoice.convertPercentage}%</Label>
            </div>
            <Slider
              value={[config.afReleaseChoice.withdrawPercentage]}
              onValueChange={([value]) =>
                updateConfig({
                  afReleaseChoice: {
                    withdrawPercentage: value,
                    convertPercentage: 100 - value,
                  },
                })
              }
              min={0}
              max={100}
              step={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* AF 释放出口配置 */}
      <Card>
        <CardHeader>
          <CardTitle>AF 释放出口配置</CardTitle>
          <CardDescription>提现 AF 的去向分配</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>到二级市场: {(config.afExitConfig.withdrawToMarketRatio * 100).toFixed(0)}%</Label>
              <Slider
                value={[config.afExitConfig.withdrawToMarketRatio * 100]}
                onValueChange={([value]) =>
                  updateConfig({
                    afExitConfig: {
                      ...config.afExitConfig,
                      withdrawToMarketRatio: value / 100,
                      withdrawBurnRatio: (100 - value) / 100,
                    },
                  })
                }
                min={0}
                max={100}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <Label>销毁: {(config.afExitConfig.withdrawBurnRatio * 100).toFixed(0)}%</Label>
              <div className="h-4 bg-red-100 rounded-full">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${config.afExitConfig.withdrawBurnRatio * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 交易资金流配置 */}
      <Card>
        <CardHeader>
          <CardTitle>交易资金流配置</CardTitle>
          <CardDescription>每笔交易的资金分配比例</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>LP USDC: {(config.tradeFundFlow.lpUsdcRatio * 100).toFixed(0)}%</Label>
              <Slider
                value={[config.tradeFundFlow.lpUsdcRatio * 100]}
                onValueChange={([value]) =>
                  updateConfig({
                    tradeFundFlow: {
                      ...config.tradeFundFlow,
                      lpUsdcRatio: value / 100,
                    },
                  })
                }
                min={0}
                max={50}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <Label>LP AF: {(config.tradeFundFlow.lpAfRatio * 100).toFixed(0)}%</Label>
              <Slider
                value={[config.tradeFundFlow.lpAfRatio * 100]}
                onValueChange={([value]) =>
                  updateConfig({
                    tradeFundFlow: {
                      ...config.tradeFundFlow,
                      lpAfRatio: value / 100,
                    },
                  })
                }
                min={0}
                max={50}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <Label>回购 AF: {(config.tradeFundFlow.buybackRatio * 100).toFixed(0)}%</Label>
              <Slider
                value={[config.tradeFundFlow.buybackRatio * 100]}
                onValueChange={([value]) =>
                  updateConfig({
                    tradeFundFlow: {
                      ...config.tradeFundFlow,
                      buybackRatio: value / 100,
                    },
                  })
                }
                min={0}
                max={50}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <Label>外汇储备金: {(config.tradeFundFlow.forexReserveRatio * 100).toFixed(0)}%</Label>
              <Slider
                value={[config.tradeFundFlow.forexReserveRatio * 100]}
                onValueChange={([value]) =>
                  updateConfig({
                    tradeFundFlow: {
                      ...config.tradeFundFlow,
                      forexReserveRatio: value / 100,
                    },
                  })
                }
                min={0}
                max={100}
                step={5}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 经纪人配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            经纪人等级配置
          </CardTitle>
          <CardDescription>V1-V6 等级的推广收益和层级分配</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>等级</TableHead>
                <TableHead>推广收益比例</TableHead>
                <TableHead>层级范围</TableHead>
                <TableHead>每层释放比例</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(config.brokerConfigs || []).map((brokerConfig) => (
                <TableRow key={brokerConfig.level}>
                  <TableCell className="font-medium">{brokerConfig.level}</TableCell>
                  <TableCell>{formatPercent(brokerConfig.promotionRewardRatio)}</TableCell>
                  <TableCell>
                    {brokerConfig.layerStart} - {brokerConfig.layerEnd} 层
                  </TableCell>
                  <TableCell>{formatPercent(brokerConfig.layerReleaseRatio)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 平台利润分配 */}
      <Card>
        <CardHeader>
          <CardTitle>平台利润分配</CardTitle>
          <CardDescription>交易利润的平台和经纪人分成比例</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {(config.tradeProfitDistribution.platformRatio * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-gray-500">平台收益</p>
            </div>
            <div className="text-gray-400">:</div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {(config.tradeProfitDistribution.brokerRatio * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-gray-500">经纪人收益</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
