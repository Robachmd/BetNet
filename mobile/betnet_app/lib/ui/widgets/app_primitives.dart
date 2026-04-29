import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.title,
    this.subtitle,
    required this.child,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: BetNetSpacing.sm),
      child: Padding(
        padding: const EdgeInsets.all(BetNetSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                      ),
                      if (subtitle != null && subtitle!.trim().isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitle!,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: BetNetSpacing.sm),
            child,
          ],
        ),
      ),
    );
  }
}

class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.width = 160,
  });

  final String label;
  final String value;
  final IconData? icon;
  final double width;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18),
            const SizedBox(height: 8),
          ],
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 2),
          Text(label),
        ],
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label, required this.tone});

  final String label;
  final StatusTone tone;

  Color _fg(BuildContext context) {
    switch (tone) {
      case StatusTone.success:
        return Colors.green.shade800;
      case StatusTone.warning:
        return Colors.orange.shade800;
      case StatusTone.error:
        return Colors.red.shade800;
      case StatusTone.info:
        return Colors.blue.shade800;
      case StatusTone.neutral:
        return Theme.of(context).colorScheme.onSurfaceVariant;
    }
  }

  Color _bg(BuildContext context) {
    switch (tone) {
      case StatusTone.success:
        return Colors.green.shade50;
      case StatusTone.warning:
        return Colors.orange.shade50;
      case StatusTone.error:
        return Colors.red.shade50;
      case StatusTone.info:
        return Colors.blue.shade50;
      case StatusTone.neutral:
        return Theme.of(context).colorScheme.surfaceContainerHighest;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _bg(context),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: _fg(context),
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

enum StatusTone { success, warning, error, info, neutral }

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    this.message,
    this.icon = Icons.inbox_outlined,
  });

  final String title;
  final String? message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 34, color: Theme.of(context).colorScheme.outline),
            const SizedBox(height: 8),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            if (message != null) ...[
              const SizedBox(height: 4),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  const ErrorState({
    super.key,
    required this.message,
    this.onRetry,
  });

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 8),
              FilledButton.tonal(
                  onPressed: onRetry, child: const Text('Retry')),
            ],
          ],
        ),
      ),
    );
  }
}

class LoadingState extends StatelessWidget {
  const LoadingState({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 8),
            Text(message!),
          ],
        ],
      ),
    );
  }
}

/// Shared neutral skeleton block used across cards/lists/detail.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    this.height = 12,
    this.width = double.infinity,
    this.radius = 8,
    this.margin,
  });

  final double height;
  final double width;
  final double radius;
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class PropertyCardSkeleton extends StatelessWidget {
  const PropertyCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SkeletonBox(height: 180, radius: 0),
          Padding(
            padding: EdgeInsets.all(BetNetSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonBox(height: 14, width: 180),
                SizedBox(height: BetNetSpacing.sm),
                SkeletonBox(height: 12, width: 140),
                SizedBox(height: BetNetSpacing.sm),
                SkeletonBox(height: 16, width: 120),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class PropertyListSkeleton extends StatelessWidget {
  const PropertyListSkeleton({super.key, this.count = 6});

  final int count;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(BetNetSpacing.md),
      itemBuilder: (_, __) => const PropertyCardSkeleton(),
      separatorBuilder: (_, __) => const SizedBox(height: BetNetSpacing.sm),
      itemCount: count,
    );
  }
}
