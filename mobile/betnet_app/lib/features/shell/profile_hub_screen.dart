import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/media_url.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/grid_menu_card.dart';
import '../../services/betnet_api.dart';
import '../../ui/screens/debug_backend_settings_screen.dart';
import '../../ui/screens/listing_packages_screen.dart';
import '../../ui/screens/qa_checklist_screen.dart';

/// Profile tab: header, six shortcut tiles, optional Post an ad (landlords).
class ProfileHubScreen extends ConsumerWidget {
  const ProfileHubScreen({
    super.key,
    this.onOpenMenu,
    this.onOpenSearchTab,
    this.onOpenFavoritesTab,
  });

  final VoidCallback? onOpenMenu;
  final VoidCallback? onOpenSearchTab;
  final VoidCallback? onOpenFavoritesTab;

  static const _gridAspect = 1.12;

  void _openSearch(BuildContext context) {
    if (onOpenSearchTab != null) {
      onOpenSearchTab!();
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Open the Search tab from the bottom navigation.')),
    );
  }

  void _openFavorites(BuildContext context) {
    if (onOpenFavoritesTab != null) {
      onOpenFavoritesTab!();
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Open Saved from the bottom navigation.')),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        leading: onOpenMenu != null
            ? IconButton(
                icon: const Icon(Icons.menu_rounded),
                onPressed: onOpenMenu,
                tooltip: 'Menu',
              )
            : null,
        title: const Text('Profile'),
        actions: [
          if (auth.isAuthenticated)
            TextButton(
              onPressed: () => context.push('/profile/edit'),
              child: const Text('Edit'),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(BetNetSpacing.md),
        children: [
          if (!auth.isAuthenticated) ...[
            Text(
              'Welcome to BetNet',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: BetNetSpacing.sm),
            Text(
              'Sign in to save favorites, message owners, and manage listings.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: BetNetSpacing.lg),
            FilledButton(
              onPressed: () => context.push('/login'),
              child: const Text('Log in'),
            ),
            const SizedBox(height: BetNetSpacing.sm),
            OutlinedButton(
              onPressed: () => context.push('/register'),
              child: const Text('Create account'),
            ),
          ],
          if (user != null) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: scheme.primaryContainer,
                  backgroundImage: () {
                    final url = resolveMediaUrl(user.profileImage);
                    if (url.isEmpty) return null;
                    return CachedNetworkImageProvider(url);
                  }(),
                  child: resolveMediaUrl(user.profileImage).isEmpty
                      ? Text(
                          user.firstName.isNotEmpty
                              ? user.firstName[0].toUpperCase()
                              : '?',
                          style: TextStyle(
                            fontSize: 28,
                            color: scheme.primary,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: BetNetSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.displayName,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: BetNetSpacing.xs),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Chip(
                          padding: EdgeInsets.zero,
                          visualDensity: VisualDensity.compact,
                          label: Text(
                            user.isAdmin
                                ? 'ADMIN'
                                : user.activeAppMode == 'LANDLORD'
                                    ? 'LANDLORD'
                                    : 'RENTER',
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: scheme.onSecondaryContainer,
                                ),
                          ),
                          backgroundColor: scheme.secondaryContainer,
                          side: BorderSide.none,
                        ),
                      ),
                      const SizedBox(height: BetNetSpacing.xs),
                      Text(user.phoneNumber),
                      if (user.email != null && user.email!.isNotEmpty)
                        Text(
                          user.email!,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: BetNetSpacing.lg),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: BetNetSpacing.md,
              crossAxisSpacing: BetNetSpacing.md,
              childAspectRatio: _gridAspect,
              children: [
                GridMenuCard(
                  icon: Icons.manage_accounts_outlined,
                  label: 'Profile settings',
                  subtitle: 'Account & security',
                  onTap: () => context.push('/profile/edit'),
                ),
                GridMenuCard(
                  icon: Icons.saved_search_outlined,
                  label: 'My saved searches',
                  subtitle: 'Search tab',
                  onTap: () => _openSearch(context),
                ),
                GridMenuCard(
                  icon: Icons.favorite_outline,
                  label: 'My favourites',
                  subtitle: 'Saved tab',
                  onTap: () => _openFavorites(context),
                ),
                GridMenuCard(
                  icon: Icons.list_alt_outlined,
                  label: 'My properties',
                  subtitle: 'Your listings',
                  onTap: () => context.push('/my-properties'),
                ),
                GridMenuCard(
                  icon: Icons.edit_note_outlined,
                  label: 'Drafts',
                  subtitle: 'Unpublished',
                  onTap: () => context.push('/my-properties'),
                ),
                GridMenuCard(
                  icon: Icons.inventory_2_outlined,
                  label: 'Listing packages',
                  subtitle: 'Plans & slots',
                  onTap: () {
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const ListingPackagesScreen(),
                      ),
                    );
                  },
                ),
              ],
            ),
            if (user.canAccessPropertyOwnerTools &&
                user.activeAppMode == 'LANDLORD') ...[
              const SizedBox(height: BetNetSpacing.lg),
              Card(
                clipBehavior: Clip.antiAlias,
                child: Padding(
                  padding: const EdgeInsets.all(BetNetSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.apartment_rounded, color: scheme.primary, size: 40),
                          const SizedBox(width: BetNetSpacing.md),
                          Expanded(
                            child: Text(
                              'Looking to sell or rent out your property?',
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: BetNetSpacing.md),
                      FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: scheme.primary,
                          foregroundColor: scheme.onPrimary,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: () => context.push('/add-property'),
                        child: Text(
                          'Post an ad',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: scheme.onPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (kDebugMode) ...[
              const SizedBox(height: BetNetSpacing.lg),
              ListTile(
                leading: const Icon(Icons.developer_mode_outlined),
                title: const Text('Debug backend URL'),
                onTap: () {
                  Navigator.push<void>(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => const DebugBackendSettingsScreen(),
                    ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.fact_check_outlined),
                title: const Text('QA checklist'),
                onTap: () {
                  Navigator.push<void>(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => const QaChecklistScreen(),
                    ),
                  );
                },
              ),
            ],
          ],
        ],
      ),
    );
  }
}
