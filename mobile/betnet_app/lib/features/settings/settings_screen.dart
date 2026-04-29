import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/tokens.dart';
import '../../services/betnet_api.dart';
import '../../ui/screens/notification_preferences_screen.dart';

final themeModeSettingProvider =
    StateProvider<ThemeMode>((ref) => ThemeMode.light);

String themeModeLabel(ThemeMode m) {
  switch (m) {
    case ThemeMode.light:
      return 'Light';
    case ThemeMode.dark:
      return 'Dark';
    case ThemeMode.system:
      return 'System default';
  }
}

Future<void> pickAppLanguage(BuildContext context, WidgetRef ref) async {
  final auth = ref.read(authControllerProvider);
  final code = await showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            title: const Text('English'),
            onTap: () => Navigator.pop(ctx, 'EN'),
          ),
          ListTile(
            title: const Text('አማርኛ'),
            onTap: () => Navigator.pop(ctx, 'AM'),
          ),
          ListTile(
            title: const Text('Afaan Oromo'),
            onTap: () => Navigator.pop(ctx, 'OM'),
          ),
        ],
      ),
    ),
  );
  if (code == null || !context.mounted) return;
  if (auth.isAuthenticated) {
    try {
      await ref.read(betNetApiProvider).patchProfile({'preferred_language': code});
      await ref.read(authControllerProvider.notifier).refreshProfile();
    } catch (_) {}
  }
}

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final themeMode = ref.watch(themeModeSettingProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          const _SectionTitle('Account'),
          if (auth.isAuthenticated) ...[
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: const Text('Edit profile'),
              onTap: () => context.push('/profile/edit'),
            ),
            ListTile(
              leading: const Icon(Icons.lock_outline),
              title: const Text('Change password'),
              onTap: () => context.push('/profile/edit'),
            ),
          ] else
            ListTile(
              leading: const Icon(Icons.login),
              title: const Text('Log in'),
              onTap: () => context.push('/login'),
            ),
          ListTile(
            leading: const Icon(Icons.language),
            title: const Text('Language'),
            subtitle: const Text('EN · አማርኛ · Oromo'),
            onTap: () => pickAppLanguage(context, ref),
          ),
          const _SectionTitle('Notifications'),
          ListTile(
            leading: const Icon(Icons.notifications_outlined),
            title: const Text('Notification preferences'),
            onTap: () {
              Navigator.push<void>(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => const NotificationPreferencesScreen(),
                ),
              );
            },
          ),
          const _SectionTitle('Preferences'),
          ListTile(
            leading: const Icon(Icons.dark_mode_outlined),
            title: const Text('Appearance'),
            subtitle: Text(themeModeLabel(themeMode)),
            onTap: () async {
              final next = await showModalBottomSheet<ThemeMode>(
                context: context,
                builder: (ctx) => SafeArea(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ListTile(
                        title: const Text('Light'),
                        onTap: () => Navigator.pop(ctx, ThemeMode.light),
                      ),
                      ListTile(
                        title: const Text('Dark'),
                        onTap: () => Navigator.pop(ctx, ThemeMode.dark),
                      ),
                      ListTile(
                        title: const Text('System'),
                        onTap: () => Navigator.pop(ctx, ThemeMode.system),
                      ),
                    ],
                  ),
                ),
              );
              if (next != null) {
                ref.read(themeModeSettingProvider.notifier).state = next;
              }
            },
          ),
          const ListTile(
            leading: Icon(Icons.payments_outlined),
            title: Text('Currency'),
            subtitle: Text('ETB (Ethiopian Birr)'),
          ),
          const _SectionTitle('Security'),
          if (auth.isAuthenticated)
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Log out'),
              onTap: () async {
                await ref.read(authControllerProvider.notifier).logout();
                if (context.mounted) context.pop();
              },
            ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        BetNetSpacing.md,
        BetNetSpacing.lg,
        BetNetSpacing.md,
        BetNetSpacing.xs,
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}
