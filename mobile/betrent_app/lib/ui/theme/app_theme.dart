import 'package:flutter/material.dart';

/// Calm, high-contrast theme inspired by modern productivity apps (readable in sunlight).
ThemeData buildBetRentTheme() {
  const seed = Color(0xFF0D9488);
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: seed,
      brightness: Brightness.light,
    ),
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(centerTitle: false, elevation: 0),
    cardTheme: CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      color: base.colorScheme.surfaceContainerHighest.withOpacity(0.35),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      filled: true,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      type: BottomNavigationBarType.fixed,
      showUnselectedLabels: true,
    ),
  );
}
