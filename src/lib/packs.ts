// Library: 40 subject presets in 8 style groups. Each preset = a full look (fonts, palette, layout mix) + its default caption template + subject icon.
// Locked UGENTIC rules kept: real fonts, flat colours (no glows / purple-blue gradients), strong ease-out, staggered reveals.
import type { GroupId, MotifId } from './looks';

export type LayoutKind = 'full' | 'punch' | 'split' | 'card' | 'circle' | 'behind' | 'broll' | 'arch' | 'polaroid' | 'band' | 'duotone' | 'frame' | 'sticker';
export type CaptionStyleId = 'box' | 'pop' | 'karaoke' | 'marker' | 'one' | 'ticker' | 'outline' | 'stack' | 'underline' | 'minimal' | 'frosted' | 'serif';

export interface Pack {
  id: string;
  /** Style group: shared layouts, hook motion and kinetic font pair. */
  group: GroupId;
  /** Background design (shapes + pattern) drawn behind panels, circles, frames and cards. */
  motif: MotifId;
  name: string;
  subject: string;
  icon: string;
  blurb: string;
  display: string;
  displayWeight: number;
  displayCase: 'upper' | 'none';
  body: string;
  bodyWeight: number;
  caption: string;
  captionWeight: number;
  bg: string;
  bg2: string;
  ink: string;
  accent: string;
  muted: string;
  capBox: string;
  capInk: string;
  capHi: string;
  grain: number;
  mix: Partial<Record<LayoutKind, number>>;
  shape: 'sharp' | 'soft';
  capStyle: CaptionStyleId;
  lex: string[];
  /** Runtime only (Look → Background): the last layer under the design when it is not a flat colour. */
  base?: PackBase;
}

export type PackBase =
  | { kind: 'gradient'; a: string; b: string; angle: number }
  | { kind: 'photo'; img: CanvasImageSource; w: number; h: number; dim: number };

const P = (p: Pack) => p;

export const PACKS: Pack[] = [
  P({ id: 'signal', group: 'tech', motif: 'broadcast', name: 'Signal', subject: 'Tech news', icon: 'cpu', blurb: 'Condensed headlines and hard cuts for AI and tech updates.',
    display: 'Archivo', displayWeight: 800, displayCase: 'upper', body: 'JetBrains Mono', bodyWeight: 600, caption: 'Archivo', captionWeight: 700,
    bg: '#0F0F0E', bg2: '#1C1B19', ink: '#F4F1EA', accent: '#FF5A1F', muted: '#8C877D', capBox: 'rgba(12,12,11,0.86)', capInk: '#F4F1EA', capHi: '#FF5A1F',
    grain: 0.05, mix: { full: 3, punch: 3, split: 3, card: 2, circle: 1 }, shape: 'sharp', capStyle: 'box',
    lex: ['ai', 'model', 'nvidia', 'openai', 'google', 'apple', 'chip', 'gpu', 'launch', 'released', 'announced', 'news', 'update', 'tech', 'robot', 'claude', 'gemini', 'gpt', 'microsoft', 'meta', 'tesla', 'acquired'] }),
  P({ id: 'ledger', group: 'editorial', motif: 'ledger', name: 'Ledger', subject: 'Business', icon: 'briefcase', blurb: 'Serif headlines and gold figures. Calm, credible pacing.',
    display: 'Fraunces', displayWeight: 700, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Manrope', captionWeight: 800,
    bg: '#0F1A15', bg2: '#17261F', ink: '#EFE8D8', accent: '#D4AE5A', muted: '#8FA095', capBox: 'rgba(239,232,216,0.94)', capInk: '#13201A', capHi: '#9A7420',
    grain: 0.04, mix: { full: 3, punch: 2, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'underline',
    lex: ['business', 'company', 'clients', 'client', 'customer', 'customers', 'agency', 'brand', 'strategy', 'deal', 'team', 'ceo', 'founder', 'hire', 'hiring', 'leadership'] }),
  P({ id: 'mint', group: 'tech', motif: 'chart', name: 'Mint', subject: 'Finance', icon: 'dollar', blurb: 'Money talk with count-up numbers and fill-as-you-speak captions.',
    display: 'Sora', displayWeight: 800, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Sora', captionWeight: 800,
    bg: '#0C1411', bg2: '#13211B', ink: '#EAF4EE', accent: '#3DDC97', muted: '#7FA392', capBox: 'rgba(12,20,17,0.9)', capInk: '#EAF4EE', capHi: '#3DDC97',
    grain: 0.04, mix: { full: 2, punch: 3, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'karaoke',
    lex: ['money', 'invest', 'investing', 'investment', 'stocks', 'stock', 'income', 'profit', 'revenue', 'savings', 'save', 'wealth', 'rich', 'tax', 'dollars', 'rupees', 'lakh', 'crore', 'market', 'price'] }),
  P({ id: 'ignite', group: 'bold', motif: 'rays', name: 'Ignite', subject: 'Motivation', icon: 'flame', blurb: 'Tall poster type and stacked captions. Built for hooks and emotion.',
    display: 'Anton', displayWeight: 400, displayCase: 'upper', body: 'Manrope', bodyWeight: 800, caption: 'Anton', captionWeight: 400,
    bg: '#121110', bg2: '#1E1C1A', ink: '#FFFFFF', accent: '#E9FF47', muted: '#9A968E', capBox: 'rgba(255,255,255,0.95)', capInk: '#111111', capHi: '#111111',
    grain: 0.06, mix: { full: 2, punch: 4, split: 2, card: 3, circle: 1 }, shape: 'sharp', capStyle: 'stack',
    lex: ['dream', 'dreams', 'life', 'fail', 'failure', 'success', 'believe', 'mindset', 'discipline', 'fear', 'courage', 'quit', 'win', 'purpose', 'passion', 'pain', 'motivation', 'yourself', 'never', 'hard'] }),
  P({ id: 'blueprint', group: 'clean', motif: 'drafting', name: 'Blueprint', subject: 'Tutorial', icon: 'sliders', blurb: 'Paper background, numbered steps, clean grid.',
    display: 'Space Grotesk', displayWeight: 700, displayCase: 'none', body: 'Space Grotesk', bodyWeight: 600, caption: 'Space Grotesk', captionWeight: 700,
    bg: '#F2EEE5', bg2: '#E6E0D3', ink: '#151515', accent: '#2F5BEA', muted: '#6E6A61', capBox: 'rgba(21,21,21,0.88)', capInk: '#F2EEE5', capHi: '#8FB0FF',
    grain: 0.035, mix: { full: 2, punch: 2, split: 4, card: 2, circle: 2 }, shape: 'soft', capStyle: 'box',
    lex: ['how', 'step', 'steps', 'first', 'second', 'third', 'tool', 'tools', 'click', 'open', 'tutorial', 'setup', 'install', 'settings', 'guide', 'button', 'free', 'use'] }),
  P({ id: 'studio', group: 'editorial', motif: 'waves', name: 'Studio', subject: 'Podcast', icon: 'mic', blurb: 'Warm editorial look with elegant serif captions.',
    display: 'DM Serif Display', displayWeight: 400, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Instrument Serif', captionWeight: 400,
    bg: '#1E1714', bg2: '#2A201B', ink: '#F3E6D6', accent: '#E3A35B', muted: '#A08A77', capBox: 'rgba(30,23,20,0.88)', capInk: '#F3E6D6', capHi: '#E3A35B',
    grain: 0.05, mix: { full: 4, punch: 2, split: 2, card: 2, circle: 2 }, shape: 'soft', capStyle: 'serif',
    lex: ['podcast', 'episode', 'guest', 'conversation', 'interview', 'story', 'talk', 'listen', 'show'] }),
  P({ id: 'pulse', group: 'bold', motif: 'speed', name: 'Pulse', subject: 'Fitness', icon: 'dumbbell', blurb: 'Bold condensed type, red hits, one-word captions.',
    display: 'Bebas Neue', displayWeight: 400, displayCase: 'upper', body: 'Manrope', bodyWeight: 800, caption: 'Bebas Neue', captionWeight: 400,
    bg: '#0B0B0B', bg2: '#1A1A1A', ink: '#FFFFFF', accent: '#FF3B30', muted: '#8A8A8A', capBox: 'rgba(11,11,11,0.9)', capInk: '#FFFFFF', capHi: '#FF3B30',
    grain: 0.06, mix: { full: 2, punch: 4, split: 2, card: 3, circle: 1 }, shape: 'sharp', capStyle: 'one',
    lex: ['gym', 'workout', 'fitness', 'muscle', 'muscles', 'body', 'training', 'exercise', 'strength', 'reps', 'cardio', 'fat', 'weight', 'protein'] }),
  P({ id: 'harvest', group: 'clean', motif: 'picnic', name: 'Harvest', subject: 'Food', icon: 'utensils', blurb: 'Cream paper, tomato red, friendly serif. Recipes and food reviews.',
    display: 'Fraunces', displayWeight: 700, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Montserrat', captionWeight: 800,
    bg: '#F4EDE1', bg2: '#EADFCB', ink: '#2A1C14', accent: '#E4572E', muted: '#8C7A68', capBox: 'rgba(42,28,20,0.9)', capInk: '#F4EDE1', capHi: '#FFB39B',
    grain: 0.04, mix: { full: 3, punch: 2, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'pop',
    lex: ['food', 'eat', 'recipe', 'cook', 'cooking', 'kitchen', 'meal', 'taste', 'restaurant', 'chicken', 'rice', 'sauce', 'delicious', 'chef'] }),
  P({ id: 'keys', group: 'editorial', motif: 'deco', name: 'Keys', subject: 'Real estate', icon: 'home', blurb: 'Navy and brass with frosted captions. Listings and property tips.',
    display: 'DM Serif Display', displayWeight: 400, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Manrope', captionWeight: 800,
    bg: '#13233A', bg2: '#1B3150', ink: '#F1EBDD', accent: '#C8A15A', muted: '#8C9AAE', capBox: 'rgba(19,35,58,0.85)', capInk: '#F1EBDD', capHi: '#C8A15A',
    grain: 0.04, mix: { full: 3, punch: 2, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'frosted',
    lex: ['home', 'house', 'property', 'estate', 'rent', 'apartment', 'mortgage', 'buyer', 'seller', 'listing', 'realtor', 'land', 'loan'] }),
  P({ id: 'campus', group: 'clean', motif: 'notebook', name: 'Campus', subject: 'Education', icon: 'school', blurb: 'Clean paper, green ink, underline captions that guide the eye.',
    display: 'Space Grotesk', displayWeight: 700, displayCase: 'none', body: 'Space Grotesk', bodyWeight: 600, caption: 'Space Grotesk', captionWeight: 700,
    bg: '#F5F2EA', bg2: '#E8E3D6', ink: '#17201A', accent: '#1F7A4D', muted: '#6B7066', capBox: 'rgba(23,32,26,0.88)', capInk: '#F5F2EA', capHi: '#7FD1A6',
    grain: 0.03, mix: { full: 2, punch: 2, split: 4, card: 2, circle: 2 }, shape: 'soft', capStyle: 'underline',
    lex: ['learn', 'study', 'school', 'course', 'exam', 'student', 'students', 'teacher', 'class', 'lesson', 'education', 'university'] }),
  P({ id: 'launch', group: 'tech', motif: 'orbits', name: 'Launch', subject: 'Startup', icon: 'rocket', blurb: 'Near-black and Claude orange. Product launches and founder updates.',
    display: 'Sora', displayWeight: 800, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Sora', captionWeight: 800,
    bg: '#111110', bg2: '#1C1B19', ink: '#F5F1EA', accent: '#D97757', muted: '#8F897E', capBox: 'rgba(17,17,16,0.88)', capInk: '#F5F1EA', capHi: '#D97757',
    grain: 0.05, mix: { full: 2, punch: 3, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'marker',
    lex: ['startup', 'product', 'launch', 'users', 'saas', 'founder', 'build', 'built', 'ship', 'feature', 'beta', 'funding', 'investors', 'mvp'] }),
  P({ id: 'loud', group: 'bold', motif: 'typewall', name: 'Loud', subject: 'Marketing', icon: 'megaphone', blurb: 'Black and signal yellow, big pop captions. Ads and growth tips.',
    display: 'Archivo', displayWeight: 800, displayCase: 'upper', body: 'Archivo', bodyWeight: 700, caption: 'Archivo', captionWeight: 800,
    bg: '#0E0E0E', bg2: '#1B1B1B', ink: '#FFFFFF', accent: '#FFD23F', muted: '#8A8A8A', capBox: 'rgba(14,14,14,0.9)', capInk: '#FFFFFF', capHi: '#FFD23F',
    grain: 0.05, mix: { full: 2, punch: 4, split: 3, card: 2, circle: 1 }, shape: 'sharp', capStyle: 'pop',
    lex: ['marketing', 'ads', 'ad', 'funnel', 'leads', 'conversion', 'campaign', 'audience', 'content', 'viral', 'hook', 'followers', 'engagement', 'sales', 'offer'] }),
  P({ id: 'atlas', group: 'clean', motif: 'contours', name: 'Atlas', subject: 'Travel', icon: 'plane', blurb: 'Sand and teal with soft serif titles and minimal captions.',
    display: 'Instrument Serif', displayWeight: 400, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Manrope', captionWeight: 700,
    bg: '#EDE6D8', bg2: '#DCD2BF', ink: '#1D2B2A', accent: '#1E8C86', muted: '#6E7A73', capBox: 'rgba(29,43,42,0.85)', capInk: '#EDE6D8', capHi: '#7FD6CF',
    grain: 0.04, mix: { full: 4, punch: 2, split: 2, card: 2, circle: 2 }, shape: 'soft', capStyle: 'minimal',
    lex: ['travel', 'trip', 'flight', 'visit', 'city', 'country', 'beach', 'hotel', 'vacation', 'explore', 'island'] }),
  P({ id: 'vital', group: 'clean', motif: 'soft', name: 'Vital', subject: 'Health', icon: 'pulse', blurb: 'Soft sage, rounded type, calm box captions.',
    display: 'Manrope', displayWeight: 800, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Manrope', captionWeight: 800,
    bg: '#EEF2EC', bg2: '#DDE6DA', ink: '#1B2A22', accent: '#4C9A6A', muted: '#6C7D72', capBox: 'rgba(238,242,236,0.95)', capInk: '#1B2A22', capHi: '#2F7A4D',
    grain: 0.03, mix: { full: 3, punch: 2, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'box',
    lex: ['health', 'healthy', 'sleep', 'stress', 'doctor', 'heart', 'mental', 'anxiety', 'wellness', 'vitamin', 'gut', 'hormones'] }),
  P({ id: 'terminal', group: 'tech', motif: 'code', name: 'Terminal', subject: 'Coding', icon: 'code', blurb: 'Monospace, phosphor green, ticker captions. Dev and AI tools.',
    display: 'JetBrains Mono', displayWeight: 700, displayCase: 'none', body: 'JetBrains Mono', bodyWeight: 600, caption: 'JetBrains Mono', captionWeight: 700,
    bg: '#0A0C0A', bg2: '#121612', ink: '#DDF5E3', accent: '#4BE38A', muted: '#6F8A78', capBox: 'rgba(10,12,10,0.9)', capInk: '#DDF5E3', capHi: '#4BE38A',
    grain: 0.05, mix: { full: 2, punch: 3, split: 3, card: 2, circle: 2 }, shape: 'sharp', capStyle: 'ticker',
    lex: ['code', 'coding', 'developer', 'python', 'javascript', 'api', 'github', 'program', 'script', 'terminal', 'bug', 'react', 'database'] }),
  P({ id: 'atelier', group: 'editorial', motif: 'herringbone', name: 'Atelier', subject: 'Fashion', icon: 'shirt', blurb: 'Espresso and rose with high-contrast serif. Beauty and style.',
    display: 'DM Serif Display', displayWeight: 400, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Instrument Serif', captionWeight: 400,
    bg: '#2A1D19', bg2: '#3A2924', ink: '#F7E9E4', accent: '#E9A3A0', muted: '#B39690', capBox: 'rgba(42,29,25,0.88)', capInk: '#F7E9E4', capHi: '#E9A3A0',
    grain: 0.05, mix: { full: 3, punch: 3, split: 2, card: 2, circle: 2 }, shape: 'soft', capStyle: 'serif',
    lex: ['fashion', 'style', 'outfit', 'outfits', 'wear', 'look', 'dress', 'brand', 'luxury', 'shoes', 'designer'] }),
  // ---------- v0.5: more subjects, and four new style groups ----------
  P({ id: 'arena', group: 'bold', motif: 'court', name: 'Arena', subject: 'Sports', icon: 'trophy', blurb: 'Court lines, condensed headlines and one-word hits on the big plays.',
    display: 'Oswald', displayWeight: 700, displayCase: 'upper', body: 'Manrope', bodyWeight: 800, caption: 'Oswald', captionWeight: 700,
    bg: '#0E1A2B', bg2: '#16263D', ink: '#F5F7FA', accent: '#FF7A1A', muted: '#8EA3B8', capBox: 'rgba(14,26,43,0.9)', capInk: '#F5F7FA', capHi: '#FF7A1A',
    grain: 0.05, mix: { full: 2, punch: 4, split: 2, card: 3, circle: 1 }, shape: 'sharp', capStyle: 'one',
    lex: ['sports', 'sport', 'match', 'matches', 'score', 'scored', 'player', 'players', 'coach', 'league', 'cricket', 'football', 'soccer', 'basketball', 'ipl', 'tournament', 'championship', 'olympics', 'nba', 'fifa', 'wicket', 'stadium', 'fans', 'season'] }),
  P({ id: 'arcade', group: 'bold', motif: 'pixels', name: 'Arcade', subject: 'Gaming', icon: 'gamepad', blurb: 'Handheld-console green, pixel fields and punchy pop captions.',
    display: 'Chakra Petch', displayWeight: 700, displayCase: 'upper', body: 'Chakra Petch', bodyWeight: 600, caption: 'Chakra Petch', captionWeight: 700,
    bg: '#D5DEB0', bg2: '#C3CE98', ink: '#1F2A12', accent: '#D93B30', muted: '#5F6A48', capBox: 'rgba(31,42,18,0.9)', capInk: '#EEF2DF', capHi: '#FF8F84',
    grain: 0.05, mix: { full: 2, punch: 4, split: 2, card: 2, circle: 2 }, shape: 'sharp', capStyle: 'pop',
    lex: ['game', 'games', 'gaming', 'gamer', 'gamers', 'console', 'playstation', 'xbox', 'nintendo', 'streamer', 'twitch', 'minecraft', 'fortnite', 'valorant', 'gta', 'controller', 'esports'] }),
  P({ id: 'torque', group: 'bold', motif: 'stripes', name: 'Torque', subject: 'Cars', icon: 'car', blurb: 'Concrete grey, a red racing stripe and heavy stacked captions.',
    display: 'Archivo', displayWeight: 900, displayCase: 'upper', body: 'Archivo', bodyWeight: 700, caption: 'Archivo', captionWeight: 800,
    bg: '#D9D5CE', bg2: '#C9C4BB', ink: '#141414', accent: '#E10600', muted: '#6F6B65', capBox: 'rgba(20,20,20,0.9)', capInk: '#F2F0EC', capHi: '#FF4A3D',
    grain: 0.05, mix: { full: 2, punch: 4, split: 2, card: 3, circle: 1 }, shape: 'sharp', capStyle: 'stack',
    lex: ['car', 'cars', 'engine', 'horsepower', 'ev', 'bmw', 'porsche', 'ferrari', 'lamborghini', 'racing', 'suv', 'mileage', 'supercar', 'motorcycle', 'bike', 'bikes', 'turbo'] }),
  P({ id: 'folio', group: 'editorial', motif: 'pages', name: 'Folio', subject: 'Books', icon: 'book', blurb: 'Cream pages, a bookmark ribbon and quiet serif captions on paper.',
    display: 'Instrument Serif', displayWeight: 400, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Cormorant Garamond', captionWeight: 700,
    bg: '#F3EBDD', bg2: '#E6DAC6', ink: '#1E1A16', accent: '#2E5E4E', muted: '#7D7264', capBox: 'rgba(243,235,221,0.95)', capInk: '#1E1A16', capHi: '#2E5E4E',
    grain: 0.04, mix: { full: 3, punch: 2, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'box',
    lex: ['book', 'books', 'reading', 'read', 'author', 'novel', 'chapter', 'writer', 'writing', 'summary', 'quote', 'quotes', 'library', 'pages', 'bestseller'] }),
  P({ id: 'vow', group: 'editorial', motif: 'arches', name: 'Vow', subject: 'Weddings & events', icon: 'gem', blurb: 'Ivory, antique gold and soft italic captions. Ceremonies and parties.',
    display: 'Cormorant Garamond', displayWeight: 600, displayCase: 'none', body: 'Manrope', bodyWeight: 600, caption: 'Instrument Serif', captionWeight: 400,
    bg: '#F7F1EA', bg2: '#EBE1D4', ink: '#2B2320', accent: '#9C7741', muted: '#8E8178', capBox: 'rgba(43,35,32,0.86)', capInk: '#F7F1EA', capHi: '#D9B77A',
    grain: 0.035, mix: { full: 4, punch: 1, split: 2, card: 2, circle: 2 }, shape: 'soft', capStyle: 'serif',
    lex: ['wedding', 'weddings', 'bride', 'groom', 'event', 'events', 'party', 'venue', 'ceremony', 'invitation', 'guests', 'celebration', 'marriage', 'reception', 'bridal'] }),
  P({ id: 'dew', group: 'clean', motif: 'bubbles', name: 'Dew', subject: 'Beauty & skincare', icon: 'sparkles', blurb: 'Blush and terracotta, soft serif titles and frosted captions.',
    display: 'Cormorant Garamond', displayWeight: 700, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Manrope', captionWeight: 800,
    bg: '#F6E7E2', bg2: '#EDD3CB', ink: '#3A2420', accent: '#B5524A', muted: '#9A7C75', capBox: 'rgba(58,36,32,0.86)', capInk: '#F6E7E2', capHi: '#F2A69C',
    grain: 0.03, mix: { full: 3, punch: 2, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'frosted',
    lex: ['beauty', 'skincare', 'skin', 'makeup', 'serum', 'moisturizer', 'sunscreen', 'spf', 'acne', 'cleanser', 'lipstick', 'glow', 'hair', 'nails', 'cosmetics'] }),
  P({ id: 'chain', group: 'tech', motif: 'hex', name: 'Chain', subject: 'Crypto', icon: 'bitcoin', blurb: 'Light grey, a linked hex chain and amber fill-as-you-speak captions.',
    display: 'Sora', displayWeight: 800, displayCase: 'none', body: 'JetBrains Mono', bodyWeight: 600, caption: 'Sora', captionWeight: 800,
    bg: '#ECEAE3', bg2: '#DDDAD1', ink: '#16161A', accent: '#C26A0A', muted: '#6E6B63', capBox: 'rgba(22,22,26,0.88)', capInk: '#ECEAE3', capHi: '#F7931A',
    grain: 0.04, mix: { full: 2, punch: 3, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'karaoke',
    lex: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'blockchain', 'token', 'tokens', 'wallet', 'defi', 'nft', 'nfts', 'web3', 'solana', 'altcoin', 'altcoins', 'coin', 'coins', 'mining', 'binance'] }),
  P({ id: 'circuit', group: 'tech', motif: 'circuit', name: 'Circuit', subject: 'AI tools', icon: 'brain', blurb: 'Board green and copper traces. Tool demos, prompts and automations.',
    display: 'Space Grotesk', displayWeight: 700, displayCase: 'none', body: 'JetBrains Mono', bodyWeight: 600, caption: 'Space Grotesk', captionWeight: 700,
    bg: '#0D3B2B', bg2: '#11493A', ink: '#E9F2EC', accent: '#E39B57', muted: '#7FA595', capBox: 'rgba(13,59,43,0.9)', capInk: '#E9F2EC', capHi: '#E39B57',
    grain: 0.04, mix: { full: 2, punch: 3, split: 3, card: 2, circle: 2 }, shape: 'sharp', capStyle: 'marker',
    lex: ['chatgpt', 'prompt', 'prompts', 'agent', 'agents', 'automation', 'automate', 'automated', 'workflow', 'workflows', 'llm', 'assistant', 'copilot', 'midjourney', 'perplexity', 'cursor', 'zapier', 'n8n', 'notebooklm'] }),
  P({ id: 'wire', group: 'news', motif: 'wire', name: 'Wire', subject: 'Breaking news', icon: 'newspaper', blurb: 'Broadcast red, a newswire globe and a ticker bar with a BREAKING tag.',
    display: 'Oswald', displayWeight: 700, displayCase: 'upper', body: 'Manrope', bodyWeight: 700, caption: 'Oswald', captionWeight: 600,
    bg: '#A3141B', bg2: '#8C1117', ink: '#FFFFFF', accent: '#FFD400', muted: '#F2B8B8', capBox: 'rgba(17,17,17,0.9)', capInk: '#FFFFFF', capHi: '#FFD400',
    grain: 0.04, mix: { full: 2, punch: 3, split: 3, card: 2, circle: 1 }, shape: 'sharp', capStyle: 'ticker',
    lex: ['breaking', 'report', 'reports', 'reported', 'government', 'officials', 'headline', 'headlines', 'crisis', 'minister', 'president', 'election', 'announcement', 'sources', 'confirmed', 'alert'] }),
  P({ id: 'archive', group: 'news', motif: 'stamp', name: 'Archive', subject: 'History & documentary', icon: 'landmark', blurb: 'Parchment, photo corners and a rust seal. Stories from the past.',
    display: 'Fraunces', displayWeight: 700, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Manrope', captionWeight: 800,
    bg: '#D9C9A8', bg2: '#CBB991', ink: '#221C14', accent: '#A33B20', muted: '#6E5F47', capBox: 'rgba(34,28,20,0.88)', capInk: '#EFE6D2', capHi: '#E08A63',
    grain: 0.07, mix: { full: 3, punch: 2, split: 3, card: 2, circle: 1 }, shape: 'sharp', capStyle: 'underline',
    lex: ['history', 'historical', 'ancient', 'empire', 'century', 'centuries', 'documentary', 'king', 'queen', 'museum', 'archive', 'legacy', 'civilization', 'dynasty', 'war', 'era', 'founded'] }),
  P({ id: 'lab', group: 'news', motif: 'molecule', name: 'Lab', subject: 'Science', icon: 'flask', blurb: 'Graph paper, turning molecules and amber highlights on clean type.',
    display: 'Bricolage Grotesque', displayWeight: 800, displayCase: 'none', body: 'JetBrains Mono', bodyWeight: 500, caption: 'Bricolage Grotesque', captionWeight: 700,
    bg: '#F1F3EF', bg2: '#E1E6DF', ink: '#15201A', accent: '#A87400', muted: '#68746D', capBox: 'rgba(21,32,26,0.9)', capInk: '#F1F3EF', capHi: '#F2B330',
    grain: 0.03, mix: { full: 2, punch: 2, split: 4, card: 2, circle: 2 }, shape: 'soft', capStyle: 'box',
    lex: ['science', 'scientist', 'scientists', 'research', 'researchers', 'experiment', 'lab', 'physics', 'chemistry', 'biology', 'nasa', 'planet', 'universe', 'atoms', 'dna', 'quantum', 'discovery', 'cells'] }),
  P({ id: 'brief', group: 'news', motif: 'columns', name: 'Brief', subject: 'Explainer', icon: 'bulb', blurb: 'Signal yellow, newspaper columns and yellow-box captions that explain.',
    display: 'Montserrat', displayWeight: 900, displayCase: 'upper', body: 'Manrope', bodyWeight: 700, caption: 'Montserrat', captionWeight: 800,
    bg: '#F5C842', bg2: '#E9B92C', ink: '#141414', accent: '#C42A1F', muted: '#5E4B12', capBox: 'rgba(245,200,66,0.96)', capInk: '#141414', capHi: '#C42A1F',
    grain: 0.04, mix: { full: 2, punch: 3, split: 3, card: 3, circle: 1 }, shape: 'sharp', capStyle: 'box',
    lex: ['explained', 'explain', 'explainer', 'breakdown', 'myth', 'myths', 'facts', 'misconception', 'truth', 'debunked'] }),
  P({ id: 'reel', group: 'cinema', motif: 'filmstrip', name: 'Reel', subject: 'Film & movies', icon: 'clap', blurb: 'Black, gold and film sprockets with understated subtitle captions.',
    display: 'Cormorant Garamond', displayWeight: 700, displayCase: 'none', body: 'Manrope', bodyWeight: 600, caption: 'Manrope', captionWeight: 700,
    bg: '#0B0A09', bg2: '#171512', ink: '#F3EDE2', accent: '#D9B36C', muted: '#8F8778', capBox: 'rgba(11,10,9,0.86)', capInk: '#F3EDE2', capHi: '#D9B36C',
    grain: 0.07, mix: { full: 4, punch: 1, split: 2, card: 2, circle: 1 }, shape: 'sharp', capStyle: 'minimal',
    lex: ['movie', 'movies', 'film', 'films', 'cinema', 'director', 'actor', 'actress', 'scene', 'trailer', 'netflix', 'oscar', 'oscars', 'hollywood', 'bollywood', 'series', 'sequel', 'cast'] }),
  P({ id: 'nocturne', group: 'cinema', motif: 'rain', name: 'Nocturne', subject: 'Storytelling', icon: 'moon', blurb: 'Night rain, a streetlight and red underlines. Mysteries and stories.',
    display: 'DM Serif Display', displayWeight: 400, displayCase: 'none', body: 'Manrope', bodyWeight: 600, caption: 'Manrope', captionWeight: 800,
    bg: '#0E1110', bg2: '#171B19', ink: '#E8E4DA', accent: '#C2413B', muted: '#7E847F', capBox: 'rgba(14,17,16,0.88)', capInk: '#E8E4DA', capHi: '#E06A62',
    grain: 0.07, mix: { full: 4, punch: 2, split: 2, card: 2, circle: 1 }, shape: 'soft', capStyle: 'underline',
    lex: ['stories', 'storytime', 'mystery', 'mysterious', 'creepy', 'ghost', 'haunted', 'legend', 'night', 'midnight', 'strange', 'unsolved', 'horror', 'disappeared'] }),
  P({ id: 'summit', group: 'cinema', motif: 'ridge', name: 'Summit', subject: 'Outdoors', icon: 'mountain', blurb: 'Moss green ridgelines, safety orange and outlined adventure captions.',
    display: 'Oswald', displayWeight: 600, displayCase: 'upper', body: 'Manrope', bodyWeight: 700, caption: 'Oswald', captionWeight: 700,
    bg: '#3B4A3F', bg2: '#46574A', ink: '#F1F0E8', accent: '#F28C38', muted: '#A9B3A6', capBox: 'rgba(36,45,38,0.9)', capInk: '#F1F0E8', capHi: '#F28C38',
    grain: 0.06, mix: { full: 4, punch: 2, split: 2, card: 2, circle: 1 }, shape: 'sharp', capStyle: 'outline',
    lex: ['hike', 'hiking', 'camping', 'camp', 'trail', 'trails', 'outdoors', 'outdoor', 'nature', 'climb', 'climbing', 'summit', 'adventure', 'mountain', 'mountains', 'forest', 'wild', 'trek', 'trekking'] }),
  P({ id: 'lens', group: 'cinema', motif: 'viewfinder', name: 'Lens', subject: 'Photography', icon: 'aperture', blurb: 'Deep teal, a live viewfinder and quiet captions for creators who shoot.',
    display: 'Geist', displayWeight: 600, displayCase: 'none', body: 'JetBrains Mono', bodyWeight: 500, caption: 'Geist', captionWeight: 600,
    bg: '#163330', bg2: '#1E413D', ink: '#EFEDE6', accent: '#F2A65A', muted: '#8FA8A3', capBox: 'rgba(22,51,48,0.88)', capInk: '#EFEDE6', capHi: '#F2A65A',
    grain: 0.06, mix: { full: 4, punch: 2, split: 2, card: 2, circle: 2 }, shape: 'sharp', capStyle: 'minimal',
    lex: ['photo', 'photos', 'photography', 'photographer', 'camera', 'lens', 'lenses', 'shoot', 'shooting', 'portrait', 'portraits', 'lighting', 'iso', 'aperture', 'shutter', 'lightroom', 'sony', 'canon', 'nikon', 'fujifilm'] }),
  P({ id: 'confetti', group: 'playful', motif: 'confetti', name: 'Confetti', subject: 'Comedy & entertainment', icon: 'laugh', blurb: 'Raspberry, falling confetti and big bouncy pop captions.',
    display: 'Bricolage Grotesque', displayWeight: 800, displayCase: 'none', body: 'Manrope', bodyWeight: 800, caption: 'Bricolage Grotesque', captionWeight: 800,
    bg: '#D93A6E', bg2: '#C42F60', ink: '#FFFFFF', accent: '#FFE14D', muted: '#FFE3EC', capBox: 'rgba(26,26,26,0.9)', capInk: '#FFFFFF', capHi: '#FFE14D',
    grain: 0.04, mix: { full: 2, punch: 4, split: 2, card: 2, circle: 2 }, shape: 'soft', capStyle: 'pop',
    lex: ['funny', 'joke', 'jokes', 'laugh', 'comedy', 'comedian', 'prank', 'meme', 'memes', 'lol', 'hilarious', 'challenge', 'reaction', 'celebrity', 'gossip', 'drama', 'roast'] }),
  P({ id: 'paws', group: 'playful', motif: 'paws', name: 'Paws', subject: 'Pets', icon: 'paw', blurb: 'Pale mint, a trail of paw prints and warm orange fill captions.',
    display: 'Fredoka', displayWeight: 600, displayCase: 'none', body: 'Fredoka', bodyWeight: 500, caption: 'Fredoka', captionWeight: 600,
    bg: '#E3EFE6', bg2: '#CFE3D5', ink: '#1E2A24', accent: '#D4542A', muted: '#64766B', capBox: 'rgba(30,42,36,0.9)', capInk: '#E3EFE6', capHi: '#FF9A75',
    grain: 0.03, mix: { full: 3, punch: 2, split: 2, card: 2, circle: 3 }, shape: 'soft', capStyle: 'karaoke',
    lex: ['dog', 'dogs', 'cat', 'cats', 'puppy', 'puppies', 'kitten', 'kittens', 'pet', 'pets', 'vet', 'breed', 'paws', 'treats', 'leash', 'groomer'] }),
  P({ id: 'craft', group: 'playful', motif: 'stitch', name: 'Craft', subject: 'DIY & crafts', icon: 'scissors', blurb: 'Kraft paper, stitched borders and a red marker that follows the voice.',
    display: 'Fredoka', displayWeight: 700, displayCase: 'none', body: 'Manrope', bodyWeight: 700, caption: 'Fredoka', captionWeight: 700,
    bg: '#E8D8BE', bg2: '#DCC7A6', ink: '#2B2118', accent: '#D6453D', muted: '#7E6A55', capBox: 'rgba(43,33,24,0.9)', capInk: '#E8D8BE', capHi: '#FF8A7F',
    grain: 0.06, mix: { full: 2, punch: 2, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'marker',
    lex: ['diy', 'craft', 'crafts', 'crafting', 'handmade', 'paint', 'painting', 'glue', 'sew', 'sewing', 'knit', 'knitting', 'yarn', 'fabric', 'decor', 'upcycle', 'woodworking', 'scissors'] }),
  P({ id: 'nursery', group: 'playful', motif: 'blocks', name: 'Nursery', subject: 'Parenting', icon: 'baby', blurb: 'Butter yellow, bobbing toy blocks and soft rounded box captions.',
    display: 'Fredoka', displayWeight: 600, displayCase: 'none', body: 'Fredoka', bodyWeight: 500, caption: 'Fredoka', captionWeight: 600,
    bg: '#FDF3D7', bg2: '#F6E3AE', ink: '#2D2622', accent: '#3E8E7E', muted: '#8A7B62', capBox: 'rgba(253,243,215,0.95)', capInk: '#2D2622', capHi: '#2F7A6B',
    grain: 0.03, mix: { full: 3, punch: 2, split: 2, card: 2, circle: 3 }, shape: 'soft', capStyle: 'box',
    lex: ['kids', 'kid', 'child', 'children', 'baby', 'babies', 'parent', 'parents', 'parenting', 'mom', 'dad', 'family', 'toddler', 'toddlers', 'bedtime', 'toys', 'newborn'] }),
  P({ id: 'zen', group: 'minimal', motif: 'enso', name: 'Zen', subject: 'Mindfulness', icon: 'leaf', blurb: 'Stone white, a brushed ensō and small lowercase captions.',
    display: 'Instrument Serif', displayWeight: 400, displayCase: 'none', body: 'Manrope', bodyWeight: 600, caption: 'Manrope', captionWeight: 600,
    bg: '#EFEDE8', bg2: '#E3E0D8', ink: '#23251F', accent: '#5F7A4B', muted: '#7C7E75', capBox: 'rgba(35,37,31,0.86)', capInk: '#EFEDE8', capHi: '#A9C48F',
    grain: 0.03, mix: { full: 4, punch: 1, split: 2, card: 1, circle: 2 }, shape: 'soft', capStyle: 'minimal',
    lex: ['meditation', 'meditate', 'mindful', 'mindfulness', 'breathe', 'breathing', 'calm', 'peace', 'peaceful', 'yoga', 'gratitude', 'journal', 'journaling', 'relax', 'spiritual'] }),
  P({ id: 'focus', group: 'minimal', motif: 'dotgrid', name: 'Focus', subject: 'Productivity', icon: 'listChecks', blurb: 'Dot-grid white, a red progress line and underline captions. Habits and systems.',
    display: 'Geist', displayWeight: 700, displayCase: 'none', body: 'Geist', bodyWeight: 500, caption: 'Geist', captionWeight: 700,
    bg: '#F5F5F2', bg2: '#E8E8E3', ink: '#161616', accent: '#E5484D', muted: '#76766F', capBox: 'rgba(22,22,22,0.88)', capInk: '#F5F5F2', capHi: '#FF7A7E',
    grain: 0.03, mix: { full: 3, punch: 2, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'underline',
    lex: ['productivity', 'productive', 'habit', 'habits', 'notion', 'todo', 'procrastination', 'procrastinate', 'distraction', 'distractions', 'planner', 'pomodoro'] }),
  P({ id: 'career', group: 'minimal', motif: 'rule', name: 'Career', subject: 'Career & jobs', icon: 'handshake', blurb: 'Paper white, résumé rules and an orange highlight. Jobs and interviews.',
    display: 'Manrope', displayWeight: 800, displayCase: 'none', body: 'Manrope', bodyWeight: 600, caption: 'Manrope', captionWeight: 800,
    bg: '#F1EFEA', bg2: '#E4E1DA', ink: '#1A1D24', accent: '#B8661A', muted: '#6F6D66', capBox: 'rgba(26,29,36,0.9)', capInk: '#F1EFEA', capHi: '#F0A04B',
    grain: 0.03, mix: { full: 3, punch: 2, split: 3, card: 2, circle: 2 }, shape: 'soft', capStyle: 'box',
    lex: ['job', 'jobs', 'career', 'careers', 'resume', 'cv', 'linkedin', 'salary', 'promotion', 'manager', 'boss', 'recruiter', 'recruiters', 'employer', 'internship', 'raise', 'layoffs'] }),
  P({ id: 'counsel', group: 'minimal', motif: 'quiet', name: 'Counsel', subject: 'Legal', icon: 'scale', blurb: 'A double rule, a section mark and burgundy accents. Law, simply put.',
    display: 'DM Serif Display', displayWeight: 400, displayCase: 'none', body: 'Manrope', bodyWeight: 600, caption: 'Instrument Serif', captionWeight: 400,
    bg: '#F2EFE8', bg2: '#E6E1D6', ink: '#1C1A17', accent: '#7A1F2B', muted: '#7C766B', capBox: 'rgba(28,26,23,0.88)', capInk: '#F2EFE8', capHi: '#E3A1A9',
    grain: 0.03, mix: { full: 3, punch: 2, split: 3, card: 2, circle: 1 }, shape: 'sharp', capStyle: 'serif',
    lex: ['law', 'laws', 'lawyer', 'lawyers', 'legal', 'court', 'contract', 'contracts', 'rights', 'sue', 'lawsuit', 'judge', 'attorney', 'clause', 'liability', 'copyright', 'trademark', 'illegal'] }),
];

export const packById = (id: string) => PACKS.find((p) => p.id === id) ?? PACKS[0];

export function detectTheme(text: string): { packId: string; scores: Record<string, number> } {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const scores: Record<string, number> = {};
  for (const p of PACKS) scores[p.id] = 0;
  for (const w of words) for (const p of PACKS) if (p.lex.includes(w)) scores[p.id]++;
  let best = 'signal';
  for (const k in scores) if (scores[k] > scores[best]) best = k;
  return { packId: best, scores };
}

export const CAPTION_STYLES: { id: CaptionStyleId; name: string; note: string }[] = [
  { id: 'box', name: 'Clean Box', note: 'Fixed box, words fade in' },
  { id: 'pop', name: 'Bold Pop', note: 'Outlined, active word pops' },
  { id: 'karaoke', name: 'Karaoke', note: 'Words fill as spoken' },
  { id: 'marker', name: 'Marker', note: 'Highlight slides word to word' },
  { id: 'one', name: 'One Word', note: 'One big word at a time' },
  { id: 'ticker', name: 'News Ticker', note: 'Lower-third bar with tag' },
  { id: 'outline', name: 'Outline', note: 'Hollow text fills in' },
  { id: 'stack', name: 'Stacked', note: 'Two huge lines, last word accent' },
  { id: 'underline', name: 'Underline', note: 'Accent line follows the voice' },
  { id: 'minimal', name: 'Minimal', note: 'Small, quiet, lowercase' },
  { id: 'frosted', name: 'Frosted', note: 'Blurred glass panel' },
  { id: 'serif', name: 'Editorial', note: 'Italic serif, accent word' },
];

export type Aspect = '9:16' | '4:5' | '16:9';
export const ASPECTS: Record<Aspect, { w: number; h: number }> = {
  '9:16': { w: 1080, h: 1920 },
  '4:5': { w: 1080, h: 1350 },
  '16:9': { w: 1920, h: 1080 },
};

// ---------- green screen backgrounds ----------
export type Bg =
  | { type: 'pack' }
  | { type: 'color'; value: string }
  | { type: 'gradient'; id: string }
  | { type: 'pattern'; id: string; color: string }
  | { type: 'photo'; dim: number };

export const BG_COLORS = ['#111110', '#F2EEE5', '#1E1714', '#13233A', '#0F1A15', '#D97757', '#2F5BEA', '#E9FF47', '#FF3B30', '#7FBF8E', '#E9A3A0', '#8C877D'];
export const BG_GRADIENTS: { id: string; name: string; a: string; b: string; angle: number }[] = [
  { id: 'ember', name: 'Ember', a: '#1B120D', b: '#D97757', angle: 160 },
  { id: 'sand', name: 'Sand', a: '#F3EDE2', b: '#C9B79A', angle: 180 },
  { id: 'forest', name: 'Forest', a: '#0B1410', b: '#2E5B45', angle: 165 },
  { id: 'harbor', name: 'Harbor', a: '#0E1A22', b: '#2A5A6B', angle: 170 },
  { id: 'charcoal', name: 'Charcoal', a: '#0D0D0D', b: '#3A3836', angle: 180 },
  { id: 'clay', name: 'Clay', a: '#3A1C14', b: '#E8906F', angle: 200 },
  { id: 'steel', name: 'Steel', a: '#15181D', b: '#59636F', angle: 150 },
  { id: 'paper', name: 'Paper', a: '#FAF7F0', b: '#E4DCCB', angle: 180 },
  { id: 'night', name: 'Night', a: '#0B0A09', b: '#2E2924', angle: 170 },
  { id: 'olive', name: 'Olive', a: '#1C2016', b: '#6E7848', angle: 160 },
  { id: 'wine', name: 'Wine', a: '#1E0F12', b: '#8C2F3A', angle: 165 },
  { id: 'sun', name: 'Sun', a: '#F5C842', b: '#E8552A', angle: 200 },
  { id: 'rose', name: 'Rose', a: '#F8ECE8', b: '#E2A497', angle: 190 },
  { id: 'mint', name: 'Mint', a: '#EEF5F0', b: '#A9CDB8', angle: 185 },
];
export const BG_PATTERNS: { id: string; name: string }[] = [
  { id: 'grid', name: 'Grid' }, { id: 'dots', name: 'Dots' }, { id: 'lines', name: 'Lines' }, { id: 'checker', name: 'Checker' }, { id: 'rings', name: 'Rings' }, { id: 'diag', name: 'Diagonal' },
];

export const FONT_LOADS = [
  '800 40px "Archivo"', '700 40px "Archivo"', '600 40px "JetBrains Mono"', '700 40px "JetBrains Mono"',
  '700 40px "Fraunces"', '700 40px "Manrope"', '800 40px "Manrope"', '400 40px "Anton"', '800 40px "Montserrat"',
  '700 40px "Space Grotesk"', '600 40px "Space Grotesk"', '800 40px "Sora"', '400 40px "Bebas Neue"',
  '400 40px "DM Serif Display"', '400 40px "Instrument Serif"', 'italic 400 40px "Instrument Serif"', '900 40px "Montserrat"', '900 40px "Archivo"', '600 40px "Manrope"',
  '800 40px "JetBrains Mono"', '500 40px "JetBrains Mono"', '400 40px "Instrument Serif"',
  '600 40px "Oswald"', '700 40px "Oswald"', '600 40px "Cormorant Garamond"', '700 40px "Cormorant Garamond"',
  '500 40px "Fredoka"', '600 40px "Fredoka"', '700 40px "Fredoka"', '700 40px "Caveat"', '600 40px "Chakra Petch"', '700 40px "Chakra Petch"',
  '500 40px "Geist"', '600 40px "Geist"', '700 40px "Geist"', '700 40px "Bricolage Grotesque"', '800 40px "Bricolage Grotesque"', '800 40px "Sora"',
];
