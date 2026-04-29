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

class LocationAlertsScreen extends ConsumerStatefulWidget {
  const LocationAlertsScreen({super.key});

  @override
  ConsumerState<LocationAlertsScreen> createState() => _LocationAlertsScreenState();
}

class _LocationAlertsScreenState extends ConsumerState<LocationAlertsScreen> {
  final _label = TextEditingController();
  String _city = kEthiopianCities.first;
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
                        row.subCity.isEmpty ? row.city : '${row.city} · ${row.subCity}',
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
