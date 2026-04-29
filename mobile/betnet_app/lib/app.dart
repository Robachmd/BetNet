import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:betnet_app/l10n/app_localizations.dart';

import 'app_router.dart' show betNetRouterProvider;
import 'features/settings/settings_screen.dart';
import 'services/betnet_api.dart';
import 'core/theme/app_theme.dart';

class BetNetApp extends ConsumerWidget {
  const BetNetApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final router = ref.watch(betNetRouterProvider);
    final themeMode = ref.watch(themeModeSettingProvider);
    return MaterialApp.router(
      onGenerateTitle: (context) =>
          AppLocalizations.of(context)?.appTitle ?? 'BetNet',
      debugShowCheckedModeBanner: false,
      theme: buildBetNetTheme(),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0D9488),
          brightness: Brightness.dark,
        ),
      ),
      themeMode: themeMode,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      localeResolutionCallback: (locale, supported) {
        if (locale == null) return const Locale('en');
        for (final loc in supported) {
          if (loc.languageCode == locale.languageCode) {
            return loc;
          }
        }
        return const Locale('en');
      },
      routerConfig: router,
      builder: (context, child) {
        if (auth.phase == AuthPhase.bootstrapping) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return child ?? const SizedBox.shrink();
      },
    );
  }
}
