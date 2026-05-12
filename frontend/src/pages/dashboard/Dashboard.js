import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function Dashboard() {
  const {
    user,
    isLoading,
    isAdmin,
    canAccessPropertyOwner,
    isOwnerMode,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (isAdmin) {
      navigate('/dashboard/admin', { replace: true });
      return;
    }
    if (canAccessPropertyOwner && isOwnerMode) {
      navigate('/dashboard/property-owner', { replace: true });
      return;
    }
    navigate('/dashboard/renter', { replace: true });
  }, [user, isLoading, isAdmin, canAccessPropertyOwner, isOwnerMode, navigate]);

  return <LoadingSpinner page text="Redirecting to your dashboard..." />;
}
