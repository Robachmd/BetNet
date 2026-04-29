import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hive/hive.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config.dart';
import '../../providers/filters_provider.dart';
import '../../providers/listings_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/app_primitives.dart';
import '../widgets/property_card.dart';
import 'filters_screen.dart';
import 'location_alerts_screen.dart';

class BrowseScreen extends ConsumerStatefulWidget {
  const BrowseScreen({
    super.key,
    this.onOpenMenu,
    this.onOpenNotifications,
    this.embedded = false,
  });

  final VoidCallback? onOpenMenu;
  final VoidCallback? onOpenNotifications;
  /// When true, omits [Scaffold] / [AppBar] so a parent screen supplies them.
  final bool embedded;

  @override
  ConsumerState<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends ConsumerState<BrowseScreen> {
  final _searchCtrl = TextEditingController();
  String _viewMode = 'list';
  List<Map<String, dynamic>> _savedSearches = [];

  static const _savedSearchesKey = 'saved_searches_v1';

  @override
  void initState() {
    super.initState();
    _loadSavedSearches();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _loadSavedSearches() {
    final box = Hive.box(AppConfig.hiveBoxName);
    final raw = box.get(_savedSearchesKey);
    if (raw is List) {
      _savedSearches = raw
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      setState(() {});
    }
  }

  void _applySearch() {
    final q = _searchCtrl.text.trim();
    final prev = ref.read(browseFiltersProvider);
    ref.read(browseFiltersProvider.notifier).state = prev.copyWith(
      searchQuery: q.isEmpty ? null : q,
      clearSearch: q.isEmpty,
    );
    ref.invalidate(listingsProvider);
  }

  Future<void> _openMapForQuery(String query) async {
    final q = Uri.encodeComponent(query);
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$q');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _saveCurrentSearch() {
    final f = ref.read(browseFiltersProvider);
    final row = <String, dynamic>{
      'id': DateTime.now().millisecondsSinceEpoch,
      'title': f.searchQuery ?? f.city ?? f.propertyType ?? 'Saved search',
      'city': f.city,
      'propertyType': f.propertyType,
      'bedrooms': f.bedrooms,
      'priceMin': f.priceMin,
      'priceMax': f.priceMax,
      'searchQuery': f.searchQuery,
    };
    _savedSearches = [row, ..._savedSearches].take(10).toList();
    Hive.box(AppConfig.hiveBoxName).put(_savedSearchesKey, _savedSearches);
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Search saved. Set an area alert from Alerts.')),
    );
  }

  void _applySavedSearch(Map<String, dynamic> row) {
    final prev = ref.read(browseFiltersProvider);
    final next = BrowseFilters(
      city: row['city'] as String?,
      subCity: prev.subCity,
      propertyType: row['propertyType'] as String?,
      bedrooms: row['bedrooms'] as String?,
      priceMin: (row['priceMin'] as num?)?.toDouble(),
      priceMax: (row['priceMax'] as num?)?.toDouble(),
      searchQuery: row['searchQuery'] as String?,
      listingType: prev.listingType,
      ordering: prev.ordering,
      hasParking: prev.hasParking,
      hasWifi: prev.hasWifi,
      hasSecurity: prev.hasSecurity,
      hasGenerator: prev.hasGenerator,
      isFurnished: prev.isFurnished,
      hasElevator: prev.hasElevator,
      petsAllowed: prev.petsAllowed,
    );
    _searchCtrl.text = next.searchQuery ?? '';
    ref.read(browseFiltersProvider.notifier).state = next;
    ref.invalidate(listingsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(listingsProvider);
    final filters = ref.watch(browseFiltersProvider);

    final content = Column(
      children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              BetNetSpacing.md,
              0,
              BetNetSpacing.md,
              BetNetSpacing.sm,
            ),
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
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: BetNetSpacing.md),
            child: Row(
              children: [
                OutlinedButton.icon(
                  onPressed: _saveCurrentSearch,
                  icon: const Icon(Icons.bookmark_add_outlined, size: 18),
                  label: const Text('Save search'),
                ),
                const SizedBox(width: BetNetSpacing.sm),
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const LocationAlertsScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.notifications_active_outlined, size: 18),
                  label: const Text('Alerts'),
                ),
              ],
            ),
          ),
          if (_savedSearches.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                BetNetSpacing.md,
                BetNetSpacing.sm,
                BetNetSpacing.md,
                BetNetSpacing.xs,
              ),
              child: SizedBox(
                height: 38,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemBuilder: (_, i) {
                    final row = _savedSearches[i];
                    return ActionChip(
                      label: Text('${row['title'] ?? 'Saved'}'),
                      onPressed: () => _applySavedSearch(row),
                    );
                  },
                  separatorBuilder: (_, __) => const SizedBox(width: BetNetSpacing.xs),
                  itemCount: _savedSearches.length,
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: BetNetSpacing.md),
            child: Row(
              children: [
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment<String>(
                      value: 'list',
                      icon: Icon(Icons.view_agenda_outlined),
                      label: Text('List'),
                    ),
                    ButtonSegment<String>(
                      value: 'map',
                      icon: Icon(Icons.map_outlined),
                      label: Text('Map'),
                    ),
                  ],
                  selected: {_viewMode},
                  onSelectionChanged: (v) {
                    if (v.isNotEmpty) {
                      setState(() => _viewMode = v.first);
                    }
                  },
                ),
                const Spacer(),
                if (_viewMode == 'map')
                  TextButton.icon(
                    onPressed: () => _openMapForQuery(
                      filters.city != null && filters.city!.isNotEmpty
                          ? '${filters.city} real estate'
                          : 'Ethiopia real estate',
                    ),
                    icon: const Icon(Icons.open_in_new, size: 18),
                    label: const Text('Open full map'),
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
                              filters.copyWith(clearCity: true);
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
                  child: _viewMode == 'list'
                      ? ListView.builder(
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
                          onTap: () => context.push('/property/${p.slug}'),
                        ),
                      );
                    },
                        )
                      : ListView(
                          padding: const EdgeInsets.all(BetNetSpacing.md),
                          children: [
                            Card(
                              child: ListTile(
                                leading: const Icon(Icons.map_outlined),
                                title: const Text('Interactive map'),
                                subtitle: const Text(
                                  'Open the map to explore this result set by location.',
                                ),
                                trailing: const Icon(Icons.open_in_new),
                                onTap: () => _openMapForQuery(
                                  result.items
                                      .take(8)
                                      .map((e) => e.locationLine)
                                      .join(' | '),
                                ),
                              ),
                            ),
                            const SizedBox(height: BetNetSpacing.sm),
                            ...result.items.map(
                              (p) => Card(
                                margin: const EdgeInsets.only(bottom: BetNetSpacing.sm),
                                child: ListTile(
                                  title: Text(
                                    p.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  subtitle: Text(
                                    p.locationLine,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  leading: const Icon(Icons.place_outlined),
                                  trailing: IconButton(
                                    tooltip: 'Open map',
                                    icon: const Icon(Icons.map),
                                    onPressed: () =>
                                        _openMapForQuery('${p.title} ${p.locationLine}'),
                                  ),
                                  onTap: () => context.push('/property/${p.slug}'),
                                ),
                              ),
                            ),
                          ],
                        ),
                );
              },
              loading: () => const PropertyListSkeleton(count: 6),
              error: (e, _) => Center(child: Text('$e')),
            ),
          ),
        ],
    );

    if (widget.embedded) return content;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Menu',
          icon: const Icon(Icons.menu),
          onPressed: widget.onOpenMenu,
        ),
        title: const Text('BetNet'),
        actions: [
          IconButton(
            tooltip: 'Event halls',
            icon: const Icon(Icons.celebration_outlined),
            onPressed: () => context.push('/halls'),
          ),
          IconButton(
            tooltip: 'Notifications',
            icon: const Icon(Icons.notifications_none),
            onPressed: widget.onOpenNotifications,
          ),
        ],
      ),
      body: content,
    );
  }
}
