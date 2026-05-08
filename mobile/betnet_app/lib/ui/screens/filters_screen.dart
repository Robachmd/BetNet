import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/filters_provider.dart';
import '../../providers/listings_provider.dart';

/// Ethiopian cities commonly used on BetNet (extend as your data grows).
const kEthiopianCities = [
  'Addis Ababa',
  'Hawassa',
  'Bahir Dar',
  'Dire Dawa',
  'Mekelle',
  'Adama',
  'Jimma',
];

/// Maps to Django `Property.PropertyType` where applicable. "Studio" uses `bedrooms=STUDIO`.
const kPropertyTypeChoices = <String, String>{
  'Apartment': 'APARTMENT',
  'Villa': 'VILLA',
  'Condominium': 'CONDOMINIUM',
  'Service house': 'SERVICE_HOUSE',
};

class FiltersScreen extends ConsumerStatefulWidget {
  const FiltersScreen({super.key});

  @override
  ConsumerState<FiltersScreen> createState() => _FiltersScreenState();
}

class _FiltersScreenState extends ConsumerState<FiltersScreen> {
  String? _city;
  String? _typeKey;
  bool _studioOnly = false;
  RangeValues _priceRange = const RangeValues(3000, 80000);
  String _datePosted = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final f = ref.read(browseFiltersProvider);
      setState(() {
        _city = f.city;
        if (f.bedrooms == 'STUDIO') _studioOnly = true;
        _datePosted = (f.createdAfter != null && f.createdAfter!.isNotEmpty) ? 'custom' : '';
        if (f.propertyType != null) {
          for (final e in kPropertyTypeChoices.entries) {
            if (e.value == f.propertyType) _typeKey = e.key;
          }
        }
        if (f.priceMin != null && f.priceMax != null) {
          _priceRange = RangeValues(f.priceMin!, f.priceMax!);
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Filters')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('City', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Any'),
                selected: _city == null,
                onSelected: (_) => setState(() => _city = null),
              ),
              ...kEthiopianCities.map(
                (c) => ChoiceChip(
                  label: Text(c),
                  selected: _city == c,
                  onSelected: (_) => setState(() => _city = c),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text('Property type', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Any'),
                selected: _typeKey == null && !_studioOnly,
                onSelected: (_) => setState(() {
                  _typeKey = null;
                  _studioOnly = false;
                }),
              ),
              ...kPropertyTypeChoices.keys.map(
                (k) => ChoiceChip(
                  label: Text(k),
                  selected: _typeKey == k,
                  onSelected: (_) => setState(() {
                    _typeKey = k;
                    _studioOnly = false;
                  }),
                ),
              ),
              ChoiceChip(
                label: const Text('Studio'),
                selected: _studioOnly,
                onSelected: (_) => setState(() {
                  _studioOnly = true;
                  _typeKey = null;
                }),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text('Date posted', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Any'),
                selected: _datePosted.isEmpty,
                onSelected: (_) => setState(() => _datePosted = ''),
              ),
              ChoiceChip(
                label: const Text('Today'),
                selected: _datePosted == 'today',
                onSelected: (_) => setState(() => _datePosted = 'today'),
              ),
              ChoiceChip(
                label: const Text('Last 7 days'),
                selected: _datePosted == 'last7',
                onSelected: (_) => setState(() => _datePosted = 'last7'),
              ),
              ChoiceChip(
                label: const Text('Last 30 days'),
                selected: _datePosted == 'last30',
                onSelected: (_) => setState(() => _datePosted = 'last30'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            'Monthly rent (ETB)',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          RangeSlider(
            values: _priceRange,
            min: 0,
            max: 200000,
            divisions: 40,
            labels: RangeLabels(
              _priceRange.start.round().toString(),
              _priceRange.end.round().toString(),
            ),
            onChanged: (v) => setState(() => _priceRange = v),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    ref.read(browseFiltersProvider.notifier).state =
                        const BrowseFilters();
                    ref.invalidate(listingsProvider);
                    Navigator.pop(context);
                  },
                  child: const Text('Clear all'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: () {
                    final prev = ref.read(browseFiltersProvider);
                    String? createdAfter;
                    if (_datePosted.isNotEmpty) {
                      final now = DateTime.now();
                      final today = DateTime(now.year, now.month, now.day);
                      DateTime start = today;
                      if (_datePosted == 'last7') {
                        start = today.subtract(const Duration(days: 7));
                      } else if (_datePosted == 'last30') {
                        start = today.subtract(const Duration(days: 30));
                      }
                      createdAfter = start.toIso8601String().split('T').first;
                    }
                    ref.read(browseFiltersProvider.notifier).state =
                        BrowseFilters(
                      city: _city,
                      subCity: prev.subCity,
                      propertyType: _studioOnly
                          ? null
                          : (_typeKey != null
                              ? kPropertyTypeChoices[_typeKey!]
                              : null),
                      bedrooms: _studioOnly ? 'STUDIO' : null,
                      priceMin: _priceRange.start,
                      priceMax: _priceRange.end,
                      searchQuery: prev.searchQuery,
                      listingType: prev.listingType,
                      ordering: prev.ordering,
                      createdAfter: createdAfter,
                      createdBefore: null,
                      hasParking: prev.hasParking,
                      hasWifi: prev.hasWifi,
                      hasSecurity: prev.hasSecurity,
                      hasGenerator: prev.hasGenerator,
                      isFurnished: prev.isFurnished,
                      hasElevator: prev.hasElevator,
                      petsAllowed: prev.petsAllowed,
                    );
                    ref.invalidate(listingsProvider);
                    Navigator.pop(context);
                  },
                  child: const Text('Apply'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
