export interface Theme {
  name: string;
  words: string[];
}

export const THEMES: Theme[] = [
  {
    name: 'Animals',
    words: ['TIGER', 'EAGLE', 'SHARK', 'PANDA', 'HORSE', 'WHALE', 'SNAKE', 'ROBIN', 'MOUSE', 'GECKO'],
  },
  {
    name: 'Food',
    words: ['PIZZA', 'STEAK', 'SALAD', 'MANGO', 'BREAD', 'GRAPE', 'SUSHI', 'TACOS', 'CURRY', 'PASTA'],
  },
  {
    name: 'Sports',
    words: ['RUGBY', 'CHESS', 'GOLF', 'TENNIS', 'HOCKEY', 'BOXING', 'SOCCER', 'DIVING', 'SKIING', 'KAYAK'],
  },
  {
    name: 'Colors',
    words: ['CRIMSON', 'AMBER', 'IVORY', 'CORAL', 'OLIVE', 'PEACH', 'LILAC', 'AZURE', 'SIENNA', 'MAUVE'],
  },
];

/** Pick a random theme */
export function getRandomTheme(): Theme {
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}
