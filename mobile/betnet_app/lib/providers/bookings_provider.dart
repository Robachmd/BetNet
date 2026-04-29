import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/booking.dart';
import '../services/betnet_api.dart';

final renterBookingsProvider =
    FutureProvider.autoDispose<List<BookingItem>>((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) return [];
  return ref.watch(betNetApiProvider).fetchBookings();
});

final ownerBookingsProvider = FutureProvider.autoDispose<List<BookingItem>>((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated || !(auth.user?.isPropertyOwner ?? false)) return [];
  return ref.watch(betNetApiProvider).fetchPropertyOwnerBookings();
});
