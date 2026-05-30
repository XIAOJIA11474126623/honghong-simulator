export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const boyfriendScenarios: Scenario[] = [
  { id: 'bf-1', title: '她让你倒水你没动', description: '她让你帮忙倒杯水，你嘴上答应却一直没动...', icon: 'cup-soda' },
  { id: 'bf-2', title: '她说"没事"但明显不高兴', description: '问她怎么了，她说"没事"，但表情和语气明明不对...', icon: 'frown' },
  { id: 'bf-3', title: '她突然沉默不理你', description: '聊着聊着她就不说话了，你完全不知道发生了什么...', icon: 'volume-x' },
  { id: 'bf-4', title: '她翻旧账了', description: '本来在说今天的事，她突然把上个月的事也翻出来了...', icon: 'book-open' },
  { id: 'bf-5', title: '她说"你根本不在乎我"', description: '她突然说你觉得她不重要，你一头雾水...', icon: 'heart-crack' },
  { id: 'bf-6', title: '她嫌弃你送的礼物', description: '你精心准备了礼物，她看了一眼却说"就这？"...', icon: 'gift' },
  { id: 'bf-7', title: '她看到你和异性聊天', description: '她看到你手机上有异性同事的消息，脸一下就变了...', icon: 'message-circle' },
  { id: 'bf-8', title: '她说"随便"但不是随便', description: '问她想吃什么，她说"随便"，但每个提议都被否...', icon: 'help-circle' },
  { id: 'bf-9', title: '她闺蜜男朋友比你浪漫', description: '她刷到闺蜜男朋友的浪漫动态，开始拿你做比较...', icon: 'sparkles' },
  { id: 'bf-10', title: '她生病了要你陪', description: '她发烧了，说想让你请假陪她，但你工作很忙...', icon: 'thermometer' },
  { id: 'bf-11', title: '她觉得你不懂她', description: '她说跟你说话像对牛弹琴，你完全不知道哪里出了问题...', icon: 'ear-off' },
  { id: 'bf-12', title: '她觉得你只顾工作不陪她', description: '最近加班太多，她觉得你心里只有工作没有她...', icon: 'briefcase' },
  { id: 'bf-13', title: '她跟你妈有矛盾', description: '她说你妈说的某句话让她很不舒服，你夹在中间...', icon: 'home' },
  { id: 'bf-14', title: '她说你变了不如以前', description: '她说你以前不是这样的，追她的时候和现在判若两人...', icon: 'clock' },
  { id: 'bf-15', title: '她想让你夸她你没反应', description: '她换了新发型兴奋地展示给你看，你头都没抬...', icon: 'scissors' },
];

export const girlfriendScenarios: Scenario[] = [
  { id: 'gf-1', title: '他加班回来很累不说话', description: '他加班到很晚回来，进门就坐在沙发上发呆不说话...', icon: 'moon' },
  { id: 'gf-2', title: '他打游戏输了心情差', description: '他打游戏连输好几把，开始摔鼠标叹气...', icon: 'gamepad-2' },
  { id: 'gf-3', title: '他跟朋友吵架了', description: '他接了个电话后变得很烦躁，原来跟好兄弟闹了矛盾...', icon: 'users' },
  { id: 'gf-4', title: '他工作压力大沉默不语', description: '最近项目压力大，他回家就闷头不说话...', icon: 'laptop' },
  { id: 'gf-5', title: '他做家务被嫌弃', description: '他主动洗碗拖地，你嫌他做得不好又做了一遍...', icon: 'spray-can' },
  { id: 'gf-6', title: '他生日被忘记了', description: '他生日那天你忘了，他还笑着说不重要...', icon: 'cake' },
  { id: 'gf-7', title: '他生病了不肯吃药', description: '他感冒了但就是不肯吃药看医生，嘴硬说没事...', icon: 'pill' },
  { id: 'gf-8', title: '他想独处你不停问怎么了', description: '他说想一个人待会儿，你不停追问是不是你的问题...', icon: 'door-closed' },
  { id: 'gf-9', title: '他对你做的饭不满意', description: '你精心做了他爱吃的菜，他吃了一口说不太好吃...', icon: 'utensils' },
  { id: 'gf-10', title: '他跟家人吵架了', description: '他跟爸妈通完电话后脸色很差，一个人坐在阳台...', icon: 'home' },
  { id: 'gf-11', title: '他面试失败了', description: '他准备了很久的面试没通过，回来后把自己关在房间...', icon: 'file-x' },
  { id: 'gf-12', title: '他跟兄弟闹矛盾了', description: '他最好的兄弟背后说了他坏话，他很受伤...', icon: 'user-x' },
  { id: 'gf-13', title: '他觉得自己不够好', description: '他突然变得很没自信，说自己什么都做不好...', icon: 'thumbs-down' },
  { id: 'gf-14', title: '他被领导批评了', description: '他在公司被领导当众批评，回来后闷闷不乐...', icon: 'megaphone' },
  { id: 'gf-15', title: '他想吃某样东西你没做', description: '他念叨了好几天想吃红烧肉，你一直没做...', icon: 'beef' },
];

export function getScenariosByRole(role: string): Scenario[] {
  return role === 'boyfriend' ? boyfriendScenarios : girlfriendScenarios;
}

export function getRoleLabel(role: string): string {
  return role === 'boyfriend' ? '男朋友' : '女朋友';
}

export function getPartnerLabel(role: string): string {
  return role === 'boyfriend' ? '女朋友' : '男朋友';
}
