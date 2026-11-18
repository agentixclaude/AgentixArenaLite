// Icons: the Lucide set (ISC licence), converted to path strings so the same icon renders
// in the UI (SVG) and on the video canvas (Path2D) with a stroke draw-on animation.
import {
  Cpu, Briefcase, CircleDollarSign, Flame, SlidersHorizontal, Mic, Dumbbell, ChefHat, House, BookOpen, Rocket, Megaphone, Plane,
  HeartPulse, CodeXml, Shirt, TrendingUp, TrendingDown, Clock, Users, Lightbulb, TriangleAlert, CircleCheck, Target, Lock, Zap, Globe,
  CalendarDays, Mail, Star, ChartColumn, CirclePlay, Smartphone, Bell, Heart, Link, MessageCircle, ShoppingCart, Camera, Captions,
  Image, Palette, Grid3x3, WandSparkles, Activity, Brain, BadgeCheck, GraduationCap, Utensils,
  TextAlignStart, TextAlignCenter, TextAlignEnd, Eye, EyeOff, Type, RotateCcw, Film, Upload, Trash2, Copy, Clapperboard,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  CaseSensitive, CaseUpper, CaseLower, Italic, Layers, Move, ImagePlus, Shuffle, ListVideo, Blend, Box, ALargeSmall, LetterText, PanelsTopLeft,
  Music, Pause, Play, AudioLines, Check, Trophy, Gamepad2, Car, Bitcoin, Newspaper, Landmark, FlaskConical, Mountain, Aperture, Laugh, PawPrint,
  Scissors, Baby, Sparkles, Leaf, ListChecks, Scale, Gem, Moon, Handshake,
} from 'lucide';

type Node = [string, Record<string, string | number>][];
const n = (v: string | number | undefined) => Number(v ?? 0);
function toPath(node: Node): string {
  return node.map(([tag, a]) => {
    switch (tag) {
      case 'path': {
        // A leading relative moveto is absolute in its own path, but not once paths are joined.
        const d = String(a.d).trim();
        const m = d.match(/^m\s*(-?\d*\.?\d+)[\s,]*(-?\d*\.?\d+)(.*)$/s);
        if (!m) return d;
        const rest = m[3].trim();
        return `M${m[1]} ${m[2]}` + (rest && /^[-+.\d]/.test(rest) ? `l${rest}` : rest);
      }
      case 'circle': { const cx = n(a.cx), cy = n(a.cy), r = n(a.r); return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`; }
      case 'ellipse': { const cx = n(a.cx), cy = n(a.cy), rx = n(a.rx), ry = n(a.ry); return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`; }
      case 'line': return `M${n(a.x1)} ${n(a.y1)}L${n(a.x2)} ${n(a.y2)}`;
      case 'polyline': case 'polygon': { const pts = String(a.points).trim().split(/[\s,]+/).map(Number); let d = `M${pts[0]} ${pts[1]}`; for (let i = 2; i < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`; return tag === 'polygon' ? d + 'Z' : d; }
      case 'rect': {
        const x = n(a.x), y = n(a.y), w = n(a.width), h = n(a.height);
        const rx = Math.min(n(a.rx ?? a.ry), w / 2), ry = Math.min(n(a.ry ?? a.rx), h / 2);
        if (!rx) return `M${x} ${y}h${w}v${h}h${-w}Z`;
        return `M${x + rx} ${y}h${w - 2 * rx}a${rx} ${ry} 0 0 1 ${rx} ${ry}v${h - 2 * ry}a${rx} ${ry} 0 0 1 ${-rx} ${ry}h${-(w - 2 * rx)}a${rx} ${ry} 0 0 1 ${-rx} ${-ry}v${-(h - 2 * ry)}a${rx} ${ry} 0 0 1 ${rx} ${-ry}Z`;
      }
      default: return '';
    }
  }).join(' ');
}

const SRC: Record<string, unknown> = {
  cpu: Cpu, briefcase: Briefcase, dollar: CircleDollarSign, flame: Flame, sliders: SlidersHorizontal, mic: Mic, dumbbell: Dumbbell,
  utensils: ChefHat, fork: Utensils, home: House, book: BookOpen, rocket: Rocket, megaphone: Megaphone, plane: Plane, pulse: HeartPulse,
  code: CodeXml, shirt: Shirt, up: TrendingUp, down: TrendingDown, clock: Clock, users: Users, bulb: Lightbulb, alert: TriangleAlert,
  check: CircleCheck, target: Target, lock: Lock, zap: Zap, globe: Globe, calendar: CalendarDays, mail: Mail, star: Star,
  chart: ChartColumn, play: CirclePlay, phone: Smartphone, bell: Bell, heart: Heart, link: Link, message: MessageCircle,
  cart: ShoppingCart, camera: Camera, captions: Captions, image: Image, palette: Palette, grid: Grid3x3, wand: WandSparkles,
  sparkline: Activity, brain: Brain, badge: BadgeCheck, school: GraduationCap,
  alignL: TextAlignStart, alignC: TextAlignCenter, alignR: TextAlignEnd, eye: Eye, eyeOff: EyeOff, type: Type, reset: RotateCcw, film: Film,
  upload: Upload, trash: Trash2, copy: Copy, clap: Clapperboard, hStart: AlignHorizontalJustifyStart, hCenter: AlignHorizontalJustifyCenter,
  hEnd: AlignHorizontalJustifyEnd, vStart: AlignVerticalJustifyStart, vCenter: AlignVerticalJustifyCenter, vEnd: AlignVerticalJustifyEnd,
  caseS: CaseSensitive, caseU: CaseUpper, caseL: CaseLower, italic: Italic, layers: Layers, move: Move, imagePlus: ImagePlus,
  shuffle: Shuffle, shots: ListVideo, blend: Blend, box: Box, size: ALargeSmall, letter: LetterText, panels: PanelsTopLeft,
  music: Music, pause: Pause, playTri: Play, wave: AudioLines, checkMark: Check, trophy: Trophy, gamepad: Gamepad2, car: Car, bitcoin: Bitcoin,
  newspaper: Newspaper, landmark: Landmark, flask: FlaskConical, mountain: Mountain, aperture: Aperture, laugh: Laugh, paw: PawPrint,
  scissors: Scissors, baby: Baby, sparkles: Sparkles, leaf: Leaf, listChecks: ListChecks, scale: Scale, gem: Gem, moon: Moon, handshake: Handshake,
};
export const ICONS: Record<string, string> = Object.fromEntries(Object.entries(SRC).map(([k, v]) => [k, toPath(v as Node)]));

const KEYMAP: [RegExp, string][] = [
  [/^(money|dollars?|rupees?|price|prices|cost|costs|revenue|profit|profits|income|paid|cash|salary|earn|earning|budget)$/, 'dollar'],
  [/^(grow|growth|growing|increase|increased|scale|scaling|double|doubled|boost|gain|gains)$/, 'up'],
  [/^(drop|dropped|decrease|lose|losing|loss|fall|fell|crash|decline)$/, 'down'],
  [/^(time|minutes?|hours?|seconds?|today|years?|days?|weeks?|months?|later|deadline)$/, 'clock'],
  [/^(people|team|customers?|clients?|audience|followers|users|community|everyone|friends)$/, 'users'],
  [/^(idea|ideas|secret|secrets|tip|tips|hack|trick|learned|lesson)$/, 'bulb'],
  [/^(think|thinking|mind|brain|smart|memory|focus)$/, 'brain'],
  [/^(mistake|mistakes|warning|stop|avoid|problem|problems|wrong|risk|danger|never|scam)$/, 'alert'],
  [/^(done|correct|easy|works|proven|simple|yes|finally|solved)$/, 'check'],
  [/^(goal|goals|target|focus|aim|plan|strategy|mission)$/, 'target'],
  [/^(security|private|privacy|safe|password|secure|protect)$/, 'lock'],
  [/^(power|powerful|energy|instant|instantly|fast|faster|speed|quick|quickly)$/, 'zap'],
  [/^(world|global|internet|online|website|web|worldwide|countries)$/, 'globe'],
  [/^(date|schedule|calendar|weekend|monday|event)$/, 'calendar'],
  [/^(email|emails|mail|inbox|newsletter)$/, 'mail'],
  [/^(best|top|star|rating|review|reviews|favorite|quality|premium)$/, 'star'],
  [/^(data|results|numbers|chart|stats|statistics|percent|analytics|metrics)$/, 'chart'],
  [/^(video|videos|watch|youtube|reel|reels|content|film|shorts)$/, 'play'],
  [/^(phone|app|apps|mobile|iphone|android)$/, 'phone'],
  [/^(ai|chip|chips|computer|gpu|nvidia|model|models|software|tech|technology|robot|robots|openai|claude|gemini|gpt)$/, 'cpu'],
  [/^(code|coding|developer|developers|program|programming|api|build|built)$/, 'code'],
  [/^(business|company|companies|work|job|jobs|office|career|startup|brand|agency)$/, 'briefcase'],
  [/^(fire|hot|viral|passion|crazy|insane|burn)$/, 'flame'],
  [/^(podcast|talk|voice|audio|speak|interview)$/, 'mic'],
  [/^(gym|workout|fitness|muscle|muscles|body|training|exercise|strength)$/, 'dumbbell'],
  [/^(food|eat|eating|recipe|cook|cooking|kitchen|diet|meal|protein)$/, 'utensils'],
  [/^(home|house|property|estate|rent|apartment|mortgage)$/, 'home'],
  [/^(school|course|courses|education|student|students|class|degree|exam|university)$/, 'school'],
  [/^(book|books|study|read|reading|learn|learning)$/, 'book'],
  [/^(launch|launched|rocket|ship|shipped|release|released)$/, 'rocket'],
  [/^(marketing|ads|ad|promote|promotion|campaign|sales)$/, 'megaphone'],
  [/^(travel|trip|flight|fly|visit|vacation|journey)$/, 'plane'],
  [/^(health|healthy|heart|doctor|sleep|stress|mental|wellness)$/, 'pulse'],
  [/^(fashion|style|clothes|outfit|wear|beauty|skin|skincare|makeup)$/, 'shirt'],
  [/^(buy|shop|store|sell|selling|product|products|order|ecommerce)$/, 'cart'],
  [/^(message|dm|comment|comments|chat|reply)$/, 'message'],
  [/^(link|bio|click)$/, 'link'],
  [/^(subscribe|notification|notifications|alert)$/, 'bell'],
  [/^(like|love|loved|care)$/, 'heart'],
  [/^(photo|photos|camera|picture|pictures|image|images)$/, 'camera'],
];

export function iconFor(word: string): string | null {
  const w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [re, ic] of KEYMAP) if (re.test(w)) return ic;
  return null;
}
export function iconForText(text: string, fallback: string): string {
  for (const w of text.split(/\s+/)) { const ic = iconFor(w); if (ic) return ic; }
  return fallback;
}

const cache = new Map<string, Path2D>();
const path = (name: string) => {
  let p = cache.get(name);
  if (!p) { p = new Path2D(ICONS[name] ?? ICONS.star); cache.set(name, p); }
  return p;
};

/** Draw an icon with a stroke draw-on animation (progress 0..1). */
export function drawIcon(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, size: number, color: string, progress = 1, weight = 2) {
  if (progress <= 0) return;
  const s = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (progress < 1) { ctx.setLineDash([90, 90]); ctx.lineDashOffset = 90 * (1 - progress); }
  ctx.stroke(path(name));
  ctx.restore();
}
