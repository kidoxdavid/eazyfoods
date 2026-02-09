# Debug Click Issues

If clicks aren't working, check:

1. **Browser Console (F12)** - Look for JavaScript errors
2. **Check if modal is stuck open** - The modal should only show when you click "Change"
3. **Try clicking in different areas** - Header, footer, main content
4. **Check Network tab** - See if API calls are failing

## Quick Test

Open browser console and run:
```javascript
document.addEventListener('click', (e) => console.log('Click detected:', e.target))
```

This will show if clicks are being detected at all.

## Common Issues

1. **Modal stuck open** - Check if `showAddressModal` is true in React DevTools
2. **Z-index conflict** - Check computed styles in DevTools
3. **JavaScript error** - Check console for red errors
4. **CSS pointer-events** - Check if any element has `pointer-events: none`

