import 'package:flutter/material.dart';

/// Spacing scale (8 / 16 / 24 base).
abstract final class BetNetSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
}

/// Border radii (12–20).
abstract final class BetNetRadii {
  static const double sm = 12;
  static const double md = 14;
  static const double lg = 16;
  static const double xl = 20;
  static const double full = 999;
}

abstract final class BetNetDurations {
  static const Duration short = Duration(milliseconds: 200);
  static const Duration medium = Duration(milliseconds: 350);
}

List<BoxShadow> betNetCardShadow(BuildContext context) {
  final c = Theme.of(context).colorScheme;
  return [
    BoxShadow(
      color: c.shadow.withValues(alpha: 0.06),
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
    BoxShadow(
      color: c.shadow.withValues(alpha: 0.04),
      blurRadius: 4,
      offset: const Offset(0, 1),
    ),
  ];
}

List<BoxShadow> betNetNavBarShadow(BuildContext context) {
  final c = Theme.of(context).colorScheme;
  return [
    BoxShadow(
      color: c.shadow.withValues(alpha: 0.08),
      blurRadius: 16,
      offset: const Offset(0, -2),
    ),
  ];
}
