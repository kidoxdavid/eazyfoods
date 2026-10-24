import { lazy, Suspense, type ReactNode } from 'react';
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
import { CartPage } from './pages/Cart';
import { CheckoutPage } from './pages/Checkout';
import { OrdersPage, OrderPage } from './pages/Orders';
import { AccountPage } from './pages/Account';
import { SignIn, Register, Forgot, Reset, Verify } from './pages/Auth';
import { RecipesPage, RecipePage } from './pages/Recipes';
import { ContentPage } from './pages/ContentPage';
import { Unsubscribe } from './pages/Unsubscribe';

const Vendor = lazy(() => import('./portals/vendor'));
const Admin = lazy(() => import('./portals/admin'));
const Driver = lazy(() => import('./portals/driver'));
const Marketing = lazy(() => import('./portals/marketing'));

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
          <Suspense fallback={<div className="wrap"><Loading /></div>}>
            <Routes>
              <Route path="/vendor/*" element={<RequireAuth><Vendor /></RequireAuth>} />
              <Route path="/admin/*" element={<RequireAuth><Admin /></RequireAuth>} />
              <Route path="/driver/*" element={<RequireAuth><Driver /></RequireAuth>} />
              <Route path="/marketing/*" element={<RequireAuth><Marketing /></RequireAuth>} />
              <Route path="*" element={
                <Site>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/deals" element={<FeedPage title="Weekly deals" sub="Live promotions from stores. Prices shown are what you pay." path="/deals" empty="No promotions are running right now." />} />
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
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot" element={<Forgot />} />
                    <Route path="/reset" element={<Reset />} />
                    <Route path="/verify" element={<Verify />} />
                    <Route path="/pages/:slug" element={<ContentPage />} />
                    <Route path="/unsubscribe/:token" element={<Unsubscribe />} />
                    <Route path="*" element={<Empty title="Page not found"><Link to="/">Back to the shop</Link></Empty>} />
                  </Routes>
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
