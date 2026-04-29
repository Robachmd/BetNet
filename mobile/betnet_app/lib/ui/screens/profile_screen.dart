import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';
import 'add_listing_screen.dart';
import 'admin_dashboard_screen.dart';
import 'bookings_screen.dart';
import 'debug_backend_settings_screen.dart';
import 'listing_packages_screen.dart';
import 'location_alerts_screen.dart';
import 'notification_preferences_screen.dart';
import 'owner_dashboard_screen.dart';
import 'owner_review_responses_screen.dart';
import 'qa_checklist_screen.dart';
import 'renter_dashboard_screen.dart';
import 'reviews_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;
    final isAdmin = user?.isAdmin ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (!auth.isAuthenticated) ...[
            Text(
              'Welcome to BetNet',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Browse properties to rent or buy without an account. Sign in to save favorites and get alerts.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => context.push('/login'),
              child: const Text('Log in'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => context.push('/register'),
              child: const Text('Create account'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => context.push('/halls'),
              child: const Text('Browse event halls'),
            ),
          ],
          if (user != null) ...[
            SectionCard(
              title: user.displayName,
              subtitle: user.phoneNumber,
              child: Column(
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.edit_outlined),
                    title: const Text('Profile settings'),
                    subtitle: const Text('Profile, password, owner mode'),
                    onTap: () => context.push('/profile/edit'),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.badge_outlined),
                    title: const Text('Role'),
                    subtitle: Text(
                      user.isAdmin
                          ? 'Admin'
                          : user.isPropertyOwner
                              ? 'Property owner'
                              : 'Renter',
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (auth.isAuthenticated)
            SectionCard(
              title: 'Home',
              subtitle: 'Main dashboard shortcuts',
              child: Column(
                children: [
                  if (user != null &&
                      user.canAccessPropertyOwnerTools &&
                      user.activeAppMode == 'LANDLORD')
                    _menuTile(
                      context,
                      icon: Icons.add_home_outlined,
                      title: 'Post a new listing',
                      onTap: () {
                        Navigator.push<void>(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => const AddListingScreen(),
                          ),
                        );
                      },
                    ),
                  if (user != null && !user.isPropertyOwner)
                    _menuTile(
                      context,
                      icon: Icons.dashboard_outlined,
                      title: 'Renter dashboard',
                      onTap: () {
                        Navigator.push<void>(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => const RenterDashboardScreen(),
                          ),
                        );
                      },
                    ),
                  if (user != null && user.canAccessPropertyOwnerTools)
                    _menuTile(
                      context,
                      icon: Icons.dashboard_customize_outlined,
                      title: 'Property owner dashboard',
                      onTap: () {
                        Navigator.push<void>(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => const OwnerDashboardScreen(),
                          ),
                        );
                      },
                    ),
                  _menuTile(
                    context,
                    icon: Icons.event_note_outlined,
                    title: 'Bookings',
                    onTap: () {
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(builder: (_) => const BookingsScreen()),
                      );
                    },
                  ),
                ],
              ),
            ),
          if (auth.isAuthenticated)
            SectionCard(
              title: 'Properties and packages',
              child: Column(
                children: [
                  if (user != null && user.canAccessPropertyOwnerTools)
                    _menuTile(
                      context,
                      icon: Icons.inventory_2_outlined,
                      title: 'Listing packages',
                      onTap: () {
                        Navigator.push<void>(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => const ListingPackagesScreen(),
                          ),
                        );
                      },
                    ),
                  if (user != null && user.canAccessPropertyOwnerTools)
                    _menuTile(
                      context,
                      icon: Icons.reply_all_outlined,
                      title: 'Respond to reviews',
                      onTap: () {
                        Navigator.push<void>(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => const OwnerReviewResponsesScreen(),
                          ),
                        );
                      },
                    ),
                  _menuTile(
                    context,
                    icon: Icons.location_on_outlined,
                    title: 'Location alerts',
                    onTap: () {
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => const LocationAlertsScreen(),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          if (auth.isAuthenticated)
            SectionCard(
              title: 'App controls',
              child: Column(
                children: [
                  _menuTile(
                    context,
                    icon: Icons.rate_review_outlined,
                    title: 'Reviews',
                    onTap: () {
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(builder: (_) => const ReviewsScreen()),
                      );
                    },
                  ),
                  _menuTile(
                    context,
                    icon: Icons.notifications_active_outlined,
                    title: 'Notification preferences',
                    onTap: () {
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => const NotificationPreferencesScreen(),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          if (auth.isAuthenticated && isAdmin)
            ListTile(
              leading: const Icon(Icons.admin_panel_settings_outlined),
              title: const Text('Admin dashboard'),
              subtitle: const Text('Overview, moderation, users, analytics'),
              onTap: () {
                Navigator.push<void>(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => const AdminDashboardScreen(),
                  ),
                );
              },
            ),
          if (auth.isAuthenticated)
            SectionCard(
              title: 'Session',
              child: _menuTile(
                context,
                icon: Icons.logout,
                title: 'Log out',
                onTap: () async {
                  await ref.read(authControllerProvider.notifier).logout();
                },
              ),
            ),
          if (kDebugMode)
            ListTile(
              leading: const Icon(Icons.developer_mode_outlined),
              title: const Text('Debug backend URL'),
              subtitle: const Text('Change API server without rebuild'),
              onTap: () {
                Navigator.push<void>(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => const DebugBackendSettingsScreen(),
                  ),
                );
              },
            ),
          if (kDebugMode)
            ListTile(
              leading: const Icon(Icons.fact_check_outlined),
              title: const Text('QA checklist'),
              subtitle: const Text('Run one-tap parity smoke tests'),
              onTap: () {
                Navigator.push<void>(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => const QaChecklistScreen(),
                  ),
                );
              },
            ),
          const SizedBox(height: 24),
          Text(
            'BetNet helps renters, buyers, sellers, and property owners in Ethiopia. '
            'Listings sync with your existing Django backend.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ],
      ),
    );
  }
}

Widget _menuTile(
  BuildContext context, {
  required IconData icon,
  required String title,
  String? subtitle,
  VoidCallback? onTap,
}) {
  return ListTile(
    contentPadding: EdgeInsets.zero,
    leading: Icon(icon),
    title: Text(title),
    subtitle: subtitle != null ? Text(subtitle) : null,
    onTap: onTap,
  );
}
