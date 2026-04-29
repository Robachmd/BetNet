import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config.dart';
import '../../core/media_url.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/drawer_widgets.dart';
import '../../features/home/home_screen.dart';
import '../../features/property/property_screen.dart';
import '../../features/search/search_screen.dart';
import '../../l10n/app_localizations.dart';
import '../../services/betnet_api.dart';
import '../../services/push_notification_service.dart';
import '../../ui/screens/favorites_screen.dart';
import '../../ui/screens/bookings_screen.dart';
import '../../ui/screens/reviews_screen.dart';
import '../../ui/screens/location_alerts_screen.dart';
import '../../ui/screens/notification_preferences_screen.dart';
import '../../ui/screens/listing_packages_screen.dart';
import '../../ui/screens/owner_dashboard_screen.dart';
import '../../ui/screens/renter_dashboard_screen.dart';
import '../../ui/screens/owner_review_responses_screen.dart';
import '../../ui/screens/admin_dashboard_screen.dart';
import 'profile_hub_screen.dart';

/// Root shell: bottom navigation + drawer; hosts primary tabs.
class MainShellScaffold extends ConsumerStatefulWidget {
  const MainShellScaffold({super.key});

  @override
  ConsumerState<MainShellScaffold> createState() => _MainShellScaffoldState();
}

class _MainShellScaffoldState extends ConsumerState<MainShellScaffold> {
  int _index = 0;
  int _notifUnread = 0;
  Timer? _poll;
  StreamSubscription<Map<String, dynamic>>? _pushSub;
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    _startPoll();
    _startPushLifecycle();
  }

  Future<void> _startPushLifecycle() async {
    await ref.read(pushNotificationServiceProvider).start();
    _pushSub =
        ref.read(pushNotificationServiceProvider).foregroundMessages.listen(
              _handlePushPayload,
            );
  }

  void _handlePushPayload(Map<String, dynamic> payload) {
    final route = payload['route']?.toString();
    if (route == 'chat') {
      if (mounted) context.push('/messages');
      return;
    }
    if (route == 'notifications') {
      if (mounted) {
        context.push('/notifications');
        _loadUnread();
      }
      return;
    }
    final slug = payload['property_slug']?.toString();
    if (slug != null && slug.isNotEmpty && mounted) {
      context.push('/property/$slug');
    }
  }

  void _startPoll() {
    _poll?.cancel();
    _poll = Timer.periodic(AppConfig.notificationPollInterval, (_) => _loadUnread());
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadUnread());
  }

  Future<void> _loadUnread() async {
    try {
      final n = await ref.read(betNetApiProvider).notificationUnreadCount();
      if (mounted) setState(() => _notifUnread = n);
    } catch (_) {}
  }

  @override
  void dispose() {
    _poll?.cancel();
    _pushSub?.cancel();
    unawaited(ref.read(pushNotificationServiceProvider).stop());
    super.dispose();
  }

  void _openMessages() {
    Navigator.pop(context);
    context.push('/messages');
  }

  void _openNotifications() {
    context.push('/notifications');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;

    final pages = <Widget>[
      HomeScreen(
        onOpenMenu: () => _scaffoldKey.currentState?.openDrawer(),
        onOpenNotifications: _openNotifications,
        onOpenSearchTab: () => setState(() => _index = 2),
      ),
      PropertyScreen(
        onOpenMenu: () => _scaffoldKey.currentState?.openDrawer(),
        onOpenNotifications: _openNotifications,
      ),
      SearchScreen(
        onOpenMenu: () => _scaffoldKey.currentState?.openDrawer(),
        onOpenNotifications: _openNotifications,
      ),
      const FavoritesScreen(),
      ProfileHubScreen(
        onOpenMenu: () => _scaffoldKey.currentState?.openDrawer(),
        onOpenSearchTab: () => setState(() => _index = 2),
        onOpenFavoritesTab: () => setState(() => _index = 3),
      ),
    ];

    return Scaffold(
      key: _scaffoldKey,
      drawer: Drawer(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: BetNetSpacing.sm),
            children: [
              UserAccountsDrawerHeader(
                decoration: const BoxDecoration(
                  color: Color(0xFF1B5E20),
                ),
                currentAccountPicture: CircleAvatar(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  backgroundImage: () {
                    final url = resolveMediaUrl(user?.profileImage);
                    if (url.isEmpty) return null;
                    return CachedNetworkImageProvider(url);
                  }(),
                  child: resolveMediaUrl(user?.profileImage).isEmpty
                      ? Text(
                          () {
                            final name = user?.firstName;
                            if (name == null || name.isEmpty) {
                              return '?';
                            }
                            return name[0].toUpperCase();
                          }(),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        )
                      : null,
                ),
                accountName: Text(
                  user != null
                      ? '${user.firstName} ${user.lastName}'.trim()
                      : 'Guest',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                accountEmail: Text(
                  user?.phoneNumber ?? 'Sign in to sync favorites',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.88),
                    fontSize: 14,
                  ),
                ),
              ),
              const DrawerSectionHeader(label: 'MAIN'),
              DrawerNavTile(
                icon: Icons.home_outlined,
                label: 'Home',
                selected: _index == 0,
                onTap: () {
                  setState(() => _index = 0);
                  Navigator.pop(context);
                },
              ),
              DrawerNavTile(
                icon: Icons.apartment_outlined,
                label: 'Property',
                selected: _index == 1,
                onTap: () {
                  setState(() => _index = 1);
                  Navigator.pop(context);
                },
              ),
              DrawerNavTile(
                icon: Icons.add_circle_outline,
                label: 'Add property',
                selected: false,
                onTap: () {
                  Navigator.pop(context);
                  context.push('/add-property');
                },
              ),
              DrawerNavTile(
                icon: Icons.list_alt_outlined,
                label: 'My properties',
                selected: false,
                onTap: () {
                  Navigator.pop(context);
                  context.push('/my-properties');
                },
              ),
              DrawerNavTile(
                icon: Icons.favorite_outline,
                label: 'Favorites',
                selected: _index == 3,
                onTap: () {
                  setState(() => _index = 3);
                  Navigator.pop(context);
                },
              ),
              DrawerNavTile(
                icon: Icons.search_outlined,
                label: 'Saved searches',
                selected: _index == 2,
                onTap: () {
                  setState(() => _index = 2);
                  Navigator.pop(context);
                },
              ),
              DrawerNavTile(
                icon: Icons.chat_bubble_outline,
                label: l10n?.chat ?? 'Chat',
                selected: false,
                onTap: _openMessages,
              ),
              DrawerNavTile(
                icon: Icons.notifications_outlined,
                label: l10n?.alerts ?? 'Alerts',
                badge: _notifUnread > 0 ? '$_notifUnread' : null,
                selected: false,
                onTap: () {
                  Navigator.pop(context);
                  _openNotifications();
                },
              ),
              if (auth.isAuthenticated) ...[
                const DrawerSectionHeader(label: 'YOUR TOOLS'),
                DrawerNavTile(
                  icon: Icons.event_note_outlined,
                  label: 'Bookings',
                  selected: false,
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const BookingsScreen(),
                      ),
                    );
                  },
                ),
                DrawerNavTile(
                  icon: Icons.rate_review_outlined,
                  label: 'Reviews',
                  selected: false,
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const ReviewsScreen(),
                      ),
                    );
                  },
                ),
                DrawerNavTile(
                  icon: Icons.location_on_outlined,
                  label: 'Location alerts',
                  selected: false,
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const LocationAlertsScreen(),
                      ),
                    );
                  },
                ),
                DrawerNavTile(
                  icon: Icons.notifications_active_outlined,
                  label: 'Notification preferences',
                  selected: false,
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const NotificationPreferencesScreen(),
                      ),
                    );
                  },
                ),
                DrawerNavTile(
                  icon: Icons.inventory_2_outlined,
                  label: 'Listing packages',
                  selected: false,
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const ListingPackagesScreen(),
                      ),
                    );
                  },
                ),
                DrawerNavTile(
                  icon: Icons.meeting_room_outlined,
                  label: 'Hall rentals',
                  selected: false,
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/halls');
                  },
                ),
                if (user != null && !user.isPropertyOwner)
                  DrawerNavTile(
                    icon: Icons.dashboard_outlined,
                    label: 'Renter dashboard',
                    selected: false,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => const RenterDashboardScreen(),
                        ),
                      );
                    },
                  ),
                if (user != null && user.canAccessPropertyOwnerTools) ...[
                  DrawerNavTile(
                    icon: Icons.dashboard_customize_outlined,
                    label: 'Property owner dashboard',
                    selected: false,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => const OwnerDashboardScreen(),
                        ),
                      );
                    },
                  ),
                  DrawerNavTile(
                    icon: Icons.reply_all_outlined,
                    label: 'Respond to reviews',
                    selected: false,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => const OwnerReviewResponsesScreen(),
                        ),
                      );
                    },
                  ),
                ],
                if (user != null && (user.isAdmin))
                  DrawerNavTile(
                    icon: Icons.admin_panel_settings_outlined,
                    label: 'Admin dashboard',
                    selected: false,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => const AdminDashboardScreen(),
                        ),
                      );
                    },
                  ),
              ],
              const DrawerSectionHeader(label: 'SUPPORT'),
              DrawerNavTile(
                icon: Icons.settings_outlined,
                label: 'Settings',
                selected: false,
                onTap: () {
                  Navigator.pop(context);
                  context.push('/settings');
                },
              ),
              DrawerNavTile(
                icon: Icons.mail_outline,
                label: 'Contact us',
                selected: false,
                onTap: () {
                  Navigator.pop(context);
                  context.push('/contact');
                },
              ),
              DrawerNavTile(
                icon: Icons.info_outline,
                label: 'About us',
                selected: false,
                onTap: () {
                  Navigator.pop(context);
                  context.push('/about');
                },
              ),
              const DrawerSectionHeader(label: 'LEGAL'),
              DrawerNavTile(
                icon: Icons.gavel_outlined,
                label: 'Terms & conditions',
                selected: false,
                onTap: () {
                  Navigator.pop(context);
                  context.push('/terms');
                },
              ),
              DrawerNavTile(
                icon: Icons.privacy_tip_outlined,
                label: 'Privacy policy',
                selected: false,
                onTap: () {
                  Navigator.pop(context);
                  context.push('/privacy');
                },
              ),
              const DrawerSectionHeader(label: 'ACCOUNT'),
              if (auth.isAuthenticated)
                DrawerNavTile(
                  icon: Icons.logout,
                  label: 'Log out',
                  selected: false,
                  onTap: () async {
                    Navigator.pop(context);
                    await ref.read(authControllerProvider.notifier).logout();
                  },
                )
              else
                DrawerNavTile(
                  icon: Icons.login,
                  label: l10n?.logIn ?? 'Log in',
                  selected: false,
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/login');
                  },
                ),
            ],
          ),
        ),
      ),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          const NavigationDestination(
            icon: Icon(Icons.apartment_outlined),
            selectedIcon: Icon(Icons.apartment_rounded),
            label: 'Property',
          ),
          const NavigationDestination(
            icon: Icon(Icons.search_rounded),
            selectedIcon: Icon(Icons.manage_search_rounded),
            label: 'Search',
          ),
          NavigationDestination(
            icon: const Icon(Icons.favorite_outline),
            selectedIcon: const Icon(Icons.favorite_rounded),
            label: l10n?.saved ?? 'Saved',
          ),
          NavigationDestination(
            icon: const Icon(Icons.person_outline),
            selectedIcon: const Icon(Icons.person_rounded),
            label: l10n?.profile ?? 'Profile',
          ),
        ],
      ),
    );
  }
}
