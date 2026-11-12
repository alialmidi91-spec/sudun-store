import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout, PageLoader } from './components/Layout';
import { CartProvider } from './context/CartContext';
import HomePage from './pages/HomePage';

// الصفحات الثانوية تُحمّل عند الحاجة لتسريع فتح الموقع
const ShopPage = lazy(() => import('./pages/ShopPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const DeliveryPage = lazy(() => import('./pages/DeliveryPage'));
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
// لوحة التحكم تُحمّل منفصلة فقط لمن يفتح /admin (ما تزيد حجم المتجر على الزبائن)
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const ProductsAdminPage = lazy(() => import('./admin/ProductsAdminPage'));
const ProductEditorPage = lazy(() => import('./admin/ProductEditorPage'));

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminLayout />
              </Suspense>
            }
          >
            <Route path="admin" element={<ProductsAdminPage />} />
            <Route path="admin/products/new" element={<ProductEditorPage />} />
            <Route path="admin/products/:id" element={<ProductEditorPage />} />
          </Route>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="product/:slug" element={<ProductPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="delivery" element={<DeliveryPage />} />
            <Route path="returns" element={<ReturnsPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}
