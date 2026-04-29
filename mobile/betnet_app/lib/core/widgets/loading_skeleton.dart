import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class BetNetSkeletonBox extends StatelessWidget {
  const BetNetSkeletonBox({
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

class BetNetPropertyCardSkeleton extends StatelessWidget {
  const BetNetPropertyCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          BetNetSkeletonBox(height: 160, radius: 0),
          Padding(
            padding: EdgeInsets.all(BetNetSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                BetNetSkeletonBox(height: 14, width: 180),
                SizedBox(height: BetNetSpacing.sm),
                BetNetSkeletonBox(height: 12, width: 140),
                SizedBox(height: BetNetSpacing.sm),
                BetNetSkeletonBox(height: 16, width: 120),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class BetNetPropertyListSkeleton extends StatelessWidget {
  const BetNetPropertyListSkeleton({super.key, this.count = 6});

  final int count;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(BetNetSpacing.md),
      itemBuilder: (_, __) => const BetNetPropertyCardSkeleton(),
      separatorBuilder: (_, __) => const SizedBox(height: BetNetSpacing.sm),
      itemCount: count,
    );
  }
}

class BetNetHorizontalCardSkeleton extends StatelessWidget {
  const BetNetHorizontalCardSkeleton({super.key, this.width = 260});

  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: const Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            BetNetSkeletonBox(height: 140, width: double.infinity, radius: 0),
            Padding(
              padding: EdgeInsets.all(BetNetSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  BetNetSkeletonBox(height: 12, width: 160),
                  SizedBox(height: 8),
                  BetNetSkeletonBox(height: 10, width: 100),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
