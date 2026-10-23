import { Navigate, Route, Routes } from 'react-router-dom';
import AuthPage from './pages/AuthPage.jsx';
import Home from './pages/Home.jsx';
import Article from './pages/Article.jsx';
import Admin from './pages/Admin.jsx';
import ShareNews from './pages/ShareNews.jsx';
import Contact from './pages/Contact.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function Shell({ children }) {
  return (
    <div className="site-layout">
      <Navbar />
      <main className="container page">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* First landing / access page: login + registration */}
      <Route path="/" element={<AuthPage />} />

      {/* Main news feed / homepage */}
      <Route
        path="/news"
        element={
          <Shell>
            <Home />
          </Shell>
        }
      />

      {/* Single story details page */}
      <Route
        path="/news/:id"
        element={
          <Shell>
            <Article />
          </Shell>
        }
      />

      {/* Share News & Advertise (Razorpay Payment Gateway ₹49) */}
      <Route
        path="/share-news"
        element={
          <Shell>
            <ShareNews />
          </Shell>
        }
      />
      <Route path="/submit-news" element={<Navigate to="/share-news" replace />} />
      <Route path="/advertise" element={<Navigate to="/share-news?type=ad" replace />} />

      {/* Public informational & editorial pages */}
      <Route path="/about" element={<Navigate to="/news" replace />} />
      <Route
        path="/contact"
        element={
          <Shell>
            <Contact />
          </Shell>
        }
      />
      <Route
        path="/privacy"
        element={
          <Shell>
            <Privacy />
          </Shell>
        }
      />
      <Route
        path="/terms"
        element={
          <Shell>
            <Terms />
          </Shell>
        }
      />

      {/* Administrator desk (restricted to admin & primary_admin) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Shell>
              <Admin />
            </Shell>
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
