import { User, Smile, Heart, Star, ShoppingBag, Sparkles } from 'lucide-react'

export const AVATAR_ICON_KEY = 'customer_avatar_icon'

export const AVATAR_ICONS = {
  user: { Icon: User, label: 'Default', bg: 'bg-slate-500', text: 'text-white' },
  smile: { Icon: Smile, label: 'Smile', bg: 'bg-amber-400', text: 'text-amber-900' },
  heart: { Icon: Heart, label: 'Heart', bg: 'bg-rose-500', text: 'text-white' },
  star: { Icon: Star, label: 'Star', bg: 'bg-yellow-400', text: 'text-yellow-900' },
  bag: { Icon: ShoppingBag, label: 'Bag', bg: 'bg-emerald-500', text: 'text-white' },
  sparkles: { Icon: Sparkles, label: 'Sparkles', bg: 'bg-violet-500', text: 'text-white' },
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
