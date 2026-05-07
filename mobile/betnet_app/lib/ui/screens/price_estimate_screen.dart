import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';

/// Neighborhood stats + optional AI-assisted band (same API as web `/price-insights`).
class PriceEstimateScreen extends ConsumerStatefulWidget {
  const PriceEstimateScreen({super.key});

  @override
  ConsumerState<PriceEstimateScreen> createState() => _PriceEstimateScreenState();
}

class _PriceEstimateScreenState extends ConsumerState<PriceEstimateScreen> {
  final _cityCtl = TextEditingController(text: 'Addis Ababa');
  final _subCityCtl = TextEditingController(text: 'Bole');
  final _propertyTypeCtl = TextEditingController(text: 'APARTMENT');
  final _listingTypeCtl = TextEditingController(text: 'rent');
  final _bedroomsCtl = TextEditingController(text: 'TWO');
  final _bathroomsCtl = TextEditingController(text: '1');
  bool _busy = false;
  String? _error;
  Map<String, dynamic>? _result;

  @override
  void dispose() {
    _cityCtl.dispose();
    _subCityCtl.dispose();
    _propertyTypeCtl.dispose();
    _listingTypeCtl.dispose();
    _bedroomsCtl.dispose();
    _bathroomsCtl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final sub = _subCityCtl.text.trim();
    if (sub.isEmpty) {
      setState(() => _error = 'Enter a sub-city or neighborhood.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _result = null;
    });
    try {
      final body = <String, dynamic>{
        'city': _cityCtl.text.trim().isEmpty ? 'Addis Ababa' : _cityCtl.text.trim(),
        'sub_city': sub,
        'listing_type': _listingTypeCtl.text.trim().isEmpty
            ? 'rent'
            : _listingTypeCtl.text.trim(),
        'bathrooms': int.tryParse(_bathroomsCtl.text.trim()) ?? 1,
      };
      final pt = _propertyTypeCtl.text.trim();
      if (pt.isNotEmpty) body['property_type'] = pt;
      final br = _bedroomsCtl.text.trim();
      if (br.isNotEmpty) body['bedrooms'] = br;
      final out = await ref.read(betNetApiProvider).postPriceEstimate(body);
      if (!mounted) return;
      setState(() => _result = out);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Price insights')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Compare BetNet listing stats for an area. With server AI keys configured, you also get a suggested band.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 16),
          SectionCard(
            title: 'Area & unit',
            child: Column(
              children: [
                TextField(
                  controller: _cityCtl,
                  decoration: const InputDecoration(labelText: 'City'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _subCityCtl,
                  decoration: const InputDecoration(labelText: 'Sub-city / neighborhood'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _propertyTypeCtl,
                  decoration: const InputDecoration(
                    labelText: 'Property type (API enum)',
                    hintText: 'APARTMENT, VILLA, …',
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _listingTypeCtl,
                  decoration: const InputDecoration(
                    labelText: 'Listing type',
                    hintText: 'rent, sale, short_term',
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _bedroomsCtl,
                  decoration: const InputDecoration(
                    labelText: 'Bedrooms',
                    hintText: 'STUDIO, ONE, TWO, THREE_PLUS',
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _bathroomsCtl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Bathrooms'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Get estimate'),
          ),
          if (_result != null) ...[
            const SizedBox(height: 20),
            SectionCard(
              title: 'Result',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _result!['disclaimer']?.toString() ?? '',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Aggregate: ${_result!['aggregate']}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if (_result!['ai'] != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'AI: ${_result!['ai']}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
