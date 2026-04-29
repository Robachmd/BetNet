import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/go_router_refresh.dart';
import 'features/settings/settings_screen.dart';
import 'features/static_pages/privacy_screen.dart';
import 'features/static_pages/terms_screen.dart';
import 'features/support/about_screen.dart';
import 'features/support/contact_screen.dart';
import 'services/betnet_api.dart';
import 'ui/screens/add_listing_screen.dart';
import 'ui/screens/chat_list_screen.dart';
import 'ui/screens/edit_profile_screen.dart';
import 'ui/screens/halls_rental_screen.dart';
import 'ui/screens/home_shell.dart';
import 'ui/screens/login_screen.dart';
import 'ui/screens/my_listings_screen.dart';
import 'ui/screens/notifications_screen.dart';
import 'ui/screens/otp_verification_screen.dart';
import 'ui/screens/payment_screen.dart';
import 'ui/screens/property_detail_screen.dart';
import 'ui/screens/register_screen.dart';

/// GoRouter with auth gates and `/property/:slug` deep links.
final betNetRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/',
    refreshListenable: goRouterRefresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      if (auth.phase == AuthPhase.bootstrapping) {
        return null;
      }
      final path = state.uri.path;
      const needsAuth = {
        '/profile/edit',
        '/payment',
        '/add-property',
        '/my-properties',
      };
      if (needsAuth.contains(path) && !auth.isAuthenticated) {
        final from = state.uri.toString();
        return '/login?from=${Uri.encodeComponent(from)}';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeShell(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/otp',
        builder: (context, state) {
          final phone = state.uri.queryParameters['phone'] ?? '';
          return OtpVerificationScreen(phoneE164: phone);
        },
      ),
      GoRoute(
        path: '/halls',
        builder: (context, state) => const HallsRentalScreen(),
      ),
      GoRoute(
        path: '/property/:slug',
        builder: (context, state) =>
            PropertyDetailScreen(slug: state.pathParameters['slug']!),
      ),
      GoRoute(
        path: '/profile/edit',
        builder: (context, state) => const EditProfileScreen(),
      ),
      GoRoute(
        path: '/payment',
        builder: (context, state) {
          final q = state.uri.queryParameters;
          return PaymentScreen(
            bookingId: q['booking_id'],
            amount: double.tryParse(q['amount'] ?? ''),
            title: q['title'],
            hallBookingId: int.tryParse(q['hall_booking_id'] ?? ''),
            txRef: q['tx_ref'],
          );
        },
      ),
      GoRoute(
        path: '/messages',
        builder: (context, state) => const ChatListScreen(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/contact',
        builder: (context, state) => const ContactScreen(),
      ),
      GoRoute(
        path: '/about',
        builder: (context, state) => const AboutScreen(),
      ),
      GoRoute(
        path: '/terms',
        builder: (context, state) => const TermsScreen(),
      ),
      GoRoute(
        path: '/privacy',
        builder: (context, state) => const PrivacyScreen(),
      ),
      GoRoute(
        path: '/add-property',
        builder: (context, state) => const AddListingScreen(),
      ),
      GoRoute(
        path: '/my-properties',
        builder: (context, state) => const MyListingsScreen(),
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
