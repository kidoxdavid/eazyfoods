import { User, Smile, Heart, Star, ShoppingBag, Sparkles } from 'lucide-react'

export const AVATAR_ICON_KEY = 'customer_avatar_icon'

export const AVATAR_ICONS = {
  user: { Icon: User, label: 'Default' },
  smile: { Icon: Smile, label: 'Smile' },
  heart: { Icon: Heart, label: 'Heart' },
  star: { Icon: Star, label: 'Star' },
  bag: { Icon: ShoppingBag, label: 'Bag' },
  sparkles: { Icon: Sparkles, label: 'Sparkles' },
}

export const getAvatarIcon = (key) => {
  const k = key && AVATAR_ICONS[key] ? key : 'user'
  return AVATAR_ICONS[k].Icon
}
