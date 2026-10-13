import PageHeader from './PageHeader'
import AdCarousel from './AdCarousel'

// Placement name -> a short label shown above the title
const EYEBROWS = {
  groceries: 'Shop', products: 'Shop', stores: 'Local markets', chefs: 'Home kitchens', meals: 'Cook', cart: 'Your basket',
  orders: 'Your orders', profile: 'Your profile', about: 'Our story', contact: 'Help', become_a_driver: 'Drive with us',
  top_market_deals: 'Deals', top_chef_deals: 'Deals',
}

/**
 * Page title block + the ad placement for that page.
 *  - default: editorial header, then the page's configured ads (nothing if none are configured)
 *  - size="tall": the bottom-of-page placement; shows the ads, or `defaultContent` when there are none
 */
const PageBanner = ({ title, subtitle, placement, defaultContent, size, eyebrow }) => {
  if (size === 'tall') {
    return <AdCarousel placements={[placement]} fallback={defaultContent} className="mt-16" />
  }
  const key = (placement || '').replace(/_(top|bottom)_banner$/, '')
  return (
    <>
      <PageHeader eyebrow={eyebrow || EYEBROWS[key]} title={title} subtitle={subtitle} />
      {placement && <AdCarousel placements={[placement]} className="mt-6" />}
    </>
  )
}

export default PageBanner
