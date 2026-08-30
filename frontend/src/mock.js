const STORAGE_KEY = 'diary_rag_demo_v1';

export const seedEntries = [
  {
    id: 'demo-summer-run',
    date: '2025-08-02',
    time: '19:42',
    content:
      '今天傍晚去滨江跑了五公里，气温终于降下来了。路过江边的时候风很大，跑完在便利店买了冰豆浆。希望八月能把十公里跑下来。',
  },
  {
    id: 'demo-night-run',
    date: '2025-05-03',
    time: '21:10',
    content:
      '第一次试着夜跑，戴了之前买的头灯。路线是小区后面那条河，人很少，跑了两公里。比白天安静，但有点怕走错路，还是得再熟悉一下。',
  },
  {
    id: 'demo-cold',
    date: '2025-11-20',
    time: '22:05',
    content:
      '上周一开始嗓子疼，周二晚上发烧到三十八度二，请了一天假。周三去社区医院开了药，周五基本好了。下次换季要早一点加衣服。',
  },
  {
    id: 'demo-move',
    date: '2026-06-24',
    time: '09:30',
    content:
      '搬到了城南的新公寓，东西比想象中多，光是书就装了六个纸箱。下午把书架装好，晚上在阳台上吃了第一顿饭，算是安定下来了。',
  },
  {
    id: 'demo-interview',
    date: '2026-03-10',
    time: '20:05',
    content:
      '明早十点有一场设计岗的面试。晚上把作品集重新过了一遍，重点准备了三个项目：移动端日记应用、数据后台、品牌官网。紧张但准备得比上次充分。',
  },
];

const answers = {
  'demo-summer-run':
    '根据日记，去年 8 月 2 日傍晚你在滨江跑了五公里，天气凉快之后体感好了很多，跑完还买了冰豆浆。',
  'demo-night-run':
    '日记里提到你第一次夜跑是去年 5 月 3 日晚上，路线是小区后面的河边，戴着头灯跑了两公里。',
  'demo-cold':
    '去年 11 月你感冒过一次：周一开始嗓子疼，周二发烧到三十八度二并请了一天假，周五基本恢复。',
  'demo-move':
    '6 月 24 日你搬到了城南的新公寓，书装了六个纸箱，当天晚上在阳台吃了搬家的第一顿饭。',
  'demo-interview':
    '3 月 10 日面试前夜，你重新过了作品集，重点准备的是移动端日记应用、数据后台和品牌官网三个项目。',
};

const groups = [
  {
    entryIds: ['demo-summer-run', 'demo-night-run'],
    words: ['夏天', '去年', '跑步', '夜跑', '滨江', '五公里'],
  },
  {
    entryIds: ['demo-cold'],
    words: ['感冒', '发烧', '嗓子', '医院', '请假'],
  },
  {
    entryIds: ['demo-move'],
    words: ['搬家', '公寓', '城南', '纸箱'],
  },
  {
    entryIds: ['demo-interview'],
    words: ['面试', '作品集', '设计岗', '准备'],
  },
];

export function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    // Keep demo data even if localStorage is unavailable.
  }
  saveEntries(seedEntries);
  return seedEntries.map((entry) => ({ ...entry }));
}

export function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    // Demo only: ignore storage failures.
  }
}

export function makeTitle(content) {
  const firstLine = content.split('\n').find((line) => line.trim());
  return firstLine ? firstLine.trim().slice(0, 24) : '无标题日记';
}

export function chunkCount(content) {
  return Math.max(1, Math.ceil(content.length / 120));
}

export function formatDateLabel(date, time = '00:00') {
  const value = new Date(`${date}T${time}`);
  return `${value.getMonth() + 1}月${value.getDate()}日`;
}

export function todayLabel() {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
}

export function suggestQuestions() {
  return [
    '我去年夏天做过什么？',
    '我什么时候感冒的？',
    '我第一次夜跑是什么时候？',
    '搬家那天我在做什么？',
  ];
}

export function askDiary(question) {
  const clean = question.toLowerCase().replace(/\s+/g, '');
  const scores = {};

  groups.forEach((group) => {
    const hits = group.words.filter((word) => clean.includes(word)).length;
    if (hits > 0) {
      group.entryIds.forEach((id) => {
        scores[id] = (scores[id] || 0) + hits;
      });
    }
  });

  const hits = Object.entries(scores)
    .map(([id, score]) => ({
      entry: seedEntries.find((item) => item.id === id),
      score,
    }))
    .filter((item) => item.entry && item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (hits.length === 0) {
    return { answer: '没有找到相关日记', sources: [] };
  }

  const entries = hits.slice(0, 2).map((hit) => hit.entry);
  const answer = entries
    .map((entry) => answers[entry.id])
    .filter(Boolean)
    .join(' ');
  const sources = entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    title: makeTitle(entry.content),
  }));

  return { answer, sources };
}
