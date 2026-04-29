import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/tokens.dart';
import '../../core/widgets/app_search_bar.dart';
import '../../core/widgets/betnet_empty_state.dart';
import '../../core/widgets/section_header.dart';
import '../../data/models/property.dart';
import '../../providers/filters_provider.dart';
import '../../providers/home_feed_provider.dart';
import '../../ui/screens/debug_backend_settings_screen.dart';
import '../../ui/widgets/property_card.dart';

/// Discover feed: search, location, featured / new / nearby carousels.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({
    super.key,
    this.onOpenMenu,
    this.onOpenNotifications,
    this.onOpenSearchTab,
  });

  final VoidCallback? onOpenMenu;
  final VoidCallback? onOpenNotifications;
  final VoidCallback? onOpenSearchTab;

  static const _horizontalCardWidth = 272.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final featured = ref.watch(featuredPropertiesProvider);
    final newest = ref.watch(newestPropertiesProvider);
    final nearby = ref.watch(nearbyPropertiesProvider);
    final filters = ref.watch(browseFiltersProvider);

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(featuredPropertiesProvider);
            ref.invalidate(newestPropertiesProvider);
            ref.invalidate(nearbyPropertiesProvider);
            ref.invalidate(deviceLocationProvider);
          },
          child: CustomScrollView(
            slivers: [
              SliverAppBar(
                floating: true,
                pinned: false,
                title: const Text('BetNet'),
                leading: IconButton(
                  icon: const Icon(Icons.menu_rounded),
                  onPressed: onOpenMenu,
                ),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined),
                    onPressed: onOpenNotifications,
                  ),
                ],
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: BetNetSpacing.md,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      AppSearchBar(
                        hintText: 'Search city, area, title…',
                        readOnly: true,
                        onTap: onOpenSearchTab,
                      ),
                      const SizedBox(height: BetNetSpacing.sm),
                      InkWell(
                        borderRadius: BorderRadius.circular(BetNetRadii.sm),
                        onTap: () => _pickCity(context, ref),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            vertical: BetNetSpacing.sm,
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.location_on_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              const SizedBox(width: BetNetSpacing.sm),
                              Expanded(
                                child: Text(
                                  filters.city ?? 'All locations',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleSmall
                                      ?.copyWith(fontWeight: FontWeight.w600),
                                ),
                              ),
                              const Icon(Icons.keyboard_arrow_down_rounded),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(
                child: SectionHeader(title: 'Featured properties'),
              ),
              _horizontalSliver(
                context,
                featured,
                onRetry: () =>
                    ref.invalidate(featuredPropertiesProvider),
              ),
              const SliverToBoxAdapter(
                child: SectionHeader(title: 'New listings'),
              ),
              _horizontalSliver(
                context,
                newest,
                onRetry: () =>
                    ref.invalidate(newestPropertiesProvider),
              ),
              const SliverToBoxAdapter(
                child: SectionHeader(title: 'Nearby'),
              ),
              _horizontalSliver(
                context,
                nearby,
                emptyMessage:
                    'Enable location in settings to see homes near you.',
                onRetry: () {
                  ref.invalidate(deviceLocationProvider);
                  ref.invalidate(nearbyPropertiesProvider);
                },
              ),
              const SliverToBoxAdapter(
                child: SizedBox(height: BetNetSpacing.xl),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickCity(BuildContext context, WidgetRef ref) async {
    const cities = [
      'Addis Ababa',
      'Hawassa',
      'Bahir Dar',
      'Dire Dawa',
      'Mekelle',
      'Adama',
      'Jimma',
    ];
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ListView(
          children: [
            ListTile(
              title: const Text('All locations'),
              onTap: () => Navigator.pop(ctx, ''),
            ),
            ...cities.map(
              (c) => ListTile(
                title: Text(c),
                onTap: () => Navigator.pop(ctx, c),
              ),
            ),
          ],
        ),
      ),
    );
    if (picked == null || !context.mounted) return;
    final prev = ref.read(browseFiltersProvider);
    ref.read(browseFiltersProvider.notifier).state = prev.copyWith(
      city: picked.isEmpty ? null : picked,
      clearCity: picked.isEmpty,
    );
  }

  Widget _horizontalSliver(
    BuildContext context,
    AsyncValue<List<PropertySummary>> async, {
    String? emptyMessage,
    VoidCallback? onRetry,
  }) {
    return async.when(
      data: (items) {
        if (items.isEmpty) {
          return SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: BetNetSpacing.md,
                vertical: BetNetSpacing.sm,
              ),
              child: BetNetEmptyState(
                title: 'Nothing here yet',
                message: emptyMessage,
                icon: Icons.home_work_outlined,
                actionLabel: onRetry != null ? 'Retry' : null,
                onAction: onRetry,
              ),
            ),
          );
        }
        return SliverToBoxAdapter(
          child: SizedBox(
            height: 300,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                horizontal: BetNetSpacing.md,
              ),
              itemCount: items.length,
              separatorBuilder: (_, __) =>
                  const SizedBox(width: BetNetSpacing.md),
              itemBuilder: (ctx, i) {
                final p = items[i];
                return SizedBox(
                  width: _horizontalCardWidth,
                  child: PropertyCard(
                    property: p,
                    onTap: () => ctx.push('/property/${p.slug}'),
                  ),
                );
              },
            ),
          ),
        );
      },
      loading: () => const SliverToBoxAdapter(
        child: SizedBox(
          height: 280,
          child: Center(child: CircularProgressIndicator()),
        ),
      ),
      error: (e, _) => SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.all(BetNetSpacing.md),
          child: BetNetEmptyState(
            title: 'Could not load',
            message: '$e',
            actionLabel: 'Retry',
            onAction: onRetry,
            secondaryActionLabel: kDebugMode ? 'Change server URL' : null,
            onSecondaryAction: kDebugMode
                ? () {
                    Navigator.of(context).push<void>(
                      MaterialPageRoute<void>(
                        builder: (_) => const DebugBackendSettingsScreen(),
                      ),
                    );
                  }
                : null,
          ),
        ),
      ),
    );
  }
}
