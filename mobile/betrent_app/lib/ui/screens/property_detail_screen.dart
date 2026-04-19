import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/models/property.dart';
import '../../services/betrent_api.dart';
import 'login_screen.dart';

final _propertyDetailProvider =
    FutureProvider.autoDispose.family<PropertyDetail, String>((ref, slug) async {
  final api = ref.watch(betRentApiProvider);
  return api.fetchPropertyDetail(slug);
});

class PropertyDetailScreen extends ConsumerWidget {
  const PropertyDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_propertyDetailProvider(slug));

    return async.when(
      data: (detail) => _DetailBody(detail: detail, slug: slug),
      loading: () => Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('$e')),
      ),
    );
  }
}

class _DetailBody extends ConsumerStatefulWidget {
  const _DetailBody({required this.detail, required this.slug});

  final PropertyDetail detail;
  final String slug;

  @override
  ConsumerState<_DetailBody> createState() => _DetailBodyState();
}

class _DetailBodyState extends ConsumerState<_DetailBody> {
  int _imgIndex = 0;
  bool _favBusy = false;

  Future<void> _toggleFavorite(PropertySummary s) async {
    final auth = ref.read(authControllerProvider);
    if (!auth.isAuthenticated) {
      if (!mounted) return;
      await Navigator.push<void>(
        context,
        MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
      );
      return;
    }
    setState(() => _favBusy = true);
    final api = ref.read(betRentApiProvider);
    try {
      if (s.isFavorited && s.favoriteId != null) {
        await api.removeFavorite(s.favoriteId!);
      } else {
        await api.addFavorite(s.id);
      }
      ref.invalidate(_propertyDetailProvider(widget.slug));
    } finally {
      if (mounted) setState(() => _favBusy = false);
    }
  }

  Future<void> _callOwner(String? phone) async {
    if (phone == null || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Phone number not available for this listing.')),
      );
      return;
    }
    final uri = Uri(scheme: 'tel', path: phone.replaceAll(RegExp(r'\s'), ''));
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.detail;
    final s = d.summary;
    final imgs = d.images.isNotEmpty
        ? d.images
        : (s.resolvedImage.isNotEmpty
            ? [
                PropertyImage(
                  id: 0,
                  imageUrl: s.primaryImageUrl ?? '',
                  isPrimary: true,
                ),
              ]
            : <PropertyImage>[]);
    final price = NumberFormat.currency(symbol: s.priceCurrency, decimalDigits: 0)
        .format(double.tryParse(s.priceMonthly) ?? 0);
    final lt = s.listingType.toLowerCase();
    final priceLine = lt == 'sale'
        ? '$price Total price'
        : lt == 'short_term'
            ? '$price / month (short-term)'
            : '$price / month';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Listing'),
        actions: [
          IconButton(
            tooltip: 'Save',
            onPressed: _favBusy ? null : () => _toggleFavorite(s),
            icon: _favBusy
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Icon(
                    s.isFavorited ? Icons.favorite : Icons.favorite_border,
                    color: s.isFavorited ? Colors.red : null,
                  ),
          ),
        ],
      ),
      body: ListView(
        children: [
          if (imgs.isNotEmpty)
            SizedBox(
              height: 240,
              child: PageView.builder(
                itemCount: imgs.length,
                onPageChanged: (i) => setState(() => _imgIndex = i),
                itemBuilder: (_, i) {
                  final url = imgs[i].resolvedUrl;
                  return CachedNetworkImage(
                    imageUrl: url,
                    fit: BoxFit.cover,
                    memCacheWidth: 900,
                    placeholder: (_, __) => const Center(child: CircularProgressIndicator()),
                  );
                },
              ),
            )
          else
            const SizedBox(
              height: 200,
              child: ColoredBox(
                color: Color(0xFFE0E0E0),
                child: Center(child: Icon(Icons.home_work, size: 64)),
              ),
            ),
          if (imgs.length > 1)
            Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  imgs.length,
                  (i) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: CircleAvatar(
                      radius: 4,
                      backgroundColor: i == _imgIndex
                          ? Theme.of(context).colorScheme.primary
                          : Colors.grey.shade400,
                    ),
                  ),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  s.title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  priceLine,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 8),
                Text(s.locationLine, style: Theme.of(context).textTheme.bodyLarge),
                const SizedBox(height: 16),
                Text(
                  'About',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(d.description),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _callOwner(d.owner.phoneNumber),
                    icon: const Icon(Icons.phone),
                    label: const Text('Call'),
                  ),
                ),
                if (d.mapsUrl != null && d.mapsUrl!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  TextButton.icon(
                    onPressed: () async {
                      final uri = Uri.parse(d.mapsUrl!);
                      if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
                    },
                    icon: const Icon(Icons.map_outlined),
                    label: const Text('Open in maps'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
