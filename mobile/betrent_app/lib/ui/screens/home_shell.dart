import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config.dart';
import '../../services/betrent_api.dart';
import 'browse_screen.dart';
import 'chat_list_screen.dart';
import 'favorites_screen.dart';
import 'notifications_screen.dart';
import 'profile_screen.dart';

/// Bottom navigation shell. Polls notification count while visible (server-driven alerts).
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;
  int _notifUnread = 0;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _startPoll();
  }

  void _startPoll() {
    _poll?.cancel();
    _poll = Timer.periodic(AppConfig.notificationPollInterval, (_) => _loadUnread());
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadUnread());
  }

  Future<void> _loadUnread() async {
    try {
      final n = await ref.read(betRentApiProvider).notificationUnreadCount();
      if (mounted) setState(() => _notifUnread = n);
    } catch (_) {}
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      BrowseScreen(onOpenNotifications: () => setState(() => _index = 3)),
      const FavoritesScreen(),
      const ChatListScreen(),
      NotificationsScreen(onChanged: _loadUnread),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore),
            label: 'Browse',
          ),
          const NavigationDestination(
            icon: Icon(Icons.favorite_outline),
            selectedIcon: Icon(Icons.favorite),
            label: 'Saved',
          ),
          const NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Chat',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _notifUnread > 0,
              label: Text('$_notifUnread'),
              child: const Icon(Icons.notifications_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: _notifUnread > 0,
              label: Text('$_notifUnread'),
              child: const Icon(Icons.notifications),
            ),
            label: 'Alerts',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
