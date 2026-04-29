import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/models/property.dart';
import '../../services/betnet_api.dart';
import 'edit_listing_screen.dart';

final myListingsProvider = FutureProvider.autoDispose<List<PropertySummary>>((ref) async {
  return ref.watch(betNetApiProvider).fetchMyProperties();
});

class MyListingsScreen extends ConsumerStatefulWidget {
  const MyListingsScreen({super.key});

  @override
  ConsumerState<MyListingsScreen> createState() => _MyListingsScreenState();
}

class _MyListingsScreenState extends ConsumerState<MyListingsScreen> {
  bool _busy = false;

  Future<void> _publish(String slug) async {
    setState(() => _busy = true);
    try {
      final result = await ref.read(betNetApiProvider).publishProperty(slug);
      if (mounted) {
        final detail = result['detail']?.toString() ?? 'Publish action completed.';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(detail)));
      }
      ref.invalidate(myListingsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(myListingsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My listings')),
      body: async.when(
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('No listings yet.'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myListingsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              itemBuilder: (context, i) {
                final p = items[i];
                return Card(
                  child: ListTile(
                    title: Text(p.title),
                    subtitle: Text('${p.locationLine} · ${p.priceCurrency} ${p.priceMonthly}'),
                    onTap: () => context.push('/property/${p.slug}'),
                    trailing: Wrap(
                      spacing: 6,
                      children: [
                        TextButton(
                          onPressed: () async {
                            await Navigator.push<void>(
                              context,
                              MaterialPageRoute<void>(
                                builder: (_) => EditListingScreen(propertySlug: p.slug),
                              ),
                            );
                            if (mounted) ref.invalidate(myListingsProvider);
                          },
                          child: const Text('Edit'),
                        ),
                        FilledButton.tonal(
                          onPressed: _busy ? null : () => _publish(p.slug),
                          child: const Text('Publish'),
                        ),
                      ],
                    ),
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
