import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ adminOnly = false, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && user.role !== 'admin' && user.role !== 'primary_admin') {
    return <Navigate to="/news" replace />;
  }
  return children;
}
