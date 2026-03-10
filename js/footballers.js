const faceTemplate = ({ name, skin = '#e2b28f', hair = '#35251f', accent = '#1e90ff', beard = false, jersey = '#2244aa' }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0e1726"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="28" fill="url(#bg)"/>
  <circle cx="128" cy="98" r="58" fill="${skin}"/>
  <path d="M72 82c6-35 32-54 56-54 26 0 50 19 56 54-14-8-28-15-56-15s-42 7-56 15Z" fill="${hair}"/>
  <ellipse cx="105" cy="99" rx="7" ry="5" fill="#1a1a1a"/>
  <ellipse cx="151" cy="99" rx="7" ry="5" fill="#1a1a1a"/>
  <path d="M114 122c9 6 19 6 28 0" fill="none" stroke="#7a4930" stroke-width="4" stroke-linecap="round"/>
  ${beard ? '<path d="M93 117c9 22 22 34 35 34s26-12 35-34c-10 10-22 14-35 14s-25-4-35-14Z" fill="#37251d" opacity="0.9"/>' : ''}
  <path d="M74 178c18-22 34-31 54-31s36 9 54 31v49H74Z" fill="${jersey}"/>
  <path d="M104 156l24 18 24-18" fill="none" stroke="#f5f5f5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
  <rect x="16" y="194" width="224" height="40" rx="18" fill="rgba(255,255,255,0.14)"/>
  <text x="128" y="220" font-size="22" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#ffffff">${name}</text>
</svg>`;

export const FOOTBALLER_FACES = {
  messi: faceTemplate({ name: 'Messi', skin: '#e7bc98', hair: '#6a4a35', accent: '#48c8ff', beard: true, jersey: '#77bfff' }),
  ronaldo: faceTemplate({ name: 'Ronaldo', skin: '#ddb18f', hair: '#201813', accent: '#6affc4', beard: false, jersey: '#ffffff' }),
  mbappe: faceTemplate({ name: 'Mbappé', skin: '#9b6c4f', hair: '#17100d', accent: '#ff9b3d', beard: false, jersey: '#1438a6' }),
  modric: faceTemplate({ name: 'Modrić', skin: '#e3bb9f', hair: '#b48a66', accent: '#b88cff', beard: false, jersey: '#fafafa' }),
  haaland: faceTemplate({ name: 'Haaland', skin: '#efc9aa', hair: '#d9c381', accent: '#ffcb42', beard: false, jersey: '#e0f05f' }),
  bellingham: faceTemplate({ name: 'Bellingham', skin: '#8f654a', hair: '#18120f', accent: '#f06f9b', beard: false, jersey: '#faf2c7' }),
  neymar: faceTemplate({ name: 'Neymar', skin: '#d7a887', hair: '#2e2019', accent: '#53ffaf', beard: true, jersey: '#ffdb4f' }),
  salah: faceTemplate({ name: 'Salah', skin: '#b57e5d', hair: '#1d1714', accent: '#ff6a6a', beard: true, jersey: '#c90f1f' }),
  debruyne: faceTemplate({ name: 'De Bruyne', skin: '#f0c7a5', hair: '#d49c62', accent: '#8fd5ff', beard: true, jersey: '#a7d3ff' }),
  vini: faceTemplate({ name: 'Vinícius', skin: '#6e4d3b', hair: '#111', accent: '#7c83ff', beard: false, jersey: '#ffffff' }),
  lewandowski: faceTemplate({ name: 'Lewandowski', skin: '#ddb193', hair: '#4b3026', accent: '#ff6161', beard: false, jersey: '#f8f8f8' }),
  kane: faceTemplate({ name: 'Kane', skin: '#ecc4a5', hair: '#7b5a43', accent: '#67e7ff', beard: true, jersey: '#f5f5f5' })
};

export const PLAYER_BY_PIECE = {
  w: { king: 'messi', queen: 'ronaldo', rook: 'mbappe', bishop: 'modric', knight: 'haaland', pawn: 'bellingham' },
  b: { king: 'neymar', queen: 'salah', rook: 'debruyne', bishop: 'vini', knight: 'lewandowski', pawn: 'kane' }
};
