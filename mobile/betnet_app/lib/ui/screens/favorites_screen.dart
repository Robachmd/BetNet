import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/property.dart';
import '../../services/betnet_api.dart';
import '../widgets/property_card.dart';
import 'login_screen.dart';
import 'property_detail_screen.dart';

final favoritesProvider =
    FutureProvider.autoDispose<List<PropertySummary>>((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) return [];
  final api = ref.watch(betNetApiProvider);
  return api.fetchFavorites();
});

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Saved')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Log in to save homes and sync across devices.'),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
                    );
                  },
                  child: const Text('Log in'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final async = ref.watch(favoritesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Saved')),
      body: async.when(
        data: (list) {
          if (list.isEmpty) {
            return const Center(child: Text('No saved listings yet.'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(favoritesProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              itemBuilder: (_, i) {
                final p = list[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: PropertyCard(
                    property: p,
                    onTap: () {
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => PropertyDetailScreen(slug: p.slug),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }
}
