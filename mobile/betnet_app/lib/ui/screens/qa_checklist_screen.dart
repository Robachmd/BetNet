import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';

class QaChecklistScreen extends ConsumerStatefulWidget {
  const QaChecklistScreen({super.key});

  @override
  ConsumerState<QaChecklistScreen> createState() => _QaChecklistScreenState();
}

class _QaChecklistScreenState extends ConsumerState<QaChecklistScreen> {
  bool _running = false;
  final Map<String, _CheckResult> _results = {};

  Future<void> _runAll() async {
    setState(() {
      _running = true;
      _results.clear();
    });

    final checks = <Future<void> Function()>[
      () => _run('Auth/profile', () async {
            await ref.read(betNetApiProvider).restoreUser();
          }),
      () => _run('Listings/fetch', () async {
            await ref.read(betNetApiProvider).fetchProperties(search: 'addis');
          }),
      () => _run('Listings/search', () async {
            await ref.read(betNetApiProvider).searchProperties('addis');
          }),
      () => _run('Listings/detail', () async {
            final list = await ref.read(betNetApiProvider).fetchProperties();
            if (list.isEmpty) throw Exception('No properties to test detail endpoint.');
            await ref.read(betNetApiProvider).fetchPropertyDetail(list.first.slug);
          }),
      () => _run('Favorites/list', () async {
            await ref.read(betNetApiProvider).fetchFavorites();
          }),
      () => _run('Favorites/create', () async {
            final list = await ref.read(betNetApiProvider).fetchProperties();
            if (list.isEmpty) {
              throw Exception('No property available for favorite create check.');
            }
            await ref.read(betNetApiProvider).addFavorite(list.first.id);
          }),
      () => _run('Favorites/delete', () async {
            _skip(
              'Favorites/delete',
              'Delete probe skipped (API requires favorite row id not exposed in this client model).',
            );
          }),
      () => _run('Bookings/list', () async {
            await ref.read(betNetApiProvider).fetchBookings();
          }),
      () => _run('Bookings/create', () async {
            final list = await ref.read(betNetApiProvider).fetchProperties();
            if (list.isEmpty) throw Exception('No listing available for booking create check.');
            final start = DateTime.now().add(const Duration(days: 3));
            final created = await ref.read(betNetApiProvider).createVisitBooking(
                  propertyId: list.first.id,
                  visitDate: DateTime(start.year, start.month, start.day),
                  visitTime24h: '10:00:00',
                );
            await ref.read(betNetApiProvider).cancelBooking(created.id);
          }),
      () => _run('Bookings/status update', () async {
            _skip(
              'Bookings/status update',
              'Status change requires owner context and pending request.',
            );
          }),
      () => _run('Chat/list', () async {
            await ref.read(betNetApiProvider).fetchConversations();
          }),
      () => _run('Chat/thread', () async {
            final rows = await ref.read(betNetApiProvider).fetchConversations();
            if (rows.isEmpty) throw Exception('No conversation available.');
            await ref.read(betNetApiProvider).fetchMessages(rows.first.id);
          }),
      () => _run('Chat/send', () async {
            final rows = await ref.read(betNetApiProvider).fetchConversations();
            if (rows.isEmpty) {
              throw Exception('No conversation available for send check.');
            }
            await ref.read(betNetApiProvider).sendMessage(
                  rows.first.id,
                  '[QA] parity checklist message',
                );
          }),
      () => _run('Notifications/list', () async {
            await ref.read(betNetApiProvider).fetchNotifications();
          }),
      () => _run('Notifications/unread', () async {
            await ref.read(betNetApiProvider).notificationUnreadCount();
          }),
      () => _run('Notifications/read', () async {
            final rows = await ref.read(betNetApiProvider).fetchNotifications();
            if (rows.isEmpty) {
              _skip('Notifications/read', 'No notification available to mark read.');
              return;
            }
            await ref.read(betNetApiProvider).markNotificationRead(rows.first.id);
          }),
      () => _run('Location alerts/list', () async {
            await ref.read(betNetApiProvider).fetchLocationAlerts();
          }),
      () => _run('Location alerts/create/update/delete', () async {
            final created = await ref.read(betNetApiProvider).createLocationAlert(
                  city: 'Addis Ababa',
                  subCity: 'Bole',
                  label: 'QA probe',
                );
            await ref.read(betNetApiProvider).updateLocationAlert(
                  id: created.id,
                  payload: {'label': 'QA probe updated'},
                );
            await ref.read(betNetApiProvider).deleteLocationAlert(created.id);
          }),
      () => _run('Reviews/my', () async {
            await ref.read(betNetApiProvider).fetchMyReviews();
          }),
      () => _run('Reviews/create', () async {
            final list = await ref.read(betNetApiProvider).fetchProperties();
            if (list.isEmpty) throw Exception('No listing available for review create.');
            await ref.read(betNetApiProvider).createReview(
                  reviewType: 'PROPERTY',
                  rating: 4,
                  title: 'QA Review',
                  comment: 'QA probe review',
                  propertyId: list.first.id,
                );
          }),
      () => _run('Listing packages/list', () async {
            await ref.read(betNetApiProvider).fetchListingPackages();
          }),
      () => _run('Listing packages/summary', () async {
            await ref.read(betNetApiProvider).fetchListingSlotSummary();
          }),
      () => _run('Payments/initiate + verify query', () async {
            final packages = await ref.read(betNetApiProvider).fetchListingPackages();
            if (packages.isEmpty) {
              _skip('Payments/initiate + verify query', 'No package available for payment init.');
              return;
            }
            final init = await ref.read(betNetApiProvider).initiateListingPackagePurchase(
                  packageId: packages.first.id,
                  paymentMethod: 'CHAPA',
                );
            final tx = init['transaction_id']?.toString() ??
                init['tx_ref']?.toString() ??
                init['purchase_id']?.toString();
            if (tx == null || tx.isEmpty) {
              throw Exception('Missing transaction id from initiate response.');
            }
            await ref.read(betNetApiProvider).verifyPayment(
                  transactionId: tx,
                  paymentMethod: 'CHAPA',
                );
          }),
      () => _run('Payments/history', () async {
            await ref.read(betNetApiProvider).fetchPaymentHistory();
          }),
      () => _run('Analytics/dashboard (admin)', () async {
            await ref.read(betNetApiProvider).fetchAdminDashboard();
          }),
      () => _run('Halls / browse', () async {
            await ref.read(betNetApiProvider).fetchHallRentals();
          }),
      () => _run('Halls / availability calendar', () async {
            final halls = await ref.read(betNetApiProvider).fetchHallRentals();
            if (halls.isEmpty) {
              _skip('Halls / availability calendar', 'No hall listings to probe availability.');
              return;
            }
            final now = DateTime.now();
            await ref.read(betNetApiProvider).fetchAvailability(
                  propertyId: halls.first.id,
                  year: now.year,
                  month: now.month,
                );
          }),
      () => _run('Admin / property directory', () async {
            try {
              await ref.read(betNetApiProvider).fetchAdminPropertyList();
            } on ApiException catch (e) {
              if (e.statusCode == 403) {
                _skip(
                  'Admin / property directory',
                  'Requires staff or platform admin.',
                );
                return;
              }
              rethrow;
            }
          }),
      () => _run('Admin / users directory', () async {
            try {
              await ref.read(betNetApiProvider).fetchAdminUsersDirectory();
            } on ApiException catch (e) {
              if (e.statusCode == 403) {
                _skip(
                  'Admin / users directory',
                  'Requires staff or platform admin.',
                );
                return;
              }
              rethrow;
            }
          }),
    ];

    for (final c in checks) {
      await c();
    }

    if (mounted) setState(() => _running = false);
  }

  Future<void> _run(String key, Future<void> Function() action) async {
    try {
      await action();
      if (_results.containsKey(key) && _results[key]!.status == _CheckStatus.skipped) {
        return;
      }
      if (!mounted) return;
      setState(
        () => _results[key] = const _CheckResult(
          status: _CheckStatus.passed,
          message: 'OK',
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(
        () => _results[key] = _CheckResult(
          status: _CheckStatus.failed,
          message: '$e',
        ),
      );
    }
  }

  void _skip(String key, String message) {
    if (!mounted) return;
    setState(
      () => _results[key] = _CheckResult(
        status: _CheckStatus.skipped,
        message: message,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final keys = _results.keys.toList();
    return Scaffold(
      appBar: AppBar(title: const Text('QA Checklist (Debug)')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard(
            title: 'One-tap parity smoke test',
            subtitle: 'Runs endpoint probes for major mobile parity areas',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FilledButton.icon(
                  onPressed: _running ? null : _runAll,
                  icon: const Icon(Icons.play_arrow),
                  label: Text(_running ? 'Running...' : 'Run all checks'),
                ),
                const SizedBox(height: 8),
                Text(
                  'Tip: login as renter, property owner, and admin to validate role-specific checks.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          SectionCard(
            title: 'Results',
            child: keys.isEmpty
                ? const EmptyState(title: 'No checks executed yet.')
                : Column(
                    children: keys.map((k) {
                      final res = _results[k]!;
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(k),
                        subtitle: Text(
                          res.message,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: StatusBadge(
                          label: res.status == _CheckStatus.passed
                              ? 'PASS'
                              : res.status == _CheckStatus.failed
                                  ? 'FAIL'
                                  : 'SKIP',
                          tone: res.status == _CheckStatus.passed
                              ? StatusTone.success
                              : res.status == _CheckStatus.failed
                                  ? StatusTone.error
                                  : StatusTone.info,
                        ),
                      );
                    }).toList(),
                  ),
          ),
        ],
      ),
    );
  }
}

class _CheckResult {
  const _CheckResult({required this.status, required this.message});
  final _CheckStatus status;
  final String message;
}

enum _CheckStatus { passed, failed, skipped }
