import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class DrawerSectionHeader extends StatelessWidget {
  const DrawerSectionHeader({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        BetNetSpacing.md,
        BetNetSpacing.md,
        BetNetSpacing.md,
        BetNetSpacing.xs,
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
            ),
      ),
    );
  }
}

class DrawerNavTile extends StatelessWidget {
  const DrawerNavTile({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.selected = false,
    this.badge,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool selected;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListTile(
      leading: Icon(
        icon,
        color: selected ? scheme.primary : scheme.onSurfaceVariant,
      ),
      title: Text(
        label,
        style: TextStyle(
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          color: selected ? scheme.primary : null,
        ),
      ),
      trailing: badge != null && badge!.isNotEmpty
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: scheme.errorContainer,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                badge!,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: scheme.onErrorContainer,
                ),
              ),
            )
          : null,
      selected: selected,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(BetNetRadii.sm),
      ),
      onTap: onTap,
    );
  }
}
