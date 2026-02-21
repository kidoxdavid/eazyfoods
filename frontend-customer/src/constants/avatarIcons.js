import {
  User,
  UserCircle,
  Smile,
  Heart,
  Star,
  Sparkles,
  ShoppingBag,
  Bot,
  Ghost,
  Cat,
  Coffee,
  Sun,
  Moon,
  Zap,
  Flower2,
  Music,
  Palette,
  Gamepad2,
  Camera,
  Pizza,
  IceCream,
  Cookie,
  UtensilsCrossed,
  Gem,
  Crown,
  Rocket,
  Bird,
  Fish,
  Bug,
  Leaf,
} from 'lucide-react'

export const AVATAR_ICON_KEY = 'customer_avatar_icon'

// Picture/cartoon-style icon avatars with distinct colors
export const AVATAR_ICONS = {
  user: { Icon: User, label: 'Default', bg: 'bg-slate-500', text: 'text-white' },
  usercircle: { Icon: UserCircle, label: 'Circle', bg: 'bg-slate-600', text: 'text-white' },
  smile: { Icon: Smile, label: 'Smile', bg: 'bg-amber-400', text: 'text-amber-900' },
  heart: { Icon: Heart, label: 'Heart', bg: 'bg-rose-500', text: 'text-white' },
  star: { Icon: Star, label: 'Star', bg: 'bg-yellow-500', text: 'text-yellow-900' },
  sparkles: { Icon: Sparkles, label: 'Sparkles', bg: 'bg-violet-500', text: 'text-white' },
  bag: { Icon: ShoppingBag, label: 'Bag', bg: 'bg-emerald-500', text: 'text-white' },
  bot: { Icon: Bot, label: 'Bot', bg: 'bg-cyan-500', text: 'text-white' },
  ghost: { Icon: Ghost, label: 'Ghost', bg: 'bg-gray-400', text: 'text-gray-900' },
  cat: { Icon: Cat, label: 'Cat', bg: 'bg-orange-400', text: 'text-orange-900' },
  coffee: { Icon: Coffee, label: 'Coffee', bg: 'bg-amber-700', text: 'text-amber-100' },
  sun: { Icon: Sun, label: 'Sun', bg: 'bg-amber-300', text: 'text-amber-900' },
  moon: { Icon: Moon, label: 'Moon', bg: 'bg-indigo-800', text: 'text-indigo-200' },
  zap: { Icon: Zap, label: 'Zap', bg: 'bg-yellow-400', text: 'text-yellow-900' },
  flower: { Icon: Flower2, label: 'Flower', bg: 'bg-pink-400', text: 'text-pink-900' },
  music: { Icon: Music, label: 'Music', bg: 'bg-fuchsia-500', text: 'text-white' },
  palette: { Icon: Palette, label: 'Palette', bg: 'bg-rose-400', text: 'text-rose-900' },
  gamepad: { Icon: Gamepad2, label: 'Game', bg: 'bg-green-500', text: 'text-white' },
  camera: { Icon: Camera, label: 'Camera', bg: 'bg-sky-500', text: 'text-white' },
  pizza: { Icon: Pizza, label: 'Pizza', bg: 'bg-orange-500', text: 'text-white' },
  icecream: { Icon: IceCream, label: 'Ice cream', bg: 'bg-pink-300', text: 'text-pink-900' },
  cookie: { Icon: Cookie, label: 'Cookie', bg: 'bg-amber-600', text: 'text-amber-100' },
  utensils: { Icon: UtensilsCrossed, label: 'Food', bg: 'bg-primary-500', text: 'text-white' },
  gem: { Icon: Gem, label: 'Gem', bg: 'bg-teal-500', text: 'text-white' },
  crown: { Icon: Crown, label: 'Crown', bg: 'bg-amber-500', text: 'text-amber-900' },
  rocket: { Icon: Rocket, label: 'Rocket', bg: 'bg-blue-500', text: 'text-white' },
  bird: { Icon: Bird, label: 'Bird', bg: 'bg-sky-400', text: 'text-sky-900' },
  fish: { Icon: Fish, label: 'Fish', bg: 'bg-blue-400', text: 'text-blue-900' },
  bug: { Icon: Bug, label: 'Bug', bg: 'bg-lime-500', text: 'text-white' },
  leaf: { Icon: Leaf, label: 'Leaf', bg: 'bg-green-500', text: 'text-white' },
}

export const getAvatarIcon = (key) => {
  const k = key && AVATAR_ICONS[key] ? key : 'user'
  return AVATAR_ICONS[k].Icon
}

export const getAvatarStyle = (key) => {
  const k = key && AVATAR_ICONS[key] ? key : 'user'
  const { bg, text } = AVATAR_ICONS[k]
  return { bg, text }
}
