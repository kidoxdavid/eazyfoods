import { Suspense, useEffect, type ReactNode } from 'react';
import { LiveBoundary } from './live';
import { SkelPage } from './skeletons';
import { Link, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { CartProvider } from './cart';
import { ToastProvider } from './toast';
import { PlaceProvider } from './place';
import { ThemeProvider } from './theme';
import { Footer, Header, TabBar } from './shell';
import { Empty, Loading } from './ui';
import { RequireAuth } from './guard';
import { Home } from './pages/Home';
import { SearchPage } from './pages/Search';
import { ProductPage } from './pages/Product';
import { StorePage, StoresPage } from './pages/Store';
import { KitchenPage, KitchensPage } from './pages/Kitchens';
import { CollectionPage, FeedPage } from './pages/Collection';
import { FlyerPage } from './pages/Flyer';
import { CreditPage } from './pages/Credit';
import { HelpPage } from './pages/Help';
import { GiftCardDonePage, GiftCardPage } from './pages/GiftCards';
import { CartPage } from './pages/Cart';
import { CheckoutPage } from './pages/Checkout';
import { OrdersPage, OrderPage } from './pages/Orders';
import { AccountPage } from './pages/Account';
import { SignIn, Register, Forgot, Reset, Verify } from './pages/Auth';
import { RecipesPage, RecipePage } from './pages/Recipes';
import { ContentPage } from './pages/ContentPage';
import { Unsubscribe } from './pages/Unsubscribe';
import { AlertsPage, ListPage, ListsPage, SharedListPage } from './pages/Lists';


/** The staff areas are their own apps (portal.html); reaching one from inside the shop is a full page load. */
function HardNav() {
  useEffect(() => {
    try { const last = Number(sessionStorage.getItem('hardnav') ?? 0); if (Date.now() - last < 3000) return; sessionStorage.setItem('hardnav', String(Date.now())); } catch { /* storage blocked: still go */ }
    window.location.replace(window.location.pathname + window.location.search);
  }, []);
  return <SkelPage />;
}

const Site = ({ children }: { children: ReactNode }) => (
  <>
    <a className="skip" href="#main">Skip to content</a>
    <Header />
    <main id="main" className="wrap">{children}</main>
    <Footer />
    <TabBar />
  </>
);

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
         <PlaceProvider>
          <ThemeProvider>
          <Suspense fallback={<SkelPage />}>
            <Routes>
              <Route path="/admin/*" element={<HardNav />} /><Route path="/marketing/*" element={<HardNav />} /><Route path="/vendor/*" element={<HardNav />} /><Route path="/driver/*" element={<HardNav />} /><Route path="/portals" element={<HardNav />} /><Route path="/finance/*" element={<HardNav />} /><Route path="/kitchen/*" element={<HardNav />} />
              <Route path="*" element={
                <Site>
                  <LiveBoundary>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/deals" element={<FeedPage title="Weekly deals" sub="Live promotions from stores. Prices shown are what you pay." path="/deals" empty="No promotions are running right now." />} />
                    <Route path="/flyer" element={<FlyerPage />} /><Route path="/credit" element={<RequireAuth><CreditPage /></RequireAuth>} /><Route path="/help" element={<HelpPage />} /><Route path="/gift-cards" element={<GiftCardPage />} /><Route path="/gift-cards/:id" element={<RequireAuth><GiftCardDonePage /></RequireAuth>} />
                    <Route path="/new" element={<FeedPage title="New arrivals" sub="Recently added to the catalogue." path="/new-arrivals" empty="Nothing new yet." />} />
                    <Route path="/stores" element={<StoresPage />} />
                    <Route path="/s/:slug" element={<StorePage />} />
                    <Route path="/kitchens" element={<KitchensPage />} />
                    <Route path="/k/:slug" element={<KitchenPage />} />
                    <Route path="/c/:slug" element={<CollectionPage />} />
                    <Route path="/p/:slug" element={<ProductPage />} />
                    <Route path="/recipes" element={<RecipesPage />} />
                    <Route path="/recipes/:slug" element={<RecipePage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
                    <Route path="/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
                    <Route path="/orders/:id" element={<RequireAuth><OrderPage /></RequireAuth>} />
                    <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
                    <Route path="/lists" element={<RequireAuth><ListsPage /></RequireAuth>} /><Route path="/lists/:id" element={<RequireAuth><ListPage /></RequireAuth>} /><Route path="/l/:token" element={<SharedListPage />} /><Route path="/alerts" element={<RequireAuth><AlertsPage /></RequireAuth>} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot" element={<Forgot />} />
                    <Route path="/reset" element={<Reset />} />
                    <Route path="/verify" element={<Verify />} />
                    <Route path="/pages/:slug" element={<ContentPage />} />
                    <Route path="/unsubscribe/:token" element={<Unsubscribe />} />
                    <Route path="*" element={<Empty title="Page not found"><Link to="/">Back to the shop</Link></Empty>} />
                  </Routes>
                  </LiveBoundary>
                </Site>
              } />
            </Routes>
          </Suspense>
          </ThemeProvider>
         </PlaceProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
