import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/models/property.dart';
import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';

final _adminOverviewProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.watch(betNetApiProvider).fetchAdminDashboard();
});

final _adminUsersAnalyticsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.watch(betNetApiProvider).fetchAdminUsersAnalytics();
});

final _adminListingsAnalyticsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.watch(betNetApiProvider).fetchAdminListingsAnalytics();
});

final _adminPopularProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.watch(betNetApiProvider).fetchAdminPopularAreasAnalytics();
});

final _adminDirectoryUsersProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  return ref.watch(betNetApiProvider).fetchAdminUsersDirectory();
});

final _adminModerationListProvider =
    FutureProvider.autoDispose<List<PropertySummary>>((ref) async {
  return ref.watch(betNetApiProvider).fetchAdminPropertyList();
});

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin'),
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Listings'),
            Tab(text: 'Users'),
            Tab(text: 'Analytics'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _OverviewTab(
            onRefresh: () {
              ref.invalidate(_adminOverviewProvider);
              ref.invalidate(_adminUsersAnalyticsProvider);
              ref.invalidate(_adminListingsAnalyticsProvider);
            },
          ),
          _ListingsModerationTab(
            onRefresh: () => ref.invalidate(_adminModerationListProvider),
          ),
          _UsersDirectoryTab(
            onRefresh: () => ref.invalidate(_adminDirectoryUsersProvider),
          ),
          _AnalyticsTab(
            onRefresh: () {
              ref.invalidate(_adminPopularProvider);
              ref.invalidate(_adminListingsAnalyticsProvider);
            },
          ),
        ],
      ),
    );
  }
}

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab({required this.onRefresh});

  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overviewAsync = ref.watch(_adminOverviewProvider);
    final usersAsync = ref.watch(_adminUsersAnalyticsProvider);
    final listingsAsync = ref.watch(_adminListingsAnalyticsProvider);

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard(
            title: 'Platform overview',
            child: overviewAsync.when(
              data: (d) => Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  StatCard(
                    label: 'Listings',
                    value: '${d['total_listings'] ?? 0}',
                    icon: Icons.home_work_outlined,
                  ),
                  StatCard(
                    label: 'Active',
                    value: '${d['active_listings'] ?? 0}',
                    icon: Icons.verified_outlined,
                  ),
                  StatCard(
                    label: 'Users',
                    value: '${d['active_users'] ?? 0}',
                    icon: Icons.group_outlined,
                  ),
                  StatCard(
                    label: 'Bookings',
                    value: '${d['total_bookings'] ?? 0}',
                    icon: Icons.event_note_outlined,
                  ),
                ],
              ),
              loading: () => const LoadingState(),
              error: (e, _) => ErrorState(message: '$e'),
            ),
          ),
          SectionCard(
            title: 'Users (summary)',
            child: usersAsync.when(
              data: (d) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Total: ${d['total_users'] ?? 0}'),
                  Text('Verified: ${d['verified_users'] ?? 0}'),
                  Text('Active 30d: ${d['active_users_30d'] ?? 0}'),
                ],
              ),
              loading: () => const LoadingState(),
              error: (e, _) => ErrorState(message: '$e'),
            ),
          ),
          SectionCard(
            title: 'Listings (summary)',
            child: listingsAsync.when(
              data: (d) {
                final status =
                    (d['listings_by_status'] as Map?)?.cast<String, dynamic>() ??
                        const <String, dynamic>{};
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Verified: ${status['verified'] ?? 0}'),
                    Text('Unverified: ${status['unverified'] ?? 0}'),
                  ],
                );
              },
              loading: () => const LoadingState(),
              error: (e, _) => ErrorState(message: '$e'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ListingsModerationTab extends ConsumerStatefulWidget {
  const _ListingsModerationTab({required this.onRefresh});

  final VoidCallback onRefresh;

  @override
  ConsumerState<_ListingsModerationTab> createState() => _ListingsModerationTabState();
}

class _ListingsModerationTabState extends ConsumerState<_ListingsModerationTab> {
  bool _busy = false;

  Future<void> _verify(int id) async {
    setState(() => _busy = true);
    try {
      await ref.read(betNetApiProvider).adminVerifyProperty(id);
      widget.onRefresh();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reject(int id) async {
    final reasonCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject listing'),
        content: TextField(
          controller: reasonCtrl,
          decoration: const InputDecoration(labelText: 'Reason (optional)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Reject')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busy = true);
    try {
      await ref.read(betNetApiProvider).adminRejectProperty(
            id,
            reason: reasonCtrl.text.trim(),
          );
      widget.onRefresh();
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
    final async = ref.watch(_adminModerationListProvider);

    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      child: async.when(
        data: (items) {
          if (items.isEmpty) {
            return const EmptyState(title: 'No listings returned');
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: items.length,
            itemBuilder: (_, i) {
              final p = items[i];
              final verified = p.isVerified == true;
              return Card(
                child: ListTile(
                  title: Text(p.title),
                  subtitle: Text('${p.city} · ${p.propertyType}'),
                  trailing: verified
                      ? const StatusBadge(label: 'Verified', tone: StatusTone.success)
                      : Wrap(
                          spacing: 4,
                          children: [
                            TextButton(
                              onPressed: _busy ? null : () => _verify(p.id),
                              child: const Text('Verify'),
                            ),
                            TextButton(
                              onPressed: _busy ? null : () => _reject(p.id),
                              child: const Text('Reject'),
                            ),
                          ],
                        ),
                  onTap: () => context.push('/property/${p.slug}'),
                ),
              );
            },
          );
        },
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(message: '$e', onRetry: widget.onRefresh),
      ),
    );
  }
}

class _UsersDirectoryTab extends ConsumerStatefulWidget {
  const _UsersDirectoryTab({required this.onRefresh});

  final VoidCallback onRefresh;

  @override
  ConsumerState<_UsersDirectoryTab> createState() => _UsersDirectoryTabState();
}

class _UsersDirectoryTabState extends ConsumerState<_UsersDirectoryTab> {
  bool _busy = false;

  Future<void> _toggle(Map<String, dynamic> row) async {
    final id = row['id'] as int;
    final active = row['is_active'] as bool? ?? true;
    setState(() => _busy = true);
    try {
      await ref.read(betNetApiProvider).adminSetUserActive(id, !active);
      widget.onRefresh();
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
    final async = ref.watch(_adminDirectoryUsersProvider);

    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      child: async.when(
        data: (rows) {
          if (rows.isEmpty) {
            return const EmptyState(title: 'No users');
          }
          return ListView.builder(
            itemCount: rows.length,
            itemBuilder: (_, i) {
              final r = rows[i];
              final phone = '${r['phone_number'] ?? ''}';
              final active = r['is_active'] as bool? ?? true;
              return ListTile(
                title: Text('${r['first_name'] ?? ''} ${r['last_name'] ?? ''}'.trim()),
                subtitle: Text('$phone · ${r['role'] ?? ''}'),
                trailing: Switch(
                  value: active,
                  onChanged: _busy ? null : (_) => _toggle(r),
                ),
              );
            },
          );
        },
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(message: '$e', onRetry: widget.onRefresh),
      ),
    );
  }
}

class _AnalyticsTab extends ConsumerWidget {
  const _AnalyticsTab({required this.onRefresh});

  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final popularAsync = ref.watch(_adminPopularProvider);
    final listingsAsync = ref.watch(_adminListingsAnalyticsProvider);

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard(
            title: 'Popular areas',
            child: popularAsync.when(
              data: (d) {
                final listed = d['most_listed'] as List<dynamic>? ?? [];
                if (listed.isEmpty) {
                  return const Text('No area data for this range.');
                }
                return Column(
                  children: listed.take(12).map((row) {
                    final m = row as Map<String, dynamic>;
                    return ListTile(
                      dense: true,
                      title: Text('${m['city'] ?? ''} ${m['sub_city'] ?? ''}'),
                      trailing: Text('${m['count'] ?? 0}'),
                    );
                  }).toList(),
                );
              },
              loading: () => const LoadingState(),
              error: (e, _) => ErrorState(message: '$e'),
            ),
          ),
          SectionCard(
            title: 'Listings by city',
            child: listingsAsync.when(
              data: (d) {
                final byCity = d['listings_by_city'] as List<dynamic>? ?? [];
                return Column(
                  children: byCity.take(15).map((row) {
                    final m = row as Map<String, dynamic>;
                    return ListTile(
                      dense: true,
                      title: Text('${m['location__city'] ?? ''}'),
                      trailing: Text('${m['count'] ?? 0}'),
                    );
                  }).toList(),
                );
              },
              loading: () => const LoadingState(),
              error: (e, _) => ErrorState(message: '$e'),
            ),
          ),
        ],
      ),
    );
  }
}
