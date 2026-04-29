import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/models/property.dart';
import '../../providers/hall_listings_provider.dart';
import '../widgets/app_primitives.dart';
import '../widgets/hall_availability_sheet.dart';
import '../widgets/property_card.dart';

/// Dedicated hall discovery (filters, sort, map, availability — web HallRentalPage parity).
class HallsRentalScreen extends ConsumerWidget {
  const HallsRentalScreen({super.key});

  static Future<void> _openInMaps(PropertySummary p) async {
    final parts = <String>[
      p.city,
      if (p.subCity != null && p.subCity!.isNotEmpty) p.subCity!,
      if (p.specificLocation != null && p.specificLocation!.isNotEmpty) p.specificLocation!,
    ];
    final q = Uri.encodeComponent(parts.join(' '));
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$q');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  static Future<void> _openRegionMaps(HallBrowseFilters f) async {
    final q = Uri.encodeComponent(
      f.city != null && f.city!.isNotEmpty
          ? 'event halls ${f.city}'
          : 'event halls Ethiopia',
    );
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$q');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(hallListingsProvider);
    final filters = ref.watch(hallBrowseFiltersProvider);
    final sort = ref.watch(hallSortOrderingProvider);
    final listData = async.asData?.value;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Event halls'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort),
            tooltip: 'Sort',
            onSelected: (ordering) {
              ref.read(hallSortOrderingProvider.notifier).state = ordering;
              ref.invalidate(hallListingsProvider);
            },
            itemBuilder: (ctx) => [
              CheckedPopupMenuItem(
                value: '-property__created_at',
                checked: sort == '-property__created_at',
                child: const Text('Newest first'),
              ),
              CheckedPopupMenuItem(
                value: 'property__price_monthly',
                checked: sort == 'property__price_monthly',
                child: const Text('Price: low to high'),
              ),
              CheckedPopupMenuItem(
                value: '-property__price_monthly',
                checked: sort == '-property__price_monthly',
                child: const Text('Price: high to low'),
              ),
              CheckedPopupMenuItem(
                value: '-capacity',
                checked: sort == '-capacity',
                child: const Text('Largest capacity'),
              ),
            ],
          ),
          IconButton(
            tooltip: 'Map (region)',
            icon: const Icon(Icons.map_outlined),
            onPressed: () => _openRegionMaps(filters),
          ),
          if (listData != null && listData.isNotEmpty)
            IconButton(
              tooltip: 'Map first result',
              icon: const Icon(Icons.place_outlined),
              onPressed: () => _openInMaps(listData.first),
            ),
          IconButton(
            tooltip: 'Filters',
            icon: const Icon(Icons.tune),
            onPressed: () async {
              final cityCtrl = TextEditingController(text: filters.city ?? '');
              final subCtrl = TextEditingController(text: filters.subCity ?? '');
              final capMinCtrl = TextEditingController(
                text: filters.capacityMin?.toString() ?? '',
              );
              final capMaxCtrl = TextEditingController(
                text: filters.capacityMax?.toString() ?? '',
              );
              final priceMinCtrl = TextEditingController(
                text: filters.pricePerHourMin?.toString() ?? '',
              );
              final priceMaxCtrl = TextEditingController(
                text: filters.pricePerHourMax?.toString() ?? '',
              );
              String? hallType = filters.hallType;
              if (!context.mounted) return;
              await showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                builder: (ctx) {
                  return Padding(
                    padding: EdgeInsets.only(
                      left: 16,
                      right: 16,
                      top: 16,
                      bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
                    ),
                    child: StatefulBuilder(
                      builder: (context, setModal) {
                        return SingleChildScrollView(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text('Hall filters', style: Theme.of(ctx).textTheme.titleLarge),
                              TextField(
                                controller: cityCtrl,
                                decoration: const InputDecoration(labelText: 'City'),
                              ),
                              TextField(
                                controller: subCtrl,
                                decoration: const InputDecoration(labelText: 'Sub-city'),
                              ),
                              DropdownButtonFormField<String?>(
                                key: ValueKey<String?>(hallType),
                                initialValue: hallType,
                                decoration: const InputDecoration(labelText: 'Hall type'),
                                items: const [
                                  DropdownMenuItem<String?>(value: null, child: Text('Any')),
                                  DropdownMenuItem<String?>(value: 'WEDDING', child: Text('Wedding')),
                                  DropdownMenuItem<String?>(value: 'MEETING', child: Text('Meeting room')),
                                  DropdownMenuItem<String?>(value: 'CONFERENCE', child: Text('Conference')),
                                  DropdownMenuItem<String?>(value: 'PARTY', child: Text('Party venue')),
                                  DropdownMenuItem<String?>(
                                    value: 'OUTDOOR_GARDEN',
                                    child: Text('Outdoor garden'),
                                  ),
                                ],
                                onChanged: (v) => setModal(() => hallType = v),
                              ),
                              TextField(
                                controller: capMinCtrl,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(labelText: 'Min capacity'),
                              ),
                              TextField(
                                controller: capMaxCtrl,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(labelText: 'Max capacity'),
                              ),
                              TextField(
                                controller: priceMinCtrl,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                decoration: const InputDecoration(
                                  labelText: 'Min ETB / hour',
                                ),
                              ),
                              TextField(
                                controller: priceMaxCtrl,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                decoration: const InputDecoration(
                                  labelText: 'Max ETB / hour',
                                ),
                              ),
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed: () {
                                  ref.read(hallBrowseFiltersProvider.notifier).state =
                                      HallBrowseFilters(
                                    city: cityCtrl.text.trim().isEmpty
                                        ? null
                                        : cityCtrl.text.trim(),
                                    subCity: subCtrl.text.trim().isEmpty
                                        ? null
                                        : subCtrl.text.trim(),
                                    hallType: hallType,
                                    capacityMin: int.tryParse(capMinCtrl.text.trim()),
                                    capacityMax: int.tryParse(capMaxCtrl.text.trim()),
                                    pricePerHourMin: double.tryParse(priceMinCtrl.text.trim()),
                                    pricePerHourMax: double.tryParse(priceMaxCtrl.text.trim()),
                                  );
                                  ref.invalidate(hallListingsProvider);
                                  Navigator.pop(ctx);
                                },
                                child: const Text('Apply'),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(hallListingsProvider),
        child: async.when(
          data: (items) {
            if (items.isEmpty) {
              return const EmptyState(
                title: 'No halls match',
                message: 'Try clearing filters or another city.',
              );
            }
            return ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              itemBuilder: (_, i) {
                final p = items[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      PropertyCard(
                        property: p,
                        onTap: () => context.push('/property/${p.slug}'),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          TextButton.icon(
                            onPressed: () => showHallAvailabilitySheet(
                              context,
                              ref,
                              propertyId: p.id,
                              title: p.title,
                            ),
                            icon: const Icon(Icons.calendar_month, size: 18),
                            label: const Text('Availability'),
                          ),
                          TextButton.icon(
                            onPressed: () => _openInMaps(p),
                            icon: const Icon(Icons.map, size: 18),
                            label: const Text('Map'),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            );
          },
          loading: () => const LoadingState(),
          error: (e, _) => ErrorState(
            message: '$e',
            onRetry: () => ref.invalidate(hallListingsProvider),
          ),
        ),
      ),
    );
  }
}
