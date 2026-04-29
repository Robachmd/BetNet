import 'package:flutter/material.dart';

import 'tokens.dart';

export 'tokens.dart';

/// Calm, high-contrast theme aligned with web Tailwind primary/secondary.
ThemeData buildBetNetTheme() {
  const primaryGreen = Color(0xFF2E7D32);
  const secondaryAmber = Color(0xFFF9A825);
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryGreen,
      brightness: Brightness.light,
    ).copyWith(
      primary: primaryGreen,
      secondary: secondaryAmber,
    ),
  );
  return base.copyWith(
    visualDensity: VisualDensity.standard,
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
      },
    ),
    appBarTheme: AppBarTheme(
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 0,
      backgroundColor: base.colorScheme.surface,
      surfaceTintColor: Colors.transparent,
    ),
    navigationBarTheme: NavigationBarThemeData(
      elevation: 8,
      shadowColor: base.shadowColor.withValues(alpha: 0.12),
      backgroundColor: base.colorScheme.surface,
      surfaceTintColor: Colors.transparent,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      height: 72,
    ),
    textTheme: base.textTheme.copyWith(
      titleLarge: base.textTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: 0.1,
      ),
      titleMedium: base.textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.w600,
      ),
      bodyMedium: base.textTheme.bodyMedium?.copyWith(height: 1.45),
      bodySmall: base.textTheme.bodySmall?.copyWith(height: 1.4),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: BetNetSpacing.sm),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(BetNetRadii.md),
      ),
      color: base.colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
      clipBehavior: Clip.antiAlias,
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(BetNetRadii.sm),
      ),
      filled: true,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: BetNetSpacing.md,
        vertical: BetNetSpacing.md,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(
          horizontal: BetNetSpacing.lg,
          vertical: BetNetSpacing.md,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(BetNetRadii.sm),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(
          horizontal: BetNetSpacing.lg,
          vertical: BetNetSpacing.md,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(BetNetRadii.sm),
        ),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      type: BottomNavigationBarType.fixed,
      showUnselectedLabels: true,
    ),
  );
}
