import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../services/betrent_api.dart';
import 'filters_screen.dart';

class AddListingScreen extends ConsumerStatefulWidget {
  const AddListingScreen({super.key});

  @override
  ConsumerState<AddListingScreen> createState() => _AddListingScreenState();
}

class _AddListingScreenState extends ConsumerState<AddListingScreen> {
  final _title = TextEditingController();
  final _desc = TextEditingController();
  final _price = TextEditingController();
  final _subCity = TextEditingController();
  final _specific = TextEditingController();
  String _city = kEthiopianCities.first;
  String _ptype = 'APARTMENT';
  String _bedrooms = 'ONE';
  final List<String> _imagePaths = [];
  bool _busy = false;

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    _price.dispose();
    _subCity.dispose();
    _specific.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    final picker = ImagePicker();
    final list = await picker.pickMultiImage(imageQuality: 75);
    setState(() {
      for (final x in list) {
        if (_imagePaths.length < 8) _imagePaths.add(x.path);
      }
    });
  }

  Future<void> _submit() async {
    final price = double.tryParse(_price.text.trim());
    if (price == null || price <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid monthly rent.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final api = ref.read(betRentApiProvider);
      final body = await api.createProperty(
        title: _title.text.trim(),
        description: _desc.text.trim(),
        propertyType: _ptype,
        bedrooms: _bedrooms,
        priceMonthly: price,
        city: _city,
        subCity: _subCity.text.trim().isEmpty ? 'Center' : _subCity.text.trim(),
        specificLocation: _specific.text.trim().isEmpty
            ? 'See map / contact for details'
            : _specific.text.trim(),
      );
      final slug = body['slug'] as String?;
      if (slug != null && _imagePaths.isNotEmpty) {
        for (var i = 0; i < _imagePaths.length; i++) {
          await api.uploadPropertyImage(
            propertySlug: slug,
            filePath: _imagePaths[i],
            isPrimary: i == 0,
          );
        }
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Listing created. Complete any publish steps on the web if required.')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    if (!auth.isAuthenticated || !auth.user!.isLandlord) {
      return Scaffold(
        appBar: AppBar(title: const Text('New listing')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text('Only landlord accounts can publish homes. Register as a landlord or update your role in Django admin.'),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('New listing')),
      body: AbsorbPointer(
        absorbing: _busy,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            TextField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'Title'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _desc,
              minLines: 3,
              maxLines: 8,
              decoration: const InputDecoration(
                labelText: 'Description',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _price,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Monthly rent (ETB)',
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _city,
              decoration: const InputDecoration(labelText: 'City'),
              items: kEthiopianCities
                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                  .toList(),
              onChanged: (v) => setState(() => _city = v ?? _city),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _subCity,
              decoration: const InputDecoration(
                labelText: 'Sub-city / woreda area',
                hintText: 'e.g. Bole',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _specific,
              decoration: const InputDecoration(
                labelText: 'Address / landmark',
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _ptype,
              decoration: const InputDecoration(labelText: 'Property type'),
              items: const [
                DropdownMenuItem(value: 'APARTMENT', child: Text('Apartment')),
                DropdownMenuItem(value: 'VILLA', child: Text('Villa')),
                DropdownMenuItem(value: 'CONDOMINIUM', child: Text('Condominium')),
                DropdownMenuItem(value: 'SERVICE_HOUSE', child: Text('Service house')),
              ],
              onChanged: (v) => setState(() => _ptype = v ?? _ptype),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _bedrooms,
              decoration: const InputDecoration(labelText: 'Bedrooms'),
              items: const [
                DropdownMenuItem(value: 'STUDIO', child: Text('Studio')),
                DropdownMenuItem(value: 'ONE', child: Text('1 bedroom')),
                DropdownMenuItem(value: 'TWO', child: Text('2 bedrooms')),
                DropdownMenuItem(value: 'THREE_PLUS', child: Text('3+ bedrooms')),
              ],
              onChanged: (v) => setState(() => _bedrooms = v ?? _bedrooms),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _pickImages,
              icon: const Icon(Icons.photo_library_outlined),
              label: Text('Photos (${_imagePaths.length}) — up to 8, compressed picker'),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Create listing'),
            ),
          ],
        ),
      ),
    );
  }
}
