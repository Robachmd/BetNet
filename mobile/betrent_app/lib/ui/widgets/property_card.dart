import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../data/models/property.dart';

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
                      placeholder: (_, __) => const Center(
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      errorWidget: (_, __, ___) => ColoredBox(
                        color: scheme.errorContainer,
                        child: Icon(Icons.broken_image_outlined, color: scheme.error),
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
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
                  const SizedBox(height: 4),
                  Text(
                    property.locationLine,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$price / mo',
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
