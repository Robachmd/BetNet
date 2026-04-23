import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/betnet_api.dart';
import 'add_listing_screen.dart';
import 'login_screen.dart';
import 'register_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;

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
              onPressed: () {
                Navigator.push<void>(
                  context,
                  MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
                );
              },
              child: const Text('Log in'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () {
                Navigator.push<void>(
                  context,
                  MaterialPageRoute<void>(builder: (_) => const RegisterScreen()),
                );
              },
              child: const Text('Create account'),
            ),
          ],
          if (user != null) ...[
            ListTile(
              title: Text(user.displayName),
              subtitle: Text(user.phoneNumber),
            ),
            ListTile(
              leading: const Icon(Icons.badge_outlined),
              title: const Text('Role'),
              subtitle: Text(user.isLandlord ? 'Landlord' : 'Renter'),
            ),
          ],
          if (user != null && user.isLandlord)
            ListTile(
              leading: const Icon(Icons.add_home_outlined),
              title: const Text('Post a new listing'),
              onTap: () {
                Navigator.push<void>(
                  context,
                  MaterialPageRoute<void>(builder: (_) => const AddListingScreen()),
                );
              },
            ),
          if (auth.isAuthenticated)
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Log out'),
              onTap: () async {
                await ref.read(authControllerProvider.notifier).logout();
              },
            ),
          const SizedBox(height: 24),
          Text(
            'BetNet helps renters, buyers, sellers, and landlords in Ethiopia. '
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
