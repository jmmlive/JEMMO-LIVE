/* JEMMO LIVE V1 · JEMMO UNIVERSO · COMPLEMENTOS TEMPORALES PRUEBA 20 */
export const STORE_VERSION = '1.1-test';
export const STORE_MODE = 'simulation';

export const CATEGORY_META = Object.freeze({
  popular: { label: 'Popular', icon: '✦', description: 'Selección destacada de JEMMO Universo.' },
  themes: { label: 'Perfiles / temas', icon: '▧', description: 'Aspectos completos para tu perfil, LIVE, Audio Room y Sala con cámara.' },
  bubbles: { label: 'Burbujas', icon: '◌', description: 'Diseños para tus mensajes dentro del chat.' },
  avatarFrames: { label: 'Marcos avatar', icon: '◎', description: 'Marcos que rodean la foto de perfil.' },
  chairFrames: { label: 'Marcos silla', icon: '⬡', description: 'Marcos alrededor de tu plaza en Audio Room.' },
  entrances: { label: 'Entradas / Rider', icon: '➜', description: 'Animaciones de entrada al acceder a LIVE, Audio Room o Sala con cámara.' },
  inventory: { label: 'Inventario', icon: '▣', description: 'Objetos adquiridos y equipados por esta cuenta.' }
});

const permanent = { durationDays: 0, durationLabel: 'PERMANENTE', simulation: true };
const fifteenDays = { durationDays: 15, durationLabel: '15 DÍAS', simulation: true };
const thirtyDays = { durationDays: 30, durationLabel: '1 MES', simulation: true };

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
    preview: { background: 'radial-gradient(circle at 75% 18%,#ffcc4d4d,transparent 22%),radial-gradient(circle at 24% 32%,#9d3eff66,transparent 32%),linear-gradient(160deg,#170228,#04010c 68%,#020005)', accent: '#ffd34f' }, ...fifteenDays
  },
  {
    id: 'theme-galaxia-violeta', category: 'themes', name: 'Galaxia Violeta', icon: '🪐', price: 55000,
    tier: 'ÉLITE', featured: false, access: 'purchase',
    description: 'Nebulosa profunda con órbitas luminosas y acabado premium.',
    preview: { background: 'radial-gradient(circle at 75% 24%,#ff4bdc66,transparent 25%),radial-gradient(circle at 18% 68%,#4e78ff55,transparent 27%),linear-gradient(145deg,#230044,#090019 55%,#030006)', accent: '#ff55df' }, ...fifteenDays
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
    preview: { bubble: 'linear-gradient(135deg,#7c23a5,#cf42f0)', border: '#f19cff', text: '#ffffff' }, ...fifteenDays
  },
  {
    id: 'bubble-elite-dorada', category: 'bubbles', name: 'Élite Dorada', icon: '✨', price: 22000,
    tier: 'ÉLITE', featured: false, access: 'purchase',
    description: 'Mensaje negro y oro con destello premium.',
    preview: { bubble: 'linear-gradient(135deg,#171005,#4a2d02)', border: '#ffd55a', text: '#fff4c1' }, ...fifteenDays
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
    preview: { frame: '0 0 0 3px #e254ff,0 0 0 6px #6e1cf077,0 0 24px #d63dff', radius: '50%' }, ...fifteenDays
  },
  {
    id: 'avatar-frame-corona', category: 'avatarFrames', name: 'Corona Élite', icon: '♛', price: 38000,
    tier: 'ÉLITE', featured: false, access: 'purchase',
    description: 'Aro dorado con insignia de corona para perfiles destacados.',
    preview: { frame: '0 0 0 3px #ffd65b,0 0 0 6px #7b4b04,0 0 25px #ffcf52aa', radius: '50%' }, ...fifteenDays
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
    preview: { frame: '2px solid #e34dff', glow: '0 0 22px #d735ffbb,inset 0 0 16px #b52aff33' }, ...fifteenDays
  },
  {
    id: 'chair-frame-trono', category: 'chairFrames', name: 'Trono Universo', icon: '👑', price: 60000,
    tier: 'ÉLITE', featured: false, access: 'purchase',
    description: 'Marco dorado y violeta para una plaza de categoría superior.',
    preview: { frame: '2px solid #ffd65b', glow: '0 0 0 3px #7e2f91,0 0 28px #ffd15c99,inset 0 0 18px #7f2ea144' }, ...fifteenDays
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
    preview: { label: 'Onda JEMMO · Jesús llegó', effect: 'wave' }, ...thirtyDays
  },
  {
    id: 'entrance-comet', category: 'entrances', name: 'Cometa Élite', icon: '☄️', price: 75000,
    tier: 'ÉLITE', featured: false, access: 'purchase',
    description: 'Cometa dorado y violeta con entrada premium.',
    preview: { label: 'Cometa Élite · Jesús llegó', effect: 'comet' }, ...thirtyDays
  }
]);

export const GIFT_CATALOG = Object.freeze([
  { id:'rosa-jemmo', category:'gifts', name:'Rosa JEMMO', icon:'🌹', price:10, tier:'BÁSICO', featured:true, animation:'pendiente', sound:false, description:'Regalo ligero para saludar y participar.' },
  { id:'estrella-jemmo', category:'gifts', name:'Estrella JEMMO', icon:'⭐', price:50, tier:'BÁSICO', featured:true, animation:'pendiente', sound:false, description:'Destello breve para destacar un momento.' },
  { id:'corona-real', category:'gifts', name:'Corona Real', icon:'👑', price:200, tier:'BÁSICO', featured:false, animation:'pendiente', sound:false, description:'Corona compacta con brillo dorado.' },
  { id:'leon-de-oro', category:'gifts', name:'León de Oro', icon:'🦁', price:1000, tier:'DESTACADO', featured:true, animation:'pendiente', sound:false, description:'Regalo destacado de entrada al catálogo premium.' },
  { id:'chicharro-neon', category:'gifts', name:'Chicharro Neón', icon:'🐟', price:5000, tier:'DESTACADO', featured:true, animation:'pendiente', sound:true, description:'El chicharro oficial de JEMMO LIVE.' },
  { id:'fuegos-jemmo', category:'gifts', name:'Fuegos JEMMO', icon:'🎆', price:10000, tier:'DESTACADO', featured:false, animation:'pendiente', sound:true, description:'Celebración violeta y dorada.' },
  { id:'dragon-violeta', category:'gifts', name:'Dragón Violeta', icon:'🐉', price:25000, tier:'PREMIUM', featured:true, animation:'pendiente', sound:true, description:'Regalo premium con presencia de pantalla.' },
  { id:'corona-imperial', category:'gifts', name:'Corona Imperial', icon:'🏆', price:50000, tier:'PREMIUM', featured:true, animation:'pendiente', sound:true, description:'Premio imperial con acabado dorado.' },
  { id:'diamante-jemmo', category:'gifts', name:'Diamante JEMMO', icon:'💎', price:100000, tier:'PREMIUM', featured:true, animation:'pendiente', sound:true, description:'Regalo premium de alto impacto.' },
  { id:'universo-jemmo', category:'gifts', name:'Universo JEMMO', icon:'🌌', price:200000, tier:'GRANDE', featured:true, animation:'pendiente', sound:true, description:'Regalo grande preparado para animación envolvente.' },
  { id:'yate-dorado', category:'gifts', name:'Yate Dorado', icon:'🛥️', price:500000, tier:'GRANDE', featured:true, animation:'pendiente', sound:true, description:'Regalo grande de categoría exclusiva.' },
  { id:'palacio-jemmo', category:'gifts', name:'Palacio JEMMO', icon:'🏰', price:1000000, tier:'ÉPICO', featured:true, animation:'pendiente', sound:true, description:'Regalo épico de un millón de JEMMOS.' },
  { id:'planeta-jemmo', category:'gifts', name:'Planeta JEMMO', icon:'🪐', price:2500000, tier:'ÉPICO', featured:true, animation:'pendiente', sound:true, description:'Regalo épico de dos millones y medio.' },
  { id:'imperio-jemmo', category:'gifts', name:'Imperio JEMMO', icon:'✨', price:5000000, tier:'LEGENDARIO', featured:true, animation:'pendiente', sound:true, description:'Regalo legendario máximo del catálogo oficial.' }
]);

export const ALL_CATALOG_ITEMS = Object.freeze([...PERSONALIZATION_CATALOG]);
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
  if(category === 'popular') return PERSONALIZATION_CATALOG.filter(item => item.featured);
  if(category === 'inventory') return [];
  return ALL_CATALOG_ITEMS.filter(item => item.category === category);
}
export function formatJemmos(value){ return Math.max(0, Number(value)||0).toLocaleString('es-ES'); }
