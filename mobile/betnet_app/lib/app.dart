import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'services/betnet_api.dart';
import 'ui/screens/home_shell.dart';
import 'ui/theme/app_theme.dart';

class BetNetApp extends ConsumerWidget {
  const BetNetApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    return MaterialApp(
      title: 'BetNet',
      debugShowCheckedModeBanner: false,
      theme: buildBetNetTheme(),
      // Guests can browse listings; login is opened from Profile, Saved, Chat, or actions that need auth.
      home: switch (auth.phase) {
        AuthPhase.bootstrapping => const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          ),
        AuthPhase.guest => const HomeShell(),
        AuthPhase.authenticated => const HomeShell(),
      },
    );
  }
}
