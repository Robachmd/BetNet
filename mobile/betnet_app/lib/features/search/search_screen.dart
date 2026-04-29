import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/screens/browse_screen.dart';

/// Advanced search: reuses browse filters, list/map, saved searches.
class SearchScreen extends ConsumerWidget {
  const SearchScreen({
    super.key,
    this.onOpenMenu,
    this.onOpenNotifications,
  });

  final VoidCallback? onOpenMenu;
  final VoidCallback? onOpenNotifications;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search'),
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded),
          onPressed: onOpenMenu,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: onOpenNotifications,
          ),
        ],
      ),
      body: BrowseScreen(
        embedded: true,
        onOpenMenu: onOpenMenu,
        onOpenNotifications: onOpenNotifications,
      ),
    );
  }
}
