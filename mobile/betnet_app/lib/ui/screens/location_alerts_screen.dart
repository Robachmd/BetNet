import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/location_alert.dart';
import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';
import 'filters_screen.dart';

final _locationAlertsProvider =
    FutureProvider.autoDispose<List<LocationAlertItem>>((ref) async {
  return ref.watch(betNetApiProvider).fetchLocationAlerts();
});

String _labelForApiEnum(String api) {
  for (final e in kPropertyTypeChoices.entries) {
    if (e.value == api) return e.key;
  }
  return api;
}

class LocationAlertsScreen extends ConsumerStatefulWidget {
  const LocationAlertsScreen({super.key});

  @override
  ConsumerState<LocationAlertsScreen> createState() => _LocationAlertsScreenState();
}

class _LocationAlertsScreenState extends ConsumerState<LocationAlertsScreen> {
  final _label = TextEditingController();
  String _city = kEthiopianCities.first;
  final Set<String> _propertyTypeApis = {};
  bool _onlyAvailableListings = true;
  final _subCity = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _label.dispose();
    _subCity.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    setState(() => _saving = true);
    try {
      await ref.read(betNetApiProvider).createLocationAlert(
            city: _city,
            subCity: _subCity.text.trim(),
            label: _label.text.trim(),
            propertyTypes: _propertyTypeApis.toList(),
            onlyAvailableListings: _onlyAvailableListings,
          );
      _label.clear();
      _subCity.clear();
      ref.invalidate(_locationAlertsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _toggle(LocationAlertItem row) async {
    try {
      await ref.read(betNetApiProvider).updateLocationAlert(
            id: row.id,
            payload: {'is_active': !row.isActive},
          );
      ref.invalidate(_locationAlertsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _remove(int id) async {
    try {
      await ref.read(betNetApiProvider).deleteLocationAlert(id);
      ref.invalidate(_locationAlertsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(_locationAlertsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Location alerts')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Add area alert', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            controller: _label,
            decoration: const InputDecoration(labelText: 'Label (optional)'),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _city,
            decoration: const InputDecoration(labelText: 'City'),
            items: kEthiopianCities
                .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                .toList(),
            onChanged: (v) => setState(() => _city = v ?? _city),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _subCity,
            decoration: const InputDecoration(labelText: 'Sub-city (optional)'),
          ),
          const SizedBox(height: 8),
          Text('Property types (optional)', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              ChoiceChip(
                label: const Text('Any type'),
                selected: _propertyTypeApis.isEmpty,
                onSelected: (_) => setState(() => _propertyTypeApis.clear()),
              ),
              ...kPropertyTypeChoices.entries.map(
                (e) => FilterChip(
                  label: Text(e.key),
                  selected: _propertyTypeApis.contains(e.value),
                  onSelected: (on) {
                    setState(() {
                      if (on) {
                        _propertyTypeApis.add(e.value);
                      } else {
                        _propertyTypeApis.remove(e.value);
                      }
                    });
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Only available listings'),
            subtitle: const Text('Turn off to include unavailable or booked-out matches'),
            value: _onlyAvailableListings,
            onChanged: (v) => setState(() => _onlyAvailableListings = v),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _saving ? null : _create,
            child: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save alert'),
          ),
          const SizedBox(height: 16),
          Text('My alerts', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          async.when(
            data: (items) {
              if (items.isEmpty) {
                return const Card(child: ListTile(title: Text('No location alerts yet.')));
              }
              return Column(
                children: items.map((row) {
                  return Card(
                    child: ListTile(
                      title: Text(row.label.isEmpty ? row.city : row.label),
                      subtitle: Text(
                        [
                          row.subCity.isEmpty ? row.city : '${row.city} · ${row.subCity}',
                          if (row.propertyTypes.isNotEmpty)
                            row.propertyTypes.map(_labelForApiEnum).join(', '),
                          if (!row.onlyAvailableListings) 'incl. unavailable',
                        ].where((s) => s.isNotEmpty).join(' · '),
                      ),
                      leading: Switch(
                        value: row.isActive,
                        onChanged: (_) => _toggle(row),
                      ),
                      trailing: IconButton(
                        onPressed: () => _remove(row.id),
                        icon: const Icon(Icons.delete_outline),
                      ),
                    ),
                  );
                }).toList(),
              );
            },
            loading: () => const PropertyListSkeleton(count: 3),
            error: (e, _) => Text('$e'),
          ),
        ],
      ),
    );
  }
}
