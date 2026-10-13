/**
 * Script to systematically fix loading issues across all frontend pages
 * This identifies common patterns and provides fixes
 */

// Common fixes needed:
// 1. Add timeout to all API calls
// 2. Add safety timeout in useEffect
// 3. Ensure loading is always set to false
// 4. Add proper error handling
// 5. Add cleanup in useEffect

const fixes = {
  // Pattern 1: useEffect without timeout
  pattern1: {
    find: /useEffect\(\(\) => \{[^}]*api\.(get|post|put|delete)\([^)]*\)[^}]*\}, \[\]\)/gs,
    replace: (match) => {
      // Add safety timeout and cleanup
      return match.replace(
        /useEffect\(\(\) => \{/,
        `useEffect(() => {
      let isMounted = true
      const safetyTimeout = setTimeout(() => {
        if (isMounted && loading) {
          setLoading(false)
        }
      }, 15000)`
      ).replace(
        /\}, \[\]\)/,
        `}
      return () => {
        isMounted = false
        clearTimeout(safetyTimeout)
      }
    }, [])`
      )
    }
  },
  
  // Pattern 2: API calls without timeout
  pattern2: {
    find: /api\.(get|post|put|delete)\(([^,)]+)\)/g,
    replace: (match, method, url) => {
      // Add timeout parameter
      if (!match.includes('timeout')) {
        return `api.${method}(${url}, { timeout: 10000 })`
      }
      return match
    }
  }
}

// Export for use in fixing scripts
module.exports = { fixes }

