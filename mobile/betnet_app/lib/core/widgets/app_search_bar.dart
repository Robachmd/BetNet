import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Rounded search field for marketplace headers.
class AppSearchBar extends StatelessWidget {
  const AppSearchBar({
    super.key,
    this.controller,
    this.hintText,
    this.onSubmitted,
    this.onChanged,
    this.leading,
    this.suffix,
    this.readOnly = false,
    this.onTap,
  });

  final TextEditingController? controller;
  final String? hintText;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final Widget? leading;
  final Widget? suffix;
  final bool readOnly;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
      borderRadius: BorderRadius.circular(BetNetRadii.xl),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(BetNetRadii.xl),
        child: IgnorePointer(
          ignoring: readOnly && onTap != null,
          child: TextField(
            controller: controller,
            readOnly: readOnly,
            onChanged: onChanged,
            onSubmitted: onSubmitted,
            decoration: InputDecoration(
              hintText: hintText,
              border: InputBorder.none,
              filled: false,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: BetNetSpacing.md,
                vertical: BetNetSpacing.md,
              ),
              prefixIcon: leading ??
                  Icon(Icons.search_rounded, color: scheme.onSurfaceVariant),
              suffixIcon: suffix,
            ),
          ),
        ),
      ),
    );
  }
}
