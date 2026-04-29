import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/bookings_provider.dart';
import '../widgets/app_primitives.dart';
import '../screens/favorites_screen.dart';
import '../screens/location_alerts_screen.dart';
import '../screens/notifications_screen.dart';
import '../screens/reviews_screen.dart';

class RenterDashboardScreen extends ConsumerWidget {
  const RenterDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingsAsync = ref.watch(renterBookingsProvider);
    final favoritesAsync = ref.watch(favoritesProvider);
    final notifAsync = ref.watch(notificationsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Renter Dashboard')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard(
            title: 'Overview',
            subtitle: 'Your renter activity at a glance',
            child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              StatCard(
                label: 'My bookings',
                value: bookingsAsync.when(
                  data: (v) => '${v.length}',
                  loading: () => '...',
                  error: (_, __) => '!',
                ),
                icon: Icons.event_note_outlined,
              ),
              StatCard(
                label: 'Saved homes',
                value: favoritesAsync.when(
                  data: (v) => '${v.length}',
                  loading: () => '...',
                  error: (_, __) => '!',
                ),
                icon: Icons.favorite_outline,
              ),
              StatCard(
                label: 'Unread alerts',
                value: notifAsync.when(
                  data: (v) => '${v.where((n) => !n.isRead).length}',
                  loading: () => '...',
                  error: (_, __) => '!',
                ),
                icon: Icons.notifications_outlined,
              ),
            ],
          ),
          ),
          const SizedBox(height: 16),
          SectionCard(
            title: 'Actions',
            child: Column(
              children: [
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const LocationAlertsScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.location_on_outlined),
                  label: const Text('Location alerts'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(builder: (_) => const ReviewsScreen()),
                    );
                  },
                  icon: const Icon(Icons.rate_review_outlined),
                  label: const Text('My reviews'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const FavoritesScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.favorite_outline),
                  label: const Text('Saved listings'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
