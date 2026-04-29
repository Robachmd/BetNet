import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/models/property.dart';
import '../../l10n/app_localizations.dart';
import '../../services/betnet_api.dart';
import '../../utils/property_types.dart';
import '../theme/app_theme.dart';
import '../widgets/app_primitives.dart';
import '../widgets/property_card.dart';
import 'chat_thread_screen.dart';
import 'create_booking_screen.dart';
import 'create_hall_booking_screen.dart';
import 'reviews_screen.dart';

final _propertyDetailProvider =
    FutureProvider.autoDispose.family<PropertyDetail, String>((ref, slug) async {
  final api = ref.watch(betNetApiProvider);
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
      loading: () => Scaffold(appBar: AppBar(), body: const PropertyListSkeleton(count: 2)),
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
      context.push('/login');
      return;
    }
    setState(() => _favBusy = true);
    final api = ref.read(betNetApiProvider);
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

  Future<bool> _ensureAuth() async {
    final auth = ref.read(authControllerProvider);
    if (auth.isAuthenticated) return true;
    if (!mounted) return false;
    await context.push('/login');
    return ref.read(authControllerProvider).isAuthenticated;
  }

  Future<void> _startConversation(PropertyDetail detail) async {
    if (!await _ensureAuth()) return;
    try {
      final id = await ref.read(betNetApiProvider).createConversation(
            participantId: detail.owner.id,
            propertyId: detail.summary.id,
            initialMessage: 'Hello, I am interested in this property.',
          );
      if (!mounted) return;
      final ownerName =
          '${detail.owner.firstName} ${detail.owner.lastName}'.trim();
      await Navigator.push<void>(
        context,
        MaterialPageRoute<void>(
          builder: (_) => ChatThreadScreen(
            conversationId: id,
            title: ownerName.isEmpty ? 'Owner' : ownerName,
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _bookVisit(PropertyDetail detail) async {
    if (!await _ensureAuth()) return;
    if (!mounted) return;
    final isHall = detail.summary.propertyType == 'HALL_RENTAL';
    await Navigator.push<bool>(
      context,
      MaterialPageRoute<bool>(
        builder: (_) => isHall
            ? CreateHallBookingScreen(
                propertyId: detail.summary.id,
                propertyTitle: detail.summary.title,
              )
            : CreateBookingScreen(
                propertyId: detail.summary.id,
                propertyTitle: detail.summary.title,
              ),
      ),
    );
  }

  String _bookButtonLabel(PropertyDetail detail) {
    if (detail.summary.propertyType == 'HALL_RENTAL') {
      return 'Book hall';
    }
    return 'Book visit';
  }

  IconData _bookButtonIcon(PropertyDetail detail) {
    if (detail.summary.propertyType == 'HALL_RENTAL') {
      return Icons.celebration_outlined;
    }
    return Icons.calendar_month_outlined;
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
        title: const Text('Property details'),
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
      bottomNavigationBar: Material(
        elevation: 12,
        color: Theme.of(context).colorScheme.surface,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              BetNetSpacing.md,
              BetNetSpacing.sm,
              BetNetSpacing.md,
              BetNetSpacing.md,
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _startConversation(d),
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: const Text('Chat'),
                  ),
                ),
                const SizedBox(width: BetNetSpacing.md),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => _bookVisit(d),
                    icon: Icon(_bookButtonIcon(d)),
                    label: Text(_bookButtonLabel(d)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: BetNetSpacing.md),
        children: [
          if (imgs.isNotEmpty)
            SizedBox(
              height: 260,
              child: Stack(
                children: [
                  PageView.builder(
                    itemCount: imgs.length,
                    onPageChanged: (i) => setState(() => _imgIndex = i),
                    itemBuilder: (_, i) {
                      final url = imgs[i].resolvedUrl;
                      return CachedNetworkImage(
                        imageUrl: url,
                        fit: BoxFit.cover,
                        memCacheWidth: 900,
                        placeholder: (_, __) => const SkeletonBox(height: 260, radius: 0),
                      );
                    },
                  ),
                  Positioned(
                    left: BetNetSpacing.md,
                    bottom: BetNetSpacing.md,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        child: Text(
                          '${_imgIndex + 1}/${imgs.length}',
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            const SizedBox(
              height: 220,
              child: ColoredBox(
                color: Color(0xFFE0E0E0),
                child: Center(child: Icon(Icons.home_work, size: 64)),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(BetNetSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionCard(
                  title: s.title,
                  subtitle: s.locationLine,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        priceLine,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Theme.of(context).colorScheme.primary,
                            ),
                      ),
                      const SizedBox(height: BetNetSpacing.sm),
                      Wrap(
                        spacing: BetNetSpacing.sm,
                        children: [
                          _MetaPill(label: s.propertyType.replaceAll('_', ' ')),
                          _MetaPill(label: s.bedrooms ?? 'N/A bedrooms'),
                          _MetaPill(
                            label: s.listingType.replaceAll('_', ' ').toUpperCase(),
                          ),
                          if (s.floorNumber != null &&
                              isFloorRelevantPropertyType(s.propertyType))
                            _MetaPill(
                              label: AppLocalizations.of(context)
                                      ?.floorMeta(s.floorNumber!) ??
                                  'Floor ${s.floorNumber}',
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                SectionCard(
                  title: 'Owner',
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(
                      child: Icon(Icons.person_outline),
                    ),
                    title: Text(
                      '${d.owner.firstName} ${d.owner.lastName}'.trim().isEmpty
                          ? 'Property owner'
                          : '${d.owner.firstName} ${d.owner.lastName}'.trim(),
                    ),
                    subtitle: Text(d.owner.phoneNumber ?? ''),
                    trailing: IconButton(
                      icon: const Icon(Icons.phone_outlined),
                      onPressed: () => _callOwner(d.owner.phoneNumber),
                    ),
                  ),
                ),
                SectionCard(
                  title: 'About this property',
                  child: Text(d.description),
                ),
                SectionCard(
                  title: 'Actions',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      FilledButton.icon(
                        onPressed: () => _bookVisit(d),
                        icon: Icon(_bookButtonIcon(d)),
                        label: Text(_bookButtonLabel(d)),
                      ),
                      const SizedBox(height: BetNetSpacing.sm),
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.push<void>(
                            context,
                            MaterialPageRoute<void>(
                              builder: (_) => PropertyReviewsScreen(
                                propertyId: d.summary.id,
                                propertyTitle: d.summary.title,
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.rate_review_outlined),
                        label: const Text('Read reviews'),
                      ),
                      if (d.mapsUrl != null && d.mapsUrl!.isNotEmpty) ...[
                        const SizedBox(height: BetNetSpacing.sm),
                        OutlinedButton.icon(
                          onPressed: () async {
                            final uri = Uri.parse(d.mapsUrl!);
                            if (await canLaunchUrl(uri)) {
                              await launchUrl(uri, mode: LaunchMode.externalApplication);
                            }
                          },
                          icon: const Icon(Icons.map_outlined),
                          label: const Text('Open in maps'),
                        ),
                      ],
                    ],
                  ),
                ),
                _SimilarPropertiesSection(
                  summary: s,
                  currentSlug: widget.slug,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(label: Text(label));
  }
}

class _SimilarPropertiesSection extends ConsumerWidget {
  const _SimilarPropertiesSection({
    required this.summary,
    required this.currentSlug,
  });

  final PropertySummary summary;
  final String currentSlug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder<List<PropertySummary>>(
      future: ref.read(betNetApiProvider).fetchProperties(
            city: summary.city,
            propertyType: summary.propertyType,
          ),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SectionCard(
            title: 'Similar properties',
            child: SizedBox(
              height: 170,
              child: Center(child: CircularProgressIndicator()),
            ),
          );
        }
        final list = (snapshot.data ?? [])
            .where((p) => p.slug != currentSlug)
            .take(6)
            .toList();
        if (list.isEmpty) {
          return const SizedBox.shrink();
        }
        return SectionCard(
          title: 'Similar properties',
          child: SizedBox(
            height: 280,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(width: BetNetSpacing.sm),
              itemBuilder: (_, i) {
                final p = list[i];
                return SizedBox(
                  width: 240,
                  child: PropertyCard(
                    property: p,
                    onTap: () => context.push('/property/${p.slug}'),
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }
}
