export const haptic = async (style = 'light') => {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    const s = style === 'heavy' ? ImpactStyle.Heavy
             : style === 'medium' ? ImpactStyle.Medium
             : ImpactStyle.Light
    await Haptics.impact({ style: s })
  } catch (_) {}
}

export const hapticNotify = async (type = 'success') => {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    const t = type === 'error' ? NotificationType.Error
             : type === 'warning' ? NotificationType.Warning
             : NotificationType.Success
    await Haptics.notification({ type: t })
  } catch (_) {}
}
