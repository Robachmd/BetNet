import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/filters_provider.dart';
import '../../providers/listings_provider.dart';
import '../widgets/property_card.dart';
import 'filters_screen.dart';
import 'property_detail_screen.dart';

class BrowseScreen extends ConsumerStatefulWidget {
  const BrowseScreen({super.key, this.onOpenNotifications});

  final VoidCallback? onOpenNotifications;

  @override
  ConsumerState<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends ConsumerState<BrowseScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _applySearch() {
    final q = _searchCtrl.text.trim();
    ref.read(browseFiltersProvider.notifier).state = BrowseFilters(
      city: ref.read(browseFiltersProvider).city,
      propertyType: ref.read(browseFiltersProvider).propertyType,
      bedrooms: ref.read(browseFiltersProvider).bedrooms,
      priceMin: ref.read(browseFiltersProvider).priceMin,
      priceMax: ref.read(browseFiltersProvider).priceMax,
      searchQuery: q.isEmpty ? null : q,
    );
    ref.invalidate(listingsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(listingsProvider);
    final filters = ref.watch(browseFiltersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('BetRent'),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            icon: const Icon(Icons.notifications_none),
            onPressed: widget.onOpenNotifications,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _applySearch(),
                    decoration: const InputDecoration(
                      hintText: 'Search city, area, title…',
                      prefixIcon: Icon(Icons.search),
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton.tonal(
                  onPressed: () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute<void>(builder: (_) => const FiltersScreen()),
                    );
                  },
                  child: const Icon(Icons.tune),
                ),
              ],
            ),
          ),
          if (filters.city != null ||
              filters.propertyType != null ||
              filters.bedrooms != null ||
              filters.priceMin != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Wrap(
                  spacing: 6,
                  children: [
                    if (filters.city != null)
                      Chip(
                        label: Text(filters.city!),
                        onDeleted: () {
                          ref.read(browseFiltersProvider.notifier).state =
                              BrowseFilters(
                            propertyType: filters.propertyType,
                            bedrooms: filters.bedrooms,
                            priceMin: filters.priceMin,
                            priceMax: filters.priceMax,
                            searchQuery: filters.searchQuery,
                          );
                          ref.invalidate(listingsProvider);
                        },
                      ),
                    if (filters.propertyType != null)
                      Chip(label: Text(filters.propertyType!)),
                    if (filters.bedrooms != null)
                      Chip(label: Text('${filters.bedrooms}')),
                  ],
                ),
              ),
            ),
          Expanded(
            child: async.when(
              data: (result) {
                if (result.items.isEmpty) {
                  return Center(
                    child: Text(
                      result.errorMessage ?? 'No listings match your filters.',
                      textAlign: TextAlign.center,
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(listingsProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: result.items.length + (result.fromCache ? 1 : 0),
                    itemBuilder: (context, i) {
                      if (result.fromCache && i == 0) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Card(
                            color: Theme.of(context).colorScheme.secondaryContainer,
                            child: ListTile(
                              title: Text(
                                result.stale
                                    ? 'Cached listings may be outdated.'
                                    : (result.errorMessage ??
                                        'Showing cached listings.'),
                              ),
                              trailing: TextButton(
                                onPressed: () => ref.invalidate(listingsProvider),
                                child: const Text('Retry'),
                              ),
                            ),
                          ),
                        );
                      }
                      final idx = result.fromCache ? i - 1 : i;
                      final p = result.items[idx];
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
          ),
        ],
      ),
    );
  }
}
