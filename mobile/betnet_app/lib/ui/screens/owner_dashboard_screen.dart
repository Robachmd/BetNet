import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/betnet_api.dart';
import '../../utils/external_checkout.dart';
import '../widgets/app_primitives.dart';
import 'add_listing_screen.dart';
import 'bookings_screen.dart';
import 'listing_packages_screen.dart';
import 'my_listings_screen.dart';
import 'owner_engagement_screen.dart';

class OwnerDashboardScreen extends ConsumerStatefulWidget {
  const OwnerDashboardScreen({super.key});

  @override
  ConsumerState<OwnerDashboardScreen> createState() => _OwnerDashboardScreenState();
}

class _OwnerDashboardScreenState extends ConsumerState<OwnerDashboardScreen> {
  bool _buying = false;

  static const _desiredPackages = <_DesiredOwnerPackage>[
    _DesiredOwnerPackage(listings: 1, postsLabel: '1 Property Post', priceEtb: '199'),
    _DesiredOwnerPackage(listings: 5, postsLabel: '5 Property Posts', priceEtb: '799'),
    _DesiredOwnerPackage(listings: 20, postsLabel: '20 Property Posts', priceEtb: '2400'),
    _DesiredOwnerPackage(listings: 50, postsLabel: '50 Property Posts', priceEtb: '5000'),
    _DesiredOwnerPackage(listings: 100, postsLabel: '100 Property Posts', priceEtb: '8000'),
  ];

  Future<int?> _fetchRemainingSlots() async {
    try {
      final summary = await ref.read(betNetApiProvider).fetchListingSlotSummary();
      return (summary['package_slots_remaining'] as num?)?.toInt() ?? 0;
    } catch (_) {
      return null;
    }
  }

  Future<void> _choosePackage(_DesiredOwnerPackage option) async {
    setState(() => _buying = true);
    try {
      final rows = await ref.read(betNetApiProvider).fetchListingPackages();
      final match = rows.where((p) => p.listingQuota == option.listings).toList();
      if (match.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '${option.listings} listing package is not available right now.',
            ),
          ),
        );
        return;
      }
      final pkg = match.first;
      final out = await ref.read(betNetApiProvider).initiateListingPackagePurchase(
            packageId: pkg.id,
            paymentMethod: 'CHAPA',
          );
      final url = out['checkout_url']?.toString();
      if (url != null && url.isNotEmpty) {
        await openPaymentCheckoutUrl(url);
      }
      final remaining = await _fetchRemainingSlots();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            remaining == null
                ? 'Checkout opened. Complete payment then verify in Listing Packages.'
                : 'Checkout opened. Listing slots left now: $remaining. Complete payment then verify in Listing Packages.',
          ),
        ),
      );
      ref.invalidate(_ownerOverviewProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _buying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final overview = ref.watch(_ownerOverviewProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Property Owner Dashboard')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard(
            title: 'Overview',
            subtitle: 'Quick snapshot of your owner activity',
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                StatCard(
                  label: 'Total Properties',
                  value: overview.when(
                    data: (v) => '${v['total_properties'] ?? 0}',
                    loading: () => '...',
                    error: (_, __) => '!',
                  ),
                  icon: Icons.home_work_outlined,
                ),
                StatCard(
                  label: 'Available',
                  value: overview.when(
                    data: (v) => '${v['available'] ?? 0}',
                    loading: () => '...',
                    error: (_, __) => '!',
                  ),
                  icon: Icons.check_circle_outline,
                ),
                StatCard(
                  label: 'Verified',
                  value: overview.when(
                    data: (v) => '${v['verified'] ?? 0}',
                    loading: () => '...',
                    error: (_, __) => '!',
                  ),
                  icon: Icons.verified_outlined,
                ),
                StatCard(
                  label: 'Total Views',
                  value: overview.when(
                    data: (v) => '${v['total_views'] ?? 0}',
                    loading: () => '...',
                    error: (_, __) => '!',
                  ),
                  icon: Icons.visibility_outlined,
                ),
                StatCard(
                  label: 'Remaining Package Slots',
                  value: overview.when(
                    data: (v) => '${v['remaining_slots'] ?? 0}',
                    loading: () => '...',
                    error: (_, __) => '!',
                  ),
                  icon: Icons.inventory_2_outlined,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SectionCard(
            title: 'Listing Packages',
            subtitle: 'Choose a package for posting property listings.',
            child: Column(
              children: _desiredPackages.map((option) {
                return _OwnerPackageTile(
                  option: option,
                  busy: _buying,
                  onChoose: () => _choosePackage(option),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),
          SectionCard(
            title: 'Property management',
            subtitle: 'Create and manage your listings quickly',
            child: Column(
              children: [
                FilledButton.icon(
                  onPressed: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(builder: (_) => const AddListingScreen()),
                    );
                  },
                  icon: const Icon(Icons.add_home_outlined),
                  label: const Text('Create new listing'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(builder: (_) => const MyListingsScreen()),
                    );
                  },
                  icon: const Icon(Icons.home_work_outlined),
                  label: const Text('Manage my listings'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SectionCard(
            title: 'More tools',
            child: Column(
              children: [
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const OwnerEngagementScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.insights_outlined),
                  label: const Text('Engagement insights'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(builder: (_) => const BookingsScreen()),
                    );
                  },
                  icon: const Icon(Icons.event_note_outlined),
                  label: const Text('Incoming booking requests'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const ListingPackagesScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.inventory_2_outlined),
                  label: const Text('Open listing packages'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

final _ownerOverviewProvider = FutureProvider.autoDispose<Map<String, int>>((
  ref,
) async {
  final api = ref.watch(betNetApiProvider);
  final properties = await api.fetchMyProperties();
  final slotSummary = await api.fetchListingSlotSummary();

  final totalProperties = properties.length;
  final available = properties.where((p) => p.isAvailable).length;
  final verified = properties.where((p) => p.isVerified ?? false).length;
  final totalViews = properties.fold<int>(0, (sum, p) => sum + p.views);
  final remainingSlots =
      (slotSummary['package_slots_remaining'] as num?)?.toInt() ?? 0;

  return {
    'total_properties': totalProperties,
    'available': available,
    'verified': verified,
    'total_views': totalViews,
    'remaining_slots': remainingSlots,
  };
});

class _DesiredOwnerPackage {
  const _DesiredOwnerPackage({
    required this.listings,
    required this.postsLabel,
    required this.priceEtb,
  });

  final int listings;
  final String postsLabel;
  final String priceEtb;
}

class _OwnerPackageTile extends StatelessWidget {
  const _OwnerPackageTile({
    required this.option,
    required this.busy,
    required this.onChoose,
  });

  final _DesiredOwnerPackage option;
  final bool busy;
  final VoidCallback onChoose;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${option.listings} LISTING${option.listings > 1 ? 'S' : ''}',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 6),
            Text(option.postsLabel),
            const SizedBox(height: 2),
            Text(
              '${option.priceEtb} ETB',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Package system for posting listings',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton(
                onPressed: busy ? null : onChoose,
                child: busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Choose Package'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

