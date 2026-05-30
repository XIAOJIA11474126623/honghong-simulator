export interface Voice {
  id: string;
  name: string;
  description: string;
  icon: string;
  speaker: string;
}

export const femaleVoices: Voice[] = [
  {
    id: 'female-gentle',
    name: '温柔女音',
    description: '轻声细语，温柔如水',
    icon: '🌸',
    speaker: 'zh_female_xiaohe_uranus_bigtts',
  },
  {
    id: 'female-cute',
    name: '甜美女音',
    description: '可爱甜美，像在撒娇',
    icon: '🍬',
    speaker: 'saturn_zh_female_keainvsheng_tob',
  },
  {
    id: 'female-playful',
    name: '俏皮女音',
    description: '古灵精怪，傲娇小公主',
    icon: '👑',
    speaker: 'saturn_zh_female_tiaopigongzhu_tob',
  },
  {
    id: 'female-charming',
    name: '魅惑女音',
    description: '慵懒迷人，叫你受不了',
    icon: '💋',
    speaker: 'zh_female_meilinvyou_saturn_bigtts',
  },
  {
    id: 'female-intellectual',
    name: '知性女音',
    description: '理性优雅，不怒自威',
    icon: '📖',
    speaker: 'saturn_zh_female_cancan_tob',
  },
  {
    id: 'female-motivational',
    name: '飒爽女音',
    description: '干脆利落，有话直说',
    icon: '⚡',
    speaker: 'zh_female_jitangnv_saturn_bigtts',
  },
];

export const maleVoices: Voice[] = [
  {
    id: 'male-deep',
    name: '低沉男音',
    description: '声音低沉，不爱说话',
    icon: '🎸',
    speaker: 'zh_male_m191_uranus_bigtts',
  },
  {
    id: 'male-sunny',
    name: '阳光男音',
    description: '开朗阳光，笑起来很好听',
    icon: '☀️',
    speaker: 'saturn_zh_male_shuanglangshaonian_tob',
  },
  {
    id: 'male-elegant',
    name: '儒雅男音',
    description: '温文尔雅，说话有分寸',
    icon: '🍵',
    speaker: 'zh_male_ruyayichen_saturn_bigtts',
  },
  {
    id: 'male-deep2',
    name: '大气男音',
    description: '沉稳大气，有安全感',
    icon: '🏔️',
    speaker: 'zh_male_dayi_saturn_bigtts',
  },
  {
    id: 'male-genius',
    name: '学长男音',
    description: '聪明自信，有点小傲气',
    icon: '🎓',
    speaker: 'saturn_zh_male_tiancaitongzhuo_tob',
  },
  {
    id: 'male-honest',
    name: '豪爽男音',
    description: '直来直去，憨厚老实',
    icon: '🔨',
    speaker: 'zh_male_taocheng_uranus_bigtts',
  },
];

const allVoices: Voice[] = [...femaleVoices, ...maleVoices];

export function getVoicesByRole(role: string): Voice[] {
  return role === 'boyfriend' ? femaleVoices : maleVoices;
}

export function getVoiceById(id: string): Voice | undefined {
  return allVoices.find((v) => v.id === id);
}
