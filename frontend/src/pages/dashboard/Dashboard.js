import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function Dashboard() {
  const { user, isLoading, isAdmin, isLandlord, isRenter } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (isAdmin) {
      navigate('/dashboard/admin', { replace: true });
    } else if (isLandlord) {
      navigate('/dashboard/landlord', { replace: true });
    } else if (isRenter) {
      navigate('/dashboard/renter', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [user, isLoading, isAdmin, isLandlord, isRenter, navigate]);

  return <LoadingSpinner fullScreen text="Redirecting to your dashboard..." />;
}
