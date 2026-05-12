import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';

final ownerEngagementProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(betNetApiProvider);
  return api.fetchOwnerListingsEngagement();
});

class OwnerEngagementScreen extends ConsumerWidget {
  const OwnerEngagementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(ownerEngagementProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Engagement insights')),
      body: async.when(
        data: (data) {
          final listings = (data['listings'] as List?) ?? const [];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SectionCard(
                title: 'How your listings are performing',
                subtitle: 'Views, favorites, and conversations for the last 30 days.',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Range: ${data['start_date'] ?? ''} → ${data['end_date'] ?? ''}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (listings.isEmpty)
                const SectionCard(
                  title: 'No listings yet',
                  subtitle: 'Create a listing to start getting engagement.',
                  child: SizedBox.shrink(),
                )
              else
                ...listings.map((row) {
                  final m = row is Map ? row : <String, dynamic>{};
                  final title = (m['title'] ?? '').toString();
                  final viewsRange = (m['views_range'] as num?)?.toInt() ?? 0;
                  final favRange = (m['favorites_range'] as num?)?.toInt() ?? 0;
                  final totalViews = (m['total_views'] as num?)?.toInt() ?? 0;
                  final favTotal = (m['favorites_total'] as num?)?.toInt() ?? 0;
                  final conv = (m['conversations_total'] as num?)?.toInt() ?? 0;
                  final published = m['is_published'] == true;
                  final available = m['is_available'] == true;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: SectionCard(
                      title: title.isEmpty ? 'Listing' : title,
                      subtitle:
                          '${published ? 'Published' : 'Draft'} · ${available ? 'Available' : 'Unavailable'}',
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          StatCard(
                            label: 'Views (30d)',
                            value: '$viewsRange',
                            icon: Icons.visibility_outlined,
                          ),
                          StatCard(
                            label: 'Favorites (30d)',
                            value: '$favRange',
                            icon: Icons.favorite_border,
                          ),
                          StatCard(
                            label: 'Conversations',
                            value: '$conv',
                            icon: Icons.chat_bubble_outline,
                          ),
                          StatCard(
                            label: 'Total views',
                            value: '$totalViews',
                            icon: Icons.bar_chart_outlined,
                          ),
                          StatCard(
                            label: 'All favorites',
                            value: '$favTotal',
                            icon: Icons.bookmark_border,
                          ),
                        ],
                      ),
                    ),
                  );
                }),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }
}

