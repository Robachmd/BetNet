import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/property.dart';
import '../../l10n/app_localizations.dart';
import '../../utils/property_types.dart';

class PropertyCard extends StatelessWidget {
  const PropertyCard({
    super.key,
    required this.property,
    this.onTap,
  });

  final PropertySummary property;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final price = NumberFormat.currency(symbol: property.priceCurrency, decimalDigits: 0)
        .format(double.tryParse(property.priceMonthly) ?? 0);
    final lt = property.listingType.toLowerCase();
    final priceTail = lt == 'sale'
        ? ' Total price'
        : lt == 'short_term'
            ? '/mo (short-term)'
            : '/mo';
    final scheme = Theme.of(context).colorScheme;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 16 / 10,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: property.resolvedImage.isEmpty
                        ? ColoredBox(
                            color: scheme.surfaceContainerHighest,
                            child: Icon(Icons.home_work_outlined, color: scheme.outline),
                          )
                        : CachedNetworkImage(
                            imageUrl: property.resolvedImage,
                            fit: BoxFit.cover,
                            memCacheWidth: 600,
                            // Downsamples decoded bitmaps to save RAM on low-end devices.
                            placeholder: (_, __) => ColoredBox(
                              color: scheme.surfaceContainerHighest,
                              child: const Center(
                                child: SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              ),
                            ),
                            errorWidget: (_, __, ___) => ColoredBox(
                              color: scheme.errorContainer,
                              child: Icon(Icons.broken_image_outlined, color: scheme.error),
                            ),
                          ),
                  ),
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withValues(alpha: 0.04),
                            Colors.black.withValues(alpha: 0.34),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: BetNetSpacing.sm,
                    left: BetNetSpacing.sm,
                    child: Wrap(
                      spacing: BetNetSpacing.xs,
                      children: [
                        _ImageBadge(
                          label: lt == 'sale'
                              ? 'For sale'
                              : lt == 'short_term'
                                  ? 'Short-term'
                                  : 'For rent',
                        ),
                        if (property.isVerified == true)
                          const _ImageBadge(
                            label: 'Verified',
                            icon: Icons.verified_outlined,
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                BetNetSpacing.md,
                BetNetSpacing.md,
                BetNetSpacing.md,
                BetNetSpacing.md,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    property.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: BetNetSpacing.xs),
                  Text(
                    property.locationLine,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: BetNetSpacing.sm),
                  Text(
                    property.propertyType.replaceAll('_', ' '),
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                  if (property.floorNumber != null &&
                      isFloorRelevantPropertyType(property.propertyType)) ...[
                    const SizedBox(height: BetNetSpacing.xs),
                    Text(
                      AppLocalizations.of(context)?.floorMeta(property.floorNumber!) ??
                          'Floor ${property.floorNumber}',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                  const SizedBox(height: BetNetSpacing.xs),
                  Text(
                    '$price$priceTail',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: scheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ImageBadge extends StatelessWidget {
  const _ImageBadge({
    required this.label,
    this.icon,
  });

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 12),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
