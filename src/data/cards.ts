export type FlashcardDefinition = {
  id: string
  character: string
  jyutping: string
  meaning: string
  example: {
    hanzi: string
    jyutping: string
    translation: string
  }
  hanziWriterId: string
  notes?: string
}

export const starterDeck: FlashcardDefinition[] = [
  {
    id: 'learn',
    character: '學',
    jyutping: 'hok6',
    meaning: 'to study or learn',
    example: {
      hanzi: '我要學中文',
      jyutping: 'ngo5 jiu3 hok6 zung1 man4',
      translation: 'I want to learn Chinese.',
    },
    hanziWriterId: '學',
    notes: 'Common in school-related phrases such as 學校 (hok6 haau6) for school.',
  },
  {
    id: 'speak',
    character: '講',
    jyutping: 'gong2',
    meaning: 'to speak or talk',
    example: {
      hanzi: '佢講廣東話好流利',
      jyutping: 'keoi5 gong2 gwong2 dung1 waa6 hou2 lau4 lei6',
      translation: 'She speaks Cantonese fluently.',
    },
    hanziWriterId: '講',
  },
  {
    id: 'listen',
    character: '聽',
    jyutping: 'teng1',
    meaning: 'to listen',
    example: {
      hanzi: '細心聽老師講解',
      jyutping: 'sai3 sam1 teng1 lou5 si1 gong2 gaai2',
      translation: "Listen carefully to the teacher's explanation.",
    },
    hanziWriterId: '聽',
  },
  {
    id: 'write',
    character: '寫',
    jyutping: 'se2',
    meaning: 'to write',
    example: {
      hanzi: '每日寫字練習',
      jyutping: 'mui5 jat6 se2 zi6 lin6 zaap6',
      translation: 'Practice writing characters every day.',
    },
    hanziWriterId: '寫',
  },
]
