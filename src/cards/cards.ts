import { Card } from 'src/app.gateway';

const cards: Card[] = [
  {
    id: 'attack',
    img: '',
    title: 'Атака',
    description: 'Атакует врага',
    rare: 0,
    damage: 5,
    play: () => {},
  },
  {
    id: 'shield',
    img: '',
    title: 'Щит',
    description: 'Защитить себя',
    rare: 0,
    shield: 10,
    play: () => {},
  },
];

export default cards;
