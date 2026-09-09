/**
 * @fileoverview 全球战略要地与地理地名检索服务
 * 提供重点战区、海峡走廊、空海基地地理坐标字典，支持拼音、中文与英文模糊联想匹配，用于战场中心快速定位
 */

import { StrategicLocationOption } from '../types/battlefield'

/**
 * 预置全球战略要地数据库
 * 包含亚太关键海峡、第一第二岛链节点、重要岛礁与主要海区
 */
export const STRATEGIC_LOCATIONS: StrategicLocationOption[] = [
  {
    name: '台湾海峡',
    aliases: ['taiwan', 'tw', 'strait', 'taiwan strait', 'twhx'],
    longitude: 119.8,
    latitude: 24.5,
    defaultRadiusKm: 350,
    region: '台海战区'
  },
  {
    name: '关岛安德森空军基地',
    aliases: ['guam', 'andersen', 'anderson', 'gd'],
    longitude: 144.92,
    latitude: 13.58,
    defaultRadiusKm: 500,
    region: '第二岛链核心枢纽'
  },
  {
    name: '钓鱼岛周边海空域',
    aliases: ['diaoyu', 'senkaku', 'dyd'],
    longitude: 123.47,
    latitude: 25.75,
    defaultRadiusKm: 200,
    region: '东海战区'
  },
  {
    name: '巴士海峡走廊',
    aliases: ['bashi', 'bashi channel', 'bs'],
    longitude: 121.2,
    latitude: 20.8,
    defaultRadiusKm: 300,
    region: '第一岛链突破口'
  },
  {
    name: '宫古海峡',
    aliases: ['miyako', 'miyako strait', 'mg'],
    longitude: 126.3,
    latitude: 25.2,
    defaultRadiusKm: 250,
    region: '东海-西太平洋咽喉'
  },
  {
    name: '冲绳嘉手纳空军基地',
    aliases: ['okinawa', 'kadena', 'cq'],
    longitude: 127.76,
    latitude: 26.35,
    defaultRadiusKm: 300,
    region: '第一岛链前沿'
  },
  {
    name: '南海仁爱礁海域',
    aliases: ['second thomas', 'renai', 'raj'],
    longitude: 115.86,
    latitude: 9.9,
    defaultRadiusKm: 180,
    region: '南沙群岛'
  },
  {
    name: '黄岩岛海空域',
    aliases: ['scarborough', 'huangyan', 'hyd'],
    longitude: 117.75,
    latitude: 15.15,
    defaultRadiusKm: 200,
    region: '中沙群岛'
  },
  {
    name: '西沙群岛永兴岛',
    aliases: ['woody island', 'yongxing', 'yxd'],
    longitude: 112.33,
    latitude: 16.83,
    defaultRadiusKm: 260,
    region: '南海战略支撑'
  },
  {
    name: '马六甲海峡咽喉',
    aliases: ['malacca', 'strait of malacca', 'mlj'],
    longitude: 101.5,
    latitude: 2.5,
    defaultRadiusKm: 400,
    region: '印度洋-南海通道'
  },
  {
    name: '霍尔木兹海峡',
    aliases: ['hormuz', 'strait of hormuz', 'hemz'],
    longitude: 56.45,
    latitude: 26.55,
    defaultRadiusKm: 350,
    region: '中东波斯湾油运命脉'
  },
  {
    name: '夏威夷珍珠港',
    aliases: ['pearl harbor', 'hawaii', 'zzg', 'xwy'],
    longitude: -157.95,
    latitude: 21.35,
    defaultRadiusKm: 600,
    region: '太平洋司令部总部'
  },
  {
    name: '印度洋迪戈加西亚基地',
    aliases: ['diego garcia', 'dg'],
    longitude: 72.42,
    latitude: -7.31,
    defaultRadiusKm: 600,
    region: '印度洋战略轰炸中枢'
  },
  {
    name: '朝鲜半岛三八线沿线',
    aliases: ['dmz', 'korea', 'sbx'],
    longitude: 126.8,
    latitude: 37.9,
    defaultRadiusKm: 250,
    region: '东北亚关键走廊'
  }
]

/**
 * 根据输入的关键字模糊检索匹配的战略要地选项
 *
 * @param query - 用户输入的检索词 (支持中文名称、拼音或英文缩写)
 * @param limit - 最大返回候选项数量 (默认为 6 条)
 * @returns 匹配成功的要地列表
 */
export function searchStrategicLocations(query: string, limit: number = 6): StrategicLocationOption[] {
  if (!query || !query.trim()) {
    return STRATEGIC_LOCATIONS.slice(0, limit)
  }

  const cleanQuery = query.trim().toLowerCase()

  return STRATEGIC_LOCATIONS.filter((item) => {
    const matchName = item.name.toLowerCase().includes(cleanQuery)
    const matchRegion = item.region.toLowerCase().includes(cleanQuery)
    const matchAlias = item.aliases.some((alias) => alias.toLowerCase().includes(cleanQuery))
    return matchName || matchRegion || matchAlias
  }).slice(0, limit)
}
