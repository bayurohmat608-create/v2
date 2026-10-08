/**
 * WHATSAPP WEB SUPER APP — UI/UX PRO MAX ENGINE
 * Multi-Chat (Grup & Japri), Cross-Context Memory, Status Stories,
 * Quoted Replies, Realtime Search, Voice & Video Calls, Vector Graphics (No Emojis for Icons).
 */

// =========================================================
// 1. GLOBAL STATE
// =========================================================
const appState = {
  activeTab: "chats", // 'chats' | 'status' | 'calls'
  activeChat: "group", // 'group' | 'direct_budi' | 'direct_rian'
  chats: {
    group: [],
    direct_budi: [],
    direct_rian: []
  },
  unreads: {
    group: 0,
    direct_budi: 0,
    direct_rian: 0
  },
  statuses: [],
  calls: [],
  availableModels: [],
  currentTopic: "",
  modelA: "",
  modelB: "",
  isRunning: false,
  wakelock: false,
  authVault: {
    active: { codex: "" },
    profiles: []
  },
  currentVaultTab: "codex",
  filter: "all",
  attachedFile: null,
  replyingTo: null, // { id, senderName, text }
  userHasScrolledUp: false,
  unreadWhileScrolled: 0,
  storyViewer: {
    category: "contacts", // 'user' | 'contacts'
    stories: [],
    index: 0,
    interval: null
  },
  inchatSearch: {
    query: "",
    matches: [],
    currentIndex: -1
  },
  voiceRecording: {
    active: false,
    timer: null,
    seconds: 0
  },
  callState: {
    active: false,
    contactId: null,
    contactName: "",
    type: "voice", // 'voice' | 'video'
    durationSec: 0,
    timer: null,
    isMuted: false,
    isSpeaker: true
  }
};

// =========================================================
// 2. VECTOR SVG ASSETS (Handcrafted Vector Character Portraits & Authentic WhatsApp Web Icons)
// =========================================================
const SVG_PORTRAITS = {
  bayu: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <linearGradient id="bayu-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c3832"/>
      <stop offset="100%" stop-color="#005c4b"/>
    </linearGradient>
    <linearGradient id="bayu-skin" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fedac2"/>
      <stop offset="100%" stop-color="#f3b78c"/>
    </linearGradient>
    <linearGradient id="bayu-hair" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1f2421"/>
      <stop offset="100%" stop-color="#111613"/>
    </linearGradient>
    <linearGradient id="bayu-suit" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#202c33"/>
      <stop offset="100%" stop-color="#111b21"/>
    </linearGradient>
    <linearGradient id="bayu-crown" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#bayu-bg)"/>
  <circle cx="50" cy="40" r="28" fill="#00a884" opacity="0.18"/>
  <path d="M22 98 C24 78 35 70 50 70 C65 70 76 78 78 98 Z" fill="url(#bayu-suit)"/>
  <path d="M42 70 L50 82 L58 70 Z" fill="#005c4b"/>
  <path d="M44 64 H56 V72 C56 75.5 53.5 78 50 78 C46.5 78 44 75.5 44 72 Z" fill="#182229"/>
  <path d="M43 54 H57 V66 C57 69 54 71 50 71 C46 71 43 69 43 66 Z" fill="url(#bayu-skin)"/>
  <ellipse cx="31" cy="48" rx="4" ry="6.5" fill="#f3b78c"/>
  <ellipse cx="69" cy="48" rx="4" ry="6.5" fill="#f3b78c"/>
  <path d="M33 42 C33 28 40 24 50 24 C60 24 67 28 67 42 C67 56 60 64 50 64 C40 64 33 56 33 42 Z" fill="url(#bayu-skin)"/>
  <path d="M31 38 C30 26 38 15 50 15 C60 15 69 22 69 34 C69 37 67 36 65 33 C61 27 54 24 46 25 C38 26 34 32 32 38 Z" fill="url(#bayu-hair)"/>
  <path d="M32 35 L33 44 L36 41 Z" fill="url(#bayu-hair)"/>
  <path d="M68 35 L67 44 L64 41 Z" fill="url(#bayu-hair)"/>
  <path d="M37 38 Q43 36 47 38" stroke="#1f2421" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <path d="M53 38 Q57 36 63 38" stroke="#1f2421" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <rect x="35" y="40" width="13" height="9" rx="3" fill="#ffffff" fill-opacity="0.12" stroke="#2a3942" stroke-width="1.8"/>
  <rect x="52" y="40" width="13" height="9" rx="3" fill="#ffffff" fill-opacity="0.12" stroke="#2a3942" stroke-width="1.8"/>
  <line x1="48" y1="44" x2="52" y2="44" stroke="#2a3942" stroke-width="1.8"/>
  <line x1="37" y1="42" x2="40" y2="47" stroke="#ffffff" stroke-width="1.2" opacity="0.45" stroke-linecap="round"/>
  <line x1="54" y1="42" x2="57" y2="47" stroke="#ffffff" stroke-width="1.2" opacity="0.45" stroke-linecap="round"/>
  <circle cx="41.5" cy="44.5" r="1.8" fill="#111b21"/>
  <circle cx="58.5" cy="44.5" r="1.8" fill="#111b21"/>
  <path d="M50 44 L49 51 H52" stroke="#df9f78" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M44 55 Q50 59 56 55" stroke="#a2553b" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <circle cx="77" cy="77" r="13" fill="#111b21" stroke="#202c33" stroke-width="2"/>
  <path d="M77 69 L79.5 74.5 L85 75.2 L81 79 L82 84.5 L77 81.8 L72 84.5 L73 79 L69 75.2 L74.5 74.5 Z" fill="url(#bayu-crown)"/>
</svg>`,

  budi: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <linearGradient id="budi-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a2a42"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="budi-skin" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffeedb"/>
      <stop offset="100%" stop-color="#f5caa6"/>
    </linearGradient>
    <linearGradient id="budi-hair" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2c1d11"/>
      <stop offset="100%" stop-color="#180e07"/>
    </linearGradient>
    <linearGradient id="budi-polo" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f2b48"/>
      <stop offset="100%" stop-color="#08182b"/>
    </linearGradient>
    <linearGradient id="budi-badge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#budi-bg)"/>
  <circle cx="50" cy="42" r="28" fill="#38bdf8" opacity="0.14"/>
  <path d="M22 98 C24 76 34 68 50 68 C66 68 76 76 78 98 Z" fill="url(#budi-polo)"/>
  <path d="M40 68 L50 78 L47 88 L40 68 Z" fill="#1b4570"/>
  <path d="M60 68 L50 78 L53 88 L60 68 Z" fill="#1b4570"/>
  <path d="M47 80 H53 V94 H47 Z" fill="#0f2b48"/>
  <circle cx="50" cy="85" r="1.2" fill="#38bdf8"/>
  <path d="M43 52 H57 V65 C57 68 54 70 50 70 C46 70 43 68 43 65 Z" fill="url(#budi-skin)"/>
  <ellipse cx="32" cy="46" rx="3.8" ry="6" fill="#f5caa6"/>
  <ellipse cx="68" cy="46" rx="3.8" ry="6" fill="#f5caa6"/>
  <path d="M34 40 C34 27 41 23 50 23 C59 23 66 27 66 40 C66 54 59 62 50 62 C41 62 34 54 34 40 Z" fill="url(#budi-skin)"/>
  <path d="M32 36 C31 24 38 16 50 16 C61 16 68 22 67 33 C65 31 60 27 51 27 C42 27 35 30 32 36 Z" fill="url(#budi-hair)"/>
  <path d="M39 19 Q48 24 64 29" stroke="#3d2a1c" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M37 36 Q42 34 46 36" stroke="#2c1d11" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M54 36 Q58 34 63 36" stroke="#2c1d11" stroke-width="2" stroke-linecap="round" fill="none"/>
  <circle cx="42" cy="43" r="6.8" fill="#ffffff" fill-opacity="0.12" stroke="#38bdf8" stroke-width="1.6"/>
  <circle cx="58" cy="43" r="6.8" fill="#ffffff" fill-opacity="0.12" stroke="#38bdf8" stroke-width="1.6"/>
  <line x1="48.8" y1="43" x2="51.2" y2="43" stroke="#38bdf8" stroke-width="1.6"/>
  <line x1="39" y1="40" x2="42" y2="45" stroke="#ffffff" stroke-width="1.2" opacity="0.6" stroke-linecap="round"/>
  <line x1="55" y1="40" x2="58" y2="45" stroke="#ffffff" stroke-width="1.2" opacity="0.6" stroke-linecap="round"/>
  <circle cx="42" cy="43" r="2" fill="#0f172a"/>
  <circle cx="58" cy="43" r="2" fill="#0f172a"/>
  <circle cx="42.6" cy="42.4" r="0.6" fill="#ffffff"/>
  <circle cx="58.6" cy="42.4" r="0.6" fill="#ffffff"/>
  <path d="M50 44 L49.2 50 H51.8" stroke="#d49b72" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M45 54 Q50 57.5 55 54" stroke="#8d4b38" stroke-width="1.7" stroke-linecap="round" fill="none"/>
  <circle cx="77" cy="77" r="13" fill="#111b21" stroke="#202c33" stroke-width="2"/>
  <circle cx="77" cy="77" r="11" fill="url(#budi-badge)"/>
  <path d="M73 75 L70.5 77 L73 79" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M81 75 L83.5 77 L81 79" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="78.5" y1="73.5" x2="75.5" y2="80.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,

  rian: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <linearGradient id="rian-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#431407"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
    <linearGradient id="rian-skin" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="100%" stop-color="#fba86b"/>
    </linearGradient>
    <linearGradient id="rian-hair" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2d1b11"/>
      <stop offset="100%" stop-color="#190e07"/>
    </linearGradient>
    <linearGradient id="rian-hoodie" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#374151"/>
      <stop offset="100%" stop-color="#1f2937"/>
    </linearGradient>
    <linearGradient id="rian-bolt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#rian-bg)"/>
  <circle cx="50" cy="42" r="28" fill="#ea580c" opacity="0.22"/>
  <path d="M22 98 C24 76 34 68 50 68 C66 68 76 76 78 98 Z" fill="url(#rian-hoodie)"/>
  <path d="M38 72 Q50 82 62 72 Q50 90 38 72 Z" fill="#111827"/>
  <line x1="45" y1="78" x2="43" y2="92" stroke="#ea580c" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="55" y1="78" x2="57" y2="92" stroke="#ea580c" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M30 63 C30 73 70 73 70 63" stroke="#111827" stroke-width="5" stroke-linecap="round" fill="none"/>
  <rect x="25" y="55" width="8" height="15" rx="4" fill="#ea580c" stroke="#111827" stroke-width="1.5"/>
  <rect x="67" y="55" width="8" height="15" rx="4" fill="#ea580c" stroke="#111827" stroke-width="1.5"/>
  <path d="M43 50 H57 V65 C57 68 54 70 50 70 C46 70 43 68 43 65 Z" fill="url(#rian-skin)"/>
  <ellipse cx="32" cy="46" rx="3.6" ry="6" fill="#fba86b"/>
  <ellipse cx="68" cy="46" rx="3.6" ry="6" fill="#fba86b"/>
  <path d="M34 39 C34 26 41 22 50 22 C59 22 66 26 66 39 C66 53 59 61 50 61 C41 61 34 53 34 39 Z" fill="url(#rian-skin)"/>
  <path d="M31 35 C29 23 37 14 50 14 C62 14 69 21 68 32 C65 30 63 26 58 28 C54 23 48 24 44 26 C40 23 35 27 31 35 Z" fill="url(#rian-hair)"/>
  <path d="M40 18 Q45 25 43 30" stroke="#3d2416" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M50 17 Q54 24 57 28" stroke="#3d2416" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M37 35 Q42 33 46 36" stroke="#2d1b11" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <path d="M54 36 Q58 33 63 35" stroke="#2d1b11" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <ellipse cx="42" cy="42" rx="2.5" ry="3" fill="#1f2937"/>
  <ellipse cx="58" cy="42" rx="2.5" ry="3" fill="#1f2937"/>
  <circle cx="42.8" cy="41" r="0.9" fill="#ffffff"/>
  <circle cx="58.8" cy="41" r="0.9" fill="#ffffff"/>
  <path d="M50 43 L48.8 49 H52.2" stroke="#d97736" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M43 53 Q50 59 57 53" stroke="#9a3412" stroke-width="2" stroke-linecap="round" fill="none"/>
  <circle cx="77" cy="77" r="13" fill="#111b21" stroke="#202c33" stroke-width="2"/>
  <circle cx="77" cy="77" r="11" fill="#ea580c"/>
  <path d="M78 69 L72 77 H77 L75 85 L83 75 H78 Z" fill="url(#rian-bolt)"/>
</svg>`,

  group: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <linearGradient id="grp-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a2a24"/>
      <stop offset="100%" stop-color="#005c4b"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#grp-bg)"/>
  <circle cx="50" cy="50" r="44" fill="none" stroke="#00a884" stroke-width="1" stroke-dasharray="3 3" opacity="0.3"/>
  <g opacity="0.9">
    <circle cx="30" cy="38" r="12" fill="#0284c7"/>
    <path d="M12 76 C14 58 24 54 34 54 C42 54 48 57 51 68 C45 74 36 77 12 76 Z" fill="#0369a1"/>
    <circle cx="28" cy="37" r="3.5" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.8"/>
    <circle cx="36" cy="37" r="3.5" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.8"/>
  </g>
  <g opacity="0.9">
    <circle cx="70" cy="38" r="12" fill="#ea580c"/>
    <path d="M88 76 C86 58 76 54 66 54 C58 54 52 57 49 68 C55 74 64 77 88 76 Z" fill="#c2410c"/>
    <path d="M60 40 C60 48 80 48 80 40" stroke="#fef08a" stroke-width="1.6" fill="none" opacity="0.85"/>
  </g>
  <g>
    <circle cx="50" cy="34" r="14.5" fill="#08201a"/>
    <circle cx="50" cy="34" r="14" fill="#00a884"/>
    <path d="M26 82 C28 62 40 54 50 54 C60 54 72 62 74 82 Z" fill="#004d3f"/>
    <path d="M43 54 L50 63 L57 54 Z" fill="#111b21"/>
    <path d="M50 23 L52 27 L56 27.5 L53 30 L54 34 L50 32 L46 34 L47 30 L44 27.5 L48 27 Z" fill="#fbbf24"/>
  </g>
  <circle cx="78" cy="78" r="13" fill="#111b21" stroke="#202c33" stroke-width="2"/>
  <circle cx="78" cy="78" r="11" fill="#00a884"/>
  <path d="M74 78 L77 81 L83 75" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`
};

const SVG_ICONS = {
  bayu: SVG_PORTRAITS.bayu,
  crown: SVG_PORTRAITS.bayu,
  budi: SVG_PORTRAITS.budi,
  rian: SVG_PORTRAITS.rian,
  group: SVG_PORTRAITS.group,
  reply: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
  image: `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1.01A11.36 11.36 0 0 1 8.57 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.52c0-.55-.45-1-.99-1z"/></svg>`,
  video: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
  play: `<svg viewBox="0 0 24 24" width="16" height="16"><polygon fill="currentColor" points="8 5 19 12 8 19 8 5"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  checkDouble: `<svg viewBox="0 0 16 15" width="16" height="15"><path fill="#53bdeb" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/></svg>`,
  tailIn: `<svg class="bubble-tail tail-left-svg" viewBox="0 0 8 13" width="8" height="13"><path fill="var(--bubble-in)" d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"/></svg>`,
  tailOut: `<svg class="bubble-tail tail-right-svg" viewBox="0 0 8 13" width="8" height="13"><path fill="var(--bubble-out)" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"/></svg>`,
  chevronDown: `<svg viewBox="0 0 19 20" width="18" height="18"><path fill="currentColor" d="M3.8 6.7l5.7 5.7 5.7-5.7 1.6 1.6-7.3 7.3-7.3-7.3z"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z"/></svg>`
};

const CHAT_METADATA = {
  group: {
    id: "group",
    title: "Tim Proyek Boss Bayu",
    status: "Boss Bayu, Budi, Rian",
    avatarSvg: SVG_ICONS.group,
    avatarClass: "avatar-group"
  },
  direct_budi: {
    id: "direct_budi",
    title: "Budi (Tech Lead)",
    status: "online",
    avatarSvg: SVG_ICONS.budi,
    avatarClass: "avatar-budi"
  },
  direct_rian: {
    id: "direct_rian",
    title: "Rian (Developer Lapangan)",
    status: "online",
    avatarSvg: SVG_ICONS.rian,
    avatarClass: "avatar-rian"
  }
};

// =========================================================
// 3. WEB AUDIO API SYNTHESIZER (Sounds & Ringtones)
// =========================================================
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSentSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch (e) {}
}

function playReceivedSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(800, now);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1200, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.08);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.25);
  } catch (e) {}
}

let ringtoneInterval = null;
function startOutgoingRingtone() {
  stopRingtone();
  const playPulse = () => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(425, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.85);
    } catch (e) {}
  };
  playPulse();
  ringtoneInterval = setInterval(playPulse, 2800);
}

function startIncomingRingtone() {
  stopRingtone();
  const playChime = () => {
    try {
      const ctx = getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.22);
      });
    } catch (e) {}
  };
  playChime();
  ringtoneInterval = setInterval(playChime, 2200);
}

function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

// =========================================================
// 4. TEXT-TO-SPEECH (Indonesian Voice)
// =========================================================
function speakIndonesian(text, speakerName) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "id-ID";

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.includes("id") || v.lang.includes("ID"));
    if (idVoice) utter.voice = idVoice;

    if (speakerName === "Budi") {
      utter.pitch = 0.95;
      utter.rate = 1.0;
    } else {
      utter.pitch = 1.1;
      utter.rate = 1.05;
    }

    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.error("SpeechSynthesis error:", e);
  }
}

// =========================================================
// 5. SSE REALTIME STREAM CONNECTION
// =========================================================
let eventSource = null;

function connectSSE() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource("/api/events");

  eventSource.addEventListener("init", (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.status) applyStatusUpdate(data.status);
      if (data.chats) appState.chats = data.chats;
      if (data.statuses) appState.statuses = data.statuses;
      if (data.calls) appState.calls = data.calls;
      if (data.authVault) {
        appState.authVault = data.authVault;
        renderAuthVaultUI();
      }

      renderAllChatPreviews();
      renderActiveChatMessages();
      renderStatusTimeline();
      renderCallsList();
    } catch (err) {
      console.error("SSE init parse error:", err);
    }
  });

  eventSource.addEventListener("message", (e) => {
    try {
      const msg = JSON.parse(e.data);
      const targetChatId = msg.chatId || "group";
      if (!appState.chats[targetChatId]) appState.chats[targetChatId] = [];

      // Avoid duplicates
      if (!appState.chats[targetChatId].some(m => m.id === msg.id)) {
        appState.chats[targetChatId].push(msg);

        if (appState.activeChat === targetChatId) {
          const list = appState.chats[targetChatId];
          const prevMsg = list.length > 1 ? list[list.length - 2] : null;
          const isFirstInCluster = !prevMsg || prevMsg.side !== msg.side || prevMsg.senderName !== msg.senderName || prevMsg.type === "system";
          appendMessageBubble(msg, isFirstInCluster);

          if (msg.side === "right") {
            playSentSound();
            if (window.AndroidBridge && window.AndroidBridge.triggerHaptic) {
              window.AndroidBridge.triggerHaptic("light");
            }
            scrollToBottom(true);
          } else {
            playReceivedSound();
            if (window.AndroidBridge) {
              if (window.AndroidBridge.triggerHaptic) window.AndroidBridge.triggerHaptic("medium");
              if (document.hidden && window.AndroidBridge.showDeviceNotification) {
                window.AndroidBridge.showDeviceNotification(
                  (msg.senderName || "AI") + " (WhatsApp AI)",
                  msg.text || "Mengirim lampiran/update tugas",
                  msg.senderName || "AI",
                  targetChatId
                );
              }
            }
            if (appState.userHasScrolledUp) {
              appState.unreadWhileScrolled++;
              const badge = document.getElementById("scrollUnreadBadge");
              badge.textContent = appState.unreadWhileScrolled;
              badge.style.display = "inline-block";
            } else {
              scrollToBottom(true);
            }
          }
        } else {
          appState.unreads[targetChatId] = (appState.unreads[targetChatId] || 0) + 1;
          playReceivedSound();
          if (window.AndroidBridge && window.AndroidBridge.showDeviceNotification) {
            window.AndroidBridge.showDeviceNotification(
              (msg.senderName || "AI") + " (WhatsApp AI)",
              msg.text || "Mengirim pesan baru",
              msg.senderName || "AI",
              targetChatId
            );
          }
        }

        renderAllChatPreviews();
        updateNavBadges();
      }
    } catch (err) {
      console.error("SSE message parse error:", err);
    }
  });

  eventSource.addEventListener("typing", (e) => {
    try {
      const data = JSON.parse(e.data);
      const typingEl = document.getElementById("typingBubble");
      const typingNameEl = document.getElementById("typingName");
      const statusEl = document.getElementById("chatRoomStatus");
      const meta = CHAT_METADATA[appState.activeChat] || CHAT_METADATA.group;

      if (data.typing && (!data.chatId || data.chatId === appState.activeChat)) {
        typingNameEl.textContent = data.who || "Anggota";
        typingEl.style.display = "flex";
        if (statusEl) {
          statusEl.textContent = `${data.who || "Anggota"} sedang mengetik...`;
          statusEl.style.color = "var(--wa-teal)";
        }
        if (!appState.userHasScrolledUp) scrollToBottom();
      } else {
        typingEl.style.display = "none";
        if (statusEl) {
          statusEl.textContent = meta.status;
          statusEl.style.color = "";
        }
      }
    } catch (err) {}
  });

  eventSource.addEventListener("status", (e) => {
    try {
      const status = JSON.parse(e.data);
      applyStatusUpdate(status);
    } catch (err) {}
  });

  eventSource.addEventListener("status_update", (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.statuses) appState.statuses = data.statuses;
      renderStatusTimeline();
      document.getElementById("badgeStatusDot").style.display = "block";
    } catch (err) {}
  });

  eventSource.addEventListener("incoming_call", (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.call) showIncomingCallModal(data.call);
    } catch (err) {}
  });

  eventSource.addEventListener("call_event", (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.call) {
        appState.calls.unshift(data.call);
        renderCallsList();
      }
    } catch (err) {}
  });

  eventSource.addEventListener("clear", (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.chatId === "all") {
        appState.chats = { group: [], direct_budi: [], direct_rian: [] };
      } else if (data.chatId && appState.chats[data.chatId]) {
        appState.chats[data.chatId] = [];
      }
      renderActiveChatMessages();
      renderAllChatPreviews();
    } catch (err) {}
  });

  eventSource.addEventListener("context_compacted", (e) => {
    try {
      const data = JSON.parse(e.data);
      const name = CHAT_METADATA[data.chatId]?.title || "chat";
      showToast(`🧠 Konteks ${name} telah dipadatkan.`);
      fetchChats();
    } catch (err) {}
  });

  eventSource.addEventListener("auth_vault", (e) => {
    try {
      const data = JSON.parse(e.data);
      appState.authVault = data;
      renderAuthVaultUI();
    } catch (err) {}
  });

  eventSource.onerror = () => {
    setTimeout(connectSSE, 3000);
  };
}

function applyStatusUpdate(status) {
  appState.currentTopic = status.topic || "";
  appState.modelA = status.modelA || "";
  appState.modelB = status.modelB || "";
  appState.isRunning = status.isRunning || false;
  appState.availableModels = status.availableModels || [];
  appState.wakelock = (status.wakelock && status.wakelock.acquired) || false;

  const topicEl = document.getElementById("topicBannerText");
  if (topicEl) {
    topicEl.textContent = appState.currentTopic || "Pengembangan Web Realtime WhatsApp";
  }

  const iconLoop = document.getElementById("iconLoopState");
  const labelLoop = document.getElementById("labelLoopState");
  if (iconLoop && labelLoop) {
    if (appState.isRunning) {
      iconLoop.innerHTML = '<rect fill="currentColor" x="6" y="6" width="12" height="12" rx="2"/>';
      labelLoop.textContent = "Hentikan Diskusi Otomatis";
    } else {
      iconLoop.innerHTML = '<polygon fill="currentColor" points="7 5 19 12 7 19 7 5"/>';
      labelLoop.textContent = "Mulai Diskusi Otomatis";
    }
  }

  const badgeWl = document.getElementById("badgeWakelockStatus");
  if (badgeWl) {
    if (appState.wakelock) {
      badgeWl.textContent = "Aktif";
      badgeWl.className = "menu-status-badge";
    } else {
      badgeWl.textContent = "Nonaktif";
      badgeWl.className = "menu-status-badge status-off";
    }
  }
}

// Official provider logos (inline SVG, no external requests)
const PROVIDER_LOGOS = {
  google: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`,
  openai: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>`,
  opencode: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#F1ECEC" d="M4 2h16v20H4z"/><path fill="#211E1E" d="M8 6h8v12H8z"/><path fill="#4B4646" d="M8 12h8v6H8z"/></svg>`
};

const PROVIDER_META = {
  google: { name: "Google", sub: "Antigravity · Gemini Pro/Ultra", bg: "bg-google" },
  openai: { name: "OpenAI", sub: "Codex · ChatGPT Plus/Pro", bg: "bg-openai" },
  opencode: { name: "opencode", sub: "Community · Gratis", bg: "bg-opencode" }
};

function getModelProvider(modelId) {
  const id = String(modelId || "");
  const m = (appState.availableModels || []).find(x => x.id === id);
  const engine = m && m.engine;
  if (engine === "codex" || id.startsWith("codex/")) return "openai";
  if (engine === "opencode" || id.startsWith("opencode/")) return "opencode";
  return "google";
}

function providerLogoHtml(provider, extraClass = "") {
  const key = PROVIDER_LOGOS[provider] ? provider : "google";
  return `<span class="provider-logo logo-${key} ${extraClass}">${PROVIDER_LOGOS[key]}</span>`;
}

function hydrateProviderLogos(root = document) {
  root.querySelectorAll("[data-logo]").forEach(el => {
    const key = el.dataset.logo;
    if (!PROVIDER_LOGOS[key]) return;
    el.classList.add("provider-logo", `logo-${key}`);
    el.innerHTML = PROVIDER_LOGOS[key];
  });
}

function shortenModelName(id) {
  if (!id) return "AI";
  if (id.includes("3.8-flash")) return "Gemini 3.8";
  if (id.includes("3.7-flash")) return "Gemini 3.7";
  if (id.includes("3.1-pro")) return "Gemini 3.1 Pro";
  if (id.includes("claude-sonnet")) return "Claude Sonnet";
  if (id.includes("claude-opus")) return "Claude Opus";
  if (id.includes("gpt-oss")) return "GPT-OSS 120B";
  // OpenAI Codex Models
  if (id.includes("gpt-6.1")) return "Codex GPT-6.1";
  if (id.includes("gpt-6-astra") || id.includes("astra")) return "Codex GPT-6 Astra";
  if (id.includes("gpt-5.6")) return "Codex GPT-5.6";
  if (id.includes("gpt-5.5")) return "Codex GPT-5.5";
  if (id.startsWith("codex/")) return "Codex " + id.replace("codex/", "");
  // Opencode Models
  if (id.includes("mimo")) return "Opencode Mimo 2.6";
  if (id.includes("nemotron-3.5")) return "Opencode Nemotron 3.5";
  if (id.includes("nemotron-3")) return "Opencode Nemotron 3";
  if (id.includes("ling-3.1")) return "Opencode Ling 3.1";
  if (id.includes("ling-3.0")) return "Opencode Ling 3.0";
  if (id.includes("longcat")) return "Opencode Longcat";
  if (id.includes("exo")) return "Opencode Exo";
  if (id.includes("big-pickle")) return "Opencode Big Pickle";
  if (id.includes("space-bunny")) return "Opencode Space Bunny";
  if (id.includes("muse-spark")) return "Opencode Muse Spark";
  if (id.includes("fledge")) return "Opencode Fledge";
  if (id.startsWith("opencode/")) return "Opencode " + id.replace("opencode/", "").split("-")[0];
  return id.split("-").slice(0, 2).join(" ");
}

// =========================================================
// 6. CHAT SWITCHING & RENDERING
// =========================================================
function switchChat(chatId) {
  appState.activeChat = chatId;
  appState.unreads[chatId] = 0;
  cancelReplying();
  closeInchatSearch(true);

  // Highlight item in chat list
  document.querySelectorAll(".chat-item").forEach(item => {
    item.classList.toggle("active", item.dataset.chatId === chatId);
  });

  // Update header info with vector SVGs
  const meta = CHAT_METADATA[chatId] || CHAT_METADATA.group;
  document.getElementById("chatRoomTitle").textContent = meta.title;
  document.getElementById("chatRoomStatus").textContent = meta.status;
  const headerAvatar = document.getElementById("headerAvatar");
  headerAvatar.innerHTML = meta.avatarSvg;
  headerAvatar.className = `avatar-vector ${meta.avatarClass}`;

  // Keep loop / stop control available in all chats
  const btnLoop = document.getElementById("btnLoopToggle");
  if (btnLoop) btnLoop.style.display = "flex";

  renderActiveChatMessages();
  renderAllChatPreviews();
  updateNavBadges();

  // Reset scroll state
  appState.userHasScrolledUp = false;
  appState.unreadWhileScrolled = 0;
  document.getElementById("btnScrollBottom").style.display = "none";
  document.getElementById("scrollUnreadBadge").style.display = "none";
  scrollToBottom(false);

  // Mobile drawer slide-in
  if (window.innerWidth <= 768) {
    document.getElementById("chatMain").classList.add("mobile-open");
  }
}

function renderAllChatPreviews() {
  ["group", "direct_budi", "direct_rian"].forEach(cId => {
    const list = appState.chats[cId] || [];
    const lastMsg = list.length ? list[list.length - 1] : null;

    const timeEl = document.getElementById(`time-${cId}`);
    const snippetEl = document.getElementById(`snippet-${cId}`);
    const unreadEl = document.getElementById(`unread-${cId}`);

    if (timeEl && lastMsg) timeEl.textContent = lastMsg.time || "";
    if (snippetEl && lastMsg) {
      const senderPrefix = lastMsg.side === "right" ? "Kamu: " : (lastMsg.senderName ? `${lastMsg.senderName}: ` : "");
      let content = lastMsg.text || "";
      if (lastMsg.file) content = `[File: ${lastMsg.file.name}]`;
      else if (lastMsg.type === "voice_note") content = "[Pesan Suara WhatsApp]";
      snippetEl.textContent = senderPrefix + content;
    }

    if (unreadEl) {
      const unreadCount = appState.unreads[cId] || 0;
      if (unreadCount > 0) {
        unreadEl.textContent = unreadCount;
        unreadEl.style.display = "inline-block";
      } else {
        unreadEl.style.display = "none";
      }
    }
  });
}

function updateNavBadges() {
  const totalUnread = Object.values(appState.unreads).reduce((a, b) => a + b, 0);
  const badgeChats = document.getElementById("badgeChats");
  if (totalUnread > 0) {
    badgeChats.textContent = totalUnread;
    badgeChats.style.display = "block";
  } else {
    badgeChats.style.display = "none";
  }
}

function renderActiveChatMessages() {
  const wrap = document.getElementById("messagesWrap");
  wrap.innerHTML = `
    <div class="date-divider"><span>HARI INI</span></div>
    <div class="security-banner">
      <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#ffd279" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
      <span>Pesan di ruang ini terenkripsi secara end-to-end. Konteks percakapan di grup dan japri selalu terhubung utuh.</span>
    </div>
  `;

  const messages = appState.chats[appState.activeChat] || [];
  for (let i = 0; i < messages.length; i++) {
    const prevMsg = i > 0 ? messages[i - 1] : null;
    const isFirstInCluster = !prevMsg || prevMsg.side !== messages[i].side || prevMsg.senderName !== messages[i].senderName || prevMsg.type === "system";
    appendMessageBubble(messages[i], isFirstInCluster);
  }
  scrollToBottom(false);
}

function appendMessageBubble(msg, isFirstInCluster = true) {
  const wrap = document.getElementById("messagesWrap");

  // System notification message
  if (msg.type === "system") {
    const sysRow = document.createElement("div");
    sysRow.className = "date-divider system-message-row";
    sysRow.id = `msg-${msg.id}`;
    sysRow.innerHTML = `<span>${escapeHtml(msg.text)}</span>`;
    wrap.appendChild(sysRow);
    return;
  }

  const isRight = msg.side === "right";

  const row = document.createElement("div");
  row.className = `message-row ${isRight ? "row-right" : "row-left"}${isFirstInCluster ? " cluster-first" : ""}`;
  row.id = `msg-${msg.id}`;

  // Authentic WhatsApp Swipe-to-Reply Icon Indicator
  const swipeIcon = document.createElement("div");
  swipeIcon.className = "swipe-reply-icon";
  swipeIcon.setAttribute("aria-hidden", "true");
  swipeIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>`;
  row.appendChild(swipeIcon);

  const bubble = document.createElement("div");
  bubble.className = `bubble ${isRight ? "bubble-right" : "bubble-left"}${isFirstInCluster ? " has-tail" : ""}`;

  // WhatsApp Corner Tail SVG
  if (isFirstInCluster) {
    const tailSpan = document.createElement("span");
    tailSpan.className = `tail-container ${isRight ? "tail-right" : "tail-left"}`;
    tailSpan.innerHTML = isRight ? SVG_ICONS.tailOut : SVG_ICONS.tailIn;
    bubble.appendChild(tailSpan);
  }

  // Hover Action Trigger Button (Chevron Down)
  const actionBtn = document.createElement("button");
  actionBtn.className = "bubble-action-trigger";
  actionBtn.title = "Opsi pesan";
  actionBtn.innerHTML = SVG_ICONS.chevronDown;
  actionBtn.onclick = (e) => {
    e.stopPropagation();
    openBubbleContextMenu(e, msg);
  };
  bubble.appendChild(actionBtn);

  // Sender Name Header (Only for incoming left bubbles when first in cluster)
  if (!isRight && isFirstInCluster) {
    const senderHeader = document.createElement("div");
    senderHeader.className = "bubble-sender";
    const senderClass = msg.senderName === "Budi" ? "sender-budi" : (msg.senderName === "Rian" ? "sender-rian" : "sender-bayu");
    senderHeader.classList.add(senderClass);
    senderHeader.textContent = msg.senderName || "Anggota";

    if (msg.model) {
      senderHeader.title = `${msg.senderName} (${shortenModelName(msg.model)})`;
      const modelTag = document.createElement("span");
      modelTag.className = "sender-model-tag";
      modelTag.innerHTML = `${providerLogoHtml(getModelProvider(msg.model))}<span>${escapeHtml(shortenModelName(msg.model))}</span>`;
      senderHeader.appendChild(modelTag);
    }
    bubble.appendChild(senderHeader);
  }

  // Quoted Reply Card
  if (msg.quoted) {
    const quotedCard = document.createElement("div");
    quotedCard.className = "quoted-box";
    quotedCard.title = "Klik untuk melompat ke pesan yang dibalas";
    
    const senderName = msg.quoted.senderName || (msg.quoted.side === "right" ? "Kamu" : "Pesan");
    const quoteText = msg.quoted.text || "Kutipan pesan";
    const accentColor = senderName.includes("Budi") ? "var(--budi-color)" : (senderName.includes("Rian") ? "var(--rian-color)" : "var(--bayu-color)");
    
    quotedCard.style.borderLeftColor = accentColor;
    quotedCard.innerHTML = `
      <div class="quoted-sender" style="color: ${accentColor};">${escapeHtml(senderName)}</div>
      <div class="quoted-text">${escapeHtml(quoteText)}</div>
    `;

    quotedCard.onclick = () => jumpToMessage(msg.quoted.id);
    bubble.appendChild(quotedCard);
  }

  // Voice Note Bubble
  if (msg.type === "voice_note") {
    const vnCard = document.createElement("div");
    vnCard.className = "voice-note-card";
    vnCard.innerHTML = `
      <button class="btn-vn-play" title="Putar Pesan Suara">${SVG_ICONS.play}</button>
      <div class="vn-waveform">
        <span class="wave-bar" style="height:12px;"></span>
        <span class="wave-bar" style="height:22px;"></span>
        <span class="wave-bar" style="height:16px;"></span>
        <span class="wave-bar" style="height:28px;"></span>
        <span class="wave-bar" style="height:18px;"></span>
        <span class="wave-bar" style="height:10px;"></span>
      </div>
      <span style="font-size:11px;color:var(--text-secondary);">${escapeHtml(msg.duration || "00:05")}</span>
    `;
    const playBtn = vnCard.querySelector(".btn-vn-play");
    if (playBtn) {
      playBtn.onclick = () => {
        playSentSound();
        if (msg.text && !msg.text.startsWith("[Pesan Suara WhatsApp")) {
          speakIndonesian(msg.text, msg.senderName);
        }
        playBtn.innerHTML = SVG_ICONS.pause;
        setTimeout(() => { playBtn.innerHTML = SVG_ICONS.play; }, 3000);
      };
    }
    bubble.appendChild(vnCard);
  }

  // File or Image attachment
  if (msg.file) {
    if (msg.file.isImage) {
      const imgWrap = document.createElement("div");
      imgWrap.className = "bubble-image-wrap";
      
      const img = document.createElement("img");
      img.src = msg.file.url;
      img.alt = msg.file.name;
      img.title = "Klik untuk membuka gambar ukuran penuh";
      img.onclick = () => window.open(msg.file.url, "_blank");
      imgWrap.appendChild(img);

      const downloadOverlay = document.createElement("a");
      downloadOverlay.className = "image-download-overlay";
      downloadOverlay.href = `${msg.file.url}?download=1`;
      downloadOverlay.download = msg.file.name;
      downloadOverlay.title = `Unduh ${msg.file.name}`;
      downloadOverlay.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#ffffff" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
      downloadOverlay.onclick = (e) => e.stopPropagation();
      imgWrap.appendChild(downloadOverlay);

      bubble.appendChild(imgWrap);
    } else {
      const fileCard = document.createElement("div");
      fileCard.className = "file-card";
      fileCard.innerHTML = `
        <div class="file-card-icon">${SVG_ICONS.doc}</div>
        <div class="file-card-info">
          <div class="file-card-name">${escapeHtml(msg.file.name)}</div>
          <div class="file-card-size">${escapeHtml(msg.file.size)}</div>
        </div>
        <a href="${msg.file.url}?download=1" download="${escapeHtml(msg.file.name)}" class="file-card-btn" title="Unduh file ke perangkat">Unduh</a>
      `;
      bubble.appendChild(fileCard);
    }
  }

  // Text Content & Code Blocks
  if (msg.text && msg.type !== "voice_note") {
    const contentWrap = document.createElement("div");
    contentWrap.className = "bubble-content-wrap bubble-text";
    renderMessageBlocks(msg.text, contentWrap);
    bubble.appendChild(contentWrap);
  }

  // Footer (Time & Blue Checkmarks)
  const footer = document.createElement("div");
  footer.className = "bubble-footer";
  const timeSpan = document.createElement("span");
  timeSpan.className = "bubble-time";
  timeSpan.textContent = msg.time || "";
  footer.appendChild(timeSpan);

  if (isRight) {
    const ticks = document.createElement("span");
    ticks.className = "bubble-ticks";
    ticks.innerHTML = SVG_ICONS.checkDouble;
    footer.appendChild(ticks);
  }

  bubble.appendChild(footer);
  row.appendChild(bubble);
  attachSwipeGesture(row, bubble, swipeIcon, msg);
  wrap.appendChild(row);
}

// Authentic WhatsApp Swipe-to-Reply Gesture Engine
function attachSwipeGesture(row, bubble, swipeIcon, msg) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isSwiping = false;
  let isVerticalScroll = false;
  const threshold = 38;

  function onTouchStart(e) {
    const touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX;
    startY = touch.clientY;
    currentX = 0;
    isSwiping = false;
    isVerticalScroll = false;
    bubble.classList.add("is-swiping");
  }

  function onTouchMove(e) {
    if (isVerticalScroll) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (!isSwiping && !isVerticalScroll) {
      if (Math.abs(dy) > Math.abs(dx)) {
        isVerticalScroll = true;
        return;
      }
      if (Math.abs(dx) > 10) {
        isSwiping = true;
      }
    }

    if (isSwiping && dx > 0) {
      if (e.cancelable) e.preventDefault();
      const moveX = Math.min(dx * 0.42, 60);
      currentX = moveX;
      bubble.style.transform = `translateX(${moveX}px)`;

      const progress = Math.min(moveX / threshold, 1);
      swipeIcon.style.opacity = progress;
      swipeIcon.style.transform = `translateY(-50%) scale(${0.4 + progress * 0.6})`;

      if (moveX >= threshold) {
        row.classList.add("reply-ready");
      } else {
        row.classList.remove("reply-ready");
      }
    }
  }

  function onTouchEnd() {
    bubble.classList.remove("is-swiping");
    bubble.style.transform = "";
    swipeIcon.style.opacity = "0";
    swipeIcon.style.transform = "translateY(-50%) scale(0)";

    const ready = row.classList.contains("reply-ready");
    row.classList.remove("reply-ready");

    if (ready) {
      if (window.navigator && window.navigator.vibrate) {
        try { window.navigator.vibrate(15); } catch (_) {}
      }
      playSentSound();
      setReplyingTo(msg);
      const input = document.getElementById("messageInput");
      if (input) input.focus();
    }
  }

  row.addEventListener("touchstart", onTouchStart, { passive: true });
  row.addEventListener("touchmove", onTouchMove, { passive: false });
  row.addEventListener("touchend", onTouchEnd, { passive: true });
  row.addEventListener("touchcancel", onTouchEnd, { passive: true });

  // Double click for instant reply on desktop
  bubble.addEventListener("dblclick", () => {
    setReplyingTo(msg);
    const input = document.getElementById("messageInput");
    if (input) input.focus();
  });
}

// Registry for snippet copy-to-clipboard
window._snippetRegistry = window._snippetRegistry || new Map();
let _snippetCounter = 0;

function copyCodeSnippet(btn) {
  const codeId = btn.getAttribute("data-code-id");
  const rawCode = window._snippetRegistry.get(codeId) || "";
  if (!rawCode) return;

  navigator.clipboard.writeText(rawCode).then(() => {
    btn.classList.add("copied");
    const span = btn.querySelector("span");
    const origText = span ? span.textContent : "Salin";
    if (span) span.textContent = "Tersalin! ✅";
    setTimeout(() => {
      btn.classList.remove("copied");
      if (span) span.textContent = origText;
    }, 2000);
  }).catch(() => {
    showToast("Gagal menyalin kode");
  });
}

// Toggle long regular message collapse/expand
function toggleWaTextMessage(btn) {
  const textBlock = btn.closest(".bubble-text-block.text-collapsible");
  if (!textBlock) return;
  const isCollapsed = textBlock.classList.contains("is-collapsed");
  if (isCollapsed) {
    textBlock.classList.remove("is-collapsed");
    textBlock.classList.add("is-expanded");
  } else {
    textBlock.classList.remove("is-expanded");
    textBlock.classList.add("is-collapsed");
  }
}

// Backwards compatibility alias
function toggleMessageText(btn) {
  toggleWaTextMessage(btn);
}

// Toggle code card collapse/expand
function toggleCodeCard(btn) {
  const card = btn.closest(".code-card");
  if (!card) return;
  const isCollapsed = card.classList.contains("is-collapsed");
  const lineCount = card.getAttribute("data-lines") || "";
  const toggleText = card.querySelector(".code-toggle-btn .toggle-text");
  const toggleIcon = card.querySelector(".code-toggle-btn .toggle-icon");
  const expandBar = card.querySelector(".code-card-expand-bar .expand-bar-text");

  if (isCollapsed) {
    // Open/Expand
    card.classList.remove("is-collapsed");
    card.classList.add("is-expanded");
    if (toggleText) toggleText.textContent = "Lipat";
    if (toggleIcon) toggleIcon.textContent = "^";
    if (expandBar) expandBar.textContent = `^ Lipat kode (${lineCount} baris)`;
  } else {
    // Fold/Collapse
    card.classList.remove("is-expanded");
    card.classList.add("is-collapsed");
    if (toggleText) toggleText.textContent = "Buka";
    if (toggleIcon) toggleIcon.textContent = "▾";
    if (expandBar) expandBar.textContent = `Buka seluruh kode (${lineCount} baris) ▾`;
  }
}

function toggleCodeCardFromBar(bar) {
  const card = bar.closest(".code-card");
  if (!card) return;
  const btn = card.querySelector(".code-toggle-btn");
  if (btn) {
    toggleCodeCard(btn);
  } else {
    const isCollapsed = card.classList.contains("is-collapsed");
    const lineCount = card.getAttribute("data-lines") || "";
    const expandBarText = card.querySelector(".code-card-expand-bar .expand-bar-text");
    if (isCollapsed) {
      card.classList.remove("is-collapsed");
      card.classList.add("is-expanded");
      if (expandBarText) expandBarText.textContent = `^ Lipat kode (${lineCount} baris)`;
    } else {
      card.classList.remove("is-expanded");
      card.classList.add("is-collapsed");
      if (expandBarText) expandBarText.textContent = `Buka seluruh kode (${lineCount} baris) ▾`;
    }
  }
}

// Message Block Parsing & Rendering
function renderMessageBlocks(rawText, containerEl) {
  if (!rawText) return;

  // Regex to match code blocks: ```[lang][:filename]\n[code]```
  const codeRegex = /```([a-zA-Z0-9_\-\+\#]*)(?:[: \t]([^\r\n`]+))?[ \t]*\r?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(rawText)) !== null) {
    const textBefore = rawText.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      renderTextBlock(textBefore, containerEl);
    }

    const lang = (match[1] || "").trim().toLowerCase();
    const explicitFilename = (match[2] || "").trim();
    const code = match[3].replace(/\n$/, ""); // trim trailing newline
    renderCodeBlock(code, lang, explicitFilename, containerEl);

    lastIndex = match.index + match[0].length;
  }

  const textAfter = rawText.substring(lastIndex);
  if (textAfter.trim()) {
    renderTextBlock(textAfter, containerEl);
  }
}

function getTruncatedRawText(text, maxChars = 360, maxLines = 5) {
  const lines = text.split("\n");
  let truncated = "";

  if (lines.length > maxLines) {
    truncated = lines.slice(0, maxLines).join("\n");
  } else {
    truncated = text;
  }

  if (truncated.length > maxChars) {
    const spaceIdx = truncated.lastIndexOf(" ", maxChars);
    if (spaceIdx > maxChars * 0.7) {
      truncated = truncated.substring(0, spaceIdx);
    } else {
      truncated = truncated.substring(0, maxChars);
    }
  }

  truncated = truncated.trimEnd();

  // Close unclosed markdown tokens to avoid broken tags in slice
  const backticks = (truncated.match(/`/g) || []).length;
  if (backticks % 2 !== 0) truncated += "`";

  const doubleStars = (truncated.match(/\*\*/g) || []).length;
  if (doubleStars % 2 !== 0) {
    truncated += "**";
  } else {
    const singleStars = (truncated.replace(/\*\*/g, "").match(/\*/g) || []).length;
    if (singleStars % 2 !== 0) truncated += "*";
  }

  const underscores = (truncated.match(/_/g) || []).length;
  if (underscores % 2 !== 0) truncated += "_";

  const tildes = (truncated.match(/~/g) || []).length;
  if (tildes % 2 !== 0) truncated += "~";

  return truncated;
}

function renderTextBlock(text, containerEl) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const lineCount = trimmed.split("\n").length;
  const isLong = trimmed.length > 340 || lineCount > 4;

  const textEl = document.createElement("div");
  textEl.className = "bubble-text-block";

  if (isLong) {
    textEl.classList.add("text-collapsible", "is-collapsed");
    const truncatedRaw = getTruncatedRawText(trimmed, 300, 4);
    const truncatedHtml = formatInlineMarkdown(truncatedRaw);
    const fullHtml = formatInlineMarkdown(trimmed);

    textEl.innerHTML = `<span class="text-content-truncated">${truncatedHtml}… <span role="button" tabindex="0" class="wa-read-more-inline ripple-surface" onclick="toggleWaTextMessage(this)">baca selengkapnya</span></span><span class="text-content-full">${fullHtml} <span role="button" tabindex="0" class="wa-read-more-inline wa-read-less-inline ripple-surface" onclick="toggleWaTextMessage(this)">Lipat ^</span></span><span class="bubble-spacer" aria-hidden="true"></span>`;
  } else {
    textEl.innerHTML = `${formatInlineMarkdown(trimmed)}<span class="bubble-spacer" aria-hidden="true"></span>`;
  }

  containerEl.appendChild(textEl);
}

function renderCodeBlock(rawCode, cleanLang, explicitFilename, containerEl) {
  let highlightedHtml = "";
  let displayLang = cleanLang ? cleanLang.toUpperCase() : "CODE";

  if (window.hljs) {
    try {
      if (cleanLang && hljs.getLanguage(cleanLang)) {
        highlightedHtml = hljs.highlight(rawCode, { language: cleanLang, ignoreIllegals: true }).value;
      } else {
        const autoRes = hljs.highlightAuto(rawCode);
        highlightedHtml = autoRes.value;
        if (!cleanLang && autoRes.language) {
          displayLang = autoRes.language.toUpperCase();
        }
      }
    } catch (e) {
      highlightedHtml = escapeHtml(rawCode);
    }
  } else {
    highlightedHtml = escapeHtml(rawCode);
  }

  const snippetId = "snip_" + (++_snippetCounter) + "_" + Math.random().toString(36).slice(2, 6);
  window._snippetRegistry.set(snippetId, rawCode);

  const lines = rawCode.split("\n");
  const lineCount = lines.length;
  const isLongCode = lineCount > 8 || rawCode.length > 280;

  // Build gutter line numbers
  const gutterHtml = Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join("");

  const card = document.createElement("div");
  card.className = `code-card${isLongCode ? " is-collapsible is-collapsed" : ""}`;
  card.setAttribute("data-lines", lineCount);

  // Header metadata
  let filenameBadge = "";
  if (explicitFilename) {
    filenameBadge = `<span class="meta-filename">${escapeHtml(explicitFilename)}</span><span class="meta-divider">•</span>`;
  }

  let toggleBtnHtml = "";
  let footerBarHtml = "";
  if (isLongCode) {
    toggleBtnHtml = `
      <button type="button" class="code-toggle-btn ripple-surface" onclick="toggleCodeCard(this)" title="Buka / Lipat kode">
        <span class="toggle-icon">▾</span>
        <span class="toggle-text">Buka</span>
      </button>
    `;
    footerBarHtml = `
      <div class="code-card-expand-bar ripple-surface" onclick="toggleCodeCardFromBar(this)" title="Klik untuk membuka atau melipat kode">
        <span class="expand-bar-text">Buka seluruh kode (${lineCount} baris) ▾</span>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="code-card-header">
      <div class="code-card-meta">
        <svg width="13" height="13" viewBox="0 0 24 24"><path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
        ${filenameBadge}
        <span class="meta-lang">${displayLang}</span>
        <span class="meta-divider">•</span>
        <span class="meta-lines">${lineCount} baris</span>
      </div>
      <div class="code-card-actions">
        ${toggleBtnHtml}
        <button type="button" class="code-copy-btn ripple-surface" onclick="copyCodeSnippet(this)" data-code-id="${snippetId}" title="Salin kode program">
          <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          <span>Salin</span>
        </button>
      </div>
    </div>
    <div class="code-card-body">
      <div class="code-scroll-pane">
        <div class="code-lines-gutter" aria-hidden="true">${gutterHtml}</div>
        <pre class="code-card-pre"><code class="hljs ${cleanLang}">${highlightedHtml}</code></pre>
      </div>
    </div>
    ${footerBarHtml}
  `;

  containerEl.appendChild(card);
}

function formatInlineMarkdown(text) {
  if (!text) return "";

  const inlineCodes = [];
  // 1. Extract inline code `code`
  let processed = text.replace(/`([^`\n]+)`/g, (match, inline) => {
    const inlineHtml = `<code class="inline-code">${escapeHtml(inline)}</code>`;
    const placeholder = `___INLINE_CODE_${inlineCodes.length}___`;
    inlineCodes.push(inlineHtml);
    return placeholder;
  });

  // 2. Escape HTML
  let escaped = escapeHtml(processed);

  // 3. Bold, Italic, Strikethrough
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/(^|[^\w*])\*([^*\n]+)\*([^\w*]|$)/g, '$1<strong>$2</strong>$3');
  escaped = escaped.replace(/(^|[^\w_])_([^_\n]+)_([^\w_]|$)/g, '$1<em>$2</em>$3');
  escaped = escaped.replace(/(^|[^\w~])~([^~\n]+)~([^\w~]|$)/g, '$1<del>$2</del>');

  // 4. Auto-link URLs
  escaped = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="wa-chat-link">$1</a>');

  // 5. Restore inline codes
  inlineCodes.forEach((inlineHtml, idx) => {
    escaped = escaped.replace(`___INLINE_CODE_${idx}___`, inlineHtml);
  });

  return escaped;
}

// Fallback formatMessageText
function formatMessageText(text) {
  if (!text) return "";
  const tempDiv = document.createElement("div");
  renderMessageBlocks(text, tempDiv);
  return tempDiv.innerHTML;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function scrollToBottom(smooth = false) {
  const stream = document.getElementById("chatStream");
  if (!stream) return;
  if (smooth) {
    stream.scrollTo({ top: stream.scrollHeight, behavior: "smooth" });
  } else {
    stream.scrollTop = stream.scrollHeight;
  }
}

function jumpToMessage(msgId) {
  if (!msgId) return;
  const targetRow = document.getElementById(`msg-${msgId}`);
  if (targetRow) {
    targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
    const targetBubble = targetRow.querySelector(".bubble");
    if (targetBubble) {
      targetBubble.classList.add("highlight-pulse");
      setTimeout(() => targetBubble.classList.remove("highlight-pulse"), 1400);
    }
  }
}

// =========================================================
// 6.5. MESSAGE CONTEXT MENU & TOAST NOTIFICATION SYSTEM
// =========================================================
let activeContextMsg = null;

function openBubbleContextMenu(e, msg) {
  activeContextMsg = msg;
  const menu = document.getElementById("bubbleContextMenu");
  if (!menu) return;

  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();

  menu.style.display = "flex";
  menu.style.visibility = "hidden";
  const menuRect = menu.getBoundingClientRect();

  let top = rect.bottom + 4;
  let left = rect.right - menuRect.width;

  // Viewport bounds checking
  if (top + menuRect.height > window.innerHeight - 12) {
    top = rect.top - menuRect.height - 4;
  }
  if (left < 10) {
    left = 10;
  }
  if (left + menuRect.width > window.innerWidth - 10) {
    left = window.innerWidth - menuRect.width - 10;
  }

  menu.style.top = `${Math.round(top)}px`;
  menu.style.left = `${Math.round(left)}px`;
  menu.style.visibility = "visible";
}

function closeBubbleContextMenu() {
  const menu = document.getElementById("bubbleContextMenu");
  if (menu) menu.style.display = "none";
  activeContextMsg = null;
}

function showToast(text) {
  const toast = document.getElementById("waToast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("toast-show");
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.classList.remove("toast-show");
  }, 2200);
}

function deleteMessageLocally(msgId) {
  if (!msgId) return;
  const list = appState.chats[appState.activeChat];
  if (list) {
    appState.chats[appState.activeChat] = list.filter(m => m.id !== msgId);
  }
  const el = document.getElementById(`msg-${msgId}`);
  if (el) {
    el.style.transition = "opacity 0.2s ease, transform 0.2s ease";
    el.style.opacity = "0";
    el.style.transform = "scale(0.96)";
    setTimeout(() => {
      renderActiveChatMessages();
    }, 200);
  }
}

// =========================================================
// 7. QUOTED REPLY SYSTEM
// =========================================================
function setReplyingTo(msg) {
  const senderName = msg.side === "right" ? "Kamu (Boss Bayu)" : (msg.senderName || "Anggota");
  let previewText = msg.text || "";
  if (msg.file) previewText = `[File: ${msg.file.name}]`;
  else if (msg.type === "voice_note") previewText = "[Pesan Suara WhatsApp]";

  appState.replyingTo = {
    id: msg.id,
    senderName,
    text: previewText
  };

  const bar = document.getElementById("replyPreviewBar");
  document.getElementById("replySenderTitle").textContent = senderName;
  document.getElementById("replySnippetText").textContent = previewText;
  
  const accentColor = senderName.includes("Budi") ? "var(--budi-color)" : (senderName.includes("Rian") ? "var(--rian-color)" : "var(--bayu-color)");
  bar.style.borderLeftColor = accentColor;
  bar.style.display = "flex";

  document.getElementById("messageInput").focus();
}

function cancelReplying() {
  appState.replyingTo = null;
  const bar = document.getElementById("replyPreviewBar");
  if (bar) bar.style.display = "none";
}

// =========================================================
// 8. SEND MESSAGE & FILE ATTACHMENTS
// =========================================================
async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed && !appState.attachedFile) return;

  const currentQuoted = appState.replyingTo ? { ...appState.replyingTo } : null;
  cancelReplying();

  if (appState.attachedFile) {
    try {
      await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: appState.attachedFile.name,
          contentBase64: appState.attachedFile.base64,
          caption: trimmed,
          chatId: appState.activeChat,
          quoted: currentQuoted
        })
      });
      clearAttachmentPreview();
    } catch (err) {
      console.error("Upload error:", err);
    }
    return;
  }

  try {
    await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: trimmed,
        chatId: appState.activeChat,
        quoted: currentQuoted
      })
    });
  } catch (err) {
    console.error("Send message error:", err);
  }
}

function sendQuickMessage(text) {
  document.getElementById("messageInput").value = text;
  document.getElementById("chatInputForm").dispatchEvent(new Event("submit"));
}

function clearAttachmentPreview() {
  appState.attachedFile = null;
  document.getElementById("attachmentPreviewBar").style.display = "none";
  document.getElementById("filePicker").value = "";
  const input = document.getElementById("messageInput");
  if (input) input.dispatchEvent(new Event("input"));
}

function initiateJapriPrompt() {
  const pick = confirm("Pilih kontak untuk japri Boss Bayu:\nKlik OK untuk Budi (Tech Lead),\natau Cancel untuk Rian (Developer Lapangan)");
  const contact = pick ? "budi" : "rian";
  fetch("/api/japri/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contactId: contact, reason: "follow_up" })
  }).then(r => r.json()).then(res => {
    if (res.chatId) switchChat(res.chatId);
  }).catch(e => console.error(e));
}

// =========================================================
// 9. WHATSAPP STATUS (STORIES) FEATURE
// =========================================================
function renderStatusTimeline() {
  // 1. My Status section
  const userStatuses = appState.statuses.filter(s => s.author === "user");
  const myRing = document.getElementById("myStatusRing");
  const mySub = document.getElementById("myStatusSubtitle");
  const myActions = document.getElementById("myStatusActions");
  const myViews = document.getElementById("myStatusViewsCount");

  if (userStatuses.length > 0) {
    myRing.classList.add("has-status");
    const latest = userStatuses[0];
    mySub.textContent = latest.text || "Status WhatsApp aktif";
    myActions.style.display = "flex";
    myViews.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg> 2`;
  } else {
    myRing.classList.remove("has-status");
    mySub.textContent = "Klik untuk melihat atau menambah status";
    myActions.style.display = "none";
  }

  // 2. Contacts Statuses
  const container = document.getElementById("statusRecentList");
  container.innerHTML = "";

  const updates = appState.statuses.filter(s => s.author !== "user");
  const badgeDot = document.getElementById("badgeStatusDot");
  if (badgeDot && updates.length > 0 && appState.activeTab !== "status") {
    badgeDot.style.display = "block";
  }

  if (!updates.length) {
    container.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:13px;">Belum ada status baru dari Budi & Rian.</div>';
    return;
  }

  updates.forEach((item, index) => {
    const el = document.createElement("div");
    el.className = "status-item";
    el.onclick = () => openStoryViewer("contacts", index);

    const isBudi = item.author === "budi";
    const avatarSvg = isBudi ? SVG_ICONS.budi : SVG_ICONS.rian;
    const avatarClass = isBudi ? "avatar-budi" : "avatar-rian";

    el.innerHTML = `
      <div class="status-avatar-ring">
        <div class="avatar-vector ${avatarClass}">${avatarSvg}</div>
      </div>
      <div class="status-info">
        <span class="status-author">${escapeHtml(item.authorName)}</span>
        <span class="status-subtitle">${escapeHtml(item.timeFormatted || "Hari ini")}</span>
      </div>
    `;
    container.appendChild(el);
  });
}

function openStoryViewer(category = "contacts", startIndex = 0) {
  const stories = category === "user"
    ? appState.statuses.filter(s => s.author === "user")
    : appState.statuses.filter(s => s.author !== "user");

  if (!stories.length) {
    document.getElementById("createStatusModal").style.display = "flex";
    return;
  }

  appState.storyViewer = {
    category,
    stories,
    index: startIndex,
    interval: null
  };

  const modal = document.getElementById("statusStoryViewerModal");
  modal.style.display = "flex";
  loadStorySlide(startIndex);
}

function loadStorySlide(index) {
  const { stories, category } = appState.storyViewer;
  if (index < 0) index = 0;
  if (index >= stories.length) {
    closeStoryViewer();
    return;
  }

  appState.storyViewer.index = index;
  const item = stories[index];

  document.getElementById("storyViewerName").textContent = category === "user" ? "Status Saya (Boss Bayu)" : item.authorName;
  document.getElementById("storyViewerTime").textContent = item.timeFormatted || "Baru saja";

  // Avatar SVG
  const avatarBox = document.getElementById("storyViewerAvatarBox");
  if (category === "user") {
    avatarBox.className = "avatar-vector avatar-bayu";
    avatarBox.innerHTML = SVG_PORTRAITS.bayu;
  } else if (item.author === "budi") {
    avatarBox.className = "avatar-vector avatar-budi";
    avatarBox.innerHTML = SVG_PORTRAITS.budi;
  } else {
    avatarBox.className = "avatar-vector avatar-rian";
    avatarBox.innerHTML = SVG_PORTRAITS.rian;
  }

  const card = document.getElementById("storyViewerCard");
  if (item.bgGradient) card.style.background = item.bgGradient;
  document.getElementById("storyViewerText").textContent = item.text || "";

  // Delete button & Footers for User vs Contacts
  const btnDelete = document.getElementById("btnStoryDelete");
  const replyFooter = document.getElementById("storyReplyFooter");
  const myViewsFooter = document.getElementById("storyMyViewsFooter");

  if (category === "user") {
    btnDelete.style.display = "flex";
    replyFooter.style.display = "none";
    myViewsFooter.style.display = "flex";
  } else {
    btnDelete.style.display = "none";
    replyFooter.style.display = "flex";
    myViewsFooter.style.display = "none";
    document.getElementById("inputStoryReply").value = "";
  }

  startStoryProgressBar();
}

function startStoryProgressBar() {
  if (appState.storyViewer.interval) clearInterval(appState.storyViewer.interval);

  const fill = document.getElementById("storyProgressFill");
  let progress = 0;
  fill.style.width = "0%";

  appState.storyViewer.interval = setInterval(() => {
    progress += 2;
    fill.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(appState.storyViewer.interval);
      loadStorySlide(appState.storyViewer.index + 1);
    }
  }, 100);
}

function closeStoryViewer() {
  if (appState.storyViewer.interval) clearInterval(appState.storyViewer.interval);
  document.getElementById("statusStoryViewerModal").style.display = "none";
}

async function deleteCurrentStory() {
  const { stories, index, category } = appState.storyViewer;
  const current = stories[index];
  if (!current || category !== "user") return;

  if (!confirm("Hapus status ini dari WhatsApp?")) return;

  try {
    await fetch("/api/statuses/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id })
    });
    closeStoryViewer();
  } catch (err) {
    console.error("Delete status error:", err);
  }
}

async function sendStoryReply() {
  const replyInput = document.getElementById("inputStoryReply");
  const text = replyInput.value.trim();
  if (!text) return;

  const { stories, index } = appState.storyViewer;
  const current = stories[index];
  if (!current) return;

  closeStoryViewer();

  try {
    const res = await fetch("/api/statuses/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statusId: current.id,
        targetContact: current.author,
        text
      })
    });
    const data = await res.json();
    if (data.chatId) switchChat(data.chatId);
  } catch (err) {
    console.error("Reply status error:", err);
  }
}

// =========================================================
// 10. REALTIME IN-CHAT SEARCH
// =========================================================
function openInchatSearch() {
  const bar = document.getElementById("inchatSearchBar");
  bar.style.display = "block";
  const input = document.getElementById("inputInchatSearch");
  input.focus();
  input.select();
}

function closeInchatSearch(skipRerender = false) {
  const bar = document.getElementById("inchatSearchBar");
  if (bar) bar.style.display = "none";
  const inp = document.getElementById("inputInchatSearch");
  if (inp) inp.value = "";
  const cnt = document.getElementById("searchMatchCount");
  if (cnt) cnt.textContent = "0 cocok";
  appState.inchatSearch = { query: "", matches: [], currentIndex: -1 };
  if (!skipRerender) {
    clearInchatHighlights();
  }
}

function performInchatSearch(query) {
  clearInchatHighlights();
  const trimmed = query.toLowerCase().trim();
  if (!trimmed) {
    document.getElementById("searchMatchCount").textContent = "0 cocok";
    appState.inchatSearch = { query: "", matches: [], currentIndex: -1 };
    return;
  }

  const matches = [];
  const bubbleTexts = document.querySelectorAll("#messagesWrap .bubble-text");

  bubbleTexts.forEach(el => {
    const text = el.textContent;
    if (text.toLowerCase().includes(trimmed)) {
      matches.push(el);
      // Safe highlight
      const regex = new RegExp(`(${escapeRegex(trimmed)})`, "gi");
      el.innerHTML = escapeHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>');
    }
  });

  appState.inchatSearch = {
    query: trimmed,
    matches,
    currentIndex: matches.length ? 0 : -1
  };

  document.getElementById("searchMatchCount").textContent = `${matches.length} cocok`;
  if (matches.length > 0) {
    highlightCurrentMatch(0);
  }
}

function highlightCurrentMatch(index) {
  const { matches } = appState.inchatSearch;
  if (!matches.length || index < 0 || index >= matches.length) return;

  document.querySelectorAll("mark.search-highlight").forEach(m => m.classList.remove("active-match"));
  const currentEl = matches[index];
  const mark = currentEl.querySelector("mark.search-highlight");
  if (mark) mark.classList.add("active-match");

  currentEl.scrollIntoView({ behavior: "smooth", block: "center" });
  document.getElementById("searchMatchCount").textContent = `${index + 1} dari ${matches.length}`;
}

function clearInchatHighlights() {
  if (typeof renderActiveChatMessages === "function") {
    renderActiveChatMessages();
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =========================================================
// 11. VOICE NOTE RECORDING SIMULATION
// =========================================================
function startVoiceRecording() {
  appState.voiceRecording.active = true;
  appState.voiceRecording.seconds = 0;

  document.getElementById("chatInputForm").style.display = "none";
  document.getElementById("voiceRecordingBar").style.display = "flex";
  document.getElementById("recTimer").textContent = "00:00";

  appState.voiceRecording.timer = setInterval(() => {
    appState.voiceRecording.seconds++;
    const s = appState.voiceRecording.seconds;
    const mins = String(Math.floor(s / 60)).padStart(2, "0");
    const secs = String(s % 60).padStart(2, "0");
    document.getElementById("recTimer").textContent = `${mins}:${secs}`;
  }, 1000);
}

function cancelVoiceRecording() {
  if (appState.voiceRecording.timer) clearInterval(appState.voiceRecording.timer);
  appState.voiceRecording.active = false;
  document.getElementById("voiceRecordingBar").style.display = "none";
  document.getElementById("chatInputForm").style.display = "flex";
}

async function sendVoiceRecording() {
  const s = appState.voiceRecording.seconds || 3;
  const mins = String(Math.floor(s / 60)).padStart(2, "0");
  const secs = String(s % 60).padStart(2, "0");
  const durationStr = `${mins}:${secs}`;

  cancelVoiceRecording();

  try {
    await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `[Pesan Suara WhatsApp - ${durationStr}]`,
        chatId: appState.activeChat,
        type: "voice_note",
        duration: durationStr,
        quoted: appState.replyingTo ? { ...appState.replyingTo } : null
      })
    });
    cancelReplying();
  } catch (err) {
    console.error("Send VN error:", err);
  }
}

// =========================================================
// 12. EMOJI DRAWER LOGIC
// =========================================================
const EMOJI_DATABASE = {
  smileys: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😋","😛","😜","🤪","😝","🤗","🤭","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","😮","😲","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬"],
  gestures: ["👍","👎","👊","✊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦵","🦿","🦶","👂","🦻","👃","🧠","👀","👁","👅","👄","💋","❤️","🧡","💛","💚","💙","💜","🤎","🖤","🤍"],
  tech: ["💻","🖥","⌨️","🖱","💽","💾","💿","📀","📷","📸","📹","🎥","📞","☎️","📟","📠","📺","📻","🎙","⏱","⏲","⏰","📡","🔋","🔌","💡","🔦","🧰","🪛","🔧","🔨","🛠","⛏","⚙️","🧱","⛓","🧲","🔬","🔭","📡","🚀","🛸"],
  symbols: ["✨","🔥","⚡️","💥","☀️","⛅️","🌈","⭐️","🌟","💫","✅","❌","⭕️","🛑","⛔️","⚠️","💯","💢","♨️","🎵","🎶","➕","➖","➗","✖️","♾","💲","™️","©️","®️","💬","💭","🗯","🔔","🔕"]
};

function populateEmojiGrid(category = "smileys") {
  const grid = document.getElementById("emojiGrid");
  grid.innerHTML = "";
  const list = EMOJI_DATABASE[category] || EMOJI_DATABASE.smileys;

  list.forEach(emoji => {
    const btn = document.createElement("button");
    btn.className = "emoji-item";
    btn.type = "button";
    btn.textContent = emoji;
    btn.onclick = () => insertEmoji(emoji);
    grid.appendChild(btn);
  });
}

function insertEmoji(emoji) {
  const input = document.getElementById("messageInput");
  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;
  const val = input.value;
  input.value = val.substring(0, start) + emoji + val.substring(end);
  input.focus();
  input.selectionStart = input.selectionEnd = start + emoji.length;
  // Trigger input event to update Send/Mic button
  input.dispatchEvent(new Event("input"));
}

// =========================================================
// 13. CODE SNIPPET MODAL
// =========================================================
function sendCodeSnippet() {
  const langSelect = document.getElementById("snippetLanguage");
  const lang = (langSelect ? langSelect.value : "javascript") || "javascript";
  const filenameInput = document.getElementById("snippetFilename");
  const captionInput = document.getElementById("snippetCaption");
  const code = document.getElementById("snippetCode").value;
  if (!code.trim()) {
    showToast("Isi kode program tidak boleh kosong");
    return;
  }

  const filename = (filenameInput ? filenameInput.value.trim() : "") || `snippet.${lang === "python" ? "py" : (lang === "bash" ? "sh" : "js")}`;
  const caption = captionInput ? captionInput.value.trim() : "";
  
  let formatted = "";
  if (caption) {
    formatted = `${caption}\n\`\`\`${lang}:${filename}\n${code}\n\`\`\``;
  } else {
    formatted = `\`\`\`${lang}:${filename}\n${code}\n\`\`\``;
  }

  document.getElementById("snippetModal").style.display = "none";
  document.getElementById("snippetCode").value = "";
  if (captionInput) captionInput.value = "";
  if (document.getElementById("snippetLineCount")) {
    document.getElementById("snippetLineCount").textContent = "1 baris";
  }
  sendMessage(formatted);
}

// =========================================================
// 14. CHAT / CONTACT INFO MODAL
// =========================================================
function openChatInfoModal() {
  const meta = CHAT_METADATA[appState.activeChat] || CHAT_METADATA.group;
  document.getElementById("chatInfoModalTitle").textContent = meta.title;
  document.getElementById("chatInfoName").textContent = meta.title;
  document.getElementById("chatInfoSub").textContent = meta.status;
  
  const avatarEl = document.getElementById("chatInfoAvatar");
  avatarEl.className = `avatar-vector avatar-large ${meta.avatarClass}`;
  avatarEl.innerHTML = meta.avatarSvg;

  const memberList = document.getElementById("chatInfoMemberList");
  memberList.innerHTML = "";

  const members = [
    { name: "Boss Bayu", role: "Ketua Tim & Admin Grup", svg: SVG_ICONS.crown, cls: "avatar-bayu" },
    { name: "Budi (Tech Lead)", role: "Software Engineer Senior", svg: SVG_ICONS.budi, cls: "avatar-budi" },
    { name: "Rian (Developer Lapangan)", role: "Praktisi Lapangan", svg: SVG_ICONS.rian, cls: "avatar-rian" }
  ];

  members.forEach(m => {
    const item = document.createElement("div");
    item.style.cssText = "display:flex;align-items:center;gap:12px;padding:6px 0;";
    item.innerHTML = `
      <div class="avatar-vector ${m.cls}" style="width:36px;height:36px;">${m.svg}</div>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:13px;color:var(--text-primary);">${m.name}</div>
        <div style="font-size:11px;color:var(--text-secondary);">${m.role}</div>
      </div>
    `;
    memberList.appendChild(item);
  });

  document.getElementById("chatInfoModal").style.display = "flex";
}

// =========================================================
// 15. WHATSAPP VOICE & VIDEO CALLS
// =========================================================
function startCall(contactId, callType = "voice") {
  const contactName = contactId === "rian" ? "Rian (Developer)" : "Budi (Tech Lead)";
  appState.callState = {
    active: true,
    contactId,
    contactName,
    type: callType,
    durationSec: 0,
    timer: null,
    isMuted: false,
    isSpeaker: true
  };

  const overlay = document.getElementById("callScreenOverlay");
  overlay.style.display = "flex";

  document.getElementById("callContactName").textContent = contactName;
  const avatarBox = document.getElementById("callContactAvatar");
  avatarBox.className = `avatar-vector avatar-large ${contactId === "rian" ? "avatar-rian" : "avatar-budi"}`;
  avatarBox.innerHTML = contactId === "rian" ? SVG_PORTRAITS.rian : SVG_PORTRAITS.budi;

  document.getElementById("callTypeBadge").textContent = callType === "video" ? "PANGGILAN VIDEO" : "PANGGILAN SUARA";
  document.getElementById("callStatusLabel").textContent = "Memanggil...";
  document.getElementById("speechSubtitle").textContent = "Menunggu jawaban...";
  document.getElementById("videoFeedContainer").style.display = callType === "video" ? "flex" : "none";

  startOutgoingRingtone();

  fetch("/api/calls/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contactId, type: callType })
  }).catch(() => {});

  // Simulated answer after 2.5s
  setTimeout(() => {
    if (!appState.callState.active) return;
    stopRingtone();
    document.getElementById("callStatusLabel").textContent = "Tersambung (00:00)";

    appState.callState.timer = setInterval(() => {
      appState.callState.durationSec++;
      const mins = String(Math.floor(appState.callState.durationSec / 60)).padStart(2, "0");
      const secs = String(appState.callState.durationSec % 60).padStart(2, "0");
      document.getElementById("callStatusLabel").textContent = `Tersambung (${mins}:${secs})`;
    }, 1000);

    const greeting = contactId === "rian"
      ? "Halo Boss Bayu! Siap Pak Ketua, Rian lagi stand by nih. Ada instruksi apa Boss?"
      : "Halo, selamat siang Boss Bayu. Budi di sini siap menerima arahan dari Pak Boss.";

    document.getElementById("speechSubtitle").textContent = `"${greeting}"`;
    speakIndonesian(greeting, contactId === "rian" ? "Rian" : "Budi");
  }, 2600);
}

async function sendCallSpeech(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  document.getElementById("inputCallTalk").value = "";
  document.getElementById("speechSubtitle").textContent = `Boss Bayu: "${trimmed}" ...`;

  try {
    const res = await fetch("/api/calls/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: appState.callState.contactId,
        text: trimmed
      })
    });
    const data = await res.json();
    if (data.replySpeech) {
      document.getElementById("speechSubtitle").textContent = `${data.speaker}: "${data.replySpeech}"`;
      speakIndonesian(data.replySpeech, data.speaker);
    }
  } catch (err) {
    console.error("Call speech error:", err);
  }
}

function endCall() {
  stopRingtone();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (appState.callState.timer) clearInterval(appState.callState.timer);

  const durationStr = `${String(Math.floor(appState.callState.durationSec / 60)).padStart(2, "0")}:${String(appState.callState.durationSec % 60).padStart(2, "0")}`;

  fetch("/api/calls/end", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ duration: durationStr })
  }).catch(() => {});

  appState.callState.active = false;
  document.getElementById("callScreenOverlay").style.display = "none";
}

function showIncomingCallModal(call) {
  startIncomingRingtone();
  const modal = document.getElementById("incomingCallModal");
  modal.style.display = "flex";

  document.getElementById("incomingCallerName").textContent = call.contactName;
  const avatarBox = document.getElementById("incomingAvatar");
  avatarBox.className = `avatar-vector avatar-large ${call.contactId === "rian" ? "avatar-rian" : "avatar-budi"}`;
  avatarBox.innerHTML = call.contactId === "rian" ? SVG_PORTRAITS.rian : SVG_PORTRAITS.budi;

  document.getElementById("incomingCallType").textContent = `Panggilan ${call.type === "video" ? "Video" : "Suara"} WhatsApp Masuk...`;

  document.getElementById("btnAcceptIncoming").onclick = () => {
    stopRingtone();
    modal.style.display = "none";
    startCall(call.contactId, call.type);
  };

  document.getElementById("btnDeclineIncoming").onclick = () => {
    stopRingtone();
    modal.style.display = "none";
  };
}

function renderCallsList() {
  const container = document.getElementById("callsListContainer");
  container.innerHTML = "";

  if (!appState.calls.length) {
    container.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:13px;">Belum ada riwayat panggilan.</div>';
    return;
  }

  appState.calls.forEach(call => {
    const el = document.createElement("div");
    el.className = "call-item";
    const isRian = call.contactId === "rian";
    const avatarSvg = isRian ? SVG_ICONS.rian : SVG_ICONS.budi;
    const arrow = call.direction === "outgoing" ? '<span class="call-icon-outgoing">↗</span>' : '<span class="call-icon-incoming">↙</span>';

    el.innerHTML = `
      <div class="avatar-vector ${isRian ? "avatar-rian" : "avatar-budi"}">${avatarSvg}</div>
      <div class="call-item-info">
        <span class="call-item-name">${escapeHtml(call.contactName)}</span>
        <span class="call-item-meta">${arrow} ${escapeHtml(call.dateFormatted || "Hari ini")} (${escapeHtml(call.duration || "00:00")})</span>
      </div>
      <button class="icon-tool btn-call-back" title="Panggil Balik">
        ${call.type === "video" ? SVG_ICONS.video : SVG_ICONS.phone}
      </button>
    `;

    el.querySelector(".btn-call-back").onclick = () => startCall(call.contactId, call.type || "voice");
    container.appendChild(el);
  });
}

// Authentic WhatsApp / Material Ripple Effect Engine
function initRippleEffect() {
  document.addEventListener("pointerdown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;

    const rippleTarget = e.target.closest(
      ".ripple-surface, .nav-btn, .tool-btn, .btn-header-action, .icon-tool, .chip, .chat-item, .menu-item, .ctx-item, .attach-item, .btn-primary, .btn-secondary, .code-copy-btn, .code-toggle-btn, .code-card-expand-bar, .wa-read-more-inline, .btn-rec-cancel, .btn-rec-send, .btn-search-nav, .btn-search-close, .btn-scroll-bottom"
    );
    if (!rippleTarget) return;

    const rect = rippleTarget.getBoundingClientRect();
    const circle = document.createElement("span");
    const diameter = Math.max(rect.width, rect.height);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.className = "wa-ripple";

    const old = rippleTarget.querySelectorAll(".wa-ripple");
    old.forEach(r => r.remove());

    if (!rippleTarget.classList.contains("ripple-surface")) {
      rippleTarget.classList.add("ripple-surface");
    }

    rippleTarget.appendChild(circle);
    setTimeout(() => {
      circle.remove();
    }, 600);
  });
}

// =========================================================
// 16. EVENT LISTENERS INITIALIZATION
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  initRippleEffect();
  // Navigation Rail Tabs
  document.querySelectorAll(".nav-btn[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab === "terminal") {
        openTerminalModal();
        return;
      }
      appState.activeTab = tab;

      document.querySelectorAll(".nav-btn[data-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      document.getElementById("viewChats").style.display = tab === "chats" ? "flex" : "none";
      document.getElementById("viewStatus").style.display = tab === "status" ? "flex" : "none";
      document.getElementById("viewCalls").style.display = tab === "calls" ? "flex" : "none";

      if (tab === "status") {
        document.getElementById("badgeStatusDot").style.display = "none";
      }
    });
  });

  // Chat Item switching
  document.querySelectorAll(".chat-item").forEach(item => {
    item.addEventListener("click", () => {
      switchChat(item.dataset.chatId);
    });
  });

  // Mobile Back Button
  document.getElementById("btnBackMobile").addEventListener("click", () => {
    document.getElementById("chatMain").classList.remove("mobile-open");
  });

  // Natural Scroll Listener on #chatStream
  const stream = document.getElementById("chatStream");
  stream.addEventListener("scroll", () => {
    const distFromBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight;
    if (distFromBottom > 150) {
      appState.userHasScrolledUp = true;
      document.getElementById("btnScrollBottom").style.display = "flex";
    } else {
      appState.userHasScrolledUp = false;
      appState.unreadWhileScrolled = 0;
      document.getElementById("btnScrollBottom").style.display = "none";
      document.getElementById("scrollUnreadBadge").style.display = "none";
    }
  });

  // Floating Scroll to Bottom Button Click
  document.getElementById("btnScrollBottom").addEventListener("click", () => {
    appState.userHasScrolledUp = false;
    appState.unreadWhileScrolled = 0;
    document.getElementById("btnScrollBottom").style.display = "none";
    document.getElementById("scrollUnreadBadge").style.display = "none";
    scrollToBottom(true);
  });

  // Cancel Quoted Reply
  document.getElementById("btnCancelReply").addEventListener("click", cancelReplying);

  // Message Input Typing Event (Toggle Mic / Send buttons with Smooth Morphing)
  const messageInput = document.getElementById("messageInput");
  const btnMic = document.getElementById("btnMic");
  const btnSendMessage = document.getElementById("btnSendMessage");
  const sendMicWrap = document.getElementById("sendMicWrap");

  function updateInputButtonsState() {
    const hasText = messageInput.value.trim().length > 0 || appState.attachedFile !== null;
    if (sendMicWrap) {
      sendMicWrap.classList.toggle("has-text", hasText);
    } else {
      btnSendMessage.style.display = hasText ? "flex" : "none";
      btnMic.style.display = hasText ? "none" : "flex";
    }
  }

  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    const targetH = Math.min(Math.max(messageInput.scrollHeight, 40), 120);
    messageInput.style.height = `${targetH}px`;
    updateInputButtonsState();
  });
  updateInputButtonsState();

  // Enter to send, Shift+Enter for new line
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("chatInputForm").dispatchEvent(new Event("submit"));
    }
  });

  // Chat Input Form Submit
  document.getElementById("chatInputForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = messageInput.value;
    sendMessage(text);
    messageInput.value = "";
    messageInput.style.height = "auto";
    messageInput.dispatchEvent(new Event("input"));
  });

  // Voice Recording Mic Button Click
  btnMic.addEventListener("click", startVoiceRecording);
  document.getElementById("btnRecCancel").addEventListener("click", cancelVoiceRecording);
  document.getElementById("btnRecSend").addEventListener("click", sendVoiceRecording);

  // Emoji Drawer Toggle & Category Tabs
  document.getElementById("btnEmoji").addEventListener("click", (e) => {
    e.stopPropagation();
    const drawer = document.getElementById("emojiDrawer");
    const isClosed = drawer.style.display === "none" || !drawer.style.display;
    drawer.style.display = isClosed ? "block" : "none";
    if (isClosed) populateEmojiGrid("smileys");
    // Close other popups
    document.getElementById("attachPopupMenu").style.display = "none";
    document.getElementById("chatMenuDropdown").style.display = "none";
  });

  document.querySelectorAll(".emoji-tab-btn").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      document.querySelectorAll(".emoji-tab-btn").forEach(b => b.classList.remove("active"));
      tabBtn.classList.add("active");
      populateEmojiGrid(tabBtn.dataset.cat);
    });
  });

  // Attachment Menu Toggle
  document.getElementById("btnAttach").addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = document.getElementById("attachPopupMenu");
    const isClosed = menu.style.display === "none" || !menu.style.display;
    menu.style.display = isClosed ? "flex" : "none";
    document.getElementById("emojiDrawer").style.display = "none";
    document.getElementById("chatMenuDropdown").style.display = "none";
  });

  // Attachment Items
  document.getElementById("attachBtnImage").addEventListener("click", () => {
    document.getElementById("attachPopupMenu").style.display = "none";
    const picker = document.getElementById("filePicker");
    picker.accept = "image/*,video/*";
    picker.click();
  });

  document.getElementById("attachBtnDoc").addEventListener("click", () => {
    document.getElementById("attachPopupMenu").style.display = "none";
    const picker = document.getElementById("filePicker");
    picker.accept = "*/*";
    picker.click();
  });

  document.getElementById("attachBtnCode").addEventListener("click", () => {
    document.getElementById("attachPopupMenu").style.display = "none";
    document.getElementById("snippetModal").style.display = "flex";
  });

  // Snippet Modal buttons & inputs
  document.getElementById("btnCloseSnippetModal").addEventListener("click", () => {
    document.getElementById("snippetModal").style.display = "none";
  });
  document.getElementById("btnCancelSnippet").addEventListener("click", () => {
    document.getElementById("snippetModal").style.display = "none";
  });
  document.getElementById("btnSendSnippet").addEventListener("click", sendCodeSnippet);

  const snippetCodeEl = document.getElementById("snippetCode");
  const snippetLangEl = document.getElementById("snippetLanguage");
  const snippetFileEl = document.getElementById("snippetFilename");
  const snippetLineEl = document.getElementById("snippetLineCount");

  if (snippetCodeEl) {
    snippetCodeEl.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = snippetCodeEl.selectionStart;
        const end = snippetCodeEl.selectionEnd;
        snippetCodeEl.value = snippetCodeEl.value.substring(0, start) + "  " + snippetCodeEl.value.substring(end);
        snippetCodeEl.selectionStart = snippetCodeEl.selectionEnd = start + 2;
      }
    });

    snippetCodeEl.addEventListener("input", () => {
      const lines = snippetCodeEl.value.split("\n").length;
      if (snippetLineEl) snippetLineEl.textContent = `${lines} baris`;
    });
  }

  // When language changes, update filename extension
  if (snippetLangEl && snippetFileEl) {
    snippetLangEl.addEventListener("change", () => {
      const selectedOption = snippetLangEl.options[snippetLangEl.selectedIndex];
      const ext = selectedOption ? selectedOption.getAttribute("data-ext") : "js";
      const currentName = snippetFileEl.value.trim();
      const baseName = currentName.includes(".") ? currentName.substring(0, currentName.lastIndexOf(".")) : (currentName || "snippet");
      snippetFileEl.value = `${baseName}.${ext}`;
    });

    // When filename changes, sync language dropdown
    snippetFileEl.addEventListener("input", () => {
      const val = snippetFileEl.value.trim();
      if (val.includes(".")) {
        const ext = val.substring(val.lastIndexOf(".") + 1).toLowerCase();
        for (let i = 0; i < snippetLangEl.options.length; i++) {
          if (snippetLangEl.options[i].getAttribute("data-ext") === ext) {
            snippetLangEl.selectedIndex = i;
            break;
          }
        }
      }
    });
  }

  // File Picker Change
  document.getElementById("filePicker").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result.split(",")[1];
      const isImg = file.type.startsWith("image/");
      appState.attachedFile = {
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        base64,
        isImage: isImg
      };

      document.getElementById("attachmentName").textContent = file.name;
      document.getElementById("attachmentSize").textContent = `(${appState.attachedFile.size})`;
      document.getElementById("attachmentPreviewBar").style.display = "flex";
      messageInput.dispatchEvent(new Event("input"));
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("btnCancelAttachment").addEventListener("click", clearAttachmentPreview);

  // Header 3-Dots Menu Dropdown
  document.getElementById("btnChatMenu").addEventListener("click", (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById("chatMenuDropdown");
    const isClosed = dropdown.style.display === "none" || !dropdown.style.display;
    dropdown.style.display = isClosed ? "flex" : "none";
    document.getElementById("emojiDrawer").style.display = "none";
    document.getElementById("attachPopupMenu").style.display = "none";
  });

  document.getElementById("menuItemInfo").addEventListener("click", () => {
    document.getElementById("chatMenuDropdown").style.display = "none";
    openChatInfoModal();
  });

  document.getElementById("menuItemSearch").addEventListener("click", () => {
    document.getElementById("chatMenuDropdown").style.display = "none";
    openInchatSearch();
  });

  document.getElementById("menuItemSettings").addEventListener("click", () => {
    document.getElementById("chatMenuDropdown").style.display = "none";
    populateSettingsModal();
    document.getElementById("settingsModal").style.display = "flex";
  });

  document.getElementById("menuItemClear").addEventListener("click", () => {
    document.getElementById("chatMenuDropdown").style.display = "none";
    const name = CHAT_METADATA[appState.activeChat].title;
    if (confirm(`Bersihkan riwayat percakapan di "${name}"?`)) {
      fetch("/api/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: appState.activeChat })
      });
    }
  });

  // Chat Info Modal close buttons
  const chatInfoModal = document.getElementById("chatInfoModal");
  const hideChatInfoModal = () => {
    if (chatInfoModal) chatInfoModal.style.display = "none";
  };
  document.getElementById("btnCloseChatInfo")?.addEventListener("click", hideChatInfoModal);
  document.getElementById("btnOkChatInfo")?.addEventListener("click", hideChatInfoModal);
  chatInfoModal?.addEventListener("click", (e) => {
    if (e.target === chatInfoModal) {
      hideChatInfoModal();
    }
  });

  // In-Chat Search Bar Toggle & Handlers
  document.getElementById("btnToggleChatSearch").addEventListener("click", () => {
    const bar = document.getElementById("inchatSearchBar");
    if (bar.style.display === "none" || !bar.style.display) {
      openInchatSearch();
    } else {
      closeInchatSearch();
    }
  });

  document.getElementById("inputInchatSearch").addEventListener("input", (e) => {
    performInchatSearch(e.target.value);
  });

  document.getElementById("btnSearchNext").addEventListener("click", () => {
    const { matches } = appState.inchatSearch;
    if (!matches.length) return;
    appState.inchatSearch.currentIndex = (appState.inchatSearch.currentIndex + 1) % matches.length;
    highlightCurrentMatch(appState.inchatSearch.currentIndex);
  });

  document.getElementById("btnSearchPrev").addEventListener("click", () => {
    const { matches } = appState.inchatSearch;
    if (!matches.length) return;
    appState.inchatSearch.currentIndex = (appState.inchatSearch.currentIndex - 1 + matches.length) % matches.length;
    highlightCurrentMatch(appState.inchatSearch.currentIndex);
  });

  document.getElementById("btnCloseInchatSearch").addEventListener("click", closeInchatSearch);

  // Search Filter in Left Sidebar Chat List
  document.getElementById("inputSearchChats").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    document.getElementById("btnClearSearch").style.display = query ? "block" : "none";

    document.querySelectorAll(".chat-item").forEach(item => {
      const name = item.querySelector(".item-name").textContent.toLowerCase();
      const snippet = item.querySelector(".item-snippet").textContent.toLowerCase();
      item.style.display = (name.includes(query) || snippet.includes(query)) ? "flex" : "none";
    });
  });

  document.getElementById("btnClearSearch").addEventListener("click", () => {
    const input = document.getElementById("inputSearchChats");
    input.value = "";
    input.dispatchEvent(new Event("input"));
  });

  // Filter Chips in Sidebar
  document.querySelectorAll(".filter-chips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chips .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const f = chip.dataset.filter;

      document.querySelectorAll(".chat-item").forEach(item => {
        const id = item.dataset.chatId;
        if (f === "all") item.style.display = "flex";
        else if (f === "group") item.style.display = id === "group" ? "flex" : "none";
        else if (f === "direct") item.style.display = id !== "group" ? "flex" : "none";
        else if (f === "favorites") item.style.display = (id === "group" || id === "direct_budi") ? "flex" : "none";
        else if (f === "unread") {
          const hasUnread = (appState.unreads[id] || 0) > 0;
          item.style.display = hasUnread ? "flex" : "none";
        }
      });
    });
  });

  // Quick initiate Japri tool
  document.getElementById("btnInitiateJapri").addEventListener("click", initiateJapriPrompt);

  // Call triggers in Chat Header
  document.getElementById("btnStartVoiceCall").addEventListener("click", () => {
    const contact = appState.activeChat === "direct_rian" ? "rian" : "budi";
    startCall(contact, "voice");
  });

  document.getElementById("btnStartVideoCall").addEventListener("click", () => {
    const contact = appState.activeChat === "direct_rian" ? "rian" : "budi";
    startCall(contact, "video");
  });

  // Call triggers in Sidebar
  document.getElementById("btnQuickCallBudi").addEventListener("click", () => startCall("budi", "voice"));
  document.getElementById("btnQuickCallRian").addEventListener("click", () => startCall("rian", "voice"));

  // Call Talk Input Submit
  document.getElementById("btnCallTalkSend").addEventListener("click", () => {
    sendCallSpeech(document.getElementById("inputCallTalk").value);
  });
  document.getElementById("inputCallTalk").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendCallSpeech(e.target.value);
    }
  });

  // Call Screen Controls
  document.getElementById("btnCallEnd").addEventListener("click", endCall);
  document.getElementById("btnCallMute").addEventListener("click", (e) => {
    appState.callState.isMuted = !appState.callState.isMuted;
    e.currentTarget.classList.toggle("active", appState.callState.isMuted);
  });
  document.getElementById("btnCallSpeaker").addEventListener("click", (e) => {
    appState.callState.isSpeaker = !appState.callState.isSpeaker;
    e.currentTarget.classList.toggle("active", appState.callState.isSpeaker);
  });

  // Loop toggle in 3-dots menu (/start /stop)
  const btnLoopToggle = document.getElementById("btnLoopToggle");
  if (btnLoopToggle) {
    btnLoopToggle.addEventListener("click", () => {
      const menu = document.getElementById("chatMenuDropdown");
      if (menu) menu.style.display = "none";
      const action = appState.isRunning ? "stop" : "start";
      showToast(action === "stop" ? "Diskusi dihentikan" : "Diskusi otomatis dimulai");
      fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, chatId: appState.activeChat })
      }).catch(() => {});
    });
  }

  // Wakelock toggle
  document.getElementById("btnToggleWakelock").addEventListener("click", () => {
    document.getElementById("chatMenuDropdown").style.display = "none";
    const action = appState.wakelock ? "release" : "acquire";
    fetch("/api/wakelock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    }).catch(() => {});
  });

  // Status Story Viewer Navigation
  document.getElementById("storyTapPrev").addEventListener("click", () => {
    loadStorySlide(appState.storyViewer.index - 1);
  });
  document.getElementById("storyTapNext").addEventListener("click", () => {
    loadStorySlide(appState.storyViewer.index + 1);
  });
  document.getElementById("btnCloseStoryViewer").addEventListener("click", closeStoryViewer);
  document.getElementById("btnStoryDelete").addEventListener("click", deleteCurrentStory);
  document.getElementById("btnSendStoryReply").addEventListener("click", sendStoryReply);
  document.getElementById("inputStoryReply").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendStoryReply();
  });

  // Status Creation & Own Status Viewing
  document.getElementById("myStatusItem").addEventListener("click", () => {
    const userStatuses = appState.statuses.filter(s => s.author === "user");
    if (userStatuses.length > 0) {
      openStoryViewer("user", 0);
    } else {
      document.getElementById("createStatusModal").style.display = "flex";
    }
  });

  document.getElementById("btnPlusMyStatus").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("createStatusModal").style.display = "flex";
  });

  document.getElementById("btnOpenNewStatusModal").addEventListener("click", () => {
    document.getElementById("createStatusModal").style.display = "flex";
  });

  document.getElementById("btnCloseCreateStatus").addEventListener("click", () => {
    document.getElementById("createStatusModal").style.display = "none";
  });
  document.getElementById("btnCancelStatus").addEventListener("click", () => {
    document.getElementById("createStatusModal").style.display = "none";
  });

  // Status Gradient Options
  document.querySelectorAll(".color-options .color-dot").forEach(dot => {
    dot.addEventListener("click", () => {
      document.querySelectorAll(".color-options .color-dot").forEach(d => d.classList.remove("active"));
      dot.classList.add("active");
      document.getElementById("statusPreviewBox").style.background = dot.dataset.gradient;
    });
  });

  // Publish Status
  document.getElementById("btnPublishStatus").addEventListener("click", () => {
    const text = document.getElementById("inputStatusText").value.trim();
    if (!text) return;

    const activeDot = document.querySelector(".color-options .color-dot.active");
    const bgGradient = activeDot ? activeDot.dataset.gradient : "linear-gradient(135deg, #075e54 0%, #128c7e 100%)";

    fetch("/api/statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "text", text, bgGradient })
    }).then(() => {
      document.getElementById("inputStatusText").value = "";
      document.getElementById("createStatusModal").style.display = "none";
    }).catch(e => console.error(e));
  });

  // Theme Toggle (Dark / Light)
  document.getElementById("btnThemeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const isDark = root.getAttribute("data-theme") !== "light";
    root.setAttribute("data-theme", isDark ? "light" : "dark");
    document.querySelector(".icon-dark").style.display = isDark ? "none" : "block";
    document.querySelector(".icon-light").style.display = isDark ? "block" : "none";

    const hljsTheme = document.getElementById("hljsTheme");
    if (hljsTheme) {
      hljsTheme.href = isDark ? "vendor/highlight-light.min.css" : "vendor/highlight-dark.min.css";
    }
  });

  // Settings Modal
  const settingsModal = document.getElementById("settingsModal");
  const hideSettingsModal = () => {
    if (settingsModal) settingsModal.style.display = "none";
  };

  document.getElementById("btnSettings")?.addEventListener("click", () => {
    populateSettingsModal();
    if (settingsModal) settingsModal.style.display = "flex";
  });
  document.getElementById("btnCloseSettings")?.addEventListener("click", hideSettingsModal);
  document.getElementById("btnCancelSettings")?.addEventListener("click", hideSettingsModal);
  settingsModal?.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      hideSettingsModal();
    }
  });

  document.getElementById("btnSaveSettings").addEventListener("click", () => {
    const modelA = document.getElementById("selectModelA").value;
    const modelB = document.getElementById("selectModelB").value;
    const topic = document.getElementById("inputTopicSettings").value.trim();

    fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelA, modelB, topic })
    }).then(() => {
      document.getElementById("settingsModal").style.display = "none";
    });
  });

  document.getElementById("btnClearChatHistory").addEventListener("click", () => {
    const name = CHAT_METADATA[appState.activeChat].title;
    if (confirm(`Bersihkan riwayat obrolan di "${name}"?`)) {
      fetch("/api/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: appState.activeChat })
      }).then(() => {
        document.getElementById("settingsModal").style.display = "none";
      });
    }
  });

  // Padatkan Konteks & Memori Button in Settings Modal
  const btnCompactSettings = document.getElementById("btnCompactContextSettings");
  if (btnCompactSettings) {
    btnCompactSettings.addEventListener("click", async () => {
      const activeChat = appState.activeChat || "group";
      const btnText = document.getElementById("btnCompactContextText");
      const origText = btnText ? btnText.textContent : "Padatkan Konteks & Memori";

      btnCompactSettings.disabled = true;
      if (btnText) btnText.textContent = "Memadatkan Konteks...";

      try {
        const res = await fetch("/api/context/compress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: activeChat })
        });
        const data = await res.json();

        if (data.success) {
          playSentSound();
          showToast(`🧠 Konteks berhasil dipadatkan! (${data.compactedCount || 0} pesan diringkas)`);
          const badge = document.getElementById("memoryStatusBadge");
          if (badge) badge.textContent = "Dipadatkan ✓";
          const stat = document.getElementById("memoryInfoStat");
          if (stat) stat.textContent = "Memori Ringkas & Cepat";

          // Refresh chats
          fetchChats();
        } else {
          showToast(data.message || "Gagal memadatkan konteks.");
        }
      } catch (err) {
        showToast("Terjadi kesalahan memadatkan konteks.");
      } finally {
        btnCompactSettings.disabled = false;
        if (btnText) btnText.textContent = origText;
      }
    });
  }

  // Droide Workstation Switchers & Terminal Launcher
  document.getElementById("btnSwitchAlpine")?.addEventListener("click", () => switchWorkstation("alpine"));
  document.getElementById("btnSwitchUbuntu")?.addEventListener("click", () => switchWorkstation("ubuntu"));
  document.getElementById("btnOpenTerminalOverlay")?.addEventListener("click", () => {
    if (window.AndroidBridge && window.AndroidBridge.toggleTerminal) {
      window.AndroidBridge.toggleTerminal("alpine");
    } else {
      showToast("💻 Terminal Overlay aktif dalam mode Native Android.");
    }
  });
  document.getElementById("btnCheckKadb")?.addEventListener("click", () => {
    if (window.AndroidBridge && window.AndroidBridge.getKadbStatus) {
      try {
        const status = JSON.parse(window.AndroidBridge.getKadbStatus());
        const text = status.connected 
          ? `🔌 KADB Terhubung di port ${status.port}!` 
          : `⚠️ KADB belum terhubung (Port: ${status.port}). Aktifkan Wireless Debugging di Pengaturan Pengembang Android.`;
        showToast(text);
        const kadbEl = document.getElementById("kadbStatusText");
        if (kadbEl) kadbEl.textContent = status.connected ? `Terhubung (Port ${status.port})` : "Wireless Debugging Belum Aktif";
      } catch (e) {
        showToast("Droide KADB aktif.");
      }
    } else {
      showToast("Droide KADB tersedia pada aplikasi Android native (Android 11+).");
    }
  });

  // Dedicated Terminal Buttons (Header, Nav Rail, Dropdown Menu)
  document.getElementById("btnHeaderTerminal")?.addEventListener("click", openTerminalModal);
  document.getElementById("tabTerminal")?.addEventListener("click", openTerminalModal);
  document.getElementById("menuItemTerminal")?.addEventListener("click", () => {
    const dropdown = document.getElementById("chatMenuDropdown");
    if (dropdown) dropdown.style.display = "none";
    openTerminalModal();
  });
  document.getElementById("btnCloseTerminalModal")?.addEventListener("click", closeTerminalModal);
  document.getElementById("terminalModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("terminalModal")) closeTerminalModal();
  });
  document.getElementById("btnTerminalClearOutput")?.addEventListener("click", () => {
    const screen = document.getElementById("terminalScreen");
    if (screen) screen.textContent = "=== Terminal Workstation Cleared ===\n$ ";
  });
  document.getElementById("btnTerminalToggleWs")?.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/workstation/status");
      const data = await res.json();
      const next = data.active === "ubuntu" ? "alpine" : "ubuntu";
      await switchWorkstation(next);
      updateTerminalWorkstationHeader();
    } catch (_) {}
  });
  document.querySelectorAll(".btn-quick-term").forEach(btn => {
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.cmd;
      if (cmd) executeTerminalCommand(cmd);
    });
  });
  document.getElementById("btnTerminalSubmit")?.addEventListener("click", () => {
    const input = document.getElementById("inputTerminalCmd");
    if (input) executeTerminalCommand(input.value);
  });
  document.getElementById("inputTerminalCmd")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeTerminalCommand(e.target.value);
    }
  });

  // Context Menu Item Actions
  document.getElementById("ctxReply")?.addEventListener("click", () => {
    if (activeContextMsg) {
      setReplyingTo(activeContextMsg);
    }
    closeBubbleContextMenu();
  });

  document.getElementById("ctxCopy")?.addEventListener("click", () => {
    if (activeContextMsg) {
      const text = activeContextMsg.text || (activeContextMsg.file ? activeContextMsg.file.name : "");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      showToast("Teks disalin ke papan klip");
    }
    closeBubbleContextMenu();
  });

  document.getElementById("ctxStar")?.addEventListener("click", () => {
    showToast("Pesan dibintangi");
    closeBubbleContextMenu();
  });

  document.getElementById("ctxDelete")?.addEventListener("click", () => {
    if (activeContextMsg) {
      deleteMessageLocally(activeContextMsg.id);
      showToast("Pesan dihapus");
    }
    closeBubbleContextMenu();
  });

  // Pinned Banner click opens settings modal
  const bannerEl = document.getElementById("chatTopicBanner");
  if (bannerEl) {
    bannerEl.addEventListener("click", () => {
      populateSettingsModal();
      document.getElementById("settingsModal").style.display = "flex";
    });
  }

  // Sidebar Menu button opens settings modal
  const btnSidebarMenu = document.getElementById("btnSidebarMenu");
  if (btnSidebarMenu) {
    btnSidebarMenu.addEventListener("click", () => {
      populateSettingsModal();
      document.getElementById("settingsModal").style.display = "flex";
    });
  }

  // User Profile badge opens Info dialog
  const userProfileBadge = document.querySelector(".user-profile-badge");
  if (userProfileBadge) {
    userProfileBadge.addEventListener("click", () => {
      openChatInfoModal();
    });
  }

  // Dismiss context menu on stream scroll
  const chatStreamEl = document.getElementById("chatStream");
  if (chatStreamEl) {
    chatStreamEl.addEventListener("scroll", () => {
      closeBubbleContextMenu();
    }, { passive: true });
  }

  // Close Popups on Outside Click
  document.addEventListener("click", (e) => {
    const emojiDrawer = document.getElementById("emojiDrawer");
    const attachMenu = document.getElementById("attachPopupMenu");
    const chatMenu = document.getElementById("chatMenuDropdown");
    const contextMenu = document.getElementById("bubbleContextMenu");

    if (emojiDrawer && !emojiDrawer.contains(e.target) && e.target.id !== "btnEmoji" && !e.target.closest("#btnEmoji")) {
      emojiDrawer.style.display = "none";
    }
    if (attachMenu && !attachMenu.contains(e.target) && e.target.id !== "btnAttach" && !e.target.closest("#btnAttach")) {
      attachMenu.style.display = "none";
    }
    if (chatMenu && !chatMenu.contains(e.target) && e.target.id !== "btnChatMenu" && !e.target.closest("#btnChatMenu")) {
      chatMenu.style.display = "none";
    }
    if (contextMenu && contextMenu.style.display !== "none" && !contextMenu.contains(e.target) && !e.target.closest(".bubble-action-trigger")) {
      closeBubbleContextMenu();
    }
  });

  // Global Escape key handler to close any active modal
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const settingsModal = document.getElementById("settingsModal");
      if (settingsModal && settingsModal.style.display === "flex") {
        settingsModal.style.display = "none";
      }
      const addModal = document.getElementById("addProfileModal");
      if (addModal && addModal.style.display === "flex") {
        const btnCancelAddProfile = document.getElementById("btnCancelAddProfile");
        if (btnCancelAddProfile) btnCancelAddProfile.click();
        else addModal.style.display = "none";
      }
      const chatInfoModal = document.getElementById("chatInfoModal");
      if (chatInfoModal && chatInfoModal.style.display === "flex") {
        chatInfoModal.style.display = "none";
      }
    }
  });

  hydrateProviderLogos();
  setupAuthVaultListeners();

  // Connect Realtime SSE Stream
  connectSSE();
});

function populateSettingsModal() {
  const selA = document.getElementById("selectModelA");
  const selB = document.getElementById("selectModelB");
  selA.innerHTML = "";
  selB.innerHTML = "";

  const groups = {};
  appState.availableModels.forEach(m => {
    const grpName = m.group || (
      (m.id.startsWith("codex/") || m.engine === "codex") ? "OpenAI Codex Models" :
      ((m.id.startsWith("opencode/") || m.engine === "opencode") ? "Opencode Community Models" : "Antigravity Models")
    );
    if (!groups[grpName]) groups[grpName] = [];
    groups[grpName].push(m);
  });

  Object.entries(groups).forEach(([grpName, models]) => {
    const optGroupA = document.createElement("optgroup");
    optGroupA.label = `--- ${grpName} ---`;
    const optGroupB = document.createElement("optgroup");
    optGroupB.label = `--- ${grpName} ---`;

    models.forEach(m => {
      const optA = document.createElement("option");
      optA.value = m.id;
      optA.textContent = m.name;
      if (m.id === appState.modelA) optA.selected = true;
      optGroupA.appendChild(optA);

      const optB = document.createElement("option");
      optB.value = m.id;
      optB.textContent = m.name;
      if (m.id === appState.modelB) optB.selected = true;
      optGroupB.appendChild(optB);
    });

    selA.appendChild(optGroupA);
    selB.appendChild(optGroupB);
  });

  document.getElementById("inputTopicSettings").value = appState.currentTopic;

  // Live provider chip (real logo) under each model selector
  [selA, selB].forEach(sel => {
    let chip = sel.parentElement.querySelector(".model-provider-chip");
    if (!chip) {
      chip = document.createElement("div");
      chip.className = "model-provider-chip";
      sel.insertAdjacentElement("afterend", chip);
      sel.addEventListener("change", () => renderProviderChip(sel, chip));
    }
    renderProviderChip(sel, chip);
  });
  // Update Context Status in Settings Modal
  const statusBadge = document.getElementById("memoryStatusBadge");
  const infoStat = document.getElementById("memoryInfoStat");
  const activeChat = appState.activeChat || "group";
  const chatName = CHAT_METADATA[activeChat]?.title || "Obrolan";

  fetch("/api/context/status")
    .then(r => r.json())
    .then(data => {
      const isCompacted = data.contextMemory && !!data.contextMemory[activeChat];
      if (statusBadge) {
        statusBadge.textContent = isCompacted ? "Sudah Dipadatkan ✓" : "Fokus Topik Aktif";
      }
      if (infoStat) {
        const count = data.chatCounts ? data.chatCounts[activeChat] : (appState.chats[activeChat]?.length || 0);
        infoStat.textContent = `${count} pesan di ${chatName}`;
      }
    })
    .catch(() => {});

  // Load and render Auth Vault in Settings
  loadAuthVault();

  // Load and render Droide Workstation & KADB status
  loadWorkstationStatus();
}

async function loadWorkstationStatus() {
  try {
    const res = await fetch("/api/workstation/status");
    if (!res.ok) return;
    const data = await res.json();
    const badge = document.getElementById("workstationStatusBadge");
    if (badge) {
      badge.textContent = `${(data.active || "alpine").toUpperCase()} Aktif`;
      badge.style.background = data.active === "ubuntu" ? "#ea580c" : "#00a884";
    }
    const btnAlpine = document.getElementById("btnSwitchAlpine");
    const btnUbuntu = document.getElementById("btnSwitchUbuntu");
    if (btnAlpine && btnUbuntu) {
      btnAlpine.style.border = data.active === "alpine" ? "2px solid #00a884" : "1px solid rgba(255,255,255,0.1)";
      btnUbuntu.style.border = data.active === "ubuntu" ? "2px solid #ea580c" : "1px solid rgba(255,255,255,0.1)";
    }
    if (window.AndroidBridge && window.AndroidBridge.getKadbStatus) {
      try {
        const kadb = JSON.parse(window.AndroidBridge.getKadbStatus());
        const kadbEl = document.getElementById("kadbStatusText");
        if (kadbEl) kadbEl.textContent = kadb.connected ? `Terhubung (Port ${kadb.port})` : `Siap di Port ${kadb.port}`;
      } catch (_) {}
    }
  } catch (_) {}
}

async function switchWorkstation(target) {
  try {
    showToast(`Beralih ke workstation ${target.toUpperCase()}...`);
    const res = await fetch("/api/workstation/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`🚀 Berhasil beralih ke workstation ${data.active.toUpperCase()}`);
      loadWorkstationStatus();
    } else {
      showToast(data.error || "Gagal beralih workstation");
    }
  } catch (err) {
    showToast("Error beralih workstation: " + err.message);
  }
}

function openTerminalModal() {
  if (window.AndroidBridge && window.AndroidBridge.toggleTerminal) {
    window.AndroidBridge.toggleTerminal("alpine");
    return;
  }

  const modal = document.getElementById("terminalModal");
  if (!modal) return;

  modal.style.display = "flex";
  updateTerminalWorkstationHeader();

  const screen = document.getElementById("terminalScreen");
  const input = document.getElementById("inputTerminalCmd");
  const submit = document.getElementById("btnTerminalSubmit");

  if (screen) {
    screen.textContent = "Terminal native tersedia di aplikasi Android.\nRaw shell via HTTP dinonaktifkan di v2 untuk keamanan.\n";
  }
  if (input) {
    input.value = "";
    input.disabled = true;
    input.placeholder = "Gunakan terminal native Android";
  }
  if (submit) submit.disabled = true;
  document.querySelectorAll(".btn-quick-term").forEach(btn => { btn.disabled = true; });
}

function closeTerminalModal() {
  const modal = document.getElementById("terminalModal");
  if (modal) modal.style.display = "none";
}

async function updateTerminalWorkstationHeader() {
  try {
    const res = await fetch("/api/workstation/status");
    if (!res.ok) return;
    const data = await res.json();
    const active = (data.active || "alpine").toUpperCase();
    const badge = document.getElementById("terminalModalBadge");
    const title = document.getElementById("terminalModalTitle");
    if (badge) {
      badge.textContent = active;
      badge.style.background = active === "UBUNTU" ? "#ea580c" : "#005c4b";
      badge.style.color = active === "UBUNTU" ? "#ffffff" : "#25d366";
    }
    if (title) {
      title.textContent = `Terminal IDE Console (${active})`;
    }
  } catch (_) {}
}

async function executeTerminalCommand(cmd) {
  cmd = (cmd || "").trim();
  if (!cmd) return;

  if (window.AndroidBridge && window.AndroidBridge.toggleTerminal) {
    window.AndroidBridge.toggleTerminal("alpine");
    return;
  }

  const screen = document.getElementById("terminalScreen");
  if (screen) {
    screen.textContent += "\nTerminal command execution via HTTP dinonaktifkan di v2. Gunakan terminal native Android.\n";
    screen.scrollTop = screen.scrollHeight;
  }
}

function renderProviderChip(sel, chip) {
  const provider = getModelProvider(sel.value);
  const meta = PROVIDER_META[provider];
  chip.innerHTML = `<span class="chip-logo ${meta.bg}">${providerLogoHtml(provider)}</span><span>${meta.name}</span><span class="chip-sub">· ${meta.sub}</span>`;
}

function loadAuthVault() {
  fetch("/api/auth/vault")
    .then(r => r.json())
    .then(data => {
      appState.authVault = data;
      renderAuthVaultUI();
    })
    .catch(err => {
      console.warn("Failed to load auth vault:", err);
    });
}

function renderAuthVaultUI() {
  const container = document.getElementById("vaultProfileList");
  if (!container) return;

  const currentEngine = "codex";
  const allProfiles = (appState.authVault && appState.authVault.profiles) || [];
  const profiles = allProfiles.filter(p => p.engine === currentEngine);
  const activeId = appState.authVault && appState.authVault.active && appState.authVault.active[currentEngine];

  const bannerCodex = document.getElementById("bannerCodexStatus");
  if (bannerCodex && appState.authVault) {
    const codexActiveId = appState.authVault.active?.codex;
    const codexProf = allProfiles.find(p => p.id === codexActiveId);
    const codexLabel = codexProf ? (codexProf.email || codexProf.alias) : "Belum ada akun";

    bannerCodex.innerHTML = `<span class="banner-item">${providerLogoHtml("openai")} OpenAI: <strong style="color: #34d399;" title="${escapeHtml(codexLabel)}">${escapeHtml(codexLabel)}</strong></span>`;
  }

  if (!profiles.length) {
    container.innerHTML = `
      <div class="vault-empty-state">
        Belum ada profil akun untuk engine ini.<br>
        Klik <strong>+ Tambah Akun</strong> di atas untuk menambahkan akun baru.
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  profiles.forEach(p => {
    const isActive = p.id === activeId;
    const avatarBadgeClass = "badge-codex-avatar";
    const avatarText = providerLogoHtml("openai");

    const card = document.createElement("div");
    card.className = `vault-profile-card ${isActive ? "active-profile" : ""}`;
    card.id = `profileCard-${p.id}`;

    card.innerHTML = `
      <div class="profile-card-left">
        <div class="profile-avatar-badge ${avatarBadgeClass}">
          ${avatarText}
        </div>
        <div class="profile-meta">
          <div class="profile-alias-row">
            <span class="profile-alias-text" title="${escapeHtml(p.alias || '')}">${escapeHtml(p.alias || '')}</span>
            ${isActive ? `<span class="profile-active-tag">● Aktif</span>` : ""}
          </div>
          <div class="profile-sub-text" title="${escapeHtml(p.masked || p.email || '')}">
            ${p.email ? `${escapeHtml(p.email)} · ` : ""}${escapeHtml(p.masked || "")}
          </div>
        </div>
      </div>
      <div class="profile-card-actions">
        ${!isActive ? `
          <button type="button" class="btn-use-profile" data-profile-id="${p.id}" title="Gunakan akun ini">
            Gunakan Akun Ini
          </button>
        ` : ""}
        ${profiles.length > 1 && !isActive ? `
          <button type="button" class="btn-delete-profile" data-profile-id="${p.id}" title="Hapus akun ini dari vault">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        ` : ""}
      </div>
    `;

    // Click handler for "Gunakan Akun Ini"
    const useBtn = card.querySelector(".btn-use-profile");
    if (useBtn) {
      useBtn.addEventListener("click", () => {
        useBtn.disabled = true;
        useBtn.textContent = "Mengaktifkan...";
        fetch("/api/auth/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ engine: p.engine, profileId: p.id })
        })
          .then(r => r.json())
          .then(res => {
            if (res.success) {
              appState.authVault = res.vault;
              playSentSound();
              showToast(`✅ Berhasil beralih ke: ${p.alias}`);
              renderAuthVaultUI();
            } else {
              showToast("Gagal beralih akun: " + (res.error || ""));
              useBtn.disabled = false;
              useBtn.textContent = "Gunakan Akun Ini";
            }
          })
          .catch(() => {
            showToast("Terjadi kesalahan beralih akun");
            useBtn.disabled = false;
            useBtn.textContent = "Gunakan Akun Ini";
          });
      });
    }

    // Click handler for Delete
    const delBtn = card.querySelector(".btn-delete-profile");
    if (delBtn) {
      delBtn.addEventListener("click", () => {
        if (!confirm(`Hapus akun "${p.alias}" dari vault?`)) return;
        fetch("/api/auth/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: p.id })
        })
          .then(r => r.json())
          .then(res => {
            if (res.success) {
              appState.authVault = res.vault;
              showToast("Akun dihapus dari vault");
              renderAuthVaultUI();
            } else {
              showToast("Gagal menghapus: " + (res.error || ""));
            }
          })
          .catch(() => showToast("Gagal menghapus akun"));
      });
    }

    container.appendChild(card);
  });
}

let activeCodexLoginSession = null;
let codexPollTimer = null;
let activeGoogleLoginSession = null;
let googlePollTimer = null;

function setupAuthVaultListeners() {
  const tabAgy = document.getElementById("tabVaultAgy");
  const tabCodex = document.getElementById("tabVaultCodex");
  // Antigravity integration is intentionally hidden because current Google
  // Terms prohibit accessing the service through third-party products.
  if (tabAgy) tabAgy.style.display = "none";
  if (tabCodex) {
    tabCodex.classList.add("active");
    appState.currentVaultTab = "codex";
  }
  if (tabAgy && tabCodex) {
    tabAgy.addEventListener("click", () => {
      appState.currentVaultTab = "antigravity";
      tabAgy.classList.add("active");
      tabCodex.classList.remove("active");
      renderAuthVaultUI();
    });
    tabCodex.addEventListener("click", () => {
      appState.currentVaultTab = "codex";
      tabCodex.classList.add("active");
      tabAgy.classList.remove("active");
      renderAuthVaultUI();
    });
  }

  const btnOpenModal = document.getElementById("btnOpenAddProfileModal");
  const addModal = document.getElementById("addProfileModal");
  const btnCloseModal = document.getElementById("btnCloseAddProfile");
  const btnCancelModal = document.getElementById("btnCancelAddProfile");

  // Selection choices
  const choiceAgy = document.getElementById("choiceAgy");
  const choiceCodex = document.getElementById("choiceCodex");
  const sectionGoogle = document.getElementById("sectionGoogleAuth");
  const sectionCodex = document.getElementById("sectionCodexAuth");
  const inputAlias = document.getElementById("inputNewProfileAlias");
  if (choiceAgy) choiceAgy.style.display = "none";
  if (sectionGoogle) sectionGoogle.style.display = "none";
  if (choiceCodex) choiceCodex.classList.add("selected");

  // Google Elements
  const btnStartGoogle = document.getElementById("btnStartGoogleLogin");
  const googleIdle = document.getElementById("googleIdleState");
  const googleActive = document.getElementById("googleActiveState");
  const btnReopenGoogle = document.getElementById("btnReopenGooglePopup");
  const btnCancelGoogle = document.getElementById("btnCancelGoogleLogin");
  const toggleGoogleFallback = document.getElementById("toggleGoogleFallback");
  const bodyGoogleFallback = document.getElementById("bodyGoogleFallback");
  const chevronGoogleFallback = document.getElementById("chevronGoogleFallback");
  const inputGoogleManualCode = document.getElementById("inputGoogleManualCode");
  const btnSubmitGoogleManualCode = document.getElementById("btnSubmitGoogleManualCode");

  // Codex Elements
  const btnStartCodex = document.getElementById("btnStartCodexLogin");
  const codexIdle = document.getElementById("codexIdleState");
  const codexActive = document.getElementById("codexActiveState");
  const codexCodeDisplay = document.getElementById("codexDeviceCodeDisplay");
  const btnCopyCodexCode = document.getElementById("btnCopyCodexCode");
  const copyCodexCodeLabel = document.getElementById("copyCodexCodeLabel");
  const btnOpenCodexUrl = document.getElementById("btnOpenCodexAuthUrl");
  const btnCancelCodex = document.getElementById("btnCancelCodexLogin");

  // Success Box
  const loginSuccessBox = document.getElementById("loginSuccessBox");
  const loginSuccessSubtitle = document.getElementById("loginSuccessSubtitle");

  let selectedEngine = "codex";
  let googleAuthWindow = null;

  function setEngineSelection(engine) {
    selectedEngine = engine;
    if (engine === "antigravity") {
      choiceAgy?.classList.add("selected");
      choiceCodex?.classList.remove("selected");
      if (sectionGoogle) sectionGoogle.style.display = "block";
      if (sectionCodex) sectionCodex.style.display = "none";
    } else {
      choiceCodex?.classList.add("selected");
      choiceAgy?.classList.remove("selected");
      if (sectionCodex) sectionCodex.style.display = "block";
      if (sectionGoogle) sectionGoogle.style.display = "none";
    }
  }

  choiceAgy?.addEventListener("click", () => setEngineSelection("antigravity"));
  choiceCodex?.addEventListener("click", () => setEngineSelection("codex"));

  // Open modal
  btnOpenModal?.addEventListener("click", () => {
    if (loginSuccessBox) loginSuccessBox.style.display = "none";
    if (googleIdle) googleIdle.style.display = "block";
    if (googleActive) googleActive.style.display = "none";
    if (codexIdle) codexIdle.style.display = "block";
    if (codexActive) codexActive.style.display = "none";
    if (inputAlias) inputAlias.value = "";
    if (inputGoogleManualCode) inputGoogleManualCode.value = "";
    if (bodyGoogleFallback) bodyGoogleFallback.style.display = "none";

    const defaultTab = appState.currentVaultTab || "codex";
    setEngineSelection(defaultTab);

    if (addModal) addModal.style.display = "flex";
  });

  const stopAllLogins = () => {
    if (codexPollTimer) { clearInterval(codexPollTimer); codexPollTimer = null; }
    if (googlePollTimer) { clearInterval(googlePollTimer); googlePollTimer = null; }

    if (activeCodexLoginSession) {
      fetch("/api/auth/codex/cancel-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: activeCodexLoginSession })
      }).catch(() => {});
      activeCodexLoginSession = null;
    }
    activeGoogleLoginSession = null;
    if (googleAuthWindow && !googleAuthWindow.closed) {
      try { googleAuthWindow.close(); } catch {}
    }
    googleAuthWindow = null;
  };

  const closeModal = () => {
    stopAllLogins();
    if (addModal) addModal.style.display = "none";
  };

  btnCloseModal?.addEventListener("click", closeModal);
  btnCancelModal?.addEventListener("click", closeModal);
  addModal?.addEventListener("click", (e) => {
    if (e.target === addModal) {
      closeModal();
    }
  });

  function handleLoginSuccess(profile, engine) {
    stopAllLogins();
    if (sectionGoogle) sectionGoogle.style.display = "none";
    if (sectionCodex) sectionCodex.style.display = "none";
    if (loginSuccessBox) {
      loginSuccessBox.style.display = "block";
      if (loginSuccessSubtitle) {
        loginSuccessSubtitle.textContent = `Akun "${profile.alias || profile.email}" berhasil terhubung dan langsung aktif!`;
      }
    }
    playSentSound();
    showToast(`✅ Berhasil terhubung ke: ${profile.alias || profile.email}`);

    appState.currentVaultTab = engine;
    if (tabAgy && tabCodex) {
      if (engine === "antigravity") {
        tabAgy.classList.add("active");
        tabCodex.classList.remove("active");
      } else {
        tabCodex.classList.add("active");
        tabAgy.classList.remove("active");
      }
    }
    renderAuthVaultUI();

    setTimeout(() => {
      closeModal();
    }, 1800);
  }

  // --- GOOGLE AUTH HANDLERS ---
  btnStartGoogle?.addEventListener("click", () => {
    const alias = (inputAlias ? inputAlias.value : "").trim();
    btnStartGoogle.disabled = true;

    fetch("/api/auth/google/start-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias })
    })
      .then(r => r.json())
      .then(data => {
        btnStartGoogle.disabled = false;
        if (!data.success) {
          showToast("Gagal memulai Google login: " + (data.error || ""));
          return;
        }

        activeGoogleLoginSession = data.stateId;
        if (googleIdle) googleIdle.style.display = "none";
        if (googleActive) googleActive.style.display = "block";

        const width = 560;
        const height = 680;
        const left = Math.max(0, (window.screen.width - width) / 2);
        const top = Math.max(0, (window.screen.height - height) / 2);
        googleAuthWindow = window.open(
          data.authUrl,
          "googleLoginWin",
          `width=${width},height=${height},top=${top},left=${left},status=no,toolbar=no,menubar=no`
        );

        if (googlePollTimer) clearInterval(googlePollTimer);
        googlePollTimer = setInterval(() => {
          if (!activeGoogleLoginSession) return;
          fetch(`/api/auth/google/check-login?stateId=${encodeURIComponent(activeGoogleLoginSession)}`)
            .then(r => r.json())
            .then(res => {
              if (res.status === "success" && res.profile) {
                handleLoginSuccess(res.profile, "antigravity");
              } else if (res.status === "failed") {
                showToast("Login Google gagal: " + (res.error || ""));
                stopAllLogins();
                if (googleIdle) googleIdle.style.display = "block";
                if (googleActive) googleActive.style.display = "none";
              }
            })
            .catch(() => {});
        }, 2000);
      })
      .catch(() => {
        btnStartGoogle.disabled = false;
        showToast("Kesalahan koneksi saat memulai login Google");
      });
  });

  btnReopenGoogle?.addEventListener("click", () => {
    if (!activeGoogleLoginSession) return;
    const alias = (inputAlias ? inputAlias.value : "").trim();
    fetch("/api/auth/google/start-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.authUrl) {
          window.open(data.authUrl, "_blank");
        }
      });
  });

  btnCancelGoogle?.addEventListener("click", () => {
    stopAllLogins();
    if (googleIdle) googleIdle.style.display = "block";
    if (googleActive) googleActive.style.display = "none";
  });

  toggleGoogleFallback?.addEventListener("click", () => {
    if (!bodyGoogleFallback) return;
    const isHidden = bodyGoogleFallback.style.display === "none";
    bodyGoogleFallback.style.display = isHidden ? "block" : "none";
    if (chevronGoogleFallback) {
      chevronGoogleFallback.textContent = isHidden ? "▲" : "▼";
    }
  });

  btnSubmitGoogleManualCode?.addEventListener("click", () => {
    const rawVal = (inputGoogleManualCode ? inputGoogleManualCode.value : "").trim();
    if (!rawVal) {
      showToast("Silakan masukkan URL callback atau kode otorisasi");
      return;
    }
    btnSubmitGoogleManualCode.disabled = true;
    btnSubmitGoogleManualCode.textContent = "Memverifikasi...";

    fetch("/api/auth/google/exchange-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: rawVal,
        stateId: activeGoogleLoginSession
      })
    })
      .then(r => r.json())
      .then(res => {
        btnSubmitGoogleManualCode.disabled = false;
        btnSubmitGoogleManualCode.textContent = "Verifikasi Kode";
        if (res.success && res.profile) {
          handleLoginSuccess(res.profile, "antigravity");
        } else {
          showToast("Gagal verifikasi kode: " + (res.error || ""));
        }
      })
      .catch(() => {
        btnSubmitGoogleManualCode.disabled = false;
        btnSubmitGoogleManualCode.textContent = "Verifikasi Kode";
        showToast("Terjadi kesalahan saat memverifikasi kode");
      });
  });

  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "google_login_success") {
      if (activeGoogleLoginSession) {
        fetch(`/api/auth/google/check-login?stateId=${encodeURIComponent(activeGoogleLoginSession)}`)
          .then(r => r.json())
          .then(res => {
            if (res.status === "success" && res.profile) {
              handleLoginSuccess(res.profile, "antigravity");
            }
          });
      }
    }
  });

  // --- CODEX AUTH HANDLERS ---
  btnStartCodex?.addEventListener("click", () => {
    const alias = (inputAlias ? inputAlias.value : "").trim();
    btnStartCodex.disabled = true;
    btnStartCodex.textContent = "Meminta kode otorisasi...";

    fetch("/api/auth/codex/start-device-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias })
    })
      .then(r => r.json())
      .then(data => {
        btnStartCodex.disabled = false;
        btnStartCodex.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#fff" d="M20.5 10.5c-.3-1.3-1-2.4-2-3.2.1-.8 0-1.6-.3-2.3-.5-1.2-1.5-2.1-2.7-2.5-1-.3-2.1-.2-3.1.3-.8-.7-1.9-1.1-3-1.1-1.6 0-3.1.8-4 2.1-.9.1-1.7.5-2.4 1.1-.9.9-1.4 2.1-1.4 3.4 0 .4.1.8.2 1.2-1 .7-1.7 1.8-1.9 3-.3 1.3 0 2.6.7 3.7.1.8.5 1.5 1 2.2.9 1.1 2.2 1.8 3.6 2 .4.8 1.1 1.5 1.9 1.9 1.2.6 2.6.7 3.9.2.7.7 1.7 1.1 2.7 1.1 1.6 0 3.1-.8 4-2.1.8-.1 1.6-.5 2.3-1.1.9-.9 1.4-2.1 1.4-3.4 0-.4-.1-.8-.2-1.2 1-.7 1.7-1.8 1.9-3 .3-1.4 0-2.7-.8-3.7z"/>
          </svg>
          <span>Mulai Login OpenAI (Device Auth)</span>
        `;
        if (!data.success) {
          showToast("Gagal memulai Codex login: " + (data.error || ""));
          return;
        }

        activeCodexLoginSession = data.loginId;
        if (codexCodeDisplay) codexCodeDisplay.textContent = data.deviceCode || "----";
        if (btnOpenCodexUrl && data.authUrl) btnOpenCodexUrl.href = data.authUrl;

        if (codexIdle) codexIdle.style.display = "none";
        if (codexActive) codexActive.style.display = "block";

        if (data.deviceCode && navigator.clipboard) {
          navigator.clipboard.writeText(data.deviceCode).catch(() => {});
        }

        if (codexPollTimer) clearInterval(codexPollTimer);
        codexPollTimer = setInterval(() => {
          if (!activeCodexLoginSession) return;
          fetch(`/api/auth/codex/check-login?loginId=${encodeURIComponent(activeCodexLoginSession)}`)
            .then(r => r.json())
            .then(res => {
              if (res.status === "success" && res.profile) {
                handleLoginSuccess(res.profile, "codex");
              } else if (res.status === "failed") {
                showToast("Login OpenAI dibatalkan atau gagal: " + (res.error || ""));
                stopAllLogins();
                if (codexIdle) codexIdle.style.display = "block";
                if (codexActive) codexActive.style.display = "none";
              }
            })
            .catch(() => {});
        }, 2000);
      })
      .catch(() => {
        btnStartCodex.disabled = false;
        btnStartCodex.textContent = "Mulai Login OpenAI (Device Auth)";
        showToast("Terjadi kesalahan saat memulai sesi OpenAI login");
      });
  });

  btnCopyCodexCode?.addEventListener("click", () => {
    const code = codexCodeDisplay ? codexCodeDisplay.textContent.trim() : "";
    if (code && code !== "MEMUAT..." && code !== "----") {
      navigator.clipboard.writeText(code).then(() => {
        if (copyCodexCodeLabel) copyCodexCodeLabel.textContent = "Tersalin! ✓";
        showToast("Kode otorisasi tersalin ke papan klip: " + code);
        setTimeout(() => {
          if (copyCodexCodeLabel) copyCodexCodeLabel.textContent = "Salin Kode";
        }, 2000);
      });
    }
  });

  btnCancelCodex?.addEventListener("click", () => {
    stopAllLogins();
    if (codexIdle) codexIdle.style.display = "block";
    if (codexActive) codexActive.style.display = "none";
  });
}

