import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../data/models/notification_item.dart';
import '../../services/betnet_api.dart';
import 'login_screen.dart';

final notificationsListProvider =
    FutureProvider.autoDispose<List<AppNotification>>((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) return [];
  return ref.watch(betNetApiProvider).fetchNotifications();
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key, this.onChanged});

  /// Called after list refresh so the shell can update its badge.
  final Future<void> Function()? onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Alerts')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Log in to see booking and listing alerts.'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  Navigator.push<void>(
                    context,
                    MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
                  );
                },
                child: const Text('Log in'),
              ),
            ],
          ),
        ),
      );
    }

    final async = ref.watch(notificationsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts'),
        actions: [
          TextButton(
            onPressed: () async {
              try {
                await ref.read(betNetApiProvider).markAllNotificationsRead();
                ref.invalidate(notificationsListProvider);
                await onChanged?.call();
              } catch (_) {}
            },
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: async.when(
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('No notifications yet.'));
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(notificationsListProvider);
              await onChanged?.call();
            },
            child: ListView.separated(
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final n = items[i];
                final fmt = DateFormat.MMMd().add_jm().format(n.createdAt);
                return ListTile(
                  title: Text(n.title, style: TextStyle(fontWeight: n.isRead ? FontWeight.normal : FontWeight.bold)),
                  subtitle: Text('${n.message}\n$fmt'),
                  isThreeLine: true,
                  onTap: () async {
                    try {
                      await ref
                          .read(betNetApiProvider)
                          .markNotificationRead(n.id);
                      ref.invalidate(notificationsListProvider);
                      await onChanged?.call();
                    } catch (_) {}
                  },
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }
}
