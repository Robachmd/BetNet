import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/listing_package.dart';
import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';
import '../../utils/external_checkout.dart';

List<ListingPackageItem> _dedupeAndSortPackages(List<ListingPackageItem> raw) {
  final byId = <int, ListingPackageItem>{};
  for (final p in raw) {
    byId.putIfAbsent(p.id, () => p);
  }
  final list = byId.values.toList()
    ..sort((a, b) {
      final s = a.sortOrder.compareTo(b.sortOrder);
      if (s != 0) return s;
      return a.id.compareTo(b.id);
    });
  return list;
}

final _listingPackagesProvider =
    FutureProvider.autoDispose<List<ListingPackageItem>>((ref) async {
  final raw = await ref.watch(betNetApiProvider).fetchListingPackages();
  return _dedupeAndSortPackages(raw);
});

final _slotSummaryProvider = FutureProvider.autoDispose<Map<String, dynamic>>((
  ref,
) async {
  return ref.watch(betNetApiProvider).fetchListingSlotSummary();
});

final _myPurchasesProvider =
    FutureProvider.autoDispose<List<ListingPackagePurchaseItem>>((ref) async {
  return ref.watch(betNetApiProvider).fetchMyListingPackagePurchases();
});

final _activePurchaseProvider =
    FutureProvider.autoDispose<ListingPackagePurchaseItem?>((ref) async {
  return ref.watch(betNetApiProvider).fetchMyActiveListingPackagePurchase();
});

class ListingPackagesScreen extends ConsumerStatefulWidget {
  const ListingPackagesScreen({super.key});

  @override
  ConsumerState<ListingPackagesScreen> createState() =>
      _ListingPackagesScreenState();
}

class _ListingPackagesScreenState extends ConsumerState<ListingPackagesScreen> {
  bool _busy = false;
  String? _pendingTransactionId;
  String _pendingMethod = 'CHAPA';

  Future<int?> _fetchRemainingSlots() async {
    try {
      final summary = await ref.read(betNetApiProvider).fetchListingSlotSummary();
      return (summary['package_slots_remaining'] as num?)?.toInt() ?? 0;
    } catch (_) {
      return null;
    }
  }

  Future<void> _buy(ListingPackageItem pkg) async {
    setState(() => _busy = true);
    try {
      final result = await ref.read(betNetApiProvider).initiateListingPackagePurchase(
            packageId: pkg.id,
            paymentMethod: 'CHAPA',
          );
      _pendingMethod = 'CHAPA';
      _pendingTransactionId = result['transaction_id']?.toString() ??
          result['tx_ref']?.toString() ??
          result['purchase_id']?.toString();
      final url = result['checkout_url']?.toString();
      if (url != null && url.isNotEmpty) {
        await openPaymentCheckoutUrl(url);
      }
      final remaining = await _fetchRemainingSlots();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            remaining == null
                ? 'Checkout opened. Complete payment then return.'
                : 'Checkout opened. Listing slots left now: $remaining.',
          ),
        ),
      );
      ref.invalidate(_myPurchasesProvider);
      ref.invalidate(_slotSummaryProvider);
      setState(() {});
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verifyPendingPayment() async {
    final tx = _pendingTransactionId;
    if (tx == null || tx.isEmpty) return;
    setState(() => _busy = true);
    try {
      final out = await ref.read(betNetApiProvider).verifyPayment(
            transactionId: tx,
            paymentMethod: _pendingMethod,
          );
      final status = out['status']?.toString() ?? 'unknown';
      if (!mounted) return;
      int? remaining;
      if (status.toUpperCase() == 'SUCCESS' ||
          status.toUpperCase() == 'COMPLETED') {
        _pendingTransactionId = null;
        remaining = await _fetchRemainingSlots();
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            remaining == null
                ? 'Verify result: $status'
                : 'Verify result: $status. Listing slots left: $remaining',
          ),
        ),
      );
      ref.invalidate(_myPurchasesProvider);
      ref.invalidate(_slotSummaryProvider);
      setState(() {});
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
    final packagesAsync = ref.watch(_listingPackagesProvider);
    final summaryAsync = ref.watch(_slotSummaryProvider);
    final purchasesAsync = ref.watch(_myPurchasesProvider);
    final activeAsync = ref.watch(_activePurchaseProvider);
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Listing packages')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(_listingPackagesProvider);
          ref.invalidate(_slotSummaryProvider);
          ref.invalidate(_myPurchasesProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_pendingTransactionId != null)
              SectionCard(
                title: 'Pending payment verification',
                subtitle: 'Transaction: $_pendingTransactionId',
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Tap verify after completing checkout.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                    FilledButton.tonal(
                      onPressed: _busy ? null : _verifyPendingPayment,
                      child: const Text('Verify'),
                    ),
                  ],
                ),
              ),
            SectionCard(
              title: 'Slot summary',
              child: summaryAsync.when(
                data: (s) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Package slots: ${s['package_slots_remaining'] ?? 0}'),
                    const SizedBox(height: 4),
                    StatusBadge(
                      label: s['can_publish'] == true ? 'Can publish' : 'Cannot publish',
                      tone: s['can_publish'] == true
                          ? StatusTone.success
                          : StatusTone.warning,
                    ),
                  ],
                ),
                loading: () => const LoadingState(),
                error: (e, _) => ErrorState(message: '$e'),
              ),
            ),
            const SizedBox(height: 8),
            SectionCard(
              title: 'Current plan',
              child: activeAsync.when(
                data: (p) {
                  if (p == null) {
                    return const EmptyState(title: 'No active package. Buy a plan to publish.');
                  }
                  return Card(
                    child: ListTile(
                      title: Text(p.packageName ?? 'Package'),
                      subtitle: Text(
                        '${p.statusDisplay} · ${p.slotsRemaining}/${p.slotsTotal} slots left',
                      ),
                      trailing: p.expiresAt == null
                          ? null
                          : Text(
                              'Expires\n${p.expiresAt!.toLocal().toString().split(' ').first}',
                              textAlign: TextAlign.right,
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: scheme.onSurfaceVariant,
                                  ),
                            ),
                    ),
                  );
                },
                loading: () => const LoadingState(),
                error: (e, _) => ErrorState(message: '$e'),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Choose a plan',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'Each plan adds listing slots you use when you publish.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 12),
            packagesAsync.when(
              data: (packages) {
                if (packages.isEmpty) {
                  return const SectionCard(
                    title: 'Available packages',
                    child: EmptyState(title: 'No listing packages available.'),
                  );
                }
                return Column(
                  children: [
                    for (final pkg in packages)
                      Padding(
                        key: ValueKey<int>(pkg.id),
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _ListingPackageTierCard(
                          pkg: pkg,
                          busy: _busy,
                          onBuy: () => _buy(pkg),
                        ),
                      ),
                  ],
                );
              },
              loading: () => const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => ErrorState(message: '$e'),
            ),
            const SizedBox(height: 12),
            SectionCard(
              title: 'Purchase history',
              child: purchasesAsync.when(
                data: (rows) {
                  if (rows.isEmpty) {
                    return const EmptyState(title: 'No package purchases yet.');
                  }
                  return Column(
                    children: [
                      for (final p in rows)
                        Padding(
                          key: ValueKey<int>(p.id),
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Card(
                            child: ListTile(
                              title: Text(p.packageName ?? 'Package'),
                              subtitle: Text(
                                '${p.statusDisplay} · ${p.slotsRemaining}/${p.slotsTotal} slots left',
                              ),
                            ),
                          ),
                        ),
                    ],
                  );
                },
                loading: () => const LoadingState(),
                error: (e, _) => ErrorState(message: '$e'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ListingPackageTierCard extends StatelessWidget {
  const _ListingPackageTierCard({
    required this.pkg,
    required this.busy,
    required this.onBuy,
  });

  final ListingPackageItem pkg;
  final bool busy;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final badge = pkg.badgeLabel?.trim();
    final hasCompare = pkg.compareAtPrice != null &&
        pkg.compareAtPrice!.isNotEmpty &&
        pkg.compareAtPrice != pkg.price;
    final savings = pkg.savingsPercent;

    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.5)),
      ),
      child: InkWell(
        onTap: busy ? null : onBuy,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          pkg.name,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        if (pkg.tagline != null && pkg.tagline!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            pkg.tagline!,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: scheme.onSurfaceVariant,
                                ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (badge != null && badge.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: scheme.secondaryContainer,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        badge,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: scheme.onSecondaryContainer,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '${pkg.currency} ${pkg.price}',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: scheme.primary,
                        ),
                  ),
                  if (hasCompare) ...[
                    const SizedBox(width: 8),
                    Text(
                      '${pkg.currency} ${pkg.compareAtPrice}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            decoration: TextDecoration.lineThrough,
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                ],
              ),
              if (savings != null && savings > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    'Save ~$savings%',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: scheme.secondary,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              const SizedBox(height: 4),
              Text(
                '${pkg.listingQuota} ${pkg.listingQuota == 1 ? 'listing' : 'listings'} · ${pkg.validityDays} days',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
              ),
              if (pkg.pricePerListing != null &&
                  pkg.pricePerListing!.isNotEmpty &&
                  pkg.listingQuota > 1) ...[
                const SizedBox(height: 2),
                Text(
                  '~${pkg.currency} ${pkg.pricePerListing} / listing',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
              ],
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: busy ? null : onBuy,
                  child: const Text('Buy this plan'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
