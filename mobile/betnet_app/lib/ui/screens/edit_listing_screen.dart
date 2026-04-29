import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/property.dart';
import '../../l10n/app_localizations.dart';
import '../../services/betnet_api.dart';
import '../../utils/listing_form_helpers.dart';
import '../../utils/property_types.dart';

class EditListingScreen extends ConsumerStatefulWidget {
  const EditListingScreen({super.key, required this.propertySlug});

  final String propertySlug;

  @override
  ConsumerState<EditListingScreen> createState() => _EditListingScreenState();
}

class _EditListingScreenState extends ConsumerState<EditListingScreen> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _price = TextEditingController();
  final _floor = TextEditingController();
  final _subCity = TextEditingController();
  final _specific = TextEditingController();
  final _area = TextEditingController();
  final _shopClasses = TextEditingController();
  final _hallCapacity = TextEditingController();
  final _hallHour = TextEditingController();
  final _hallDay = TextEditingController();
  final _cityField = TextEditingController();

  bool _loading = true;
  bool _saving = false;
  String? _error;
  String _apiPropertyType = '';
  String? _mapsUrl;
  String _listingType = ListingTypeValues.rent;
  String _bedrooms = 'ONE';
  int _bathrooms = 1;

  String _water = 'SOMETIMES';
  String _electricity = 'MODERATE';
  bool _aParking = false;
  bool _aWifi = false;
  bool _aSecurity = false;
  bool _aGenerator = false;
  bool _aFurnished = false;
  bool _aElevator = false;
  bool _aBalcony = false;
  bool _aGarden = false;
  bool _aCctv = false;
  bool _aPets = false;

  String _hallType = 'WEDDING';
  bool _hallSound = false;
  bool _hallStage = false;
  bool _hallDecoration = true;
  bool _hallCatering = false;
  bool _hallIndoor = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _price.dispose();
    _floor.dispose();
    _subCity.dispose();
    _specific.dispose();
    _area.dispose();
    _shopClasses.dispose();
    _hallCapacity.dispose();
    _hallHour.dispose();
    _hallDay.dispose();
    _cityField.dispose();
    super.dispose();
  }

  void _applyAmenitiesFrom(Map<String, dynamic>? m) {
    final map = m ?? defaultAmenitiesMap();
    _water = '${map['water_availability'] ?? 'SOMETIMES'}';
    _electricity = '${map['electricity_stability'] ?? 'MODERATE'}';
    _aParking = map['has_parking'] == true;
    _aWifi = map['has_wifi'] == true;
    _aSecurity = map['has_security'] == true;
    _aGenerator = map['has_generator'] == true;
    _aFurnished = map['is_furnished'] == true;
    _aElevator = map['has_elevator'] == true;
    _aBalcony = map['has_balcony'] == true;
    _aGarden = map['has_garden'] == true;
    _aCctv = map['has_cctv'] == true;
    _aPets = map['pets_allowed'] == true;
  }

  void _applyHallFrom(Map<String, dynamic>? h) {
    if (h == null) return;
    final cap = h['capacity'];
    _hallCapacity.text = cap != null ? '$cap' : '';
    final ph = h['price_per_hour'];
    _hallHour.text = ph != null ? '$ph' : '';
    final pd = h['price_per_day'];
    _hallDay.text = pd != null ? '$pd' : '';
    final ht = h['hall_type'];
    if (ht != null && '$ht'.isNotEmpty) {
      _hallType = '$ht';
    }
    _hallSound = h['has_sound_system'] == true;
    _hallStage = h['has_stage'] == true;
    _hallDecoration = h['decoration_allowed'] != false;
    _hallCatering = h['catering_available'] == true;
    _hallIndoor = h['is_indoor'] != false;
  }

  Map<String, dynamic> _amenitiesPayload() {
    return {
      'water_availability': _water,
      'electricity_stability': _electricity,
      'has_parking': _aParking,
      'has_wifi': _aWifi,
      'has_security': _aSecurity,
      'has_generator': _aGenerator,
      'is_furnished': _aFurnished,
      'has_elevator': _aElevator,
      'has_balcony': _aBalcony,
      'has_garden': _aGarden,
      'has_cctv': _aCctv,
      'pets_allowed': _aPets,
    };
  }

  Map<String, dynamic> _hallPayload() {
    final cap = int.tryParse(_hallCapacity.text.trim());
    final ph = double.tryParse(_hallHour.text.trim());
    final pd = double.tryParse(_hallDay.text.trim());
    return {
      'capacity': cap ?? 0,
      if (ph != null && ph > 0) 'price_per_hour': ph.toStringAsFixed(2),
      if (pd != null && pd > 0) 'price_per_day': pd.toStringAsFixed(2),
      'hall_type': _hallType,
      'has_sound_system': _hallSound,
      'has_stage': _hallStage,
      'decoration_allowed': _hallDecoration,
      'catering_available': _hallCatering,
      'is_indoor': _hallIndoor,
    };
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final detail =
          await ref.read(betNetApiProvider).fetchPropertyDetail(widget.propertySlug);
      _hydrateFromDetail(detail);
    } catch (e) {
      _error = '$e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _hydrateFromDetail(PropertyDetail detail) {
    final s = detail.summary;
    _title.text = s.title;
    _description.text = detail.description;
    _price.text = s.priceMonthly;
    _apiPropertyType = s.propertyType;
    _listingType = s.listingType;
    _bedrooms = s.bedrooms?.isNotEmpty == true ? s.bedrooms! : 'ONE';
    _bathrooms = detail.bathrooms ?? 1;
    final f = s.floorNumber;
    _floor.text = f != null ? '$f' : '';
    _cityField.text = s.city;
    _specific.text = s.specificLocation ?? '';
    _area.text = detail.areaSqm ?? '';
    _mapsUrl = detail.mapsUrl;
    if (detail.shopClassCount != null) {
      _shopClasses.text = '${detail.shopClassCount}';
    }
    _applyAmenitiesFrom(detail.amenitiesMap);
    _applyHallFrom(detail.hallDetailMap);
  }

  String get _priceFieldLabel {
    final hall = isHallPropertyType(_apiPropertyType);
    if (hall) return 'Display price (ETB, optional)';
    if (_listingType == ListingTypeValues.sale) return 'Total asking price (ETB)';
    if (_listingType == ListingTypeValues.shortTerm) {
      return 'Short-term rate (ETB)';
    }
    return 'Monthly rent (ETB)';
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    final floorLabel = l10n?.floorNumberLabel ?? 'Floor number';
    final hall = isHallPropertyType(_apiPropertyType);

    if (_cityField.text.trim().isEmpty) {
      setState(() => _error = 'City is required.');
      return;
    }

    double mainPrice;
    if (hall) {
      final ph = double.tryParse(_hallHour.text.trim());
      final pd = double.tryParse(_hallDay.text.trim());
      final cap = int.tryParse(_hallCapacity.text.trim());
      if (cap == null || cap < 1) {
        setState(() => _error = 'Hall: enter guest capacity (1+).');
        return;
      }
      if ((ph == null || ph <= 0) && (pd == null || pd <= 0)) {
        setState(
          () => _error = 'Hall: enter at least one of hourly or daily rate.',
        );
        return;
      }
      mainPrice = hallPriceMonthlyPlaceholder(pricePerHour: ph, pricePerDay: pd);
      final opt = double.tryParse(_price.text.trim());
      if (opt != null && opt > 0) mainPrice = opt;
    } else {
      final p = double.tryParse(_price.text.trim());
      if (p == null || p <= 0) {
        setState(() => _error = 'Enter a valid price.');
        return;
      }
      mainPrice = p;
    }

    final payload = <String, dynamic>{
      'title': _title.text.trim(),
      'description': _description.text.trim(),
      'listing_type': _listingType,
      'price_monthly': mainPrice.toStringAsFixed(2),
      'bedrooms': hall ? '' : _bedrooms,
      'bathrooms': hall ? 1 : _bathrooms,
      'location': {
        'city': _cityField.text.trim(),
        'sub_city': _subCity.text.trim().isEmpty ? 'Center' : _subCity.text.trim(),
        'woreda': '',
        'kebele': '',
        'specific_location': _specific.text.trim().isEmpty
            ? 'See map / contact for details'
            : _specific.text.trim(),
        'maps_url': _mapsUrl ?? '',
      },
      'amenities': _amenitiesPayload(),
    };

    final ar = _area.text.trim();
    if (ar.isEmpty) {
      payload['area_sqm'] = null;
    } else {
      final a = double.tryParse(ar);
      if (a == null || a <= 0) {
        setState(() => _error = 'Area: enter a positive number (m²).');
        return;
      }
      payload['area_sqm'] = a.toStringAsFixed(2);
    }

    if (isFloorRelevantPropertyType(_apiPropertyType)) {
      final ft = _floor.text.trim();
      if (ft.isEmpty) {
        payload['floor_number'] = null;
      } else {
        final n = int.tryParse(ft);
        if (n == null || n < 0 || n > 200) {
          setState(() => _error = '$floorLabel: use 0–200.');
          return;
        }
        payload['floor_number'] = n;
      }
    }

    if (_apiPropertyType == 'BUSINESS_SHOP') {
      final sc = int.tryParse(_shopClasses.text.trim());
      if (sc == null || sc < 1 || sc > 99) {
        setState(() => _error = 'Business shop: classes/areas 1–99.');
        return;
      }
      payload['shop_class_count'] = sc;
    }

    if (hall) {
      payload['hall_detail'] = _hallPayload();
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(betNetApiProvider).updateProperty(
            propertySlug: widget.propertySlug,
            payload: payload,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Listing updated.')),
      );
      Navigator.pop(context);
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _propertyTypeLabel() {
    for (final t in kAddPropertyTypeChoices) {
      if (t.$1 == _apiPropertyType) return t.$2;
    }
    return _apiPropertyType;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final hall = isHallPropertyType(_apiPropertyType);
    return Scaffold(
      appBar: AppBar(title: const Text('Edit listing')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Property type'),
                  subtitle: Text(_propertyTypeLabel()),
                ),
                const SizedBox(height: 8),
                Text(
                  'Offer as',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 8),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(
                      value: ListingTypeValues.rent,
                      label: Text('Rent'),
                    ),
                    ButtonSegment(
                      value: ListingTypeValues.sale,
                      label: Text('Sale'),
                    ),
                    ButtonSegment(
                      value: ListingTypeValues.shortTerm,
                      label: Text('Short stay'),
                    ),
                  ],
                  selected: {_listingType},
                  onSelectionChanged: (s) {
                    setState(() => _listingType = s.first);
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _title,
                  decoration: const InputDecoration(labelText: 'Title'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _description,
                  minLines: 3,
                  maxLines: 8,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 12),
                if (!hall) ...[
                  DropdownButtonFormField<String>(
                    key: ValueKey<String>(_bedrooms),
                    initialValue: _bedrooms,
                    decoration: const InputDecoration(labelText: 'Bedrooms'),
                    items: const [
                      DropdownMenuItem(value: 'STUDIO', child: Text('Studio')),
                      DropdownMenuItem(value: 'ONE', child: Text('1 bedroom')),
                      DropdownMenuItem(value: 'TWO', child: Text('2 bedrooms')),
                      DropdownMenuItem(
                        value: 'THREE_PLUS',
                        child: Text('3+ bedrooms'),
                      ),
                    ],
                    onChanged: (v) => setState(() => _bedrooms = v ?? _bedrooms),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int>(
                    key: ValueKey<int>(_bathrooms),
                    initialValue: _bathrooms,
                    decoration: const InputDecoration(labelText: 'Bathrooms'),
                    items: List.generate(
                      12,
                      (i) =>
                          DropdownMenuItem(value: i + 1, child: Text('${i + 1}')),
                    ),
                    onChanged: (v) => setState(() => _bathrooms = v ?? _bathrooms),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: _area,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Area (m²)',
                    hintText: 'Clear to remove',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _price,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: _priceFieldLabel,
                    helperText: hall
                        ? 'Defaults from hall rates if empty/zero.'
                        : null,
                  ),
                ),
                if (hall) ...[
                  const SizedBox(height: 16),
                  Text(
                    'Hall details',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    key: ValueKey<String>(_hallType),
                    initialValue: _hallType,
                    decoration: const InputDecoration(labelText: 'Hall type'),
                    items: kHallTypeChoices
                        .map(
                          (t) => DropdownMenuItem(value: t.$1, child: Text(t.$2)),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _hallType = v ?? _hallType),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _hallCapacity,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Max capacity (guests)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _hallHour,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Price per hour (ETB)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _hallDay,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Price per day (ETB)',
                    ),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Sound system'),
                    value: _hallSound,
                    onChanged: (v) => setState(() => _hallSound = v),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Stage'),
                    value: _hallStage,
                    onChanged: (v) => setState(() => _hallStage = v),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Decoration allowed'),
                    value: _hallDecoration,
                    onChanged: (v) => setState(() => _hallDecoration = v),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Catering available'),
                    value: _hallCatering,
                    onChanged: (v) => setState(() => _hallCatering = v),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Indoor venue'),
                    value: _hallIndoor,
                    onChanged: (v) => setState(() => _hallIndoor = v),
                  ),
                ],
                const SizedBox(height: 16),
                Text(
                  'Amenities',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                DropdownButtonFormField<String>(
                  key: ValueKey<String>(_water),
                  initialValue: _water,
                  decoration: const InputDecoration(labelText: 'Water'),
                  items: kWaterChoices
                      .map(
                        (t) => DropdownMenuItem(value: t.$1, child: Text(t.$2)),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => _water = v ?? _water),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  key: ValueKey<String>(_electricity),
                  initialValue: _electricity,
                  decoration:
                      const InputDecoration(labelText: 'Electricity'),
                  items: kElectricityChoices
                      .map(
                        (t) => DropdownMenuItem(value: t.$1, child: Text(t.$2)),
                      )
                      .toList(),
                  onChanged: (v) =>
                      setState(() => _electricity = v ?? _electricity),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Parking'),
                  value: _aParking,
                  onChanged: (v) => setState(() => _aParking = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Wi‑Fi'),
                  value: _aWifi,
                  onChanged: (v) => setState(() => _aWifi = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Security'),
                  value: _aSecurity,
                  onChanged: (v) => setState(() => _aSecurity = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Generator'),
                  value: _aGenerator,
                  onChanged: (v) => setState(() => _aGenerator = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Furnished'),
                  value: _aFurnished,
                  onChanged: (v) => setState(() => _aFurnished = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Elevator'),
                  value: _aElevator,
                  onChanged: (v) => setState(() => _aElevator = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Balcony'),
                  value: _aBalcony,
                  onChanged: (v) => setState(() => _aBalcony = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Garden'),
                  value: _aGarden,
                  onChanged: (v) => setState(() => _aGarden = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('CCTV'),
                  value: _aCctv,
                  onChanged: (v) => setState(() => _aCctv = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Pets allowed'),
                  value: _aPets,
                  onChanged: (v) => setState(() => _aPets = v),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _cityField,
                  decoration: const InputDecoration(labelText: 'City'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _subCity,
                  decoration: const InputDecoration(labelText: 'Sub-city'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _specific,
                  decoration: const InputDecoration(labelText: 'Address / landmark'),
                ),
                if (_apiPropertyType == 'BUSINESS_SHOP') ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _shopClasses,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Number of classes / areas',
                    ),
                  ),
                ],
                if (isFloorRelevantPropertyType(_apiPropertyType)) ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _floor,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: l10n?.floorNumberLabel ?? 'Floor number',
                      hintText: l10n?.floorNumberHint ?? 'e.g. 3 (ground = 0)',
                      helperText: l10n?.floorNumberHelp ??
                          'Optional. 0–200 for this property type.',
                    ),
                  ),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _error!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ],
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Save changes'),
                ),
              ],
            ),
    );
  }
}
