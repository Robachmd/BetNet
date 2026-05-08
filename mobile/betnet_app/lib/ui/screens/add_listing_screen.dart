import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

import '../../core/config.dart';
import '../../l10n/app_localizations.dart';
import '../../services/betnet_api.dart';
import '../../utils/external_checkout.dart';
import '../../utils/listing_form_helpers.dart';
import '../../utils/property_types.dart';
import 'filters_screen.dart';

/// Same cap as web landlord flow (`MAX_IMAGES_PER_PROPERTY`).
const int kMaxListingPhotos = 10;

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
  final _floorNumber = TextEditingController();
  final _shopClasses = TextEditingController();
  final _area = TextEditingController();
  final _hallCapacity = TextEditingController();
  final _hallHour = TextEditingController();
  final _hallDay = TextEditingController();

  String _city = kEthiopianCities.first;
  String _ptype = 'APARTMENT';
  String _bedrooms = 'ONE';
  int _bathrooms = 1;
  String _listingType = ListingTypeValues.rent;
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

  final List<String> _imagePaths = [];
  int _coverPhotoIndex = 0;
  String? _videoPath;
  bool _busy = false;
  late Future<Map<String, dynamic>> _slotSummaryFuture;

  @override
  void initState() {
    super.initState();
    _slotSummaryFuture = _loadSlotSummary();
  }

  Future<Map<String, dynamic>> _loadSlotSummary() {
    return ref.read(betNetApiProvider).fetchListingSlotSummary();
  }

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    _price.dispose();
    _subCity.dispose();
    _specific.dispose();
    _floorNumber.dispose();
    _shopClasses.dispose();
    _area.dispose();
    _hallCapacity.dispose();
    _hallHour.dispose();
    _hallDay.dispose();
    super.dispose();
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

  String get _priceFieldLabel {
    if (isHallPropertyType(_ptype)) {
      return 'Display price (ETB, optional)';
    }
    if (_listingType == ListingTypeValues.sale) {
      return 'Total asking price (ETB)';
    }
    if (_listingType == ListingTypeValues.shortTerm) {
      return 'Short-term rate (ETB)';
    }
    return 'Monthly rent (ETB)';
  }

  Future<void> _runListingFeeCheckout({
    required int propertyId,
    required String title,
    required String paymentMethod,
  }) async {
    if (!mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    final api = ref.read(betNetApiProvider);
    final phone = ref.read(authControllerProvider).user?.phoneNumber ?? '';
    if (paymentMethod == 'TELEBIRR' && phone.isEmpty) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Telebirr needs a phone number on your account.'),
        ),
      );
      return;
    }
    try {
      final data = await api.initiatePayment(
        paymentType: 'LISTING_FEE',
        amount: AppConfig.defaultListingFeeEtb,
        paymentMethod: paymentMethod,
        propertyId: propertyId,
        description: 'Listing fee: $title',
        phone: phone.isEmpty ? null : phone,
      );
      final url = data['checkout_url'] as String?;
      if (url == null || url.isEmpty) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text(
                'No checkout link returned. Complete payment on the website if needed.'),
          ),
        );
        return;
      }
      final opened = await openPaymentCheckoutUrl(url);
      if (!mounted) return;
      if (opened) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text(
              'Finish payment in your browser or bank app, then return here.',
            ),
          ),
        );
      } else {
        messenger.showSnackBar(
          const SnackBar(
            content: Text(
                'Could not open the payment page. Try again or use the website.'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _offerPublishPayment({
    required int propertyId,
    required String title,
  }) async {
    if (!mounted) return;
    const fee = AppConfig.defaultListingFeeEtb;
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => AlertDialog(
        title: const Text('Publish listing'),
        content: const Text(
          'Pay $fee ETB listing fee to publish. Choose a method — you will leave the app '
          'so Chapa or Telebirr can open your bank or wallet app.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Later'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _runListingFeeCheckout(
                propertyId: propertyId,
                title: title,
                paymentMethod: 'CHAPA',
              );
            },
            child: const Text('Chapa'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              _runListingFeeCheckout(
                propertyId: propertyId,
                title: title,
                paymentMethod: 'TELEBIRR',
              );
            },
            child: const Text('Telebirr'),
          ),
        ],
      ),
    );
  }

  Future<void> _pickImages() async {
    final picker = ImagePicker();
    final list = await picker.pickMultiImage(imageQuality: 75);
    setState(() {
      for (final x in list) {
        if (_imagePaths.length < kMaxListingPhotos) {
          _imagePaths.add(x.path);
        }
      }
      if (_coverPhotoIndex >= _imagePaths.length) {
        _coverPhotoIndex = 0;
      }
    });
  }

  Future<void> _pickVideo() async {
    final picker = ImagePicker();
    final v = await picker.pickVideo(
      source: ImageSource.gallery,
      maxDuration: const Duration(minutes: 2),
    );
    if (v == null) return;
    setState(() => _videoPath = v.path);
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final floorLabel = l10n?.floorNumberLabel ?? 'Floor number';
    final hall = isHallPropertyType(_ptype);

    double mainPrice;
    if (hall) {
      final ph = double.tryParse(_hallHour.text.trim());
      final pd = double.tryParse(_hallDay.text.trim());
      final cap = int.tryParse(_hallCapacity.text.trim());
      if (cap == null || cap < 1) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Hall: enter guest capacity (1+).')),
        );
        return;
      }
      if ((ph == null || ph <= 0) && (pd == null || pd <= 0)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Hall: enter at least one of hourly or daily rate.'),
          ),
        );
        return;
      }
      mainPrice = hallPriceMonthlyPlaceholder(pricePerHour: ph, pricePerDay: pd);
      final opt = double.tryParse(_price.text.trim());
      if (opt != null && opt > 0) {
        mainPrice = opt;
      }
    } else {
      final p = double.tryParse(_price.text.trim());
      if (p == null || p <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Enter a valid ${_priceFieldLabel.toLowerCase()}.')),
        );
        return;
      }
      mainPrice = p;
    }

    int? floorVal;
    if (isFloorRelevantPropertyType(_ptype)) {
      final ft = _floorNumber.text.trim();
      if (ft.isNotEmpty) {
        floorVal = int.tryParse(ft);
        if (floorVal == null || floorVal < 0 || floorVal > 200) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                '$floorLabel: use a whole number from 0 to 200.',
              ),
            ),
          );
          return;
        }
      }
    }
    int? shopClassCount;
    if (_ptype == 'BUSINESS_SHOP') {
      shopClassCount = int.tryParse(_shopClasses.text.trim());
      if (shopClassCount == null || shopClassCount < 1 || shopClassCount > 99) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Business shop: enter number of classes/areas (1–99).',
            ),
          ),
        );
        return;
      }
    }

    double? areaSqm;
    final ar = _area.text.trim();
    if (ar.isNotEmpty) {
      areaSqm = double.tryParse(ar);
      if (areaSqm == null || areaSqm <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Area: enter a positive number (m²).')),
        );
        return;
      }
    }

    final bedStr = hall ? '' : _bedrooms;

    setState(() => _busy = true);
    try {
      final api = ref.read(betNetApiProvider);
      final body = await api.createProperty(
        title: _title.text.trim(),
        description: _desc.text.trim(),
        propertyType: _ptype,
        bedrooms: bedStr,
        priceMonthly: mainPrice,
        listingType: _listingType,
        bathrooms: hall ? 1 : _bathrooms,
        city: _city,
        subCity: _subCity.text.trim().isEmpty ? 'Center' : _subCity.text.trim(),
        specificLocation: _specific.text.trim().isEmpty
            ? 'See map / contact for details'
            : _specific.text.trim(),
        amenities: _amenitiesPayload(),
        floorNumber: floorVal,
        shopClassCount: shopClassCount,
        areaSqm: areaSqm,
        hallDetail: hall ? _hallPayload() : null,
      );
      final slug = body['slug'] as String?;
      if (slug != null && _imagePaths.isNotEmpty) {
        final cover = _coverPhotoIndex >= 0 && _coverPhotoIndex < _imagePaths.length
            ? _coverPhotoIndex
            : 0;
        for (var i = 0; i < _imagePaths.length; i++) {
          await api.uploadPropertyImage(
            propertySlug: slug,
            filePath: _imagePaths[i],
            isPrimary: i == cover,
          );
        }
      }
      if (slug != null && _videoPath != null && _videoPath!.isNotEmpty) {
        await api.uploadPropertyVideo(propertySlug: slug, filePath: _videoPath!);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Listing created.')),
        );
        final rawId = body['id'];
        final propertyId = switch (rawId) {
          int v => v,
          num v => v.toInt(),
          _ => null,
        };
        if (propertyId != null) {
          await _offerPublishPayment(
            propertyId: propertyId,
            title: _title.text.trim(),
          );
        }
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    if (!auth.isAuthenticated || !auth.user!.isPropertyOwner) {
      return Scaffold(
        appBar: AppBar(title: const Text('New listing')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
                'Only property owner accounts can publish homes. Register as a property owner or update your role in Django admin.'),
          ),
        ),
      );
    }

    final l10n = AppLocalizations.of(context);
    final hall = isHallPropertyType(_ptype);

    return Scaffold(
      appBar: AppBar(title: const Text('New listing')),
      body: AbsorbPointer(
        absorbing: _busy,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            FutureBuilder<Map<String, dynamic>>(
              future: _slotSummaryFuture,
              builder: (context, snapshot) {
                final remaining = (snapshot.data?['package_slots_remaining'] as num?)
                        ?.toInt() ??
                    0;
                final loading =
                    snapshot.connectionState == ConnectionState.waiting;
                final failed = snapshot.hasError;
                return Card(
                  color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.35),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Remaining listing package slots',
                          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                color: Theme.of(context).colorScheme.primary,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              loading
                                  ? '...'
                                  : failed
                                      ? '!'
                                      : '$remaining',
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(
                                    color: Theme.of(context).colorScheme.primary,
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                            const SizedBox(width: 8),
                            Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Text(
                                'slots left to publish',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            Text(
              'Offer as',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'Rent, sale, or short-term — pricing labels below update to match.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment<String>(
                  value: ListingTypeValues.rent,
                  label: Text('Rent'),
                ),
                ButtonSegment<String>(
                  value: ListingTypeValues.sale,
                  label: Text('Sale'),
                ),
                ButtonSegment<String>(
                  value: ListingTypeValues.shortTerm,
                  label: Text('Short stay'),
                ),
              ],
              selected: {_listingType},
              onSelectionChanged: (s) {
                setState(() => _listingType = s.first);
              },
            ),
            const SizedBox(height: 16),
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
            DropdownButtonFormField<String>(
              key: ValueKey<String>(_ptype),
              initialValue: _ptype,
              decoration: const InputDecoration(labelText: 'Property type'),
              items: kAddPropertyTypeChoices
                  .map(
                    (t) => DropdownMenuItem(value: t.$1, child: Text(t.$2)),
                  )
                  .toList(),
              onChanged: (v) {
                setState(() {
                  _ptype = v ?? _ptype;
                  if (!isFloorRelevantPropertyType(_ptype)) {
                    _floorNumber.clear();
                  }
                  if (_ptype != 'BUSINESS_SHOP') {
                    _shopClasses.clear();
                  }
                });
              },
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
                  (i) => DropdownMenuItem(value: i + 1, child: Text('${i + 1}')),
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
                hintText: 'Optional',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _price,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: _priceFieldLabel,
                helperText: hall
                    ? 'Defaults from hall rates if left empty or zero.'
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
                  hintText: 'Optional if daily set',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _hallDay,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Price per day (ETB)',
                  hintText: 'Optional if hourly set',
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
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              key: ValueKey<String>(_water),
              initialValue: _water,
              decoration: const InputDecoration(labelText: 'Water availability'),
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
                  const InputDecoration(labelText: 'Electricity stability'),
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
            DropdownButtonFormField<String>(
              key: ValueKey<String>(_city),
              initialValue: _city,
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
            if (_ptype == 'BUSINESS_SHOP')
              TextField(
                controller: _shopClasses,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Number of classes / areas',
                  helperText: 'Required for business shops (1–99).',
                ),
              )
            else if (isFloorRelevantPropertyType(_ptype)) ...[
              TextField(
                controller: _floorNumber,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: l10n?.floorNumberLabel ?? 'Floor number',
                  hintText: l10n?.floorNumberHint ?? 'e.g. 3 (ground = 0)',
                  helperText: l10n?.floorNumberHelp ??
                      'Unit or shop floor (0–200). Optional.',
                ),
              ),
            ],
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _pickImages,
              icon: const Icon(Icons.photo_library_outlined),
              label: Text(
                  'Photos (${_imagePaths.length}) — up to $kMaxListingPhotos'),
            ),
            if (_imagePaths.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                'Reorder photos and choose a cover',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 8),
              ReorderableListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                buildDefaultDragHandles: false,
                itemCount: _imagePaths.length,
                onReorder: (oldIndex, newIndex) {
                  setState(() {
                    var ni = newIndex;
                    if (ni > oldIndex) ni -= 1;
                    final moved = _imagePaths.removeAt(oldIndex);
                    _imagePaths.insert(ni, moved);

                    if (_coverPhotoIndex == oldIndex) {
                      _coverPhotoIndex = ni;
                    } else if (oldIndex < _coverPhotoIndex && ni >= _coverPhotoIndex) {
                      _coverPhotoIndex -= 1;
                    } else if (oldIndex > _coverPhotoIndex && ni <= _coverPhotoIndex) {
                      _coverPhotoIndex += 1;
                    }
                  });
                },
                itemBuilder: (context, index) {
                  final path = _imagePaths[index];
                  return Card(
                    key: ValueKey('photo-$path'),
                    elevation: 0,
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          File(path),
                          width: 52,
                          height: 52,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            width: 52,
                            height: 52,
                            color: Theme.of(context)
                                .colorScheme
                                .surfaceContainerHighest,
                            child: const Icon(Icons.broken_image_outlined),
                          ),
                        ),
                      ),
                      title: Text(
                        index == _coverPhotoIndex ? 'Cover photo' : 'Photo ${index + 1}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: index == _coverPhotoIndex ? FontWeight.w700 : null,
                            ),
                      ),
                      subtitle: Text(
                        path.split(RegExp(r'[\\/]+')).last,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            tooltip: 'Set as cover',
                            onPressed: () => setState(() => _coverPhotoIndex = index),
                            icon: Icon(
                              index == _coverPhotoIndex
                                  ? Icons.star_rounded
                                  : Icons.star_border_rounded,
                            ),
                          ),
                          ReorderableDragStartListener(
                            index: index,
                            child: const Icon(Icons.drag_handle_rounded),
                          ),
                          IconButton(
                            tooltip: 'Remove',
                            onPressed: () {
                              setState(() {
                                _imagePaths.removeAt(index);
                                if (_coverPhotoIndex == index) {
                                  _coverPhotoIndex = 0;
                                } else if (_coverPhotoIndex > index) {
                                  _coverPhotoIndex -= 1;
                                }
                                if (_coverPhotoIndex >= _imagePaths.length) {
                                  _coverPhotoIndex = 0;
                                }
                              });
                            },
                            icon: const Icon(Icons.delete_outline_rounded),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _pickVideo,
              icon: const Icon(Icons.video_library_outlined),
              label: Text(_videoPath == null ? 'Add video (optional)' : 'Video selected'),
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
