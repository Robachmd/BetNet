import 'package:flutter/material.dart';

import '../theme/tokens.dart';

enum AppButtonVariant { primary, secondary, text }

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.expand = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final child = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 20),
          const SizedBox(width: BetNetSpacing.sm),
        ],
        Text(label),
      ],
    );

    switch (variant) {
      case AppButtonVariant.primary:
        return SizedBox(
          width: expand ? double.infinity : null,
          child: FilledButton(
            onPressed: onPressed,
            child: child,
          ),
        );
      case AppButtonVariant.secondary:
        return SizedBox(
          width: expand ? double.infinity : null,
          child: OutlinedButton(
            onPressed: onPressed,
            child: child,
          ),
        );
      case AppButtonVariant.text:
        return TextButton(
          onPressed: onPressed,
          child: child,
        );
    }
  }
}
