import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/tokens.dart';
import '../../core/widgets/betnet_empty_state.dart';
import '../../providers/property_market_provider.dart';
import '../../ui/widgets/property_card.dart';

/// Main marketplace: segment tabs, category chips, sort, list/grid.
class PropertyScreen extends ConsumerStatefulWidget {
  const PropertyScreen({
    super.key,
    this.onOpenMenu,
    this.onOpenNotifications,
  });

  final VoidCallback? onOpenMenu;
  final VoidCallback? onOpenNotifications;

  @override
  ConsumerState<PropertyScreen> createState() => _PropertyScreenState();
}

class _PropertyScreenState extends ConsumerState<PropertyScreen> {
  bool _grid = false;

  static const _sortChoices = [
    (label: 'Newest', value: '-created_at'),
    (label: 'Price ↑', value: 'price_monthly'),
    (label: 'Price ↓', value: '-price_monthly'),
  ];

  void _setSegment(PropertyMarketSegment s) {
    ref.read(propertyMarketProvider.notifier).state =
        ref.read(propertyMarketProvider).copyWith(
              segment: s,
              clearCategory: true,
            );
    ref.invalidate(propertyMarketListingsProvider);
  }

  void _setCategory(String? key) {
    final m = ref.read(propertyMarketProvider);
    ref.read(propertyMarketProvider.notifier).state = m.copyWith(
      categoryKey: key,
      clearCategory: key == null,
    );
    ref.invalidate(propertyMarketListingsProvider);
  }

  void _setSort(String ordering) {
    ref.read(propertyMarketProvider.notifier).state =
        ref.read(propertyMarketProvider).copyWith(ordering: ordering);
    ref.invalidate(propertyMarketListingsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final market = ref.watch(propertyMarketProvider);
    final async = ref.watch(propertyMarketListingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Properties'),
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded),
          onPressed: widget.onOpenMenu,
        ),
        actions: [
          IconButton(
            icon: Icon(_grid ? Icons.view_list_rounded : Icons.grid_view_rounded),
            onPressed: () => setState(() => _grid = !_grid),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: widget.onOpenNotifications,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(104),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: BetNetSpacing.sm),
                child: SegmentedButton<PropertyMarketSegment>(
                  segments: const [
                    ButtonSegment(
                      value: PropertyMarketSegment.buy,
                      label: Text('Buy'),
                    ),
                    ButtonSegment(
                      value: PropertyMarketSegment.rent,
                      label: Text('Rent'),
                    ),
                    ButtonSegment(
                      value: PropertyMarketSegment.commercial,
                      label: Text('Commercial'),
                    ),
                    ButtonSegment(
                      value: PropertyMarketSegment.hall,
                      label: Text('Hall'),
                    ),
                  ],
                  selected: {market.segment},
                  onSelectionChanged: (s) {
                    if (s.isNotEmpty) _setSegment(s.first);
                  },
                ),
              ),
              if (market.segment != PropertyMarketSegment.hall)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(
                    BetNetSpacing.sm,
                    BetNetSpacing.sm,
                    BetNetSpacing.sm,
                    BetNetSpacing.sm,
                  ),
                  child: Row(
                    children: [
                      FilterChip(
                        label: const Text('All'),
                        selected: market.categoryKey == null,
                        onSelected: (_) => _setCategory(null),
                      ),
                      _typeChip('Apartment', 'APARTMENT', market.categoryKey),
                      _typeChip('Villa', 'VILLA', market.categoryKey),
                      _typeChip('Condo', 'CONDOMINIUM', market.categoryKey),
                      _typeChip('Studio', 'STUDIO', market.categoryKey),
                      _typeChip('Service house', 'SERVICE_HOUSE', market.categoryKey),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: BetNetSpacing.md,
              vertical: BetNetSpacing.xs,
            ),
            child: Row(
              children: [
                Text(
                  'Sort',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(width: BetNetSpacing.sm),
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _sortChoices.map((e) {
                        final sel = market.ordering == e.value;
                        return Padding(
                          padding: const EdgeInsets.only(right: BetNetSpacing.xs),
                          child: ChoiceChip(
                            label: Text(e.label),
                            selected: sel,
                            onSelected: (_) => _setSort(e.value),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: async.when(
              data: (items) {
                if (items.isEmpty) {
                  return BetNetEmptyState(
                    title: 'No listings',
                    message: 'Try another tab or category.',
                    actionLabel: 'Refresh',
                    onAction: () =>
                        ref.invalidate(propertyMarketListingsProvider),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(propertyMarketListingsProvider),
                  child: _grid
                      ? GridView.builder(
                          padding: const EdgeInsets.all(BetNetSpacing.md),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: BetNetSpacing.sm,
                            crossAxisSpacing: BetNetSpacing.sm,
                            childAspectRatio: 0.72,
                          ),
                          itemCount: items.length,
                          itemBuilder: (ctx, i) {
                            final p = items[i];
                            return PropertyCard(
                              property: p,
                              onTap: () => ctx.push('/property/${p.slug}'),
                            );
                          },
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(BetNetSpacing.md),
                          itemCount: items.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: BetNetSpacing.sm),
                          itemBuilder: (ctx, i) {
                            final p = items[i];
                            return PropertyCard(
                              property: p,
                              onTap: () => ctx.push('/property/${p.slug}'),
                            );
                          },
                        ),
                );
              },
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => BetNetEmptyState(
                title: 'Error',
                message: '$e',
                actionLabel: 'Retry',
                onAction: () =>
                    ref.invalidate(propertyMarketListingsProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _typeChip(String label, String key, String? selected) {
    final isSel = selected == key;
    return Padding(
      padding: const EdgeInsets.only(right: BetNetSpacing.xs),
      child: FilterChip(
        label: Text(label),
        selected: isSel,
        onSelected: (_) => _setCategory(key),
      ),
    );
  }
}
