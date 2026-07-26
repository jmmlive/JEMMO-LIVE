/* JEMMO LIVE V1 · JEMMO UNIVERSO · CATÁLOGO PRUEBA 18 */
export const STORE_VERSION = '1.0-test';
export const STORE_MODE = 'simulation';

export const CATEGORY_META = Object.freeze({
  popular: { label: 'Popular', icon: '✦', description: 'Selección destacada de JEMMO Universo.' },
  themes: { label: 'Temas', icon: '▧', description: 'Fondos completos para Audio Room y salas compatibles.' },
  bubbles: { label: 'Burbujas', icon: '◌', description: 'Diseños para tus mensajes dentro del chat.' },
  avatarFrames: { label: 'Marcos avatar', icon: '◎', description: 'Marcos que rodean la foto de perfil.' },
  chairFrames: { label: 'Marcos silla', icon: '⬡', description: 'Marcos alrededor de tu plaza en Audio Room.' },
  entrances: { label: 'Entradas', icon: '➜', description: 'Animaciones de entrada al acceder a una sala.' },
  gifts: { label: 'Regalos', icon: '🎁', description: 'Catálogo inicial para LIVE y Salas. No se compran para inventario.' },
  inventory: { label: 'Inventario', icon: '▣', description: 'Objetos adquiridos y equipados por esta cuenta.' }
});

const permanent = { durationDays: 0, durationLabel: 'PERMANENTE EN PRUEBAS', simulation: true };

export const PERSONALIZATION_CATALOG = Object.freeze([
  {
    id: 'theme-jemmo-base', category: 'themes', name: 'JEMMO Base', icon: '✦', price: 0,
    tier: 'BASE', featured: true, starter: true, access: 'free',
    description: 'Fondo neutro oficial, limpio y gratuito para todas las cuentas.',
    preview: { background: 'linear-gradient(155deg,#15031d 0%,#09000e 58%,#020003 100%)', accent: '#c94cff' }, ...permanent
  },
  {
    id: 'theme-noche-chicharrera', category: 'themes', name: 'Noche Chicharrera', icon: '🌌', price: 18000,
    tier: 'POPULAR', featured: true, access: 'purchase',
    description: 'Cielo violeta, luces de costa y destellos inspirados en Tenerife.',
    preview: { background: 'radial-gradient(circle at 75% 18%,#ffcc4d4d,transparent 22%),radial-gradient(circle at 24% 32%,#9d3eff66,transparent 32%),linear-gradient(160deg,#170228,#04010c 68%,#020005)', accent: '#ffd34f' }, ...permanent
  },
  {
    id: 'theme-galaxia-violeta', category: 'themes', name: 'Galaxia Violeta', icon: '🪐', price: 55000,
    tier: 'ÉLITE', featured: false, access: 'purchase',
    description: 'Nebulosa profunda con órbitas luminosas y acabado premium.',
    preview: { background: 'radial-gradient(circle at 75% 24%,#ff4bdc66,transparent 25%),radial-gradient(circle at 18% 68%,#4e78ff55,transparent 27%),linear-gradient(145deg,#230044,#090019 55%,#030006)', accent: '#ff55df' }, ...permanent
  },

  {
    id: 'bubble-jemmo-base', category: 'bubbles', name: 'Burbuja Base', icon: '◌', price: 0,
    tier: 'BASE', featured: false, starter: true, access: 'free',
    description: 'Mensaje oscuro y legible con borde malva oficial.',
    preview: { bubble: 'linear-gradient(135deg,#26102e,#130519)', border: '#7b348e', text: '#ffffff' }, ...permanent
  },
  {
    id: 'bubble-brillo-malva', category: 'bubbles', name: 'Brillo Malva', icon: '💬', price: 6000,
    tier: 'POPULAR', featured: true, access: 'purchase',
    description: 'Burbuja malva con brillo suave y punta redondeada.',
    preview: { bubble: 'linear-gradient(135deg,#7c23a5,#cf42f0)', border: '#f19cff', text: '#ffffff' }, ...permanent
  },
  {
    id: 'bubble-elite-dorada', category: 'bubbles', name: 'Élite Dorada', icon: '✨', price: 22000,
    tier: 'ÉLITE', featured: false, access: 'purchase',
    description: 'Mensaje negro y oro con destello premium.',
    preview: { bubble: 'linear-gradient(135deg,#171005,#4a2d02)', border: '#ffd55a', text: '#fff4c1' }, ...permanent
  },

  {
    id: 'avatar-frame-base', category: 'avatarFrames', name: 'Marco Avatar Base', icon: '◎', price: 0,
    tier: 'BASE', featured: false, starter: true, access: 'free',
    description: 'Aro violeta fino para la foto de perfil.',
    preview: { frame: '0 0 0 3px #7c2f92,0 0 15px #9a37ba55', radius: '50%' }, ...permanent
  },
  {
    id: 'avatar-frame-pulso', category: 'avatarFrames', name: 'Pulso JEMMO', icon: '💜', price: 12000,
    tier: 'POPULAR', featured: true, access: 'purchase',
    description: 'Doble aro neón con pulso violeta.',
    preview: { frame: '0 0 0 3px #e254ff,0 0 0 6px #6e1cf077,0 0 24px #d63dff', radius: '50%' }, ...permanent
  },
  {
    id: 'avatar-frame-corona', category: 'avatarFrames', name: 'Corona Élite', icon: '♛', price: 38000,
    tier: 'ÉLITE', featured: false, access: 'purchase',
    description: 'Aro dorado con insignia de corona para perfiles destacados.',
    preview: { frame: '0 0 0 3px #ffd65b,0 0 0 6px #7b4b04,0 0 25px #ffcf52aa', radius: '50%' }, ...permanent
  },

  {
    id: 'chair-frame-base', category: 'chairFrames', name: 'Marco Silla Base', icon: '⬡', price: 0,
    tier: 'BASE', featured: false, starter: true, access: 'free',
    description: 'Marco limpio para tu plaza en Audio Room.',
    preview: { frame: '1px solid #6b2b7a', glow: '0 0 12px #a637c733' }, ...permanent
  },
  {
    id: 'chair-frame-neon', category: 'chairFrames', name: 'Anillo Neón', icon: '🔮', price: 15000,
    tier: 'POPULAR', featured: true, access: 'purchase',
    description: 'Anillo violeta luminoso alrededor de la silla.',
    preview: { frame: '2px solid #e34dff', glow: '0 0 22px #d735ffbb,inset 0 0 16px #b52aff33' }, ...permanent
  },
  {
    id: 'chair-frame-trono', category: 'chairFrames', name: 'Trono Universo', icon: '👑', price: 60000,
    tier: 'ÉLITE', featured: false, access: 'purchase',
    description: 'Marco dorado y violeta para una plaza de categoría superior.',
    preview: { frame: '2px solid #ffd65b', glow: '0 0 0 3px #7e2f91,0 0 28px #ffd15c99,inset 0 0 18px #7f2ea144' }, ...permanent
  },

  {
    id: 'entrance-base', category: 'entrances', name: 'Entrada Base', icon: '➜', price: 0,
    tier: 'BASE', featured: false, starter: true, access: 'free',
    description: 'Aviso compacto con tu nombre al entrar.',
    preview: { label: 'Jesús entró en la sala', effect: 'base' }, ...permanent
  },
  {
    id: 'entrance-wave', category: 'entrances', name: 'Onda JEMMO', icon: '🌊', price: 20000,
    tier: 'POPULAR', featured: true, access: 'purchase',
    description: 'Una onda violeta recorre la sala al entrar.',
    preview: { label: 'Onda JEMMO · Jesús llegó', effect: 'wave' }, ...permanent
  },
  {
    id: 'entrance-comet', category: 'entrances', name: 'Cometa Élite', icon: '☄️', price: 75000,
    tier: 'ÉLITE', featured: false, access: 'purchase',
    description: 'Cometa dorado y violeta con entrada premium.',
    preview: { label: 'Cometa Élite · Jesús llegó', effect: 'comet' }, ...permanent
  }
]);

export const GIFT_CATALOG = Object.freeze([
  { id:'gift-jemmo-cafe', category:'gifts', name:'JEMMO Café', icon:'☕', price:500, tier:'NORMAL', featured:true, animation:'2 s', sound:false, description:'Detalle pequeño para saludar o agradecer.' },
  { id:'gift-jemmo-besito', category:'gifts', name:'JEMMO Besito', icon:'💋', price:1000, tier:'NORMAL', featured:true, animation:'2 s', sound:false, description:'Beso corto con destello malva.' },
  { id:'gift-jemmo-rosa', category:'gifts', name:'JEMMO Rosa Neón', icon:'🌹', price:2000, tier:'NORMAL', featured:false, animation:'3 s', sound:false, description:'Rosa violeta luminosa.' },
  { id:'gift-jemmo-estrella', category:'gifts', name:'JEMMO Estrella', icon:'⭐', price:5000, tier:'NORMAL', featured:false, animation:'3 s', sound:false, description:'Estrella brillante para destacar un momento.' },
  { id:'gift-jemmo-chicharro', category:'gifts', name:'JEMMO Chicharro', icon:'🐟', price:10000, tier:'DESTACADO', featured:true, animation:'4 s', sound:true, description:'El chicharro oficial cruza la pantalla con sonido acuático.' },
  { id:'gift-jemmo-beso-especial', category:'gifts', name:'JEMMO Beso Especial', icon:'💖', price:18000, tier:'DESTACADO', featured:true, animation:'5 s', sound:true, description:'Beso protagonista con sonido y explosión de corazones.' },
  { id:'gift-jemmo-boom', category:'gifts', name:'JEMMO Boom', icon:'💥', price:25000, tier:'DESTACADO', featured:true, animation:'5 s', sound:true, description:'Impacto violeta y dorado para celebrar.' },
  { id:'gift-jemmo-corona', category:'gifts', name:'JEMMO Corona', icon:'👑', price:50000, tier:'PREMIUM', featured:false, animation:'6 s', sound:true, description:'Corona real con caída de destellos.' },
  { id:'gift-jemmo-elite', category:'gifts', name:'JEMMO Élite', icon:'💎', price:100000, tier:'PREMIUM', featured:true, animation:'7 s', sound:true, description:'Animación premium para grandes apoyos.' },
  { id:'gift-jemmo-universo', category:'gifts', name:'JEMMO Universo', icon:'🌌', price:200000, tier:'GRANDE', featured:true, animation:'9 s', sound:true, description:'El universo JEMMO cubre la sala con órbitas y estrellas.' }
]);

export const ALL_CATALOG_ITEMS = Object.freeze([...PERSONALIZATION_CATALOG, ...GIFT_CATALOG]);
export const STARTER_ITEM_IDS = Object.freeze(PERSONALIZATION_CATALOG.filter(item => item.starter).map(item => item.id));
export const DEFAULT_EQUIPPED = Object.freeze({
  themes: 'theme-jemmo-base',
  bubbles: 'bubble-jemmo-base',
  avatarFrames: 'avatar-frame-base',
  chairFrames: 'chair-frame-base',
  entrances: 'entrance-base'
});

export function itemById(id){ return ALL_CATALOG_ITEMS.find(item => item.id === id) || null; }
export function itemsForCategory(category){
  if(category === 'popular') return ALL_CATALOG_ITEMS.filter(item => item.featured);
  if(category === 'inventory') return [];
  return ALL_CATALOG_ITEMS.filter(item => item.category === category);
}
export function formatJemmos(value){ return Math.max(0, Number(value)||0).toLocaleString('es-ES'); }
